window.onerror = function (msg, src, line, col, err) {
  document.body.innerHTML =
    "<pre style='color:white;padding:20px'>" +
    "JS ERROR:\\n" +
    msg + "\\n\\nLine: " + line +
    "</pre>";
};

function stars(score) {
  const s = Math.max(0, Math.min(5, Number(score) || 0));
  let html = "";
  for (let i = 1; i <= 5; i++) {
    html += `<span class="star ${i <= s ? "on" : "off"}"></span>`;
  }
  return html;
}

function dayNarrative(day) {
  const wind = day.windMax;
  const dir = day.windDir;
  const score = day.score;
  const rec = day.rec;

  let windDesc = "Light winds";
  if (wind >= 10 && wind < 15) windDesc = "Moderate winds";
  if (wind >= 15 && wind < 20) windDesc = "Fresh winds";
  if (wind >= 20) windDesc = "Strong winds";

  let bite;
  if (score >= 4) bite = "good bite periods likely";
  else if (score === 3) bite = "patchy bite expected";
  else bite = "poor bite conditions";

  let advice;
  if (rec === "SEND IT") advice = "Worth fishing if you time it right.";
  else if (rec === "MAYBE") advice = "Fish early or late if you go.";
  else advice = "Better off staying dry.";

  return `${windDesc} from the ${dir} with ${bite}. ${advice}`;
}

function fmt(v, suffix = "", fallback = "—") {
  return v == null ? fallback : `${v}${suffix}`;
}

function dayLabel(isoDate) {
  const d = new Date(isoDate + "T00:00:00");
  return d.toLocaleDateString("en-AU", { weekday: "short", day: "2-digit", month: "short" });
}

function degToCompass(deg) {
  if (deg == null) return "—";
  const dirs = ["N","NE","E","SE","S","SW","W","NW"];
  return dirs[Math.round(deg / 45) % 8];
}

function approxNextTideChangeTime(now = new Date()) {
  const base = new Date(now);
  base.setHours(0, 0, 0, 0);
  const cycleMs = (6 * 60 + 12) * 60 * 1000;
  const since = now.getTime() - base.getTime();
  const n = Math.floor(since / cycleMs) + 1;
  const next = new Date(base.getTime() + n * cycleMs);
  return next.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" });
}
function bestWindowToday(wind) {
  if (!wind || wind.speed == null) return "Dawn – early morning";
  if (wind.speed < 10) return "Dawn – mid morning";
  if (wind.speed < 16) return "Early morning";
  return "Late afternoon";
}

fetch("forecast.json", { cache: "no-store" })
  .then(r => r.json())
  .then(data => {
    const select = document.getElementById("location");
    const card = document.getElementById("card");

    const ids = Object.keys(data || {});
    if (!ids.length) {
      card.innerHTML = `<div class="detailCard">No forecast data.</div>`;
      return;
    }

    /* ---------- GROUP DROPDOWN BY REGION ---------- */
    const regions = {};
    ids.forEach(id => {
      const r = data[id].region || "Other";
      regions[r] ??= [];
      regions[r].push(id);
    });

    select.innerHTML = "";
    Object.entries(regions).forEach(([region, list]) => {
      const group = document.createElement("optgroup");
      group.label = region;
      list.forEach(id => {
        const o = document.createElement("option");
        o.value = id;
        o.textContent = data[id].name;
        group.appendChild(o);
      });
      select.appendChild(group);
    });

    select.value = ids[0];

    function render(id) {
      const d = data[id];
      const c = d.current || {};
      const wind = c.wind || {};
      const swell = c.swell || {};
      const tide = c.tide || {};
      const daily = d.daily || [];

      const isBay =
  /bay|harbour|harbor|lake|entrance/i.test(d.region + " " + d.name);

const swellClass = isBay
  ? ""
  : swell.height > 2.0
    ? "swell-high"
    : swell.height >= 1.5
      ? "swell-mid"
      : "";

      card.innerHTML = `
        <div class="titleRow">
          <h2 class="locName">${d.name}</h2>
          <div class="region">${d.region}</div>
        </div>

        <div class="stars">${stars(c.score)}</div>
        <div class="rec">${c.recommendation}</div>

        <div class="grid">
          <div class="box">
            <div class="label">Wind</div>
            <div class="iconRow">
              <div class="compass">
                <div class="needle" style="transform: translate(0,-50%) rotate(${wind.degrees || 0}deg)"></div>
              </div>
              <div>
                <div class="value">${fmt(wind.speed," km/h")} ${wind.direction || ""}</div>
                <div class="tiny">Max: ${fmt(wind.max," km/h")}</div>
              </div>
            </div>
          </div>

          <div class="box ${swellClass}">
            <div class="label">Swell</div>
            <div class="iconRow">
  <div class="swellIcon">🌊</div>
  <div>
    <div class="value">${fmt(swell.height," m")} ${degToCompass(swell.direction)}</div>
    <div class="tiny">Daily max</div>
    <div class="swellLegend">
      <span class="amber">Amber</span> = choppy ·
      <span class="red">Red</span> = rough
    </div>
  </div>
</div>
          </div>

          <div class="box">
            <div class="label">Tide</div>
            <div class="value">${tide.state || "—"}</div>
            <div class="tiny">Next change (approx): <b>${approxNextTideChangeTime()}</b></div>
          </div>
        </div>

        <div class="tiny"><b>Best times:</b> ${(c.bestTimes || []).join(", ")}</div>
<div class="tiny"><b>Best window today:</b> ${bestWindowToday(wind)} (approx)</div>
        <div class="tiny"><b>Top targets:</b> ${(c.species || []).join(", ")}</div>

        <h3 class="sectionTitle">7-day outlook</h3>
        <div class="daysList">
          ${daily.slice(0,7).map(day => `
            <div class="dayRow">
  <div>
    <div class="dayWhen">${day.dateLabel}</div>
    <div class="dayStars">${renderStars(day.score)}</div>
  </div>

  <div class="dayMid">
    <strong>${day.recommendation}</strong>
    <div class="tiny">${dayReport(day)}</div>
    <div class="tiny">Targets: ${day.targets.join(", ")}</div>
  </div>

  <div class="dayRight">
    ${day.windMax} km/h ${day.windDir}
  </div>
</div>


        <div class="tiny">Updated: ${d.updatedAt}</div>
      `;
    }

    select.onchange = () => render(select.value);
    render(ids[0]);
  })
  .catch(() => {
    document.getElementById("card").innerHTML =
      `<div class="detailCard">Error loading forecast.</div>`;
  });
