import { AiError, type ImageMediaType } from "@/lib/ai";
import { checkOutfit } from "@/lib/checker";
import { CLOSET_ENABLED, listItems } from "@/lib/db";
import { getWeather } from "@/lib/weather";

// Free models can be slow or need a fallback, so allow more than the default function time.
export const maxDuration = 120;

const MEDIA_TYPES: ImageMediaType[] = ["image/jpeg", "image/png", "image/webp"];

// The Claude API accepts images up to 5 MB each.
const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("photo");
  const event = String(form.get("event") ?? "").trim();
  const details = String(form.get("details") ?? "").trim();
  const city = String(form.get("city") ?? "").trim();

  if (!(file instanceof File)) {
    return Response.json({ error: "Attach a photo of the outfit." }, { status: 400 });
  }
  if (!MEDIA_TYPES.includes(file.type as ImageMediaType)) {
    return Response.json(
      { error: "Only JPEG, PNG and WebP photos are supported." },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "Photo is larger than 5 MB." }, { status: 400 });
  }
  if (!event || event.length > 60 || details.length > 300 || city.length > 80) {
    return Response.json({ error: "Pick an event." }, { status: 400 });
  }

  try {
    const check = await checkOutfit({
      image: Buffer.from(await file.arrayBuffer()),
      mediaType: file.type as ImageMediaType,
      event,
      details,
      weather: city ? await getWeather(city) : null,
      closet: CLOSET_ENABLED ? listItems().filter((item) => item.tagged) : [],
    });
    return Response.json({ check });
  } catch (err) {
    if (!(err instanceof AiError)) throw err;
    return Response.json({ error: err.message }, { status: 503 });
  }
}
