import fs from "fs";
import locations from "../docs/locations.json" assert { type: "json" };

function degToCompass(deg) {
  const dirs = ["N","NE","E","SE","S","SW","W","NW"];
  return dirs[Math.round(deg / 45) % 8];
}

function score({ wind }) {
  if (wind < 10) return 5;
  if (wind < 15) return 4;
  if (wind < 20) return 3;
  return 2;
}

async function run() {
  const out = {};

  for (const loc of locations) {
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${loc.lat}&longitude=${loc.lon}` +
      `&hourly=wind_speed_10m,wind_direction_10m` +
      `&daily=wave_height_max` +
      `&timezone=Australia/Sydney`;

    const res = await fetch(url);
    const data = await res.json();

    const windSpeed = data.hourly.wind_speed_10m[0];
    const windDeg = data.hourly.wind_direction_10m[0];

    out[loc.id] = {
      name: loc.name,
      score: score({ wind: windSpeed }),
      recommendation: windSpeed < 15 ? "GO" : "MAYBE",
      bestTimes: ["Dawn", "Dusk"],
      species: ["Bream", "Tailor", "Flathead"],

      wind: {
        speed: Math.round(windSpeed),
        direction: degToCompass(windDeg),
        degrees: Math.round(windDeg)
      },
      swell: {
        height: Number(data.daily.wave_height_max[0].toFixed(1))
      },
      tide: {
        state: "Updating",
        next: "Auto"
      }
    };
  }

  fs.writeFileSync(
    "./docs/forecast.json",
    JSON.stringify(out, null, 2)
  );
}

run();
