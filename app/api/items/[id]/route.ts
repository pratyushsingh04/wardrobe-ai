import { unlink } from "node:fs/promises";
import path from "node:path";
import { deleteItem, getImageFile, updateItem, UPLOAD_DIR } from "@/lib/db";
import { TagsSchema } from "@/lib/tagger";

export async function PATCH(request: Request, ctx: RouteContext<"/api/items/[id]">) {
  const { id } = await ctx.params;
  const parsed = TagsSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: "Invalid tags." }, { status: 400 });
  }
  const item = updateItem(id, parsed.data);
  if (!item) {
    return Response.json({ error: "Item not found." }, { status: 404 });
  }
  return Response.json({ item });
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/items/[id]">) {
  const { id } = await ctx.params;
  const imageFile = getImageFile(id);
  if (!imageFile) {
    return Response.json({ error: "Item not found." }, { status: 404 });
  }
  deleteItem(id);
  await unlink(path.join(UPLOAD_DIR, imageFile)).catch(() => {});
  return Response.json({ ok: true });
}
