import fs from "fs";
import locations from "../docs/locations.json" assert { type: "json" };

function degToCompass(deg) {
  const dirs = ["N","NE","E","SE","S","SW","W","NW"];
  return dirs[Math.round(deg / 45) % 8];
}

function scoreFromWind(windKmh) {
  if (windKmh < 8) return 5;
  if (windKmh < 12) return 4;
  if (windKmh < 18) return 3;
  if (windKmh < 24) return 2;
  return 1;
}

function recommendation(score) {
  return score >= 4 ? "GO" : score === 3 ? "MAYBE" : "DON'T GO";
}

async function fetchOpenMeteo(lat, lon) {
  // Daily: max wind + dominant wind dir + swell max + weather code
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lon}` +
    `&hourly=wind_speed_10m,wind_direction_10m` +
    `&daily=wind_speed_10m_max,wind_direction_10m_dominant,wave_height_max,weathercode` +
    `&timezone=Australia/Sydney`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo failed ${res.status}`);
  return res.json();
}

function topTargets(score) {
  // simple “all fish grouped” behaviour: show 3 most likely targets
  if (score >= 4) return ["Tailor", "Bream", "Flathead"];
  if (score === 3) return ["Bream", "Whiting", "Squid"];
  return ["Bream", "Flathead", "Luderick"];
}

async function run() {
  const updatedAt = new Date().toISOString();
  const out = {};

  for (const loc of locations) {
    const data = await fetchOpenMeteo(loc.lat, loc.lon);

    // Current = first hourly datapoint (now-ish)
    const windNow = data.hourly?.wind_speed_10m?.[0];
    const windDegNow = data.hourly?.wind_direction_10m?.[0];

    if (windNow == null || windDegNow == null) {
      throw new Error(`Missing hourly wind for ${loc.id}`);
    }

    // 7-day block from daily arrays
    const days = data.daily?.time?.slice(0, 7) ?? [];
    const windMa
