(function () {

  var RARE_THRESHOLD = 3;

  var typeClass = {
    risk:        'insight-risk',
    warning:     'insight-warning',
    strength:    'insight-strength',
    opportunity: 'insight-opportunity',
    info:        'insight-info'
  };

  var timeShort = {
    '1 Hora':          '1h',
    '2 Horas':         '2h',
    '3 Horas':         '3h',
    'Más de 3 horas':  '+3h'
  };

  // ── INSIGHTS ────────────────────────────────────────────────────────

  function renderInsights(containerId, data) {
    var container = document.getElementById(containerId);
    if (!container) return;

    var insights = window.DashboardAnalytics.generateInsights(data);

    if (!insights.length) {
      container.innerHTML = '<div class="mod-empty">No se generaron insights para el filtro actual.</div>';
      return;
    }

    container.innerHTML = insights.map(function (ins) {
      return '<div class="insight-card ' + (typeClass[ins.type] || '') + '">' +
        '<div class="insight-header">' +
          '<span class="insight-icon">' + ins.icon + '</span>' +
          '<span class="insight-title">' + ins.title + '</span>' +
        '</div>' +
        '<div class="insight-value">' + ins.value + '</div>' +
        '<div class="insight-context">' + ins.context + '</div>' +
        '<div class="insight-action">' + ins.action + '</div>' +
      '</div>';
    }).join('');
  }

  // ── RANKING DE PERFILES ─────────────────────────────────────────────

  function renderProfileRanking(containerId, data) {
    var container = document.getElementById(containerId);
    if (!container) return;

    var ranked = window.DashboardAnalytics.availabilityRanking(data);
    var top = ranked.slice(0, 8);

    if (!top.length) {
      container.innerHTML =
        '<div class="card-title">Ranking de perfiles</div>' +
        '<div class="mod-empty">Sin datos para el filtro actual.</div>';
      return;
    }

    var maxScore = window.DashboardAnalytics.profileScore(top[0]);

    var rows = top.map(function (d, i) {
      var score = window.DashboardAnalytics.profileScore(d);
      var barPct = maxScore > 0 ? Math.round(score / maxScore * 100) : 0;
      var semLabel = d.semester === 'Egresado' ? 'Egres.' : 'Sem.' + d.semester;
      var wilClass = d.willing === 'Sí' ? 'pill-green' : d.willing === 'No' ? 'pill-red' : 'pill-orange';
      var expClass = d.previous === 'Sí' ? 'pill-green' : 'pill-red';
      var expLabel = d.previous === 'Sí' ? 'Exp.' : 'Sin exp.';

      return '<div class="profile-row">' +
        '<span class="profile-rank">' + (i + 1) + '</span>' +
        '<div class="profile-info">' +
          '<div class="profile-name">' + d.name + '</div>' +
          '<div class="profile-meta">' +
            '<span class="pill">' + semLabel + '</span>' +
            '<span class="pill">' + (timeShort[d.time] || d.time) + '</span>' +
            '<span class="pill ' + wilClass + '">' + d.willing + '</span>' +
            '<span class="pill ' + expClass + '">' + expLabel + '</span>' +
          '</div>' +
          '<div class="profile-score-bar">' +
            '<div class="profile-score-fill" style="width:' + barPct + '%"></div>' +
          '</div>' +
        '</div>' +
        '<span class="profile-score-num">' + score + '</span>' +
      '</div>';
    }).join('');

    container.innerHTML =
      '<div class="card-title">Ranking de perfiles de disponibilidad</div>' +
      '<div class="profile-list">' + rows + '</div>';
  }

  // ── MAPA DE HABILIDADES ─────────────────────────────────────────────

  function renderSkillMap(containerId, data) {
    var container = document.getElementById(containerId);
    if (!container) return;

    var freq = window.DashboardAnalytics.skillFrequency(data);
    var entries = Object.entries(freq).sort(function (a, b) { return b[1] - a[1]; });

    if (!entries.length) {
      container.innerHTML =
        '<div class="card-title">Mapa de habilidades</div>' +
        '<div class="mod-empty">Sin datos para el filtro actual.</div>';
      return;
    }

    var maxCount = entries[0][1];

    var rows = entries.map(function (entry) {
      var skill    = entry[0];
      var count    = entry[1];
      var isRare   = count <= RARE_THRESHOLD;
      var barPct   = maxCount > 0 ? Math.round(count / maxCount * 100) : 0;
      var fillClass = 'skill-bar-fill' + (isRare ? ' rare' : '');
      var badge    = isRare ? '<span class="rare-badge">ESCASA</span>' : '';

      return '<div class="skill-row">' +
        '<span class="skill-label">' + skill + '</span>' +
        '<div class="skill-bar-wrap">' +
          '<div class="' + fillClass + '" style="width:' + barPct + '%"></div>' +
        '</div>' +
        '<span class="skill-count">' + count + '</span>' +
        badge +
      '</div>';
    }).join('');

    container.innerHTML =
      '<div class="card-title">Mapa de habilidades</div>' +
      '<div class="skill-map">' + rows + '</div>';
  }

  // ── API PÚBLICA ─────────────────────────────────────────────────────

  function updateAll(data) {
    renderInsights('mod-insights', data);
    renderProfileRanking('mod-ranking', data);
    renderSkillMap('mod-skills', data);
  }

  window.DashboardModules = { updateAll: updateAll };

  // Auto-inicialización con RAW al cargar el script.
  // app.js ya ejecutó applyFilters() pero DashboardModules no existía aún.
  // Esta llamada puebla los tres módulos en la primera carga.
  if (window.DashboardData && window.DashboardData.RAW) {
    window.DashboardModules.updateAll(window.DashboardData.RAW);
  }

})();
