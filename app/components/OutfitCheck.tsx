"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { resizePhoto } from "@/lib/resize";
import { EVENTS, STYLE_FOR, type OutfitCheck as Check, type StyleFor } from "@/lib/types";
import Lookbook from "./Lookbook";
import { EASE } from "./motion";
import { card, Chip, field, label, primaryButton } from "./ui";

const CITY_KEY = "wardrobe-city";

// Shown one after another while the AI works, since a check can take half a minute.
const LOADING_LINES = [
  "Reading the fabrics…",
  "Checking the weather…",
  "Matching the dress code…",
  "Picking better pieces…",
  "Styling hair and grooming…",
];

export default function OutfitCheck() {
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [event, setEvent] = useState<string>(EVENTS[0]);
  const [checkedEvent, setCheckedEvent] = useState<string>(EVENTS[0]);
  const [styleFor, setStyleFor] = useState<StyleFor>("Auto");
  const [details, setDetails] = useState("");
  const [check, setCheck] = useState<Check | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingLine, setLoadingLine] = useState(0);
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
    if (!loading) return;
    const timer = setInterval(
      () => setLoadingLine((line) => (line + 1) % LOADING_LINES.length),
      2600,
    );
    return () => clearInterval(timer);
  }, [loading]);

  useEffect(() => {
    if (check) resultRef.current?.scrollIntoView({ block: "start" });
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

    setLoadingLine(0);
    setLoading(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("photo", await resizePhoto(photo), "outfit.jpg");
      body.append("event", event);
      body.append("details", details);
      body.append("city", city);
      body.append("styleFor", styleFor);
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
    <div className={`${card} p-4 sm:p-7`}>
      <form onSubmit={submit} className="flex flex-col gap-7 md:flex-row">
        <label className="group relative flex aspect-[3/4] w-full max-w-xs shrink-0 cursor-pointer flex-col items-center justify-center gap-3 self-center overflow-hidden rounded-3xl border border-dashed border-line bg-background/60 text-center transition duration-500 hover:border-accent md:w-72 md:self-auto">
          {preview ? (
            <>
              {/* A local blob preview; next/image adds nothing here. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="Outfit to check"
                className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
              />
              <span className="absolute bottom-3 rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                Change photo
              </span>
            </>
          ) : (
            <>
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft text-accent transition duration-500 group-hover:scale-110 group-hover:bg-accent group-hover:text-accent-ink">
                <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
                  <circle cx="12" cy="13" r="3.5" />
                </svg>
              </span>
              <span className="px-6 font-display text-2xl">Drop your outfit here</span>
              <span className="px-6 text-xs text-muted">Worn or laid out, full outfit in frame</span>
            </>
          )}
          {loading && (
            <span className="absolute inset-0 flex items-end overflow-hidden bg-black/55 p-4">
              <span className="animate-scan absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-transparent via-accent/60 to-transparent" />
              <AnimatePresence mode="wait">
                <motion.span
                  key={loadingLine}
                  className="relative text-sm font-medium text-white"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.35, ease: EASE }}
                >
                  {LOADING_LINES[loadingLine]}
                </motion.span>
              </AnimatePresence>
            </span>
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => choosePhoto(e.target.files?.[0])}
          />
        </label>

        <div className="flex flex-1 flex-col gap-6">
          <fieldset>
            <legend className={label}>Where are you going?</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {EVENTS.map((option) => (
                <Chip key={option} active={event === option} onClick={() => setEvent(option)}>
                  {option}
                </Chip>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className={label}>Shop and style for</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {STYLE_FOR.map((option) => (
                <Chip key={option} active={styleFor === option} onClick={() => setStyleFor(option)}>
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
              <span className="absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-white/40 opacity-0 blur-md transition-all duration-700 group-hover/button:left-full group-hover/button:opacity-100" />
              <span className="relative">
                {loading ? "Styling you…" : check ? "Check again" : "Check my outfit"}
              </span>
            </button>
            <p className="text-xs text-muted">
              {loading
                ? "This can take up to half a minute."
                : "Score, what to buy instead, hair and grooming."}
            </p>
          </div>
          {error && (
            <p role="alert" className="rounded-xl border border-red-400/40 bg-red-400/10 px-3.5 py-2.5 text-sm">
              {error}
            </p>
          )}
        </div>
      </form>

      {check && (
        <motion.div
          ref={resultRef}
          className="mt-8 scroll-mt-24 border-t border-line pt-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
        >
          <Lookbook key={`${checkedEvent}-${check.score}-${check.summary}`} check={check} event={checkedEvent} />
          <p className="mt-4 text-xs text-muted">
            {check.weather
              ? `Weather used: ${check.weather.city}, ${check.weather.tempC}°C, ${check.weather.raining ? "rain" : "no rain"}`
              : "Weather not found for this city, so it was scored for mild conditions"}
          </p>
        </motion.div>
      )}
    </div>
  );
}
