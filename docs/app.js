function stars(score) {
  const s = Math.max(1, Math.min(5, Number(score) || 1));
  const filled = "⭐".repeat(s);
  const empty = "☆".repeat(5 - s);
  return `${filled}<span class="empty">${empty}</span>`;
}

function fmt(v, suffix, fallback = "—") {
  return v == null ? fallback : `${v}${suffix ?? ""}`;
}

function dayLabel(isoDate) {
  const d = new Date(isoDate + "T00:00:00");
  return d.toLocaleDateString("en-AU", { weekday: "short", day: "2-digit", month: "short" });
}

function timeLabel(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "—";
  }
}

function safeObj(o) {
  return o && typeof o === "object" ? o : {};
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

    // Build dropdown
    select.innerHTML = "";
    ids.forEach((id) => {
      const o = document.createElement("option");
      o.value = id;
      o.textContent = data[id]?.name ?? id;
      select.appendChild(o);
    });

    // ✅ MOBILE FIX: force a valid default selection
    select.value = ids[0];

    function render(id) {
      const d = safeObj(data[id]);
      const c = safeObj(d.current);
      const wind = safeObj(c.wind);
      const swell = safeObj(c.swell);
      const tide = safeObj(c.tide);

      const daily = Array.isArray(d.daily) ? d.daily : [];

      const dailyHtml = daily.slice(0, 7).map((day) => {
        const w = safeObj(day.wind);
        return `
          <button class="day" data-date="${day.date}">
            <div class="dayTop">${dayLabel(day.date)}</div>
            <div class="dayStars">${stars(day.score)}</div>
            <div class="dayMeta">
              <span>${fmt(w.max, " km/h")}</span>
              <span>${w.direction ?? "—"}</span>
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
            <div class="windRow">
              <div class="compass">
                <div class="arrow" style="transform: rotate(${Number(wind.degrees) || 0}deg)"></div>
              </div>
              <div>
                <div class="value">${fmt(wind.speed, " km/h")} ${wind.direction ?? ""}</div>
                <div class="tiny">Max: ${fmt(wind.max, " km/h")}</div>
              </div>
            </div>
          </div>

          <div class="box">
            <div class="label">Swell</div>
            <div class="value">${fmt(swell.height, " m")}</div>
            <div class="tiny">Daily max</div>
          </div>

          <div class="box">
            <div class="label">Tide</div>
            <div class="value">${tide.state ?? "—"}</div>
            <div class="tiny">${tide.next ?? ""}</div>
          </div>
        </div>

        <div class="tiny"><b>Best times:</b> ${(c.bestTimes || ["Dawn","Dusk"]).join(", ")}</div>
        <div class="tiny"><b>Top targets:</b> ${(c.species || []).join(", ")}</div>

        <h3 class="sectionTitle">7-day outlook</h3>
        <div class="daysRow">${dailyHtml}</div>

        <div class="detail" id="detail"></div>

        <div class="tiny">Updated: ${d.updatedAt ?? ""}</div>
      `;

      // Detail click behaviour
      const detail = document.getElementById("detail");
      const buttons = card.querySelectorAll(".day");

      function openDay(date) {
        const day = daily.find((x) => x.date === date);
        if (!day) return;

        const w = safeObj(day.wind);
        const s = safeObj(day.swell);

        detail.innerHTML = `
          <div class="detailCard">
            <div class="detailTitle">${dayLabel(day.date)} — ${day.recommendation ?? "—"}</div>
            <div class="detailGrid">
              <div><b>Score</b><br/>${stars(day.score)}</div>
              <div><b>Wind (max)</b><br/>${fmt(w.max, " km/h")} ${w.direction ?? ""}</div>
              <div><b>Swell (max)</b><br/>${fmt(s.max, " m")}</div>
              <div><b>Targets</b><br/>${(day.speciesTop || day.species || []).join(", ")}</div>
            </div>
          </div>
        `;
      }

      buttons.forEach((btn) => {
        btn.addEventListener("click", () => openDay(btn.getAttribute("data-date")));
      });

      // Auto-open first day
      if (daily[0]?.date) openDay(daily[0].date);
    }

    select.onchange = () => render(select.value);

    // ✅ Render explicitly with a guaranteed valid ID
    render(ids[0]);
  })
  .catch((err) => {
    console.error(err);
    const card = document.getElementById("card");
    card.innerHTML = `<div class="detailCard">Error loading forecast data.</div>`;
  });
