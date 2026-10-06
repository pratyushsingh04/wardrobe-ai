import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { ApiError as GeminiApiError, GoogleGenAI } from "@google/genai";
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
        "No AI key found. Add a free GEMINI_API_KEY to .env.local (see README) to turn on the AI.",
      );
  }
}

async function askGemini<Schema extends z.ZodType>({
  prompt,
  schema,
  image,
}: JsonRequest<Schema>): Promise<z.infer<Schema>> {
  const jsonSchema: Record<string, unknown> = z.toJSONSchema(schema);
  delete jsonSchema.$schema;

  let text: string | undefined;
  try {
    const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const interaction = await client.interactions.create({
      model: process.env.GEMINI_MODEL || "gemini-3.8-flash",
      input: [
        { type: "text", text: prompt },
        ...(image
          ? [
              {
                type: "image" as const,
                data: image.data.toString("base64"),
                mime_type: image.mediaType,
              },
            ]
          : []),
      ],
      response_format: { type: "text", mime_type: "application/json", schema: jsonSchema },
    });
    text = interaction.output_text;
  } catch (err) {
    if (!(err instanceof GeminiApiError)) {
      throw new AiError("Could not reach the Gemini API. Check your internet connection.");
    }
    if (err.status === 429) {
      throw new AiError("The free Gemini limit is used up for now. Try again in a minute.");
    }
    if (err.status === 400 || err.status === 401 || err.status === 403) {
      throw new AiError(
        `Gemini rejected the request (${err.status}). Check GEMINI_API_KEY in .env.local.`,
      );
    }
    throw new AiError(`The Gemini request failed (${err.status}). Try again.`);
  }

  try {
    return schema.parse(JSON.parse(text ?? ""));
  } catch {
    throw new AiError("The AI gave an answer the app could not read. Try again.");
  }
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
      throw new AiError("The Anthropic API key was rejected. Check ANTHROPIC_API_KEY in .env.local.");
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
