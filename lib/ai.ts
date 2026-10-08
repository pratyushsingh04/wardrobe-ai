import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

// An AI failure with a message that is safe to show to the user.
export class AiError extends Error {}

export type ImageMediaType = "image/jpeg" | "image/png" | "image/webp";

type JsonRequest<Schema extends z.ZodType> = {
  prompt: string;
  schema: Schema;
  image?: { data: Buffer; mediaType: ImageMediaType };
};

// Gemini has a free tier, so it wins when both keys are set.
function provider(): "gemini" | "claude" | null {
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.ANTHROPIC_API_KEY) return "claude";
  return null;
}

export function hasAiKey() {
  return provider() !== null;
}

// Asks the configured model for JSON matching `schema`. Throws AiError on any AI failure.
export async function generateJson<Schema extends z.ZodType>(
  request: JsonRequest<Schema>,
): Promise<z.infer<Schema>> {
  switch (provider()) {
    case "gemini":
      return askGemini(request);
    case "claude":
      return askClaude(request);
    default:
      throw new AiError(
        process.env.VERCEL
          ? "The AI is not set up on this site yet. Add GEMINI_API_KEY in the Vercel project settings and redeploy."
          : "No AI key found. Add a free GEMINI_API_KEY to .env.local (see README) to turn on the AI.",
      );
  }
}

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/interactions";

// Tried in this order. Free-tier models are often overloaded or out of quota, so a request
// that is slow or fails is backed up by the next model rather than waited on.
// Flash-Lite goes first: in testing it was the quickest and the most reliably available.
const GEMINI_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-3.8-flash",
  "gemini-3.7-flash",
];

// If a model has not answered after this long, the next one starts alongside it.
const HEDGE_MS = 9_000;
const REQUEST_TIMEOUT_MS = 40_000;
const REMEMBER_MS = 10 * 60_000;

// The model that answered most recently goes first next time.
let lastGood: { model: string; at: number } | null = null;

type GeminiStep = { type: string; content?: { type: string; text?: string }[] };

function geminiOrder() {
  const preferred = [
    process.env.GEMINI_MODEL,
    lastGood && Date.now() - lastGood.at < REMEMBER_MS ? lastGood.model : undefined,
  ].filter((model): model is string => Boolean(model));
  return [...new Set([...preferred, ...GEMINI_MODELS])];
}

async function askGemini<Schema extends z.ZodType>({
  prompt,
  schema,
  image,
}: JsonRequest<Schema>): Promise<z.infer<Schema>> {
  const jsonSchema: Record<string, unknown> = z.toJSONSchema(schema);
  delete jsonSchema.$schema;

  const input = [
    { type: "text", text: prompt },
    ...(image
      ? [{ type: "image", data: image.data.toString("base64"), mime_type: image.mediaType }]
      : []),
  ];
  const abort = new AbortController();

  // Resolves with the parsed answer, or rejects with an AiError describing why this model failed.
  async function attempt(model: string): Promise<z.infer<Schema>> {
    const started = Date.now();
    let res: Response;
    try {
      res = await fetch(GEMINI_URL, {
        method: "POST",
        headers: {
          "x-goog-api-key": process.env.GEMINI_API_KEY!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          input,
          // Not storing the interaction keeps the photo off Google's side and answers seconds sooner.
          store: false,
          response_format: { type: "text", mime_type: "application/json", schema: jsonSchema },
        }),
        signal: AbortSignal.any([abort.signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)]),
      });
    } catch (err) {
      if (err instanceof Error && err.name === "TimeoutError") {
        throw new AiError("The AI took too long to answer. Try again.");
      }
      throw new AiError("Could not reach the Gemini API. Check your internet connection.");
    }

    if (res.status === 429) {
      throw new AiError("The free Gemini limit is used up for now. Try again in a minute.");
    }
    if (res.status === 503 || res.status === 404) {
      throw new AiError("The free Gemini models are busy right now. Try again in a minute.");
    }
    if (res.status === 400 || res.status === 401 || res.status === 403) {
      throw new AiError(`Gemini rejected the request (${res.status}). Check your GEMINI_API_KEY.`);
    }
    if (!res.ok) throw new AiError(`The Gemini request failed (${res.status}). Try again.`);

    let parsed: z.infer<Schema>;
    try {
      const body = (await res.json()) as { steps?: GeminiStep[] };
      const text = (body.steps ?? [])
        .filter((step) => step.type === "model_output")
        .flatMap((step) => step.content ?? [])
        .map((part) => part.text ?? "")
        .join("");
      parsed = schema.parse(JSON.parse(text));
    } catch {
      throw new AiError("The AI gave an answer the app could not read. Try again.");
    }
    lastGood = { model, at: Date.now() };
    console.log(`[ai] ${model} answered in ${Date.now() - started}ms`);
    return parsed;
  }

  const models = geminiOrder();
  return new Promise((resolve, reject) => {
    let next = 0;
    let running = 0;
    let lastError: unknown = null;
    let timer: ReturnType<typeof setTimeout> | undefined;

    function launch() {
      clearTimeout(timer);
      if (next >= models.length) return;
      const model = models[next++];
      running++;
      // Back this request up if it is still going after the hedge delay.
      timer = setTimeout(launch, HEDGE_MS);
      attempt(model).then(
        (answer) => {
          clearTimeout(timer);
          abort.abort();
          resolve(answer);
        },
        (err) => {
          running--;
          lastError = err;
          if (abort.signal.aborted) return;
          if (next < models.length) launch();
          else if (running === 0) reject(lastError);
        },
      );
    }

    launch();
  });
}

async function askClaude<Schema extends z.ZodType>({
  prompt,
  schema,
  image,
}: JsonRequest<Schema>): Promise<z.infer<Schema>> {
  try {
    const client = new Anthropic();
    const response = await client.beta.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { format: betaZodOutputFormat(schema) },
      messages: [
        {
          role: "user",
          content: [
            ...(image
              ? [
                  {
                    type: "image" as const,
                    source: {
                      type: "base64" as const,
                      media_type: image.mediaType,
                      data: image.data.toString("base64"),
                    },
                  },
                ]
              : []),
            { type: "text" as const, text: prompt },
          ],
        },
      ],
    });
    if (response.stop_reason === "refusal" || !response.parsed_output) {
      throw new AiError("The AI could not answer this one. Try a different photo.");
    }
    return response.parsed_output;
  } catch (err) {
    if (err instanceof AiError) throw err;
    if (err instanceof Anthropic.AuthenticationError) {
      throw new AiError(
        "The Anthropic API key was rejected. Check ANTHROPIC_API_KEY in .env.local.",
      );
    }
    if (err instanceof Anthropic.RateLimitError) {
      throw new AiError("The AI is rate limited right now. Try again in a minute.");
    }
    if (err instanceof Anthropic.APIConnectionError) {
      throw new AiError("Could not reach the Anthropic API. Check your internet connection.");
    }
    if (err instanceof Anthropic.APIError) {
      throw new AiError(`The AI request failed: ${err.message}`);
    }
    throw err;
  }
}
