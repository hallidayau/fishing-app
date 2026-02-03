function render(id) {
  const d = data[id];

  card.innerHTML = `
    <h2>${d.name}</h2>

    <h1>
      ${"⭐".repeat(d.score)}${"☆".repeat(5 - d.score)}
    </h1>

    <strong>${d.recommendation}</strong>

    <div class="conditions">
      <div class="condition">
        <div class="compass">
          <div class="arrow" style="transform: rotate(${d.wind.degrees}deg);"></div>
        </div>
        <div>
          <b>Wind</b><br/>
          ${d.wind.speed} km/h ${d.wind.direction}
        </div>
      </div>

      <div class="condition">
        <b>Swell</b><br/>
        ${d.swell.height} m
      </div>

      <div class="condition">
        <b>Tide</b><br/>
        ${d.tide.state}<br/>
        ${d.tide.next}
      </div>
    </div>

    <p><b>Best times:</b> ${d.bestTimes.join(", ")}</p>
    <p><b>Best targets:</b> ${d.species.join(", ")}</p>
  `;
}
