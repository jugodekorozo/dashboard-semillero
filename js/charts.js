(function () {
  const charts = {};
  const css = getComputedStyle(document.documentElement);
  const mutedColor = css.getPropertyValue("--muted").trim() || "#a8a8a8";
  const borderColor = css.getPropertyValue("--border").trim() || "rgba(255, 255, 255, 0.12)";

  function count(arr, key) {
    return arr.reduce((acc, d) => {
      const v = Array.isArray(d[key]) ? d[key] : [d[key]];
      v.forEach((x) => {
        acc[x] = (acc[x] || 0) + 1;
      });
      return acc;
    }, {});
  }

  function sortedEntries(obj, n = 20) {
    return Object.entries(obj)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n);
  }

  function pct(n, total) {
    return Math.round((n / total) * 100) + "%";
  }

  function makeChart(id, type, labels, values, colors, filteredLength, opts = {}) {
    if (charts[id]) charts[id].destroy();

    const ctx = document.getElementById(id).getContext("2d");
    charts[id] = new Chart(ctx, {
      type,
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: colors,
            borderColor: type === "bar" ? colors : "transparent",
            borderWidth: type === "bar" ? 0 : 0,
            borderRadius: type === "bar" ? 6 : 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: type !== "bar",
            position: "right",
            labels: { color: mutedColor, font: { size: 11 }, boxWidth: 12, padding: 10 },
          },
          tooltip: {
            callbacks: {
              label: (ctx2) => ` ${ctx2.label || ""}: ${ctx2.raw} (${pct(ctx2.raw, filteredLength)})`,
            },
          },
        },
        scales:
          type === "bar"
            ? {
                x: { ticks: { color: mutedColor, font: { size: 10 } }, grid: { color: borderColor } },
                y: {
                  ticks: { color: mutedColor, font: { size: 10 } },
                  grid: { color: borderColor },
                  beginAtZero: true,
                },
              }
            : {},
        indexAxis: opts.horizontal ? "y" : "x",
        ...opts.extra,
      },
    });
  }

  function updateCharts(data, palette, filteredLength) {
    const semOrder = ["1", "2", "3", "4", "5", "6", "7", "8", "Egresado"];
    const semC = count(data, "semester");
    const semLbls = semOrder.filter((s) => semC[s]);
    makeChart(
      "ch-semester",
      "bar",
      semLbls.map((s) => (s === "Egresado" ? "Egres." : "Sem." + s)),
      semLbls.map((s) => semC[s]),
      palette,
      filteredLength,
      {}
    );

    const lineC = count(data, "lines");
    const lineShort = {
      "Ilustración": "Ilustración",
      "Editorial": "Editorial",
      "Audiovisuales/Animación": "Audiovisual",
      "Diseño de interfaces - UX/UI": "UX/UI",
    };
    const lineEntries = sortedEntries(lineC);
    makeChart(
      "ch-lines",
      "doughnut",
      lineEntries.map(([k]) => lineShort[k] || k),
      lineEntries.map(([, v]) => v),
      palette,
      filteredLength,
      {}
    );

    const timeOrder = ["1 Hora", "2 Horas", "3 Horas", "Más de 3 horas"];
    const timeC = count(data, "time");
    makeChart(
      "ch-time",
      "doughnut",
      timeOrder.filter((t) => timeC[t]),
      timeOrder.filter((t) => timeC[t]).map((t) => timeC[t]),
      ["#f2992e", "#6eb42c", "#a8a8a8", "#e7027c"],
      filteredLength,
      {}
    );

    const topC = count(data, "topics");
    const topE = sortedEntries(topC, 12);
    makeChart(
      "ch-topics",
      "bar",
      topE.map(([k]) => k),
      topE.map(([, v]) => v),
      topE.map((_, i) => palette[i % palette.length]),
      filteredLength,
      {
        horizontal: true,
        extra: {
          indexAxis: "y",
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: mutedColor, font: { size: 10 } }, grid: { color: borderColor } },
            y: { ticks: { color: mutedColor, font: { size: 11 } }, grid: { color: "transparent" } },
          },
        },
      }
    );

    const sklC = count(data, "skills");
    const sklE = sortedEntries(sklC, 12);
    makeChart(
      "ch-skills",
      "bar",
      sklE.map(([k]) => k),
      sklE.map(([, v]) => v),
      sklE.map((_, i) => palette[(i + 4) % palette.length]),
      filteredLength,
      {
        horizontal: true,
        extra: {
          indexAxis: "y",
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: mutedColor, font: { size: 10 } }, grid: { color: borderColor } },
            y: { ticks: { color: mutedColor, font: { size: 11 } }, grid: { color: "transparent" } },
          },
        },
      }
    );

    const wilC = count(data, "willing");
    makeChart(
      "ch-willing",
      "doughnut",
      ["Sí", "Tal vez", "No"],
      [wilC["Sí"] || 0, wilC["Tal vez"] || 0, wilC["No"] || 0],
      ["#6eb42c", "#f2992e", "#e7027c"],
      filteredLength,
      {}
    );

    const prevC = count(data, "previous");
    makeChart(
      "ch-prev",
      "doughnut",
      ["Sin experiencia", "Con experiencia"],
      [prevC["No"] || 0, prevC["Sí"] || 0],
      ["#a8a8a8", "#6eb42c"],
      filteredLength,
      {}
    );

    const goalC = count(data, "goals");
    const goalShort = {
      "desarrollar un proyecto": "Desarrollar proyecto",
      "aprender a investigar": "Aprender investigación",
      "mejorar mi portafolio": "Mejorar portafolio",
      "participar en eventos académicos": "Eventos académicos",
      "publicar o presentar proyectos": "Publicar/presentar",
    };
    const goalE = sortedEntries(goalC, 5);
    makeChart(
      "ch-goals",
      "bar",
      goalE.map(([k]) => goalShort[k] || k),
      goalE.map(([, v]) => v),
      goalE.map((_, i) => palette[(i + 2) % palette.length]),
      filteredLength,
      {}
    );
  }

  window.DashboardCharts = { updateCharts };
})();
