import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { Item, ItemTags } from "./types";

export const DATA_DIR = path.join(/* turbopackIgnore: true */ process.cwd(), "data");
export const UPLOAD_DIR = path.join(/* turbopackIgnore: true */ DATA_DIR, "uploads");

// Vercel functions have no persistent disk, so the closet (photos + SQLite) only runs on a real server.
export const CLOSET_ENABLED = !process.env.VERCEL;
if (CLOSET_ENABLED) mkdirSync(UPLOAD_DIR, { recursive: true });

export function closetDisabledResponse() {
  return Response.json(
    { error: "The closet is not available on this deployment." },
    { status: 501 },
  );
}

type Row = {
  id: string;
  image_file: string;
  name: string;
  category: string;
  colors: string;
  fabric: string;
  seasons: string;
  occasions: string;
  tagged: number;
  created_at: string;
};

// Reuse one connection across dev hot reloads.
const globalForDb = globalThis as unknown as { wardrobeDb?: DatabaseSync };

function getDb() {
  if (!globalForDb.wardrobeDb) {
    const db = new DatabaseSync(path.join(/* turbopackIgnore: true */ DATA_DIR, "wardrobe.db"));
    db.exec(`
      CREATE TABLE IF NOT EXISTS items (
        id TEXT PRIMARY KEY,
        image_file TEXT NOT NULL,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        colors TEXT NOT NULL,
        fabric TEXT NOT NULL,
        seasons TEXT NOT NULL,
        occasions TEXT NOT NULL,
        tagged INTEGER NOT NULL,
        created_at TEXT NOT NULL
      )
    `);
    globalForDb.wardrobeDb = db;
  }
  return globalForDb.wardrobeDb;
}

function toItem(row: Row): Item {
  return {
    id: row.id,
    imageUrl: `/api/images/${row.image_file}`,
    name: row.name,
    category: row.category as Item["category"],
    colors: JSON.parse(row.colors),
    fabric: row.fabric,
    seasons: JSON.parse(row.seasons),
    occasions: JSON.parse(row.occasions),
    tagged: row.tagged === 1,
    createdAt: row.created_at,
  };
}

export function listItems(): Item[] {
  const rows = getDb()
    .prepare("SELECT * FROM items ORDER BY created_at DESC")
    .all() as Row[];
  return rows.map(toItem);
}

export function getItem(id: string): Item | null {
  const row = getDb().prepare("SELECT * FROM items WHERE id = ?").get(id) as
    | Row
    | undefined;
  return row ? toItem(row) : null;
}

export function getImageFile(id: string): string | null {
  const row = getDb()
    .prepare("SELECT image_file FROM items WHERE id = ?")
    .get(id) as { image_file: string } | undefined;
  return row?.image_file ?? null;
}

export function insertItem(
  id: string,
  imageFile: string,
  tags: ItemTags,
  tagged: boolean,
): Item {
  getDb()
    .prepare(
      `INSERT INTO items
        (id, image_file, name, category, colors, fabric, seasons, occasions, tagged, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      imageFile,
      tags.name,
      tags.category,
      JSON.stringify(tags.colors),
      tags.fabric,
      JSON.stringify(tags.seasons),
      JSON.stringify(tags.occasions),
      tagged ? 1 : 0,
      new Date().toISOString(),
    );
  return getItem(id)!;
}

export function updateItem(id: string, tags: ItemTags): Item | null {
  getDb()
    .prepare(
      `UPDATE items
       SET name = ?, category = ?, colors = ?, fabric = ?, seasons = ?, occasions = ?, tagged = 1
       WHERE id = ?`,
    )
    .run(
      tags.name,
      tags.category,
      JSON.stringify(tags.colors),
      tags.fabric,
      JSON.stringify(tags.seasons),
      JSON.stringify(tags.occasions),
      id,
    );
  return getItem(id);
}

export function deleteItem(id: string) {
  getDb().prepare("DELETE FROM items WHERE id = ?").run(id);
}
