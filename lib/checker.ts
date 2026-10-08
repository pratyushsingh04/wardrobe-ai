import { z } from "zod";
import { AiError, generateJson, type ImageMediaType } from "./ai";
import { beautyLinks, shopLinks } from "./shops";
import {
  SCORE_PARTS,
  type Item,
  type OutfitCheck,
  type StyleFor,
  type Weather,
} from "./types";

const ProductSchema = z.object({
  name: z.string(),
  reason: z.string(),
  searchQuery: z.string(),
});

const CheckSchema = z.object({
  clothingVisible: z.boolean(),
  formality: z.number(),
  coordination: z.number(),
  weather: z.number(),
  context: z.number(),
  summary: z.string(),
  works: z.array(z.string()),
  issues: z.array(z.string()),
  suggestions: z.array(z.string()),
  idealOutfit: z.string(),
  pieces: z.array(ProductSchema),
  hairstyles: z.array(z.object({ name: z.string(), why: z.string(), how: z.string() })),
  hairProducts: z.array(ProductSchema),
  makeupKind: z.enum(["Makeup", "Grooming"]),
  makeupTitle: z.string(),
  makeupSteps: z.array(z.object({ area: z.string(), tip: z.string() })),
  makeupProducts: z.array(ProductSchema),
});

type CheckInput = {
  image: Buffer;
  mediaType: ImageMediaType;
  event: string;
  details: string;
  styleFor: StyleFor;
  weather: Weather | null;
  closet: Item[];
};

function buildPrompt({
  event,
  details,
  styleFor,
  weather,
  closet,
}: Omit<CheckInput, "image" | "mediaType">) {
  const styleLine =
    styleFor === "Auto"
      ? "The wearer did not say whether they shop menswear or womenswear, so go by the clothes in the photo."
      : `The wearer shops ${styleFor.toLowerCase()}.`;
  const makeupLines = `- makeupKind: "Makeup".
- makeupTitle: a short name for the overall makeup look, like "Soft glam with a rose lip".
- makeupSteps: 5 makeup steps in the order they are done, with the areas Skin prep, Base, Eyes, Cheeks and Lips. Each tip is one specific sentence naming shades and finishes that suit the event, the outfit colours and the weather.`;
  const groomingLines = `- makeupKind: "Grooming".
- makeupTitle: a short name for the overall grooming look, like "Clean, matte and fresh".
- makeupSteps: 4 or 5 grooming steps in the order they are done, with areas like Beard or shave, Skin, Brows, Hands and Fragrance. Each tip is one specific sentence suited to the event and the weather.`;
  const lookLines =
    styleFor === "Womenswear"
      ? makeupLines
      : styleFor === "Menswear"
        ? groomingLines
        : `Pick ONE of these two, going by the clothes in the photo:
For womenswear:
${makeupLines}
For menswear:
${groomingLines}`;
  const weatherLine = weather
    ? `Weather in ${weather.city} right now: ${weather.tempC}°C, ${weather.raining ? "raining" : "no rain"}.`
    : "Weather is unknown, so score the weather part for mild conditions.";
  const closetLine = closet.length
    ? `The wearer also owns these items, which you can recommend by name in suggestions: ${closet
        .map((item) => `${item.name} (${item.category})`)
        .join("; ")}.`
    : "";

  return `You are an honest, friendly personal stylist for a user in India. The photo shows what they plan to wear, either on themselves or laid out.

Event: ${event}
${details ? `Extra details from the wearer: ${details}` : ""}
${weatherLine}
${styleLine}
${closetLine}

Judge only the clothing, footwear and accessories, never the person's body, face or looks.

Score each part from 0 to 100, where 50 means acceptable but forgettable and 90+ means you would change nothing:
- formality: is it as formal or as relaxed as this event expects?
- coordination: do the colours, fit and pieces work together?
- weather: will it be comfortable in this weather?
- context: does it suit the setting and customs of this event (for example ethnic wear at a wedding or puja, modest and neat for an interview)?
If part of the outfit is out of frame, score what you can see and say what you could not see.

Then write, in simple English:
- summary: one or two sentences with the overall call for this event
- works: up to 3 things that are right about the outfit
- issues: up to 3 things that are wrong for this event (empty if none)
- suggestions: up to 4 specific changes that would raise the score, most important first
- idealOutfit: one or two sentences describing what would be ideal to wear to this event
- pieces: the 3 to 5 pieces that make up that ideal outfit (for example top, bottom, footwear, one accessory). For each give a short name like "Pastel blue linen shirt", a reason of one sentence, and a searchQuery of 3 to 6 plain words a shopper would type into an Indian fashion store, starting with "men" or "women" (for example "men pastel blue linen shirt"). No brand names.
- hairstyles: 3 hairstyles that suit this outfit and event and are realistic for the hair length visible in the photo, best one first. If no hair is visible, suggest widely wearable styles. For each give a name of a few words, why (one sentence on why it fits this outfit and event), and how (one or two sentences on getting it at home, or what to ask the barber or stylist for).
- hairProducts: 2 or 3 hair products that help with the top hairstyle (for example "Matte hair clay", "Heat protectant spray"). Same fields as pieces; the searchQuery is 2 to 5 plain words with no brand names.
${lookLines}
- makeupProducts: 3 or 4 products that the steps need (for example "Waterproof kajal", "Matte sunscreen SPF 50"). Same fields as pieces; the searchQuery is 2 to 5 plain words with no brand names.
Hair, makeup and grooming advice is about styling choices only. Never comment on the person's face shape, skin tone, body or attractiveness.

Set clothingVisible to false only if the photo shows no clothing, footwear or accessories at all.`;
}

function verdictFor(score: number): OutfitCheck["verdict"] {
  if (score >= 80) return "Great choice";
  if (score >= 60) return "Good, with small fixes";
  if (score >= 40) return "Needs changes";
  return "Not suitable";
}

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export async function checkOutfit(input: CheckInput): Promise<OutfitCheck> {
  const result = await generateJson({
    prompt: buildPrompt(input),
    schema: CheckSchema,
    image: { data: input.image, mediaType: input.mediaType },
  });
  if (!result.clothingVisible) {
    throw new AiError("No clothes are visible in this photo. Upload a photo of the outfit.");
  }

  const breakdown = {
    formality: clamp(result.formality),
    coordination: clamp(result.coordination),
    weather: clamp(result.weather),
    context: clamp(result.context),
  };
  // The overall score is computed here, not by the model, so the same part scores always give the same total.
  const score = clamp(SCORE_PARTS.reduce((sum, part) => sum + breakdown[part.key] * part.weight, 0));

  return {
    score,
    verdict: verdictFor(score),
    breakdown,
    summary: result.summary,
    works: result.works,
    issues: result.issues,
    suggestions: result.suggestions,
    idealOutfit: result.idealOutfit,
    shop: result.pieces.slice(0, 5).map((piece) => ({
      name: piece.name,
      reason: piece.reason,
      links: shopLinks(piece.searchQuery),
    })),
    hairstyles: result.hairstyles.slice(0, 3),
    hairProducts: result.hairProducts.slice(0, 3).map((product) => ({
      name: product.name,
      reason: product.reason,
      links: beautyLinks(product.searchQuery),
    })),
    makeup: {
      // An explicit choice from the wearer wins over what the model inferred from the photo.
      kind:
        input.styleFor === "Womenswear"
          ? "Makeup"
          : input.styleFor === "Menswear"
            ? "Grooming"
            : result.makeupKind,
      title: result.makeupTitle,
      steps: result.makeupSteps.slice(0, 5),
      products: result.makeupProducts.slice(0, 4).map((product) => ({
        name: product.name,
        reason: product.reason,
        links: beautyLinks(product.searchQuery),
      })),
    },
    weather: input.weather,
  };
}
