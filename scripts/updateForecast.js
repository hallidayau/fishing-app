import fs from "fs";
import fetch from "node-fetch";

const LOCATIONS = {
  hawks_nest: { name: "Hawks Nest", region: "Port Stephens", lat: -32.67, lon: 152.17 }
};

function degToCompass(deg) {
  const dirs = ["N","NE","E","SE","S","SW","W","NW"];
  return dirs[Math.round(deg / 45) % 8];
}

function scoreFromWind(wind) {
  if (wind < 10) return 5;
  if (wind < 15) return 4;
  if (wind < 20) return 3;
  if (wind < 25) return 2;
  return 1;
}

function recommendationFromScore(score) {
  if (score >= 4) return "SEND IT";
  if (score === 3) return "MAYBE";
  return "GO TO PUB";
}

async function run() {
  const output = {};

  for (const key in LOCATIONS) {
    const loc = LOCATIONS[key];

    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}` +
      `&hourly=wind_speed_10m,wind_direction_10m` +
      `&daily=wave_height_max` +
      `&timezone=Australia/Sydney`;

    const res = await fetch(url);
    const data = await res.json();

    const windSpeed = Math.round(data.hourly.wind_speed_10m[0]);
    const windDirDeg = data.hourly.wind_direction_10m[0];
    const windDir = degToCompass(windDirDeg);
    const swell = Number(data.daily.wave_height_max[0].toFixed(1));

    const score = scoreFromWind(windSpeed);

    output[key] = {
      name: loc.name,
      region: loc.region,
      score,
      recommendation: recommendationFromScore(score),
      wind: {
        speed: windSpeed,
        direction: windDir,
        max: windSpeed
      },
      swell: {
        height: swell
      },
      tide: {
        state: "Approx",
        next: "Auto"
      },
      bestTimes: ["Dawn", "Dusk"],
      species: ["Bream", "Flathead", "Tailor"],
      days: [],
      updated: new Date().toISOString()
    };
  }

  fs.writeFileSync("./docs/forecast.json", JSON.stringify(output, null, 2));
}

run();
