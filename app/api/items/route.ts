import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { insertItem, listItems, UPLOAD_DIR } from "@/lib/db";
import { AiError, type ImageMediaType } from "@/lib/ai";
import { EMPTY_TAGS, tagClothingImage } from "@/lib/tagger";

const EXTENSIONS: Record<ImageMediaType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// The Claude API accepts images up to 5 MB each.
const MAX_BYTES = 5 * 1024 * 1024;

export async function GET() {
  return Response.json({ items: listItems() });
}

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("photo");
  if (!(file instanceof File)) {
    return Response.json({ error: "Attach a photo." }, { status: 400 });
  }
  if (!(file.type in EXTENSIONS)) {
    return Response.json(
      { error: "Only JPEG, PNG and WebP photos are supported." },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "Photo is larger than 5 MB." }, { status: 400 });
  }

  const mediaType = file.type as ImageMediaType;
  const id = randomUUID();
  const imageFile = `${id}.${EXTENSIONS[mediaType]}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOAD_DIR, imageFile), bytes);

  // A failed tagging call still saves the item, so the user can tag it by hand.
  try {
    const tags = await tagClothingImage(bytes, mediaType);
    return Response.json({ item: insertItem(id, imageFile, tags, true) });
  } catch (err) {
    if (!(err instanceof AiError)) throw err;
    return Response.json({
      item: insertItem(id, imageFile, EMPTY_TAGS, false),
      warning: err.message,
    });
  }
}
