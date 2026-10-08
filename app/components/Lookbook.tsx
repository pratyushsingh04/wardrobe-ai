"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { SCORE_PARTS, type OutfitCheck, type ShopPiece } from "@/lib/types";
import { CountUp, EASE } from "./motion";
import { ghostButton, label } from "./ui";

const PAGES = ["The verdict", "Shop the look", "Hair", "Makeup & grooming"];
const RING_RADIUS = 54;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

function toneFor(score: number) {
  if (score >= 80) return { text: "text-emerald-400", bar: "bg-emerald-400" };
  if (score >= 60) return { text: "text-lime-400", bar: "bg-lime-400" };
  if (score >= 40) return { text: "text-amber-400", bar: "bg-amber-400" };
  return { text: "text-red-400", bar: "bg-red-400" };
}

// Each page turns in like a book page: it swings on its spine edge.
const flip = {
  enter: (direction: number) => ({
    rotateY: direction > 0 ? 82 : -82,
    opacity: 0,
    transformOrigin: direction > 0 ? "left center" : "right center",
  }),
  center: { rotateY: 0, opacity: 1 },
  exit: (direction: number) => ({
    rotateY: direction > 0 ? -82 : 82,
    opacity: 0,
    transformOrigin: direction > 0 ? "left center" : "right center",
  }),
};

function ScoreRing({ score }: { score: number }) {
  return (
    <div className={`relative h-40 w-40 shrink-0 ${toneFor(score).text}`}>
      <div className="absolute inset-4 rounded-full bg-current opacity-15 blur-2xl" />
      <svg viewBox="0 0 120 120" className="relative h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="60" cy="60" r={RING_RADIUS} fill="none" strokeWidth="7" className="stroke-line" />
        <circle
          cx="60"
          cy="60"
          r={RING_RADIUS}
          fill="none"
          strokeWidth="7"
          strokeLinecap="round"
          stroke="currentColor"
          strokeDasharray={RING_LENGTH}
          strokeDashoffset={RING_LENGTH * (1 - score / 100)}
          style={{ "--ring-full": RING_LENGTH } as React.CSSProperties}
          className="animate-ring"
        />
      </svg>
      <p
        className="absolute inset-0 flex items-center justify-center font-display text-6xl tabular-nums"
        aria-label={`${score} percent`}
      >
        <CountUp value={score} />
        <span className="mt-3 text-2xl">%</span>
      </p>
    </div>
  );
}

type AdviceProps = { title: string; lines: string[]; mark: string; markClass: string };

function Advice({ title, lines, mark, markClass }: AdviceProps) {
  if (lines.length === 0) return null;
  return (
    <div className="rounded-2xl border border-line bg-background/50 p-4">
      <h4 className={label}>{title}</h4>
      <ul className="mt-3 space-y-2.5 text-sm">
        {lines.map((line, index) => (
          <motion.li
            key={line}
            className="flex gap-2.5"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.35 + index * 0.08 }}
          >
            <span
              aria-hidden="true"
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${markClass}`}
            >
              {mark}
            </span>
            {line}
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

function VerdictPage({ check, event }: { check: OutfitCheck; event: string }) {
  return (
    <>
      <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
        <ScoreRing score={check.score} />
        <div className="min-w-0 flex-1">
          <p className={label}>For {event}</p>
          <p className="mt-1 font-display text-4xl leading-tight sm:text-5xl">{check.verdict}</p>
          <p className="mt-2 text-sm text-muted sm:text-base">{check.summary}</p>
        </div>
      </div>

      <dl className="mt-7 grid gap-x-8 gap-y-4 sm:grid-cols-2">
        {SCORE_PARTS.map((part, index) => {
          const value = check.breakdown[part.key];
          return (
            <div key={part.key}>
              <div className="flex justify-between text-sm">
                <dt>{part.label}</dt>
                <dd className="font-semibold tabular-nums">{value}%</dd>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line">
                <div
                  className={`animate-grow h-full rounded-full ${toneFor(value).bar}`}
                  style={{ width: `${value}%`, animationDelay: `${0.2 + index * 0.1}s` }}
                />
              </div>
            </div>
          );
        })}
      </dl>

      <div className="mt-7 grid gap-4 lg:grid-cols-3">
        <Advice title="What works" lines={check.works} mark="✓" markClass="bg-emerald-400/15 text-emerald-300" />
        <Advice title="What doesn't" lines={check.issues} mark="✕" markClass="bg-red-400/15 text-red-300" />
        <Advice title="Quick fixes" lines={check.suggestions} mark="→" markClass="bg-accent-soft text-accent" />
      </div>
    </>
  );
}

function ProductGrid({ products }: { products: ShopPiece[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {products.map((piece, index) => (
        <motion.li
          key={piece.name}
          className="glow-card flex flex-col gap-3 rounded-2xl p-4"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: EASE, delay: 0.3 + index * 0.08 }}
        >
          <div className="flex items-start gap-3">
            <span className="font-display text-3xl leading-none text-accent">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div>
              <h4 className="font-semibold leading-snug">{piece.name}</h4>
              <p className="mt-1 text-sm text-muted">{piece.reason}</p>
            </div>
          </div>
          <div className="mt-auto flex flex-wrap gap-2">
            {piece.links.map((link) => (
              <a
                key={link.store}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-line px-3 py-1 text-xs font-medium transition duration-300 hover:border-accent hover:bg-accent hover:text-accent-ink"
              >
                {link.store} ↗
              </a>
            ))}
          </div>
        </motion.li>
      ))}
    </ul>
  );
}

const SEARCH_NOTE = "Each button opens that store's search results. Prices and stock are on the store.";

function ShopPage({ check }: { check: OutfitCheck }) {
  return (
    <>
      <p className={label}>Wear this instead</p>
      <p className="mt-2 font-display text-3xl leading-tight sm:text-4xl">{check.idealOutfit}</p>
      <div className="mt-6">
        <ProductGrid products={check.shop} />
      </div>
      <p className="mt-4 text-xs text-muted">{SEARCH_NOTE}</p>
    </>
  );
}

function HairPage({ check }: { check: OutfitCheck }) {
  const [topPick, ...others] = check.hairstyles;
  if (!topPick) return <p className="text-sm text-muted">No hairstyle ideas came back for this one.</p>;
  return (
    <>
      <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
        <div className="rounded-2xl bg-accent-soft p-6">
          <p className={label}>Top pick</p>
          <p className="mt-2 font-display text-4xl leading-tight text-gradient sm:text-5xl">
            {topPick.name}
          </p>
          <p className="mt-4 text-sm sm:text-base">{topPick.why}</p>
          <p className={`${label} mt-5`}>How to get it</p>
          <p className="mt-1.5 text-sm sm:text-base">{topPick.how}</p>
        </div>
        {others.length > 0 && (
          <div>
            <p className={label}>Also works</p>
            <ul className="mt-3 space-y-4">
              {others.map((style, index) => (
                <motion.li
                  key={style.name}
                  className="border-b border-line pb-4"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, ease: EASE, delay: 0.3 + index * 0.1 }}
                >
                  <p className="font-display text-2xl leading-tight">{style.name}</p>
                  <p className="mt-1 text-sm text-muted">{style.why}</p>
                  <p className="mt-1.5 text-sm">{style.how}</p>
                </motion.li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {check.hairProducts.length > 0 && (
        <>
          <p className={`${label} mt-7`}>What you need for it</p>
          <div className="mt-3">
            <ProductGrid products={check.hairProducts} />
          </div>
          <p className="mt-4 text-xs text-muted">{SEARCH_NOTE}</p>
        </>
      )}
    </>
  );
}

function MakeupPage({ check }: { check: OutfitCheck }) {
  const { makeup } = check;
  return (
    <>
      <p className={label}>The {makeup.kind.toLowerCase()} look</p>
      <p className="mt-2 font-display text-4xl leading-tight text-gradient sm:text-5xl">
        {makeup.title}
      </p>

      <ol className="mt-6 grid gap-x-8 sm:grid-cols-2">
        {makeup.steps.map((step, index) => (
          <motion.li
            key={step.area + step.tip}
            className="flex gap-4 border-b border-line py-3.5"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.3 + index * 0.08 }}
          >
            <span className="font-display text-3xl leading-none text-accent">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div>
              <p className={label}>{step.area}</p>
              <p className="mt-1 text-sm sm:text-base">{step.tip}</p>
            </div>
          </motion.li>
        ))}
      </ol>

      {makeup.products.length > 0 && (
        <>
          <p className={`${label} mt-7`}>Products for this look</p>
          <div className="mt-3">
            <ProductGrid products={makeup.products} />
          </div>
          <p className="mt-4 text-xs text-muted">
            {SEARCH_NOTE} Styling ideas for the event, yours to take or leave.
          </p>
        </>
      )}
    </>
  );
}

export default function Lookbook({ check, event }: { check: OutfitCheck; event: string }) {
  const [[page, direction], setPage] = useState<[number, number]>([0, 1]);

  function go(next: number) {
    if (next < 0 || next >= PAGES.length || next === page) return;
    setPage([next, next > page ? 1 : -1]);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Your lookbook" className="flex flex-wrap gap-1">
          {PAGES.map((title, index) => (
            <button
              key={title}
              role="tab"
              aria-selected={page === index}
              onClick={() => go(index)}
              className={`relative rounded-full px-4 py-2 text-sm font-medium transition ${
                page === index ? "text-accent-ink" : "text-muted hover:text-foreground"
              }`}
            >
              {page === index && (
                <motion.span
                  layoutId="lookbook-tab"
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-accent to-accent-2"
                  transition={{ duration: 0.5, ease: EASE }}
                />
              )}
              <span className="relative">
                <span className="mr-1.5 opacity-70">{String(index + 1).padStart(2, "0")}</span>
                {title}
              </span>
            </button>
          ))}
        </div>
        <p className="text-xs tabular-nums text-muted">
          Page {page + 1} of {PAGES.length}
        </p>
      </div>

      <div className="mt-5 [perspective:2400px]">
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={page}
            role="tabpanel"
            custom={direction}
            variants={flip}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.55, ease: [0.65, 0, 0.35, 1] }}
            className="rounded-3xl border border-line bg-surface p-5 shadow-[0_40px_80px_-50px_black] [backface-visibility:hidden] sm:p-8"
          >
            {page === 0 && <VerdictPage check={check} event={event} />}
            {page === 1 && <ShopPage check={check} />}
            {page === 2 && <HairPage check={check} />}
            {page === 3 && <MakeupPage check={check} />}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <button onClick={() => go(page - 1)} disabled={page === 0} className={`${ghostButton} disabled:invisible`}>
          ← {PAGES[page - 1]}
        </button>
        <button
          onClick={() => go(page + 1)}
          disabled={page === PAGES.length - 1}
          className={`${ghostButton} border-accent text-accent disabled:invisible`}
        >
          Turn the page: {PAGES[page + 1]} →
        </button>
      </div>
    </div>
  );
}
