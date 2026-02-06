const locationSelect = document.getElementById("location");
const card = document.getElementById("card");

let DATA = {};
let LOCS = [];

function safe(val, fallback = "—") {
  return val !== undefined && val !== null ? val : fallback;
}

function stars(score = 0) {
  let out = "";
  for (let i = 1; i <= 5; i++) {
    out += `<span class="star ${i <= score ? "on" : "off"}"></span>`;
  }
  return `<div class="stars">${out}</div>`;
}

function report(day) {
  const wind = safe(day.wind?.max);
  const dir = safe(day.wind?.dir);
  const score = safe(day.score, 0);

  if (score >= 4) {
    return `Light ${dir} winds around ${wind} km/h should fish well, especially early.`;
  }
  if (score === 3) {
    return `Moderate ${dir} winds near ${wind} km/h may fish best in sheltered water.`;
  }
  return `Stronger ${dir} winds around ${wind} km/h likely make conditions poor.`;
}

function render(id) {
  const d = DATA[id];
  if (!d) {
    card.innerHTML = "<p>No data available.</p>";
    return;
  }

  card.innerHTML = `
    <div class="titleRow">
      <h2 class="locName">${d.name}</h2>
      <div class="region">${safe(d.region)}</div>
    </div>

    ${stars(d.score)}
    <span class="rec">${safe(d.recommendation)}</span>

    <div class="grid">
      <div class="box">
        <div class="label">Wind</div>
        <div class="value">${safe(d.wind?.speed)} km/h ${safe(d.wind?.dir)}</div>
      </div>

      <div class="box">
        <div class="label">Swell</div>
        <div class="value">${safe(d.swell?.height)} m</div>
      </div>

      <div class="box">
        <div class="label">Tide</div>
        <div class="value">${safe(d.tide?.state)}</div>
      </div>
    </div>

    <div class="sectionTitle">7-day outlook</div>
    <div class="daysList">
      ${(d.days || []).map(day => `
        <div class="dayRow">
          <div>
            <div class="dayWhen">${safe(day.label)}</div>
            ${stars(day.score)}
          </div>
          <div class="dayMid">
            <strong>${safe(day.recommendation)}</strong>
            <div class="tiny">${report(day)}</div>
          </div>
          <div class="dayRight">
            ${safe(day.wind?.max)} km/h ${safe(day.wind?.dir)}
          </div>
        </div>
      `).join("")}
    </div>

    <div class="tiny">Updated: ${safe(d.updated)}</div>
  `;
}

Promise.all([
  fetch("forecast.json").then(r => r.json()),
  fetch("locations.json").then(r => r.json())
])
.then(([forecast, locations]) => {
  DATA = forecast;
  LOCS = locations;

  locationSelect.innerHTML = LOCS.map(l =>
    `<option value="${l.id}">${l.name}</option>`
  ).join("");

  locationSelect.onchange = e => render(e.target.value);
  render(LOCS[0].id);
})
.catch(err => {
  card.innerHTML = `<pre>${err}</pre>`;
});
