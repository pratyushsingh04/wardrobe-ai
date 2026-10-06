"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { resizePhoto } from "@/lib/resize";
import { CATEGORIES, type Category, type Item, type ItemTags } from "@/lib/types";
import EditItemDialog from "./EditItemDialog";
import OutfitCheck from "./OutfitCheck";
import OutfitPanel from "./OutfitPanel";
import { Chip, ghostButton, SectionHeading } from "./ui";

const STEPS = [
  { title: "Snap it", text: "Upload a photo of the outfit, worn or laid out on the bed." },
  { title: "Pick the event", text: "Wedding, interview, date, college. Add the city for live weather." },
  { title: "Get the verdict", text: "A score out of 100, what works, what to fix and what would be ideal." },
];

export default function Closet() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [filter, setFilter] = useState<Category | "all">("all");
  const [uploading, setUploading] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState<Item | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/items")
      .then((res) => res.json())
      .then((data) => setItems(data.items))
      .catch(() => setNotice("Could not load your closet. Refresh to try again."));
  }, []);

  async function uploadOne(file: File) {
    const body = new FormData();
    body.append("photo", await resizePhoto(file), "photo.jpg");
    const res = await fetch("/api/items", { method: "POST", body });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    setItems((current) => [data.item, ...(current ?? [])]);
    if (data.warning) setNotice(`${data.warning} The photo was saved without tags.`);
  }

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setNotice(null);
    setUploading(files.length);
    for (const file of Array.from(files)) {
      try {
        await uploadOne(file);
      } catch (err) {
        setNotice(err instanceof Error ? err.message : "Upload failed.");
      }
      setUploading((n) => n - 1);
    }
    if (fileInput.current) fileInput.current.value = "";
  }

  async function saveTags(id: string, tags: ItemTags) {
    const res = await fetch(`/api/items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tags),
    });
    const data = await res.json();
    if (!res.ok) {
      setNotice(data.error);
      return;
    }
    setItems((current) => current!.map((item) => (item.id === id ? data.item : item)));
    setEditing(null);
  }

  async function remove(item: Item) {
    if (!confirm(`Remove "${item.name}" from your closet?`)) return;
    const res = await fetch(`/api/items/${item.id}`, { method: "DELETE" });
    if (!res.ok) {
      setNotice("Could not remove this item.");
      return;
    }
    setItems((current) => current!.filter((other) => other.id !== item.id));
  }

  const visible = (items ?? []).filter((item) => filter === "all" || item.category === filter);
  const usedCategories = CATEGORIES.filter((category) =>
    items?.some((item) => item.category === category),
  );
  const hasTaggedItems = items?.some((item) => item.tagged) ?? false;

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-line bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <a href="#top" className="font-display text-2xl leading-none">
            Wardrobe <span className="italic text-accent">AI</span>
          </a>
          <nav className="flex items-center gap-1 text-sm font-medium sm:gap-2">
            <a href="#check" className="rounded-full px-3 py-1.5 transition hover:bg-accent-soft">
              Check
            </a>
            <a href="#suggest" className="rounded-full px-3 py-1.5 transition hover:bg-accent-soft">
              Suggest
            </a>
            <a href="#closet" className="rounded-full px-3 py-1.5 transition hover:bg-accent-soft">
              Closet
            </a>
          </nav>
        </div>
      </header>

      <main id="top" className="relative flex-1 overflow-x-clip">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[38rem] bg-[radial-gradient(60rem_28rem_at_15%_0%,var(--accent-soft),transparent_70%),radial-gradient(40rem_22rem_at_95%_10%,var(--accent-soft),transparent_70%)]"
        />

        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <section className="animate-rise pb-10 pt-12 text-center sm:pt-20">
            <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-1.5 text-xs font-medium text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Your AI stylist, honest every time
            </p>
            <h1 className="mx-auto mt-5 max-w-3xl font-display text-5xl leading-[1.02] sm:text-7xl">
              Is this outfit <span className="italic text-accent">right</span> for the event?
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base text-muted sm:text-lg">
              Upload what you plan to wear and pick where you&apos;re going. Get a score out of 100,
              what to fix, and what would be ideal.
            </p>
          </section>

          <section id="check" aria-label="Outfit check">
            <OutfitCheck />
          </section>

          <section aria-label="How it works" className="mt-12 grid gap-6 sm:grid-cols-3">
            {STEPS.map((step, index) => (
              <div key={step.title} className="flex gap-4">
                <span className="font-display text-5xl leading-none text-accent">{index + 1}</span>
                <div>
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="mt-1 text-sm text-muted">{step.text}</p>
                </div>
              </div>
            ))}
          </section>

          <section id="suggest" className="mt-20">
            <SectionHeading eyebrow="From your closet" title="Not sure what to wear?">
              Pick an occasion and get an outfit built from the clothes you own, matched to
              today&apos;s weather.
            </SectionHeading>
            <div className="mt-6">
              {hasTaggedItems ? (
                <OutfitPanel />
              ) : (
                <p className="rounded-[28px] border border-dashed border-line px-6 py-10 text-center text-sm text-muted">
                  Add a few clothes to your closet below and this will start suggesting outfits.
                </p>
              )}
            </div>
          </section>

          <section id="closet" className="mt-20 pb-20">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <SectionHeading eyebrow="My closet" title="Everything you own, tagged">
                {items
                  ? `${items.length} ${items.length === 1 ? "item" : "items"}. Add one piece per photo.`
                  : "Loading your closet…"}
              </SectionHeading>
              <label className={`${ghostButton} cursor-pointer has-disabled:cursor-wait has-disabled:opacity-60`}>
                {uploading > 0
                  ? `Tagging ${uploading} ${uploading === 1 ? "photo" : "photos"}…`
                  : "+ Add clothes"}
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  disabled={uploading > 0}
                  className="sr-only"
                  onChange={(event) => handleFiles(event.target.files)}
                />
              </label>
            </div>

            {notice && (
              <div
                role="alert"
                className="mt-6 flex items-start justify-between gap-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm"
              >
                <p>{notice}</p>
                <button onClick={() => setNotice(null)} className="shrink-0 font-medium underline">
                  Dismiss
                </button>
              </div>
            )}

            {usedCategories.length > 1 && (
              <div className="mt-6 flex flex-wrap gap-2">
                {(["all", ...usedCategories] as const).map((category) => (
                  <Chip key={category} active={filter === category} onClick={() => setFilter(category)}>
                    {category}
                  </Chip>
                ))}
              </div>
            )}

            {items?.length === 0 && uploading === 0 && (
              <div className="mt-6 rounded-[28px] border border-dashed border-line px-6 py-16 text-center">
                <p className="font-display text-3xl">Your closet is empty</p>
                <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
                  Add a photo of a shirt, jeans or shoes. The AI names it and tags its colour,
                  fabric, season and occasion.
                </p>
              </div>
            )}

            <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {visible.map((item) => (
                <li
                  key={item.id}
                  className="group flex flex-col overflow-hidden rounded-3xl border border-line bg-surface transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_40px_-28px_rgba(60,30,10,0.5)]"
                >
                  <div className="relative aspect-[3/4] overflow-hidden bg-line">
                    <Image
                      src={item.imageUrl}
                      alt={item.name}
                      fill
                      unoptimized
                      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                      className="object-cover transition duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="flex flex-1 flex-col gap-2.5 p-4">
                    <div>
                      <p className="font-medium leading-snug">{item.name}</p>
                      <p className="text-xs capitalize text-muted">
                        {item.tagged
                          ? [item.category, item.fabric].filter(Boolean).join(" · ")
                          : "Not tagged yet"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[...item.colors, ...item.seasons, ...item.occasions].map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs capitalize"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="mt-auto flex gap-4 pt-1 text-xs font-medium">
                      <button onClick={() => setEditing(item)} className="underline underline-offset-2">
                        Edit tags
                      </button>
                      <button
                        onClick={() => remove(item)}
                        className="text-red-600 underline underline-offset-2 dark:text-red-400"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-xs text-muted sm:px-6">
          <p className="font-display text-lg text-foreground">
            Wardrobe <span className="italic text-accent">AI</span>
          </p>
          <p>Scores judge the clothes, never the person.</p>
        </div>
      </footer>

      {editing && (
        <EditItemDialog
          item={editing}
          onCancel={() => setEditing(null)}
          onSave={(tags) => saveTags(editing.id, tags)}
        />
      )}
    </>
  );
}
