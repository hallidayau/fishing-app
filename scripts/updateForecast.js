import fs from "fs";
import locations from "../docs/locations.json" assert { type: "json" };

function degToCompass(deg) {
  const dirs = ["N","NE","E","SE","S","SW","W","NW"];
  return dirs[Math.round(deg / 45) % 8];
}

async function run() {
  const out = {};
  const updatedAt = new Date().toISOString();

  for (const loc of locations) {
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${loc.lat}&longitude=${loc.lon}` +
      `&hourly=wind_speed_10m,wind_direction_10m` +
      `&daily=wave_height_max` +
      `&timezone=Australia/Sydney`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Open-Meteo failed ${res.status}`);

    const data = await res.json();
    const windSpeed = data.hourly?.wind_speed_10m?.[0];
    const windDeg = data.hourly?.wind_direction_10m?.[0];
    const swell = data.daily?.wave_height_max?.[0] ?? null;

    if (windSpeed == null || windDeg == null) {
      throw new Error(`Missing wind fields for ${loc.id}`);
    }

    const score =
      windSpeed < 8 ? 5 :
      windSpeed < 12 ? 4 :
      windSpeed < 18 ? 3 :
      windSpeed < 24 ? 2 : 1;

    out[loc.id] = {
      name: loc.name,
      region: loc.region ?? "",
      score,
      recommendation: score >= 4 ? "GO" : score === 3 ? "MAYBE" : "DON'T GO",
      bestTimes: ["Dawn", "Dusk"],
      species: score >= 4 ? ["Tailor","Bream","Flathead"] : ["Bream","Flathead","Whiting"],
      wind: {
        speed: Math.round(windSpeed),
        direction: degToCompass(windDeg),
        degrees: Math.round(windDeg)
      },
      swell: { height: swell == null ? null : Number(swell) },
      tide: { state: "Tides next step", next: "Coming after wind/swell" },
      updatedAt
    };
  }

  fs.writeFileSync("docs/forecast.json", JSON.stringify(out, null, 2));
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
