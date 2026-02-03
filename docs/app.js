function stars(score){
  const filled = "⭐".repeat(score);
  const empty  = "☆".repeat(5 - score);
  return `${filled}<span class="empty">${empty}</span>`;
}

function fmt(v, suffix, fallback="—"){
  return (v == null) ? fallback : `${v}${suffix ?? ""}`;
}

function dayLabel(isoDate){
  const d = new Date(isoDate + "T00:00:00");
  return d.toLocaleDateString("en-AU", { weekday:"short", day:"2-digit", month:"short" });
}

fetch("forecast.json", { cache: "no-store" })
  .then(r => r.json())
  .then(data => {
    const select = document.getElementById("location");
    const card = document.getElementById("card");

    const ids = Object.keys(data);
    ids.forEach(id => {
      const o = document.createElement("option");
      o.value = id;
      o.textContent = data[id].name;
      select.appendChild(o);
    });

    function render(id){
      const d = data[id];
      const c = d.current;

      const dailyHtml = (d.daily ?? []).map(day => `
        <button class="day" data-date="${day.date}">
          <div class="dayTop">${dayLabel(day.date)}</div>
          <div class="dayStars">${stars(day.score)}</div>
          <div class="dayMeta">
            <span>${fmt(day.wind.max, " km/h")}</span>
            <span>${day.wind.direction}</span>
          </div>
        </button>
      `).join("");

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
            <div class="windRow">
              <div class="compass">
                <div class="arrow" style="transform: rotate(${c.wind.degrees}deg)"></div>
              </div>
              <div>
                <div class="value">${c.wind.speed} km/h ${c.wind.direction}</div>
                <div class="tiny">Max: ${fmt(c.wind.max, " km/h")}</div>
              </div>
            </div>
          </div>

          <div class="box">
            <div class="label">Swell</div>
            <div class="value">${fmt(c.swell.height, " m")}</div>
            <div class="tiny">Daily max</div>
          </div>

          <div class="box">
            <div class="label">Tide</div>
            <div class="value">${c.tide.state}</div>
            <div class="tiny">${c.tide.next}</div>
          </div>
        </div>

        <div class="tiny"><b>Best times:</b> ${c.bestTimes.join(", ")}</div>
        <div class="tiny"><b>Top targets:</b> ${c.species.join(", ")}</div>

        <h3 class="sectionTitle">7-day outlook</h3>
        <div class="daysRow">${dailyHtml}</div>

        <div class="detail" id="detail"></div>
        <div class="tiny">Updated: ${d.updatedAt}</div>
      `;

      // Details on click
      const detail = document.getElementById("detail");
      const buttons = card.querySelectorAll(".day");
      buttons.forEach(btn => {
        btn.addEventListener("click", () => {
          const date = btn.getAttribute("data-date");
          const day = (d.daily ?? []).find(x => x.date === date);
          if (!day) return;

          detail.innerHTML = `
            <div class="detailCard">
              <div class="detailTitle">${dayLabel(day.date)} — ${day.recommendation}</div>
              <div class="detailGrid">
                <div><b>Score</b><br/>${stars(day.score)}</div>
                <div><b>Wind (max)</b><br/>${fmt(day.wind.max, " km/h")} ${day.wind.direction}</div>
                <div><b>Swell (max)</b><br/>${fmt(day.swell.max, " m")}</div>
                <div><b>Targets</b><br/>${(day.species ?? []).join(", ")}</div>
              </div>
            </div>
          `;
        });
      });

      // Auto-open today detail
      if (d.daily?.[0]) {
        const first = card.querySelector(".day");
        if (first) first.click();
      }
    }

    select.onchange = () => render(select.value);
    render(select.value);
  });
