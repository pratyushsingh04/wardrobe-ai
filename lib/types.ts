export const CATEGORIES = [
  "top",
  "bottom",
  "dress",
  "outerwear",
  "footwear",
  "accessory",
  "ethnic",
  "other",
] as const;

export const SEASONS = ["summer", "monsoon", "winter", "all-season"] as const;

export const OCCASIONS = [
  "casual",
  "college",
  "office",
  "party",
  "wedding",
  "gym",
  "home",
] as const;

export type Category = (typeof CATEGORIES)[number];
export type Season = (typeof SEASONS)[number];
export type Occasion = (typeof OCCASIONS)[number];

export type ItemTags = {
  name: string;
  category: Category;
  colors: string[];
  fabric: string;
  seasons: Season[];
  occasions: Occasion[];
};

export type Item = ItemTags & {
  id: string;
  imageUrl: string;
  tagged: boolean;
  createdAt: string;
};

export type Weather = {
  city: string;
  tempC: number;
  raining: boolean;
};

export type Outfit = {
  items: Item[];
  reason: string;
  weather: Weather | null;
  // "ai" when Claude picked the outfit, "rules" when the built-in matcher did.
  source: "ai" | "rules";
};

export const EVENTS = [
  "Casual outing",
  "College",
  "Office",
  "Job interview",
  "Date",
  "Party",
  "Wedding",
  "Festival or puja",
  "Gym",
] as const;

export type EventName = (typeof EVENTS)[number];

// Each part is scored 0-100; the weights add up to 1.
export const SCORE_PARTS = [
  { key: "formality", label: "Right level of formal", weight: 0.4 },
  { key: "coordination", label: "Colours and fit", weight: 0.25 },
  { key: "weather", label: "Comfort in this weather", weight: 0.2 },
  { key: "context", label: "Fits the setting", weight: 0.15 },
] as const;

export type ScoreKey = (typeof SCORE_PARTS)[number]["key"];

export const STYLE_FOR = ["Auto", "Menswear", "Womenswear"] as const;

export type StyleFor = (typeof STYLE_FOR)[number];

export type ShopLink = { store: string; url: string };

export type ShopPiece = {
  name: string;
  reason: string;
  links: ShopLink[];
};

export type OutfitCheck = {
  score: number;
  verdict: "Great choice" | "Good, with small fixes" | "Needs changes" | "Not suitable";
  breakdown: Record<ScoreKey, number>;
  summary: string;
  works: string[];
  issues: string[];
  suggestions: string[];
  idealOutfit: string;
  // Pieces that make up the ideal outfit, each with store search links.
  shop: ShopPiece[];
  hair: { style: string; how: string };
  grooming: string[];
  weather: Weather | null;
};
