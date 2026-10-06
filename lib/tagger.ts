import { z } from "zod";
import { generateJson, type ImageMediaType } from "./ai";
import { CATEGORIES, OCCASIONS, SEASONS, type ItemTags } from "./types";

export const TagsSchema = z.object({
  name: z.string(),
  category: z.enum(CATEGORIES),
  colors: z.array(z.string()),
  fabric: z.string(),
  seasons: z.array(z.enum(SEASONS)),
  occasions: z.array(z.enum(OCCASIONS)),
});

export const EMPTY_TAGS: ItemTags = {
  name: "Untitled item",
  category: "other",
  colors: [],
  fabric: "",
  seasons: [],
  occasions: [],
};

const PROMPT = `This is a photo of one clothing item or accessory from a personal wardrobe in India.
Tag it for a wardrobe app:
- name: a short label a person would use, like "Navy slim-fit chinos" (max 5 words)
- category: "ethnic" covers kurtas, sarees, sherwanis, lehengas and similar
- colors: 1 to 3 plain lowercase colour names, most dominant first
- fabric: your best guess in one or two lowercase words, like "cotton" or "denim"
- seasons: where it is comfortable to wear in Indian weather; use "all-season" alone if it works year-round
- occasions: every occasion it suits
If the photo shows several items, tag the most prominent one.`;

export function tagClothingImage(image: Buffer, mediaType: ImageMediaType): Promise<ItemTags> {
  return generateJson({ prompt: PROMPT, schema: TagsSchema, image: { data: image, mediaType } });
}
