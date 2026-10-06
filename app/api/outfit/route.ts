import { z } from "zod";
import { CLOSET_ENABLED, closetDisabledResponse, listItems } from "@/lib/db";
import { suggestOutfit } from "@/lib/outfit";
import { OCCASIONS, type Outfit } from "@/lib/types";
import { getWeather } from "@/lib/weather";

const RequestSchema = z.object({
  occasion: z.enum(OCCASIONS),
  city: z.string().trim().max(80),
  previousIds: z.array(z.string()).max(10).default([]),
});

export async function POST(request: Request) {
  if (!CLOSET_ENABLED) return closetDisabledResponse();
  const parsed = RequestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: "Pick an occasion." }, { status: 400 });
  }
  const { occasion, city, previousIds } = parsed.data;

  const items = listItems().filter((item) => item.tagged);
  if (items.length === 0) {
    return Response.json(
      { error: "Add and tag a few clothes first, then ask for an outfit." },
      { status: 400 },
    );
  }

  const weather = city ? await getWeather(city) : null;
  const outfit: Outfit = {
    ...(await suggestOutfit(items, occasion, weather, previousIds)),
    weather,
  };
  return Response.json({ outfit });
}
