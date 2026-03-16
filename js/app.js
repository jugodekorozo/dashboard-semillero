(function () {
  const { RAW, PALETTE } = window.DashboardData;
  let filtered = [...RAW];

  // Estado de búsqueda y sorting (persiste entre cambios de filtro)
  let _searchQuery = '';
  let _sortKey     = null;   // null = sin ordenar
  let _sortDir     = 'desc';

  function pct(n, total) {
    if (!total) return "0%";
    return Math.round((n / total) * 100) + "%";
  }

  function updateKPIs(data) {
    const n = data.length;
    const A = window.DashboardAnalytics;

    document.getElementById("k-total").textContent = n;
    document.getElementById("total-badge").textContent = n;
    document.getElementById("result-count").textContent = `Mostrando ${n} de ${RAW.length} inscritos`;

    if (!A) return;  // analytics.js aún no cargó (primera ejecución de app.js)

    // Núcleo activo: willing=Sí y time >= 2h
    const active = A.getActiveCore(data).length;
    document.getElementById("k-active").textContent = active;
    document.getElementById("k-active-pct").textContent = pct(active, n) + " dispuestos y disponibles";

    // Núcleo estratégico: experiencia + willing=Sí + time >= 3h
    const strategic = A.getStrategicCore(data).length;
    document.getElementById("k-strategic").textContent = strategic;
    document.getElementById("k-strategic-pct").textContent = pct(strategic, n) + " listos para liderar";

    // Riesgo de rotación: sem 8 + egresados
    const rotation = A.getRotationRisk(data);
    document.getElementById("k-rotation").textContent = rotation.count;
    document.getElementById("k-rotation-pct").textContent = rotation.pct + "% próximos a graduarse";

    // Diversidad de habilidades: skills únicas
    const diversity = A.getSkillDiversity(data);
    document.getElementById("k-diversity").textContent = diversity;

    // Potencial editorial: escritura + diseño editorial + experiencia previa
    const editorial = A.getEditorialPotential(data).length;
    document.getElementById("k-editorial").textContent = editorial;
    document.getElementById("k-editorial-pct").textContent = pct(editorial, n) + " con perfil completo";
  }

  function pillClass(val) {
    if (val === "Sí") return "pill-green";
    if (val === "No") return "pill-red";
    return "pill-orange";
  }

  function updateTable(data) {
    const tbody = document.getElementById("tbl-body");
    const A = window.DashboardAnalytics;
    tbody.innerHTML = data
      .map(
        (d) => {
          const score = A ? A.profileScore(d) : "—";
          return `
    <tr>
      <td><span class="score-badge">${score}</span></td>
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
      <td><span class="skills-count">${d.skills.length}</span></td>
    </tr>`;
        }
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

  function _updateSearchCount(shown, total) {
    const el = document.getElementById("search-count");
    if (!el) return;
    el.textContent = _searchQuery
      ? shown + " resultado" + (shown !== 1 ? "s" : "") + " de " + total
      : "";
  }

  function _updateSortHeaders() {
    ["score", "semester", "time", "skills"].forEach((key) => {
      const el = document.getElementById("th-" + key);
      if (!el) return;
      const arrow = el.querySelector(".sort-arrow");
      if (arrow) arrow.textContent = _sortKey === key ? (_sortDir === "asc" ? "↑" : "↓") : "↕";
      el.classList.toggle("th-active", _sortKey === key);
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

    // Búsqueda y sorting se aplican solo a la tabla; KPIs y gráficos usan filtered completo
    const A = window.DashboardAnalytics;
    const searched = (_searchQuery && A) ? A.searchStudents(filtered, _searchQuery) : filtered;
    const display  = (_sortKey && A)     ? A.sortStudents(searched, _sortKey, _sortDir)  : searched;

    updateKPIs(filtered);
    window.DashboardCharts.updateCharts(filtered, PALETTE, filtered.length);
    updateTable(display);
    _updateSearchCount(searched.length, filtered.length);
    _updateSortHeaders();
    if (window.DashboardModules) window.DashboardModules.updateAll(filtered);
  }

  function resetFilters() {
    ["f-semester", "f-line", "f-time", "f-prev", "f-willing"].forEach((id) => {
      document.getElementById(id).value = "";
    });
    applyFilters();
  }

  window.applyFilters = applyFilters;
  window.resetFilters = resetFilters;

  window._sortTable = function (key) {
    if (_sortKey === key) {
      _sortDir = _sortDir === "desc" ? "asc" : "desc";
    } else {
      _sortKey = key;
      _sortDir = "desc";
    }
    applyFilters();
  };

  window._onSearchInput = function (val) {
    _searchQuery = val;
    applyFilters();
  };

  Chart.defaults.color = "#a8a8a8";
  Chart.defaults.borderColor = "rgba(255,255,255,0.08)";
  Chart.defaults.font.family = "'Roboto', sans-serif";

  populateFilters();
  applyFilters();
})();
