import fs from "fs";
import locations from "../docs/locations.json" assert { type: "json" };

function degToCompass(deg) {
  const dirs = ["N","NE","E","SE","S","SW","W","NW"];
  return dirs[Math.round(deg / 45) % 8];
}

// Simple base score: wind-driven (we’ll refine later)
function scoreFromWind(windKmh) {
  if (windKmh < 8) return 5;
  if (windKmh < 12) return 4;
  if (windKmh < 18) return 3;
  if (windKmh < 24) return 2;
  return 1;
}

async function fetchOpenMeteo(lat, lon) {
  // Wind (hourly) + Swell max (daily). If swell missing, we return null.
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lon}` +
    `&hourly=wind_speed_10m,wind_direction_10m` +
    `&daily=wave_height_max` +
    `&timezone=Australia/Sydney`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo failed ${res.status}`);
  return res.json();
}

async function run() {
  const out = {};
  const updatedAt = new Date().toISOString();

  for (const loc of locations) {
    const data = await fetchOpenMeteo(loc.lat, loc.lon);

    const windSpeed = data.hourly?.wind_speed_10m?.[0];
    const windDeg = data.hourly?.wind_direction_10m?.[0];

    if (windSpeed == null || windDeg == null) {
      throw new Error(`Missing wind for ${loc.id}`);
    }

    const swellMax = data.daily?.wave_height_max?.[0] ?? null;

    const score = scoreFromWind(windSpeed);

    out[loc.id] = {
      name: loc.name,
      region: loc.region,
      score,
      recommendation: score >= 4 ? "GO" : score === 3 ? "MAYBE" : "DON'T GO",
      bestTimes: ["Dawn", "Dusk"],
      species: score >= 4 ? ["Tailor", "Bream", "Flathead"] : ["Bream", "Flathead", "Whiting"],

      wind: {
        speed: Math.round(windSpeed),
        direction: degToCompass(windDeg),
        degrees: Math.round(windDeg)
      },
      swell: {
        height: swellMax == null ? null : Number(swellMax)
      },
      tide: {
        state: "Tides next step",
        next: "We’ll wire tides after wind/swell is confirmed"
      },
      updatedAt
    };
  }

  fs.writeFileSync("docs/forecast.json", JSON.stringify(out, null, 2));
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
