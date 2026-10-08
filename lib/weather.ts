import type { Season, Weather } from "./types";

type Place = { name: string; latitude: number; longitude: number };

const WEATHER_TTL_MS = 10 * 60_000;
const LOOKUP_TIMEOUT_MS = 4_000;

// Cities don't move, so places are cached for the life of the server; weather for ten minutes.
const places = new Map<string, Place | null>();
const recent = new Map<string, { weather: Weather; at: number }>();

// Open-Meteo is free and needs no API key.
export async function getWeather(city: string): Promise<Weather | null> {
  const key = city.trim().toLowerCase();
  const cached = recent.get(key);
  if (cached && Date.now() - cached.at < WEATHER_TTL_MS) return cached.weather;

  try {
    let place = places.get(key);
    if (place === undefined) {
      const geo = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?count=1&name=${encodeURIComponent(city)}`,
        { signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS) },
      ).then((res) => res.json());
      place = (geo.results?.[0] as Place | undefined) ?? null;
      places.set(key, place);
    }
    if (!place) return null;

    const forecast = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,precipitation,weather_code`,
      { signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS) },
    ).then((res) => res.json());
    const current = forecast.current;
    const weather = {
      city: place.name,
      tempC: Math.round(current.temperature_2m),
      // WMO weather codes 51 and above are drizzle, rain, snow and storms.
      raining: current.precipitation > 0 || current.weather_code >= 51,
    };
    recent.set(key, { weather, at: Date.now() });
    return weather;
  } catch {
    return null;
  }
}

export function seasonFor(weather: Weather): Season {
  if (weather.raining) return "monsoon";
  return weather.tempC < 18 ? "winter" : "summer";
}
