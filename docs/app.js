fetch("forecast.json")
  .then(r => r.json())
  .then(data => {
    const select = document.getElementById("location");
    const card = document.getElementById("card");

    Object.keys(data).forEach(id => {
      const o = document.createElement("option");
      o.value = id;
      o.textContent = data[id].name;
      select.appendChild(o);
    });

    function render(id) {
      const d = data[id];
      card.innerHTML = `
        <h2>${d.name}</h2>
        <h1>${"⭐".repeat(d.score)}</h1>
        <strong>${d.recommendation}</strong>
        <p>Best times: ${d.bestTimes.join(", ")}</p>
        <p>Best targets: ${d.species.join(", ")}</p>
      `;
    }

    select.onchange = () => render(select.value);
    render(select.value);
  });
