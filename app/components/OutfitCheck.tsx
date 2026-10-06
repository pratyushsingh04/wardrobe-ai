"use client";

import { useEffect, useRef, useState } from "react";
import { resizePhoto } from "@/lib/resize";
import { EVENTS, SCORE_PARTS, type OutfitCheck as Check } from "@/lib/types";
import { card, Chip, field, label, primaryButton } from "./ui";

const CITY_KEY = "wardrobe-city";
const RING_RADIUS = 54;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

function toneFor(score: number) {
  if (score >= 80) return { text: "text-emerald-600 dark:text-emerald-400", bar: "bg-emerald-500" };
  if (score >= 60) return { text: "text-lime-600 dark:text-lime-400", bar: "bg-lime-500" };
  if (score >= 40) return { text: "text-amber-600 dark:text-amber-400", bar: "bg-amber-500" };
  return { text: "text-red-600 dark:text-red-400", bar: "bg-red-500" };
}

function ScoreRing({ score }: { score: number }) {
  return (
    <div className={`relative h-36 w-36 shrink-0 ${toneFor(score).text}`}>
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="60" cy="60" r={RING_RADIUS} fill="none" strokeWidth="9" className="stroke-line" />
        <circle
          cx="60"
          cy="60"
          r={RING_RADIUS}
          fill="none"
          strokeWidth="9"
          strokeLinecap="round"
          stroke="currentColor"
          strokeDasharray={RING_LENGTH}
          strokeDashoffset={RING_LENGTH * (1 - score / 100)}
          style={{ "--ring-full": RING_LENGTH } as React.CSSProperties}
          className="animate-ring"
        />
      </svg>
      <p className="absolute inset-0 flex items-center justify-center font-display text-5xl tabular-nums">
        {score}
        <span className="mt-2 text-xl">%</span>
      </p>
    </div>
  );
}

type AdviceProps = {
  title: string;
  lines: string[];
  mark: string;
  markClass: string;
};

function Advice({ title, lines, mark, markClass }: AdviceProps) {
  if (lines.length === 0) return null;
  return (
    <div className="rounded-2xl border border-line bg-background p-4">
      <h3 className={label}>{title}</h3>
      <ul className="mt-3 space-y-2.5 text-sm">
        {lines.map((line) => (
          <li key={line} className="flex gap-2.5">
            <span
              aria-hidden="true"
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${markClass}`}
            >
              {mark}
            </span>
            {line}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function OutfitCheck() {
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [event, setEvent] = useState<string>(EVENTS[0]);
  const [checkedEvent, setCheckedEvent] = useState<string>(EVENTS[0]);
  const [details, setDetails] = useState("");
  const [check, setCheck] = useState<Check | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cityInput = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CITY_KEY);
      if (saved && cityInput.current) cityInput.current.value = saved;
    } catch {
      // Storage can be blocked; the default city still works.
    }
  }, []);

  useEffect(() => {
    if (check) resultRef.current?.scrollIntoView({ block: "nearest" });
  }, [check]);

  function choosePhoto(file: File | undefined) {
    if (!file) return;
    if (preview) URL.revokeObjectURL(preview);
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
    setCheck(null);
    setError(null);
  }

  async function submit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    if (!photo) {
      setError("Add a photo of the outfit first.");
      return;
    }
    const city = cityInput.current?.value.trim() ?? "";
    try {
      localStorage.setItem(CITY_KEY, city);
    } catch {}

    setLoading(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("photo", await resizePhoto(photo), "outfit.jpg");
      body.append("event", event);
      body.append("details", details);
      body.append("city", city);
      const res = await fetch("/api/check", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCheckedEvent(event);
      setCheck(data.check);
    } catch (err) {
      setCheck(null);
      setError(err instanceof Error ? err.message : "Could not check this outfit.");
    }
    setLoading(false);
  }

  return (
    <div className={`${card} p-4 sm:p-6`}>
      <form onSubmit={submit} className="flex flex-col gap-6 md:flex-row">
        <label className="group relative flex aspect-[3/4] w-full max-w-xs shrink-0 cursor-pointer self-center flex-col items-center justify-center gap-3 overflow-hidden rounded-3xl border-2 border-dashed border-line bg-background text-center transition hover:border-accent md:w-64">
          {preview ? (
            <>
              {/* A local blob preview; next/image adds nothing here. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Outfit to check" className="h-full w-full object-cover" />
              <span className="absolute bottom-3 rounded-full bg-black/65 px-3 py-1 text-xs font-medium text-white opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                Change photo
              </span>
            </>
          ) : (
            <>
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
                  <circle cx="12" cy="13" r="3.5" />
                </svg>
              </span>
              <span className="px-6 text-sm font-medium">Add a photo of your outfit</span>
              <span className="px-6 text-xs text-muted">Worn or laid out, full outfit in frame</span>
            </>
          )}
          {loading && (
            <span className="absolute inset-0 overflow-hidden bg-black/35">
              <span className="animate-scan absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-transparent via-white/45 to-transparent" />
            </span>
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => choosePhoto(e.target.files?.[0])}
          />
        </label>

        <div className="flex flex-1 flex-col gap-5">
          <fieldset>
            <legend className={label}>Where are you going?</legend>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {EVENTS.map((option) => (
                <Chip key={option} active={event === option} onClick={() => setEvent(option)}>
                  {option}
                </Chip>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
            <label className="flex flex-col gap-2">
              <span className={label}>City</span>
              <input ref={cityInput} defaultValue="Delhi" className={field} />
            </label>
            <label className="flex flex-col gap-2">
              <span className={label}>Anything else? (optional)</span>
              <input
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                maxLength={300}
                placeholder="Evening reception, outdoors, friend's wedding"
                className={field}
              />
            </label>
          </div>

          <div className="mt-auto flex flex-wrap items-center gap-4">
            <button type="submit" disabled={loading} className={primaryButton}>
              {loading ? "Reading your outfit…" : check ? "Check again" : "Check my outfit"}
            </button>
            <p className="text-xs text-muted">Scored on formality, colours, weather and setting.</p>
          </div>
          {error && (
            <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm">
              {error}
            </p>
          )}
        </div>
      </form>

      {check && (
        <div ref={resultRef} className="animate-rise mt-6 border-t border-line pt-6">
          <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
            <ScoreRing score={check.score} />
            <div className="min-w-0 flex-1">
              <p className={label}>For {checkedEvent}</p>
              <p className="mt-1 font-display text-3xl leading-tight sm:text-4xl">{check.verdict}</p>
              <p className="mt-2 text-sm text-muted">{check.summary}</p>
            </div>
          </div>

          <dl className="mt-6 grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {SCORE_PARTS.map((part) => {
              const value = check.breakdown[part.key];
              return (
                <div key={part.key}>
                  <div className="flex justify-between text-sm">
                    <dt>{part.label}</dt>
                    <dd className="font-semibold tabular-nums">{value}%</dd>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-line">
                    <div
                      className={`animate-grow h-full rounded-full ${toneFor(value).bar}`}
                      style={{ width: `${value}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </dl>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <Advice
              title="What works"
              lines={check.works}
              mark="✓"
              markClass="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
            />
            <Advice
              title="What doesn't"
              lines={check.issues}
              mark="✕"
              markClass="bg-red-500/15 text-red-700 dark:text-red-300"
            />
            <Advice
              title="How to improve it"
              lines={check.suggestions}
              mark="→"
              markClass="bg-accent-soft text-accent"
            />
          </div>

          <div className="mt-4 rounded-2xl bg-accent-soft p-5">
            <h3 className={label}>Ideal for this event</h3>
            <p className="mt-2 font-display text-xl leading-snug sm:text-2xl">{check.idealOutfit}</p>
          </div>
          <p className="mt-3 text-xs text-muted">
            {check.weather
              ? `Weather used: ${check.weather.city}, ${check.weather.tempC}°C, ${check.weather.raining ? "rain" : "no rain"}`
              : "Weather not found for this city, so it was scored for mild conditions"}
          </p>
        </div>
      )}
    </div>
  );
}
