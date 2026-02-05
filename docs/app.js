function stars(score) {
  const s = Math.max(1, Math.min(5, Number(score) || 1));
  const filled = "⭐".repeat(s);
  const empty = "☆".repeat(5 - s);
  return `${filled}<span class="empty">${empty}</span>`;
}

function fmt(v, suffix = "", fallback = "—") {
  return v == null ? fallback : `${v}${suffix}`;
}

function dayLabel(isoDate) {
  const d = new Date(isoDate + "T00:00:00");
  return d.toLocaleDateString("en-AU", { weekday: "short", day: "2-digit", month: "short" });
}

// Very simple “next change” estimate, NO API:
// Assume tide change happens roughly every 6h 12m from local midnight.
// This is a crude heuristic — good enough for mates, and we label it approx.
function approxNextTideChangeTime(now = new Date()) {
  const base = new Date(now);
  base.setHours(0, 0, 0, 0);

  const cycleMs = (6 * 60 + 12) * 60 * 1000; // 6h12m
  const since = now.getTime() - base.getTime();
  const n = Math.floor(since / cycleMs) + 1;
  const next = new Date(base.getTime() + n * cycleMs);

  return next.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" });
}

fetch("forecast.json", { cache: "no-store" })
  .then((r) => r.json())
  .then((data) => {
    const select = document.getElementById("location");
    const card = document.getElementById("card");

    const ids = Object.keys(data || {});
    if (!ids.length) {
      card.innerHTML = `<div class="detailCard">No forecast data found.</div>`;
      return;
    }

    // Dropdown
    select.innerHTML = "";
    ids.forEach((id) => {
      const o = document.createElement("option");
      o.value = id;
      o.textContent = data[id]?.name ?? id;
      select.appendChild(o);
    });

    // Mobile-safe default
    select.value = ids[0];

    function render(id) {
      const d = data[id];
      const c = d?.current ?? {};
      const wind = c.wind ?? {};
      const swell = c.swell ?? {};
      const tide = c.tide ?? {};
      const daily = Array.isArray(d?.daily) ? d.daily : [];

      const nextTideApprox = approxNextTideChangeTime(new Date());

      // Build 7-day list rows
      const listHtml = daily.slice(0, 7).map((day) => {
        const w = day.wind ?? {};
        const s = day.swell ?? {};
        return `
          <button class="dayRow" data-date="${day.date}">
            <div>
              <div class="dayWhen">${dayLabel(day.date)}</div>
              <div class="dayStars">${stars(day.score)}</div>
            </div>
            <div class="dayMid">
              <div><b>${day.recommendation ?? "—"}</b></div>
              <div class="tiny">Targets: ${(day.speciesTop ?? []).join(", ")}</div>
            </div>
            <div class="dayRight">
              <span>${fmt(w.max, " km/h")}</span>
              <span>${w.direction ?? "—"}</span>
              <span>${s.max != null ? fmt(s.max, " m") : "—"}</span>
            </div>
          </button>
        `;
      }).join("");

      card.innerHTML = `
        <div class="titleRow">
          <h2 class="locName">${d.name ?? "Location"}</h2>
          <div class="region">${d.region ?? ""}</div>
        </div>

        <div class="stars">${stars(c.score)}</div>
        <div class="rec">${c.recommendation ?? "—"}</div>

        <div class="grid">
          <div class="box">
            <div class="label">Wind</div>
            <div class="iconRow">
              <div class="compass">
                <div class="needle" style="transform: translate(0, -50%) rotate(${Number(wind.degrees) || 0}deg)"></div>
              </div>
              <div>
                <div class="value">${fmt(wind.speed, " km/h")} ${wind.direction ?? ""}</div>
                <div class="tiny">Max: ${fmt(wind.max, " km/h")}</div>
              </div>
            </div>
          </div>

          <div class="box">
            <div class="label">Swell</div>
            <div class="iconRow">
              <div class="swellIcon">🌊</div>
              <div>
                <div class="value">${fmt(swell.height, " m")}</div>
                <div class="tiny">Daily max</div>
              </div>
            </div>
          </div>

          <div class="box">
            <div class="label">Tide</div>
            <div class="value">${tide.state ?? "—"}</div>
            <div class="tiny">Next change (approx): <b>${nextTideApprox}</b></div>
            <div class="tiny">${tide.next ?? ""}</div>
          </div>
        </div>

        <div class="tiny"><b>Best times:</b> ${(c.bestTimes || ["Dawn","Dusk"]).join(", ")}</div>
        <div class="tiny"><b>Top targets:</b> ${(c.species || []).join(", ")}</div>

        <h3 class="sectionTitle">7-day outlook</h3>
        <div class="daysList">${listHtml}</div>

        <div class="detail" id="detail"></div>

        <div class="tiny">Updated: ${d.updatedAt ?? ""}</div>
      `;

      // Detail
      const detail = document.getElementById("detail");
      const buttons = card.querySelectorAll(".dayRow");

      function openDay(date) {
        const day = daily.find((x) => x.date === date);
        if (!day) return;

        const w = day.wind ?? {};
        const s = day.swell ?? {};

        detail.innerHTML = `
          <div class="detailCard">
            <div class="detailTitle">${dayLabel(day.date)} — ${day.recommendation ?? "—"}</div>
            <div class="detailGrid">
              <div><b>Score</b><br/>${stars(day.score)}</div>
              <div><b>Wind (max)</b><br/>${fmt(w.max, " km/h")} ${w.direction ?? ""}</div>
              <div><b>Swell (max)</b><br/>${s.max != null ? fmt(s.max, " m") : "—"}</div>
              <div><b>Tide</b><br/>${day.tideState ?? "—"}</div>
              <div><b>Targets</b><br/>${(day.speciesTop ?? []).join(", ")}</div>
              <div><b>Next tide change</b><br/>${approxNextTideChangeTime(new Date())} (approx)</div>
            </div>
          </div>
        `;
      }

      buttons.forEach((btn) => {
        btn.addEventListener("click", () => openDay(btn.getAttribute("data-date")));
      });

      if (daily[0]?.date) openDay(daily[0].date);
    }

    select.onchange = () => render(select.value);
    render(ids[0]);
  })
  .catch((err) => {
    console.error(err);
    document.getElementById("card").innerHTML =
      `<div class="detailCard">Error loading forecast data.</div>`;
  });
