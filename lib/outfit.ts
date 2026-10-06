import { z } from "zod";
import { AiError, generateJson, hasAiKey } from "./ai";
import type { Category, Item, Occasion, Outfit, Weather } from "./types";
import { seasonFor } from "./weather";

const PickSchema = z.object({
  itemIds: z.array(z.string()),
  reason: z.string(),
});

export async function suggestOutfit(
  items: Item[],
  occasion: Occasion,
  weather: Weather | null,
  previousIds: string[],
): Promise<Omit<Outfit, "weather">> {
  if (hasAiKey()) {
    try {
      const picked = await pickWithAi(items, occasion, weather, previousIds);
      if (picked) return { ...picked, source: "ai" };
    } catch (err) {
      // An AI failure shouldn't leave the user without an outfit; fall back to the rule matcher.
      if (!(err instanceof AiError)) throw err;
    }
  }
  return { ...pickByRules(items, occasion, weather, previousIds), source: "rules" };
}

async function pickWithAi(
  items: Item[],
  occasion: Occasion,
  weather: Weather | null,
  previousIds: string[],
) {
  const closet = items.map(({ id, name, category, colors, fabric, seasons, occasions }) => ({
    id,
    name,
    category,
    colors,
    fabric,
    seasons,
    occasions,
  }));
  const weatherLine = weather
    ? `Weather in ${weather.city} right now: ${weather.tempC}°C, ${weather.raining ? "raining" : "no rain"}.`
    : "Weather is unknown, so pick something that works in mild conditions.";
  const previousLine = previousIds.length
    ? `The last suggestion used these ids: ${previousIds.join(", ")}. Suggest a different combination if the closet allows it.`
    : "";

  const picked = await generateJson({
    schema: PickSchema,
    prompt: `You are a personal stylist. Pick one complete outfit for a "${occasion}" occasion using only items from this closet.
${weatherLine}
${previousLine}

Closet (JSON):
${JSON.stringify(closet)}

Rules:
- Use each category at most once. A dress or a full ethnic set replaces top and bottom.
- Include footwear when the closet has any, and outerwear only when the weather calls for it.
- Colours should go together, and fabrics should be comfortable in this weather.
- If the closet is missing a piece, pick the best partial outfit and say what is missing.

Return the chosen item ids and a reason of one or two friendly sentences addressed to the wearer.`,
  });
  const chosen = picked.itemIds
    .map((id) => items.find((item) => item.id === id))
    .filter((item): item is Item => item !== undefined);
  if (chosen.length === 0) return null;
  return { items: chosen, reason: picked.reason };
}

function pickByRules(
  items: Item[],
  occasion: Occasion,
  weather: Weather | null,
  previousIds: string[],
) {
  const season = weather ? seasonFor(weather) : null;

  function score(item: Item) {
    let points = 0;
    if (item.occasions.includes(occasion)) points += 4;
    if (season && (item.seasons.includes(season) || item.seasons.includes("all-season"))) points += 2;
    // Prefer something new when the user asks for another suggestion.
    if (!previousIds.includes(item.id)) points += 1;
    return points;
  }

  function best(...categories: Category[]) {
    const candidates = items.filter((item) => categories.includes(item.category));
    if (candidates.length === 0) return null;
    const top = Math.max(...candidates.map(score));
    const tied = candidates.filter((item) => score(item) === top);
    return tied[Math.floor(Math.random() * tied.length)];
  }

  const chosen: Item[] = [];
  const missing: string[] = [];

  const main = best("top", "dress", "ethnic");
  if (main) chosen.push(main);
  else missing.push("top");

  if (main?.category !== "dress") {
    const bottom = best("bottom");
    if (bottom) chosen.push(bottom);
    else if (main?.category !== "ethnic") missing.push("bottom");
  }

  const footwear = best("footwear");
  if (footwear) chosen.push(footwear);
  else missing.push("footwear");

  if (weather && (weather.raining || weather.tempC < 20)) {
    const outerwear = best("outerwear");
    if (outerwear) chosen.push(outerwear);
  }

  const offOccasion = chosen.filter((item) => !item.occasions.includes(occasion));
  const parts = [
    weather
      ? `Picked for ${weather.tempC}°C${weather.raining ? " and rain" : ""} in ${weather.city}.`
      : `Picked for a ${occasion} day.`,
  ];
  if (offOccasion.length) {
    parts.push(`Nothing better tagged for ${occasion}, so this is the closest match.`);
  }
  if (chosen.length === 0) {
    return {
      items: chosen,
      reason:
        "Nothing in your closet is tagged as a top, bottom, dress, ethnic wear or footwear yet. Add photos of those, or fix the category with Edit tags, and ask again.",
    };
  }
  if (missing.length) {
    const list =
      missing.length > 1
        ? `${missing.slice(0, -1).join(", ")} or ${missing[missing.length - 1]}`
        : missing[0];
    parts.push(`Your closet has no ${list} yet, so add some for a full outfit.`);
  }
  return { items: chosen, reason: parts.join(" ") };
}
