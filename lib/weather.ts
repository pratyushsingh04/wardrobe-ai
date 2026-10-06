import type { Season, Weather } from "./types";

// Open-Meteo is free and needs no API key.
export async function getWeather(city: string): Promise<Weather | null> {
  try {
    const geo = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?count=1&name=${encodeURIComponent(city)}`,
    ).then((res) => res.json());
    const place = geo.results?.[0];
    if (!place) return null;

    const forecast = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,precipitation,weather_code`,
    ).then((res) => res.json());
    const current = forecast.current;
    return {
      city: place.name,
      tempC: Math.round(current.temperature_2m),
      // WMO weather codes 51 and above are drizzle, rain, snow and storms.
      raining: current.precipitation > 0 || current.weather_code >= 51,
    };
  } catch {
    return null;
  }
}

export function seasonFor(weather: Weather): Season {
  if (weather.raining) return "monsoon";
  return weather.tempC < 18 ? "winter" : "summer";
}
