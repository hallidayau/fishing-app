function starsHTML(score){
  const filled = "⭐".repeat(score);
  const empty  = "☆".repeat(5 - score);
  return `${filled}<span class="empty">${empty}</span>`;
}

function fmtSwell(v){
  return (v == null) ? "—" : `${v.toFixed(1)} m`;
}

fetch("forecast.json", { cache: "no-store" })
  .then(r => {
    if (!r.ok) throw new Error(`Failed to load forecast.json (${r.status})`);
    return r.json();
  })
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
      card.innerHTML = `
        <div class="titleRow">
          <h2 class="locName">${d.name}</h2>
          <div class="region">${d.region ?? ""}</div>
        </div>

        <div class="stars">${starsHTML(d.score)}</div>
        <div class="rec">${d.recommendation}</div>

        <div class="grid">
          <div class="box">
            <div class="label">Wind</div>
            <div class="windRow">
              <div class="compass">
                <div class="arrow" style="transform: rotate(${d.wind.degrees}deg)"></div>
              </div>
              <div>
                <div class="value">${d.wind.speed} km/h ${d.wind.direction}</div>
              </div>
            </div>
          </div>

          <div class="box">
            <div class="label">Swell</div>
            <div class="value">${fmtSwell(d.swell.height)}</div>
          </div>

          <div class="box">
            <div class="label">Tide</div>
            <div class="value">${d.tide.state}</div>
            <div class="tiny">${d.tide.next}</div>
          </div>
        </div>

        <div class="tiny"><b>Best times:</b> ${d.bestTimes.join(", ")}</div>
        <div class="tiny"><b>Top targets:</b> ${d.species.join(", ")}</div>
        <div class="tiny">Updated: ${d.updatedAt}</div>
      `;
    }

    select.onchange = () => render(select.value);
    render(select.value);
  })
  .catch(err => {
    document.getElementById("card").innerHTML =
      `<div class="tiny">Error: ${err.message}</div>`;
  });
