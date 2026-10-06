import { readFile } from "node:fs/promises";
import path from "node:path";
import { UPLOAD_DIR } from "@/lib/db";

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function GET(_request: Request, ctx: RouteContext<"/api/images/[file]">) {
  const { file } = await ctx.params;
  // Uploaded files are always "<uuid>.<ext>"; reject anything else so the path can't escape the folder.
  const match = /^[0-9a-f-]{36}\.(jpg|png|webp)$/.exec(file);
  if (!match) {
    return new Response("Not found", { status: 404 });
  }
  try {
    const bytes = await readFile(path.join(/* turbopackIgnore: true */ UPLOAD_DIR, file));
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": CONTENT_TYPES[match[1]],
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
