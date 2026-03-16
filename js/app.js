(function () {
  const { RAW, PALETTE } = window.DashboardData;
  let filtered = [...RAW];

  function pct(n, total) {
    if (!total) return "0%";
    return Math.round((n / total) * 100) + "%";
  }

  function updateKPIs(data) {
    const n = data.length;
    document.getElementById("k-total").textContent = n;
    document.getElementById("total-badge").textContent = n;

    const exp = data.filter((d) => d.previous === "Sí").length;
    document.getElementById("k-exp").textContent = exp;
    document.getElementById("k-exp-pct").textContent = pct(exp, n);

    const yes = data.filter((d) => d.willing === "Sí").length;
    document.getElementById("k-yes").textContent = yes;
    document.getElementById("k-yes-pct").textContent = pct(yes, n);

    const m3 = data.filter((d) => d.time === "Más de 3 horas").length;
    document.getElementById("k-more3").textContent = m3;
    document.getElementById("k-more3-pct").textContent = pct(m3, n);

    document.getElementById("k-grad").textContent = data.filter((d) => d.semester === "Egresado").length;
    document.getElementById("k-sem8").textContent = data.filter((d) => d.semester === "8").length;
    document.getElementById("result-count").textContent = `Mostrando ${n} de ${RAW.length} inscritos`;
  }

  function pillClass(val) {
    if (val === "Sí") return "pill-green";
    if (val === "No") return "pill-red";
    return "pill-orange";
  }

  function updateTable(data) {
    const tbody = document.getElementById("tbl-body");
    tbody.innerHTML = data
      .map(
        (d, i) => `
    <tr>
      <td style="color:var(--muted)">${i + 1}</td>
      <td style="font-weight:600">${d.name}</td>
      <td><span class="pill">${d.semester === "Egresado" ? "Egres." : "Sem. " + d.semester}</span></td>
      <td>${d.lines
        .map(
          (l) =>
            `<span class="pill">${l
              .replace("Audiovisuales/Animación", "AV/Anim.")
              .replace("Diseño de interfaces - UX/UI", "UX/UI")}</span>`
        )
        .join("")}</td>
      <td>${d.time}</td>
      <td><span class="pill ${pillClass(d.willing)}">${d.willing}</span></td>
      <td><span class="pill ${d.previous === "Sí" ? "pill-green" : "pill-red"}">${d.previous}</span></td>
      <td>${d.topics
        .map((t) => `<span class="pill pill-topic">${t}</span>`)
        .join("")}</td>
    </tr>`
      )
      .join("");
  }

  function populateFilters() {
    const fSem = document.getElementById("f-semester");
    const fLine = document.getElementById("f-line");
    const fTime = document.getElementById("f-time");

    fSem.innerHTML = '<option value="">Todos</option>';
    fLine.innerHTML = '<option value="">Todas</option>';
    fTime.innerHTML = '<option value="">Todos</option>';

    const sems = [...new Set(RAW.map((d) => d.semester))].sort((a, b) => {
      const order = { "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, Egresado: 9 };
      return (order[a] || 0) - (order[b] || 0);
    });

    sems.forEach((s) => {
      const o = document.createElement("option");
      o.value = s;
      o.textContent = s === "Egresado" ? "Egresado" : "Semestre " + s;
      fSem.appendChild(o);
    });

    const lines = [...new Set(RAW.flatMap((d) => d.lines))].sort();
    lines.forEach((l) => {
      const o = document.createElement("option");
      o.value = l;
      o.textContent = l;
      fLine.appendChild(o);
    });

    const times = ["1 Hora", "2 Horas", "3 Horas", "Más de 3 horas"];
    times.forEach((t) => {
      const o = document.createElement("option");
      o.value = t;
      o.textContent = t;
      fTime.appendChild(o);
    });
  }

  function applyFilters() {
    const sem = document.getElementById("f-semester").value;
    const line = document.getElementById("f-line").value;
    const time = document.getElementById("f-time").value;
    const prev = document.getElementById("f-prev").value;
    const will = document.getElementById("f-willing").value;

    filtered = RAW.filter(
      (d) =>
        (!sem || d.semester === sem) &&
        (!line || d.lines.includes(line)) &&
        (!time || d.time === time) &&
        (!prev || d.previous === prev) &&
        (!will || d.willing === will)
    );

    updateKPIs(filtered);
    window.DashboardCharts.updateCharts(filtered, PALETTE, filtered.length);
    updateTable(filtered);
  }

  function resetFilters() {
    ["f-semester", "f-line", "f-time", "f-prev", "f-willing"].forEach((id) => {
      document.getElementById(id).value = "";
    });
    applyFilters();
  }

  window.applyFilters = applyFilters;
  window.resetFilters = resetFilters;

  Chart.defaults.color = "#a8a8a8";
  Chart.defaults.borderColor = "rgba(255,255,255,0.08)";
  Chart.defaults.font.family = "'Roboto', sans-serif";

  populateFilters();
  applyFilters();
})();
