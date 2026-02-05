import fs from "fs";
import locations from "../docs/locations.json" assert { type: "json" };

function degToCompass(deg) {
  const dirs = ["N","NE","E","SE","S","SW","W","NW"];
  return dirs[Math.round(deg / 45) % 8];
}

/* Overall conditions score (simple, readable) */
function scoreFromWind(windKmh) {
  if (windKmh < 8) return 5;
  if (windKmh < 12) return 4;
  if (windKmh < 18) return 3;
  if (windKmh < 24) return 2;
  return 1;
}

/* Approximate tide guidance – NOT real tides */
function tideHeuristic(dateIso) {
  const day = Number(dateIso.slice(8, 10));
  return day % 2 === 0 ? "Run-in (approx)" : "Run-out (approx)";
}

/* Species logic – this is the value */
function speciesScores({ score, wind, swell }) {
  const clamp = n => Math.max(0, Math.min(100, n));
  const w = wind ?? 15;
  const s = swell ?? 1;

  const scores = [
    ["Bream",      clamp(70 + score*6 - w*1.2)],
    ["Flathead",  clamp(65 + score*6 - w*0.8)],
    ["Whiting",   clamp(60 + score*5 - w*1.0)],
    ["Tailor",    clamp(45 + score*7 + s*10)],
    ["Jewfish",   clamp(40 + score*6 + s*8 - w*0.6)],
    ["Squid",     clamp(50 + score*6 - w*1.4)]
  ];

  scores.sort((a,b) => b[1]-a[1]);
  return scores.slice(0,3).map(s => s[0]);
}

async function fetchWeather(lat, lon) {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lon}` +
    `&hourly=wind_speed_10m,wind_direction_10m` +
    `&daily=wind_speed_10m_max,wind_direction_10m_dominant,wave_height_max` +
    `&timezone=Australia/Sydney`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("Weather fetch failed");
  return res.json();
}

async function run() {
  const out = {};
  const updatedAt = new Date().toISOString();

  for (const loc of locations) {
    const data = await fetchWeather(loc.lat, loc.lon);

    const nowWind = data.hourly.wind_speed_10m[0];
    const nowDeg  = data.hourly.wind_direction_10m[0];

    const days = data.daily.time.slice(0,7);

    const daily = days.map((date, i) => {
      const w = data.daily.wind_speed_10m_max[i];
      const d = data.daily.wind_direction_10m_dominant[i];
      const s = data.daily.wave_height_max[i] ?? null;
      const sc = scoreFromWind(w);

      return {
        date,
        score: sc,
        recommendation: sc >= 4 ? "GO" : sc === 3 ? "MAYBE" : "DON'T GO",
        wind: {
          max: Math.round(w),
          direction: degToCompass(d),
          degrees: Math.round(d)
        },
        swell: { max: s },
        tideState: tideHeuristic(date),
        speciesTop: speciesScores({ score: sc, wind: w, swell: s })
      };
    });

    const today = daily[0];

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
          speed: Math.round(nowWind),
          direction: degToCompass(nowDeg),
          degrees: Math.round(nowDeg),
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

run().catch(err => {
  console.error(err);
  process.exit(1);
});
