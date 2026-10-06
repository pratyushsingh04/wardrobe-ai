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

// Free-tier models get overloaded or hit their quota, so fall through to the next one.
const GEMINI_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
];

type GeminiStep = { type: string; content?: { type: string; text?: string }[] };

async function askGemini<Schema extends z.ZodType>({
  prompt,
  schema,
  image,
}: JsonRequest<Schema>): Promise<z.infer<Schema>> {
  const jsonSchema: Record<string, unknown> = z.toJSONSchema(schema);
  delete jsonSchema.$schema;

  const models = process.env.GEMINI_MODEL
    ? [process.env.GEMINI_MODEL, ...GEMINI_MODELS.filter((m) => m !== process.env.GEMINI_MODEL)]
    : GEMINI_MODELS;
  let busy = "";

  for (const model of models) {
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
          input: [
            { type: "text", text: prompt },
            ...(image
              ? [
                  {
                    type: "image",
                    data: image.data.toString("base64"),
                    mime_type: image.mediaType,
                  },
                ]
              : []),
          ],
          response_format: { type: "text", mime_type: "application/json", schema: jsonSchema },
        }),
        // A hung model shouldn't eat the whole wait; only the last one gets a long timeout.
        signal: AbortSignal.timeout(model === models.at(-1) ? 45_000 : 20_000),
      });
    } catch (err) {
      if (err instanceof Error && err.name === "TimeoutError") {
        busy = "The AI took too long to answer. Try again.";
        continue;
      }
      throw new AiError("Could not reach the Gemini API. Check your internet connection.");
    }

    // Overloaded (503) or out of quota (429) on this model: try the next one.
    if (res.status === 503 || res.status === 429 || res.status === 404) {
      busy =
        res.status === 429
          ? "The free Gemini limit is used up for now. Try again in a minute."
          : "The free Gemini models are busy right now. Try again in a minute.";
      continue;
    }
    if (res.status === 400 || res.status === 401 || res.status === 403) {
      throw new AiError(`Gemini rejected the request (${res.status}). Check your GEMINI_API_KEY.`);
    }
    if (!res.ok) throw new AiError(`The Gemini request failed (${res.status}). Try again.`);

    try {
      const body = (await res.json()) as { steps?: GeminiStep[] };
      const text = (body.steps ?? [])
        .filter((step) => step.type === "model_output")
        .flatMap((step) => step.content ?? [])
        .map((part) => part.text ?? "")
        .join("");
      return schema.parse(JSON.parse(text));
    } catch {
      throw new AiError("The AI gave an answer the app could not read. Try again.");
    }
  }
  throw new AiError(busy);
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
