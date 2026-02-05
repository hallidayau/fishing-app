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
    tideState: tideHeuristic(date),
    const days = data.daily?.time?.slice(0, 7) ?? [];
    const windMax = data.daily?.wind_speed_10m_max?.slice(0, 7) ?? [];
    const windDirDom = data.daily?.wind_direction_10m_dominant?.slice(0, 7) ?? [];
    const swellMax = data.daily?.wave_height_max?.slice(0, 7) ?? [];
    const weatherCode = data.daily?.weathercode?.slice(0, 7) ?? [];

    const daily = days.map((date, i) => {
      const w = windMax[i] ?? null;
      const d = windDirDom[i] ?? 0;
      const s = swellMax[i] ?? null;
      const sc = w == null ? 3 : scoreFromWind(w); // fallback
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
        weatherCode: weatherCode[i] ?? null,
        species: topTargets(sc)
      };
    });

    // Today card uses today’s daily if available, else hourly
    const today = daily[0] ?? {
      date: updatedAt.slice(0, 10),
      score: scoreFromWind(windNow),
      recommendation: recommendation(scoreFromWind(windNow)),
      wind: { max: Math.round(windNow), direction: degToCompass(windDegNow), degrees: Math.round(windDegNow) },
      swell: { max: null },
      weatherCode: null,
      const sp = speciesScores({ score: sc, windMax: w, swellMax: s });

return {
  date,
  score: sc,
  recommendation: recommendation(sc),
  wind: { max: w == null ? null : Math.round(w), direction: degToCompass(d), degrees: Math.round(d) },
  swell: { max: s == null ? null : Number(s) },
  tideState: tideHeuristic(date),
  speciesTop: sp.top,
  speciesRanked: sp.ranked
};
    };

    out[loc.id] = {
      name: loc.name,
      region: loc.region ?? "",
      updatedAt,
      current: tide: {
      species: today.speciesTop ?? ["Bream", "Flathead", "Whiting"],
  state: tideHeuristic(today.date),
  next: "Best bite: dawn/dusk + 2hrs around tide change (approx)"
}
        score: today.score,
        recommendation: today.recommendation,
        bestTimes: ["Dawn", "Dusk"],   // we can refine later with tide + light
        species: today.species,
        wind: {
          speed: Math.round(windNow),
          direction: degToCompass(windDegNow),
          degrees: Math.round(windDegNow),
          max: today.wind.max
        },
        swell: { height: today.swell.max },
        tide: { function tideHeuristic(localIsoDate) {
  // Very simple: alternates run-in/run-out daily (approximation)
  // This is NOT real tide data; it’s a placeholder that still helps planning.
  const day = Number(localIsoDate.slice(8, 10));
  const state = (day % 2 === 0) ? "Run-in (approx)" : "Run-out (approx)";
  return state;
}
 }
      },
      daily
    };
  }

  fs.writeFileSync("docs/forecast.json", JSON.stringify(out, null, 2));
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
function speciesScores({ score, windMax, swellMax }) {
  // 0–100 simple suitability
  const wind = windMax ?? 15;
  const swell = swellMax ?? 1.0;

  const clamp = (n) => Math.max(0, Math.min(100, n));

  // heuristics
  const bream = clamp(60 + (score * 6) - (wind * 1.2));          // likes lighter winds
  const tailor = clamp(45 + (score * 7) + (swell * 10));         // likes swell + activity
  const jew = clamp(35 + (score * 5) + (swell * 8) - (wind * 0.8)); // likes swell, not too windy
  const whiting = clamp(55 + (score * 5) - (wind * 1.0));        // similar to bream
  const flathead = clamp(50 + (score * 6) - (wind * 0.6));       // tolerates a bit more wind
  const squid = clamp(40 + (score * 6) - (wind * 1.3));          // hates wind/chop

  const list = [
    ["Bream", bream],
    ["Tailor", tailor],
    ["Jewfish", jew],
    ["Whiting", whiting],
    ["Flathead", flathead],
    ["Squid", squid]
  ];

  list.sort((a,b) => b[1]-a[1]);
  return {
    ranked: list,
    top: list.slice(0,3).map(x => x[0])
  };
}
