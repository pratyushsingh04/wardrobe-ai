"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { OCCASIONS, type Occasion, type Outfit } from "@/lib/types";
import { card, Chip, field, ghostButton, label } from "./ui";

const CITY_KEY = "wardrobe-city";

export default function OutfitPanel() {
  const [occasion, setOccasion] = useState<Occasion>("casual");
  const [outfit, setOutfit] = useState<Outfit | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cityInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CITY_KEY);
      if (saved && cityInput.current) cityInput.current.value = saved;
    } catch {
      // Storage can be blocked; the default city still works.
    }
  }, []);

  async function suggest(event: React.FormEvent) {
    event.preventDefault();
    const city = cityInput.current?.value.trim() ?? "";
    try {
      localStorage.setItem(CITY_KEY, city);
    } catch {}

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/outfit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          occasion,
          city,
          previousIds: outfit?.items.map((item) => item.id) ?? [],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOutfit(data.outfit);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not suggest an outfit.");
    }
    setLoading(false);
  }

  return (
    <div className={`${card} p-4 sm:p-6`}>
      <form onSubmit={suggest} className="flex flex-col gap-5">
        <fieldset>
          <legend className={label}>Occasion</legend>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {OCCASIONS.map((option) => (
              <Chip key={option} active={occasion === option} onClick={() => setOccasion(option)}>
                {option}
              </Chip>
            ))}
          </div>
        </fieldset>
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex w-40 flex-col gap-2">
            <span className={label}>City</span>
            <input ref={cityInput} defaultValue="Delhi" className={field} />
          </label>
          <button type="submit" disabled={loading} className={ghostButton}>
            {loading ? "Picking…" : outfit ? "Try another" : "Suggest an outfit"}
          </button>
        </div>
      </form>

      {error && (
        <p role="alert" className="mt-4 rounded-xl border border-red-400/40 bg-red-400/10 px-3.5 py-2.5 text-sm">
          {error}
        </p>
      )}

      {outfit && (
        <div className="animate-rise mt-6 border-t border-line pt-6">
          {outfit.items.length > 0 && (
            <ul className="flex gap-4 overflow-x-auto pb-2">
              {outfit.items.map((item) => (
                <li key={item.id} className="w-32 shrink-0 sm:w-36">
                  <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-line">
                    <Image
                      src={item.imageUrl}
                      alt={item.name}
                      fill
                      unoptimized
                      sizes="144px"
                      className="object-cover"
                    />
                  </div>
                  <p className="mt-2 text-sm font-medium leading-snug">{item.name}</p>
                  <p className="text-xs capitalize text-muted">{item.category}</p>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 font-display text-xl leading-snug">{outfit.reason}</p>
          <p className="mt-2 text-xs text-muted">
            {outfit.weather
              ? `${outfit.weather.city}: ${outfit.weather.tempC}°C, ${outfit.weather.raining ? "rain" : "no rain"}`
              : "Weather not found for this city"}
            {" · "}
            {outfit.source === "ai" ? "Picked by AI" : "Picked by tag matching (add an AI key for AI styling)"}
          </p>
        </div>
      )}
    </div>
  );
}
