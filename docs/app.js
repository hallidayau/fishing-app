const locationSelect = document.getElementById("location");
const card = document.getElementById("card");

let FORECAST = {};
let LOCATIONS = [];

function renderStars(score) {
  let html = "";
  for (let i = 1; i <= 5; i++) {
    html += `<span class="star ${i <= score ? "on" : "off"}"></span>`;
  }
  return `<div class="stars">${html}</div>`;
}

function renderLocation(id) {
  const d = FORECAST[id];
  if (!d) return;

  card.innerHTML = `
    <div class="titleRow">
      <h2 class="locName">${d.name}</h2>
      <div class="region">${d.region || ""}</div>
    </div>

    ${renderStars(d.score)}
    <span class="rec">${d.recommendation}</span>

    <div class="grid">
      <div class="box">
        <div class="label">Wind</div>
        <div class="value">
          ${d.wind.speed} km/h ${d.wind.direction}
        </div>
        <div class="tiny">
          Max: ${d.wind.max} km/h
        </div>
      </div>

      <div class="box">
        <div class="label">Swell</div>
        <div class="value">
          ${d.swell.height ?? "—"} m
        </div>
        <div class="tiny">Daily max</div>
      </div>

      <div class="box">
        <div class="label">Tide</div>
        <div class="value">
          ${d.tide.state}
        </div>
        <div class="tiny">
          ${d.tide.next || ""}
        </div>
      </div>
    </div>

    <div class="tiny">
      <strong>Best times:</strong> ${d.bestTimes.join(", ")}<br>
      <strong>Top targets:</strong> ${d.species.join(", ")}
    </div>

    <div class="sectionTitle">7-day outlook</div>
    <div class="daysList">
      ${Object.values(d.days).map(day => `
        <div class="dayRow">
          <div>
            <div class="dayWhen">${day.label}</div>
            ${renderStars(day.score)}
          </div>
          <div class="dayMid">
            <strong>${day.recommendation}</strong>
            <div class="tiny">
              ${day.wind.max} km/h ${day.wind.direction}
            </div>
          </div>
        </div>
      `).join("")}
    </div>

    <div class="tiny">
      Updated: ${d.updated}
    </div>
  `;
}

Promise.all([
  fetch("forecast.json").then(r => r.json()),
  fetch("locations.json").then(r => r.json())
])
.then(([forecast, locations]) => {
  FORECAST = forecast;
  LOCATIONS = locations;

  locationSelect.innerHTML = LOCATIONS
    .map(l => `<option value="${l.id}">${l.name}</option>`)
    .join("");

  locationSelect.onchange = e => renderLocation(e.target.value);

  renderLocation(LOCATIONS[0].id);
})
.catch(err => {
  card.innerHTML = `<pre style="color:white">${err}</pre>`;
});
