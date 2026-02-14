const locationSelect = document.getElementById("location");
const card = document.getElementById("card");

let FORECAST = {};

async function loadData() {
  const res = await fetch("forecast.json?v=" + Date.now());
  FORECAST = await res.json();

  buildDropdown();
  renderLocation(Object.keys(FORECAST)[0]);
}

function buildDropdown() {
  locationSelect.innerHTML = Object.keys(FORECAST)
    .map(id => `<option value="${id}">${FORECAST[id].name}</option>`)
    .join("");

  locationSelect.addEventListener("change", (e) => {
    renderLocation(e.target.value);
  });
}

function renderStars(score) {
  return Array.from({ length: 5 })
    .map((_, i) =>
      `<span class="star ${i < score ? "on" : "off"}"></span>`
    )
    .join("");
}

function renderLocation(id) {
  const data = FORECAST[id];
  if (!data) return;

  card.innerHTML = `
    <div class="titleRow">
      <h2 class="locName">${data.name}</h2>
      <div class="region">${data.region}</div>
    </div>

    <div class="stars">
      ${renderStars(data.score)}
    </div>

    <div class="rec">${data.recommendation}</div>

    <div class="grid">
      <div class="box">
        <div class="label">Wind</div>
        <div class="value">${data.wind.speed} km/h ${data.wind.direction}</div>
        <div class="tiny">Max: ${data.wind.max} km/h</div>
      </div>

      <div class="box">
        <div class="label">Swell</div>
        <div class="value">${data.swell.height} m</div>
        <div class="tiny">Daily max</div>
      </div>

      <div class="box">
        <div class="label">Tide</div>
        <div class="value">${data.tide.state}</div>
        <div class="tiny">${data.tide.next}</div>
      </div>
    </div>

    <div class="sectionTitle">7-day outlook</div>
    <div class="daysList">
      ${Object.values(data.days || {})
        .map(
          (day) => `
        <div class="dayRow">
          <div>
            <div class="dayWhen">${day.label}</div>
            <div class="dayStars">
              ${renderStars(day.score)}
            </div>
          </div>
          <div>${day.recommendation}</div>
          <div class="dayRight">${day.wind.max} km/h ${day.wind.direction}</div>
        </div>
      `
        )
        .join("")}
    </div>

    <div class="tiny">Updated: ${data.updated}</div>
  `;
}

loadData();
