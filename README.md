# Wardrobe AI

Upload a photo of what you plan to wear, pick an event, and get a four-page lookbook: a suitability score out of 100 with what works and what to fix, the pieces to wear instead with search links to Myntra, Amazon, Flipkart and Ajio, three hairstyle options, and a step-by-step makeup or grooming look with product links to Nykaa, Amazon, Purplle and Myntra. Locally you can also build a closet of AI-tagged clothes and get outfit suggestions from it.

## Run it

```bash
npm install
cp .env.example .env.local   # then paste a free Gemini key (or an Anthropic key) into .env.local
npm run dev
```

Open http://localhost:3000. The outfit check needs an AI key. The free option is a Gemini key from https://aistudio.google.com/apikey; an Anthropic key also works. Without one, only the closet works: photos are saved untagged and you can tag them by hand with "Edit tags".

Requires Node 22.5 or newer (the app uses the built-in `node:sqlite` module).

## How it works

| Part | Where |
|---|---|
| Closet page, upload, filter, edit dialog | `app/components/` |
| Upload + list API | `app/api/items/route.ts` |
| Edit + delete API | `app/api/items/[id]/route.ts` |
| Image serving | `app/api/images/[file]/route.ts` |
| Outfit check and scoring (Claude vision) | `lib/checker.ts`, `app/api/check/route.ts` |
| Store search links | `lib/shops.ts` |
| Lookbook with page-flip, animation helpers | `app/components/Lookbook.tsx`, `app/components/motion.tsx` |
| AI tagging (Claude vision + structured output) | `lib/tagger.ts` |
| Outfit suggestion (Claude, with a tag-matching fallback) | `lib/outfit.ts`, `app/api/outfit/route.ts` |
| Live weather (Open-Meteo, no key needed) | `lib/weather.ts` |
| AI provider layer (Gemini with hedged model fallback, or Claude) | `lib/ai.ts` |
| SQLite storage | `lib/db.ts` |

Photos and the database live in `data/`, which is git-ignored.

## Next up

- Background removal
- "Wore this" log and wardrobe stats
- Stylist chat
- Move storage to Postgres + S3 and deploy
