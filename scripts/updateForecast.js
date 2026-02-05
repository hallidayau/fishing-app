import fs from "fs";
import locations from "../docs/locations.json" assert { type: "json" };

function degToCompass(deg) {
  const dirs = ["N","NE","E","SE","S","SW","W","NW"];
  return dirs[Math.round(deg / 45) % 8];
}

// Overall 1–5 score (simple + explainable)
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

// Approx tide guidance (NO API). Clearly labelled in UI.
function tideHeuristic(dateIso) {
  const day = Number(dateIso.slice(8, 10));
  return day % 2 === 0 ? "Run-in (approx)" : "Run-out (approx)";
}

// Species ranking based on wind/swell/overall score (no extra APIs)
function speciesTop3({ score, windMax, swellMax }) {
  const clamp = (n) => Math.max(0, Math.min(100, n));
  const w = windMax ?? 15;
  const s = swellMax ?? 1;

  const list = [
    ["Bream",     clamp(70 + score * 6 - w * 1.2)],
    ["Flathead",  clamp(65 + score * 6 - w * 0.8)],
    ["Whiting",   clamp(60 + score * 5 - w * 1.0)],
    ["Tailor",    clamp(45 + score * 7 + s * 10)],
    ["Jewfish",   clamp(40 + score * 6 + s * 8 - w * 0.6)],
    ["Squid",     clamp(50 + score * 6 - w * 1.4)]
  ];

  list.sort((a, b) => b[1] - a[1]);
  return list.slice(0, 3).map((x) => x[0]);
}

async function fetchOpenMeteo(lat, lon) {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lon}` +
    `&hourly=wind_speed_10m,wind_direction_10m` +
    `&daily=wind_speed_10m_max,wind_direction_10m_dominant,wave_height_max` +
    `&timezone=Australia/Sydney`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo failed ${res.status}`);
  return res.json();
}

async function run() {
  const updatedAt = new Date().toISOString();
  const out = {};

  for (const loc of locations) {
    const data = await fetchOpenMeteo(loc.lat, loc.lon);

    const windNow = data.hourly?.wind_speed_10m?.[0];
    const windDegNow = data.hourly?.wind_direction_10m?.[0];

    if (windNow == null || windDegNow == null) {
      throw new Error(`Missing hourly wind for ${loc.id}`);
    }

    const days = (data.daily?.time ?? []).slice(0, 7);
    const windMax = (data.daily?.wind_speed_10m_max ?? []).slice(0, 7);
    const windDom = (data.daily?.wind_direction_10m_dominant ?? []).slice(0, 7);
    const swellMax = (data.daily?.wave_height_max ?? []).slice(0, 7);

    const daily = days.map((date, i) => {
      const w = windMax[i] ?? null;
      const d = windDom[i] ?? 0;
      const s = swellMax[i] ?? null;

      const sc = w == null ? 3 : scoreFromWind(w);

      return {
        date,
        score: sc,
        recommendation: recommendation(sc),
        wind: {
          max: w == null ? null : Math.round(w),
          direction: degToCompass(d),
          degrees: Math.round(d)
        },
        swell: {
          max: s == null ? null : Number(s)
        },
        tideState: tideHeuristic(date),
        speciesTop: speciesTop3({ score: sc, windMax: w, swellMax: s })
      };
    });

    const today = daily[0] ?? {
      date: updatedAt.slice(0, 10),
      score: scoreFromWind(windNow),
      recommendation: recommendation(scoreFromWind(windNow)),
      wind: { max: Math.round(windNow), direction: degToCompass(windDegNow), degrees: Math.round(windDegNow) },
      swell: { max: null },
      tideState: tideHeuristic(updatedAt.slice(0, 10)),
      speciesTop: speciesTop3({ score: scoreFromWind(windNow), windMax: windNow, swellMax: null })
    };

    out[loc.id] = {
      name: loc.name,
      region: loc.region ?? "",
      updatedAt,
      current: {
        score: today.score,
        recommendation: today.recommendation,
        bestTimes: ["Dawn", "Dusk"],
        species: today.speciesTop,
        wind: {
          speed: Math.round(windNow),
          direction: degToCompass(windDegNow),
          degrees: Math.round(windDegNow),
          max: today.wind.max
        },
        swell: { height: today.swell.max },
        tide: {
          state: today.tideState,
          next: "Best bite ±2 hrs around tide change (approx)"
        }
      },
      daily
    };
  }

  fs.writeFileSync("docs/forecast.json", JSON.stringify(out, null, 2));
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
