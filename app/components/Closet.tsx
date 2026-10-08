"use client";

import { motion, useScroll, useSpring, useTransform } from "motion/react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { resizePhoto } from "@/lib/resize";
import { CATEGORIES, EVENTS, type Category, type Item, type ItemTags } from "@/lib/types";
import EditItemDialog from "./EditItemDialog";
import { EASE, INTRO_SECONDS, Reveal, usePointerGlow, WordReveal } from "./motion";
import OutfitCheck from "./OutfitCheck";
import OutfitPanel from "./OutfitPanel";
import { Chip, ghostButton, label, primaryButton, SectionHeading } from "./ui";

const STEPS = [
  { title: "Snap it", text: "Upload a photo of the outfit, worn or laid out on the bed." },
  { title: "Pick the event", text: "Wedding, interview, date, college. Add your city for live weather." },
  { title: "Get the verdict", text: "A score out of 100 with exactly what works and what doesn't." },
  { title: "Turn the page", text: "What to buy instead with store links, then hair and grooming." },
];

const HEADLINE = [
  { text: "Is" },
  { text: "this" },
  { text: "outfit" },
  { text: "right", className: "italic text-gradient pr-[0.08em]" },
  { text: "for" },
  { text: "the" },
  { text: "event?" },
];

function Marquee() {
  const words = [...EVENTS, ...EVENTS];
  return (
    <div aria-hidden="true" className="relative overflow-hidden border-y border-line py-5">
      <div className="animate-marquee flex w-max items-center gap-10 whitespace-nowrap pr-10">
        {words.map((word, index) => (
          <span key={index} className="flex items-center gap-10">
            <span
              className={`font-display text-5xl sm:text-7xl ${
                index % 2 === 0
                  ? "text-foreground"
                  : "text-transparent [-webkit-text-stroke:1px_var(--muted)]"
              }`}
            >
              {word}
            </span>
            <span className="text-2xl text-accent">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export default function Closet({ closetEnabled }: { closetEnabled: boolean }) {
  const [items, setItems] = useState<Item[] | null>(null);
  const [filter, setFilter] = useState<Category | "all">("all");
  const [uploading, setUploading] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState<Item | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const heroRef = usePointerGlow<HTMLElement>();
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 26 });
  const { scrollY } = useScroll();
  const heroShift = useTransform(scrollY, [0, 600], [0, 120]);
  const heroFade = useTransform(scrollY, [0, 500], [1, 0]);

  useEffect(() => {
    if (!closetEnabled) return;
    fetch("/api/items")
      .then((res) => res.json())
      .then((data) => setItems(data.items))
      .catch(() => setNotice("Could not load your closet. Refresh to try again."));
  }, [closetEnabled]);

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
      {/* Intro curtain: pure CSS, so it lifts even before scripts load. */}
      <div
        aria-hidden="true"
        className="animate-curtain fixed inset-0 z-50 flex items-center justify-center bg-background"
      >
        <p className="overflow-hidden font-display text-6xl sm:text-8xl">
          <span className="animate-curtain-word inline-block">
            Wardrobe <span className="italic text-gradient">AI</span>
          </span>
        </p>
      </div>

      <header className="fixed inset-x-0 top-0 z-30 border-b border-line/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <a href="#top" className="font-display text-2xl leading-none">
            Wardrobe <span className="italic text-gradient">AI</span>
          </a>
          <nav className="flex items-center gap-1 text-sm font-medium sm:gap-2">
            <a href="#check" className="rounded-full px-3 py-1.5 transition hover:bg-accent-soft hover:text-accent">
              Check
            </a>
            <a href="#how" className="hidden rounded-full px-3 py-1.5 transition hover:bg-accent-soft hover:text-accent sm:block">
              How it works
            </a>
            {closetEnabled && (
              <a href="#closet" className="rounded-full px-3 py-1.5 transition hover:bg-accent-soft hover:text-accent">
                Closet
              </a>
            )}
          </nav>
        </div>
        <motion.div
          aria-hidden="true"
          className="h-px origin-left bg-gradient-to-r from-accent to-accent-2"
          style={{ scaleX: progress }}
        />
      </header>

      <main id="top" className="relative flex-1 overflow-x-clip">
        <section
          ref={heroRef}
          className="relative flex min-h-[92svh] flex-col items-center justify-center overflow-hidden px-4 pb-16 pt-28 text-center sm:px-6"
        >
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
            <div className="animate-drift absolute -left-40 top-10 h-[32rem] w-[32rem] rounded-full bg-accent/25 blur-[120px]" />
            <div className="animate-drift absolute -right-40 bottom-0 h-[30rem] w-[30rem] rounded-full bg-accent-2/15 blur-[130px] [animation-delay:-8s]" />
            <div className="spotlight absolute inset-0" />
            <div className="absolute inset-0 bg-[linear-gradient(var(--line)_1px,transparent_1px),linear-gradient(90deg,var(--line)_1px,transparent_1px)] bg-[size:72px_72px] opacity-25 [mask-image:radial-gradient(ellipse_at_center,black,transparent_72%)]" />
          </div>

          <motion.div style={{ y: heroShift, opacity: heroFade }} className="flex flex-col items-center">
            <motion.p
              className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/70 px-4 py-1.5 text-xs font-medium text-muted backdrop-blur"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: EASE, delay: INTRO_SECONDS }}
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
              </span>
              Your AI stylist, honest every time
            </motion.p>

            <h1 className="mt-7 max-w-5xl font-display text-[clamp(3.2rem,11vw,9.5rem)] leading-[0.92] tracking-tight">
              <WordReveal words={HEADLINE} delay={INTRO_SECONDS + 0.1} />
            </h1>

            <motion.p
              className="mx-auto mt-7 max-w-xl text-base text-muted sm:text-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: EASE, delay: INTRO_SECONDS + 0.7 }}
            >
              Upload what you plan to wear. Get a score out of 100, what to buy instead, and the
              hair and grooming to match.
            </motion.p>

            <motion.div
              className="mt-9 flex flex-wrap items-center justify-center gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: EASE, delay: INTRO_SECONDS + 0.85 }}
            >
              <a href="#check" className={primaryButton}>
                <span className="absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-white/40 opacity-0 blur-md transition-all duration-700 group-hover/button:left-full group-hover/button:opacity-100" />
                <span className="relative">Check my outfit</span>
              </a>
              <a href="#how" className={ghostButton}>
                See how it works
              </a>
            </motion.div>
          </motion.div>

          <motion.a
            href="#check"
            aria-label="Scroll to the outfit check"
            className={`${label} absolute bottom-6 hidden flex-col items-center gap-2 [@media(min-height:860px)]:flex`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: INTRO_SECONDS + 1.4 }}
          >
            Scroll
            <span className="block h-9 w-px overflow-hidden bg-line">
              <span className="animate-scan block h-1/3 w-full bg-accent" />
            </span>
          </motion.a>
        </section>

        <Marquee />

        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <section id="check" className="pt-24">
            <Reveal>
              <SectionHeading eyebrow="The check" title="Show us the fit.">
                One photo, one event. The lookbook that comes back has three pages: the verdict,
                what to wear instead, and hair and grooming.
              </SectionHeading>
            </Reveal>
            <Reveal delay={0.15} className="mt-8">
              <OutfitCheck />
            </Reveal>
          </section>

          <section id="how" className="pt-28">
            <Reveal>
              <SectionHeading eyebrow="How it works" title="Four steps to dressed right." />
            </Reveal>
            <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((step, index) => (
                <li key={step.title}>
                  <Reveal delay={index * 0.1} className="glow-card h-full rounded-3xl p-6 hover:-translate-y-1.5">
                    <span className="font-display text-7xl leading-none text-gradient">
                      {index + 1}
                    </span>
                    <h3 className="mt-6 text-lg font-semibold">{step.title}</h3>
                    <p className="mt-2 text-sm text-muted">{step.text}</p>
                  </Reveal>
                </li>
              ))}
            </ol>
          </section>

          {closetEnabled && (
            <>
              <section id="suggest" className="pt-28">
                <Reveal>
                  <SectionHeading eyebrow="From your closet" title="Not sure what to wear?">
                    Pick an occasion and get an outfit built from the clothes you own, matched to
                    today&apos;s weather.
                  </SectionHeading>
                </Reveal>
                <Reveal delay={0.15} className="mt-8">
                  {hasTaggedItems ? (
                    <OutfitPanel />
                  ) : (
                    <p className="rounded-[28px] border border-dashed border-line px-6 py-12 text-center text-sm text-muted">
                      Add a few clothes to your closet below and this will start suggesting outfits.
                    </p>
                  )}
                </Reveal>
              </section>

              <section id="closet" className="pt-28">
                <Reveal className="flex flex-wrap items-end justify-between gap-4">
                  <SectionHeading eyebrow="My closet" title="Everything you own, tagged.">
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
                </Reveal>

                {notice && (
                  <div
                    role="alert"
                    className="mt-6 flex items-start justify-between gap-4 rounded-2xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm"
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
                    <p className="font-display text-4xl">Your closet is empty</p>
                    <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
                      Add a photo of a shirt, jeans or shoes. The AI names it and tags its colour,
                      fabric, season and occasion.
                    </p>
                  </div>
                )}

                <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {visible.map((item, index) => (
                    <li key={item.id}>
                      <Reveal
                        delay={Math.min(index, 7) * 0.06}
                        className="glow-card group flex h-full flex-col overflow-hidden rounded-3xl hover:-translate-y-1.5"
                      >
                        <div className="relative aspect-[3/4] overflow-hidden bg-line">
                          <Image
                            src={item.imageUrl}
                            alt={item.name}
                            fill
                            unoptimized
                            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                            className="object-cover transition duration-700 group-hover:scale-110"
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
                                className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs capitalize text-accent-2"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                          <div className="mt-auto flex gap-4 pt-1 text-xs font-medium">
                            <button onClick={() => setEditing(item)} className="underline underline-offset-2">
                              Edit tags
                            </button>
                            <button onClick={() => remove(item)} className="text-red-400 underline underline-offset-2">
                              Remove
                            </button>
                          </div>
                        </div>
                      </Reveal>
                    </li>
                  ))}
                </ul>
              </section>
            </>
          )}
        </div>

        <footer className="mt-28 overflow-hidden border-t border-line">
          <div className="mx-auto w-full max-w-6xl px-4 pt-14 sm:px-6">
            <Reveal className="flex flex-wrap items-end justify-between gap-6">
              <p className="max-w-md font-display text-3xl leading-tight sm:text-4xl">
                Dress for the room you&apos;re walking into.
              </p>
              <a href="#check" className={ghostButton}>
                Check an outfit ↑
              </a>
            </Reveal>
            <p className="mt-10 text-xs text-muted">Scores judge the clothes, never the person.</p>
          </div>
          <p
            aria-hidden="true"
            className="-mb-[0.22em] mt-4 select-none whitespace-nowrap text-center font-display text-[clamp(4rem,21vw,20rem)] leading-none text-gradient opacity-90"
          >
            Wardrobe AI
          </p>
        </footer>
      </main>

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
