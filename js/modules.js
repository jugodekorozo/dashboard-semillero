(function () {

  var RARE_THRESHOLD = 3;

  // Estado del constructor de equipos (persiste entre actualizaciones de filtros)
  var _teamData = [];
  var _selectedTemplateKey = 'editorial';

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

  // ── CONSTRUCTOR DE EQUIPOS ──────────────────────────────────────────

  // Renderiza solo el área de resultados (sin tocar los botones de plantilla).
  // Se llama tanto desde renderTeamBuilder como desde window._teamBuilderSelect.
  function renderTeamResults(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;
    var resultEl = container.querySelector('.team-results');
    if (!resultEl) return;

    var templates = window.DashboardAnalytics.PROJECT_TEMPLATES;
    var template  = templates[_selectedTemplateKey];
    if (!template) return;

    var team = window.DashboardAnalytics.suggestTeam(_teamData, template.skills, template.size);

    if (!team.length) {
      resultEl.innerHTML = '<div class="mod-empty">Sin datos suficientes para el filtro actual.</div>';
      return;
    }

    var maxScore = team.reduce(function (mx, m) { return Math.max(mx, m.score); }, 0);

    var requiredHtml =
      '<div class="team-required">' +
        '<span class="team-required-label">Habilidades buscadas:</span>' +
        template.skills.map(function (s) {
          return '<span class="pill pill-topic">' + s + '</span>';
        }).join('') +
      '</div>';

    var cardsHtml = team.map(function (m) {
      var barPct    = maxScore > 0 ? Math.round(m.score / maxScore * 100) : 0;
      var semLabel  = m.semester === 'Egresado' ? 'Egres.' : 'Sem.' + m.semester;
      var badgeCls  = m.matchCount === template.skills.length ? 'match-full'
                    : m.matchCount > 0                        ? 'match-partial'
                    :                                           'match-none';
      var matchLabel = m.matchCount + '/' + template.skills.length;
      var expPill    = m.previous === 'Sí' ? '<span class="pill pill-green">Exp.</span>' : '';

      var matchedHtml = m.matchedSkills.length
        ? '<div class="match-skills">' +
            m.matchedSkills.map(function (s) {
              return '<span class="match-skill-tag">' + s + '</span>';
            }).join('') +
          '</div>'
        : '';

      return '<div class="team-member-card">' +
        '<div class="team-member-header">' +
          '<div class="team-member-info">' +
            '<div class="team-member-name">' + m.name + '</div>' +
            '<div class="team-member-meta">' +
              '<span class="pill">' + semLabel + '</span>' +
              '<span class="pill">' + (timeShort[m.time] || m.time) + '</span>' +
              expPill +
            '</div>' +
          '</div>' +
          '<span class="match-badge ' + badgeCls + '">' + matchLabel + '</span>' +
        '</div>' +
        matchedHtml +
        '<div class="team-reason">' + m.reason + '</div>' +
        '<div class="profile-score-bar" style="margin-top:8px">' +
          '<div class="profile-score-fill" style="width:' + barPct + '%"></div>' +
        '</div>' +
      '</div>';
    }).join('');

    resultEl.innerHTML = requiredHtml + '<div class="team-grid">' + cardsHtml + '</div>';
  }

  // Renderiza el widget completo (plantillas + resultados).
  // Preserva _selectedTemplateKey entre llamadas de updateAll.
  function renderTeamBuilder(containerId, data) {
    var container = document.getElementById(containerId);
    if (!container) return;

    _teamData = data;

    var templates = window.DashboardAnalytics.PROJECT_TEMPLATES;
    var keys = Object.keys(templates);

    var btnHtml = keys.map(function (key) {
      var tpl = templates[key];
      var cls = 'team-template-btn' + (key === _selectedTemplateKey ? ' active' : '');
      return '<button class="' + cls + '" data-key="' + key + '" ' +
        'onclick="window._teamBuilderSelect(\'' + key + '\')">' +
        tpl.icon + ' ' + tpl.label +
      '</button>';
    }).join('');

    container.innerHTML =
      '<div class="card-title">Constructor de equipos</div>' +
      '<div class="team-templates">' + btnHtml + '</div>' +
      '<div class="team-results"></div>';

    renderTeamResults(containerId);
  }

  // ── TOP HABILIDADES E INTERESES ─────────────────────────────────────

  // Renderiza una lista compacta de top-N ítems con barra proporcional.
  // items: [{ name, count }]   scarce (opcional): [{ name, count }] para badge de escasas
  function renderTopList(containerId, title, items, scarce) {
    var container = document.getElementById(containerId);
    if (!container) return;

    if (!items.length) {
      container.innerHTML = '<div class="card-title">' + title + '</div><div class="mod-empty">Sin datos.</div>';
      return;
    }

    var max = items[0].count;
    var rows = items.map(function (item) {
      var pct = max > 0 ? Math.round(item.count / max * 100) : 0;
      return '<div class="top-row">' +
        '<span class="top-label">' + item.name + '</span>' +
        '<div class="top-bar-wrap">' +
          '<div class="top-bar-fill" style="width:' + pct + '%"></div>' +
        '</div>' +
        '<span class="top-count">' + item.count + '</span>' +
      '</div>';
    }).join('');

    var scarceHtml = '';
    if (scarce && scarce.length) {
      scarceHtml =
        '<div class="top-scarce">' +
          '<span class="top-scarce-label">Escasas</span>' +
          scarce.map(function (s) {
            return '<span class="rare-badge">' + s.name + ' (' + s.count + ')</span>';
          }).join('') +
        '</div>';
    }

    container.innerHTML =
      '<div class="card-title">' + title + '</div>' +
      '<div class="top-list">' + rows + '</div>' +
      scarceHtml;
  }

  function renderTopSkills(containerId, data) {
    var items  = window.DashboardAnalytics.getTopSkills(data, 5);
    var scarce = window.DashboardAnalytics.getScarceSkills(data, 5);
    renderTopList(containerId, 'Top 5 habilidades', items, scarce);
  }

  function renderTopInterests(containerId, data) {
    var items = window.DashboardAnalytics.getTopInterests(data, 5);
    renderTopList(containerId, 'Top 5 intereses', items, null);
  }

  // ── PERFILES DEL SEMILLERO ──────────────────────────────────────────

  function renderProfiles(containerId, data) {
    var container = document.getElementById(containerId);
    if (!container) return;

    var A = window.DashboardAnalytics;
    if (!A) { container.innerHTML = ''; return; }

    if (!data.length) {
      container.innerHTML = '<div class="card-title">Perfiles del Semillero</div><div class="mod-empty">Sin datos para el filtro actual.</div>';
      return;
    }

    var dist   = A.getProfileDistribution(data);
    var groups = A.getStudentsByProfile(data);
    var meta   = A.PROFILE_META;
    var profs  = A.PROFILES;
    var total  = data.length;
    var maxCount = Math.max.apply(null, profs.map(function (p) { return dist[p]; }));

    // ── Tarjetas resumen ────────────────────────────────────────────
    var cardsHtml = profs.map(function (p) {
      var m      = meta[p];
      var count  = dist[p];
      var pct    = total > 0 ? Math.round(count / total * 100) : 0;
      var barPct = maxCount > 0 ? Math.round(count / maxCount * 100) : 0;

      return '<div class="prf-card">' +
        '<div class="prf-card-header">' +
          '<span class="prf-card-icon">' + m.icon + '</span>' +
          '<span class="prf-card-name">' + p + '</span>' +
        '</div>' +
        '<div class="prf-card-count" style="color:' + m.color + '">' + count + '</div>' +
        '<div class="prf-card-pct">' + pct + '% del grupo</div>' +
        '<div class="prf-bar-wrap">' +
          '<div class="prf-bar-fill" style="width:' + barPct + '%;background:rgba(' + m.colorRgb + ',0.75)"></div>' +
        '</div>' +
        '<div class="prf-card-desc">' + m.description + '</div>' +
      '</div>';
    }).join('');

    // ── Listas colapsables por perfil ───────────────────────────────
    var groupsHtml = profs.map(function (p) {
      var students = groups[p];
      if (!students.length) return '';
      var m = meta[p];

      var pillsHtml = students.map(function (s) {
        return '<span class="prf-student-pill" ' +
          'style="border-color:rgba(' + m.colorRgb + ',0.4)">' +
          s.name.split(' ').slice(0, 2).join(' ') +
        '</span>';
      }).join('');

      return '<div class="prf-group">' +
        '<div class="prf-group-header">' +
          '<span class="prf-group-icon">' + m.icon + '</span>' +
          '<span class="prf-group-label" style="color:' + m.color + '">' + p + '</span>' +
          '<span class="prf-group-count">' + students.length + ' estudiantes</span>' +
          '<span class="prf-group-arrow">▾</span>' +
        '</div>' +
        '<div class="prf-group-body">' + pillsHtml + '</div>' +
      '</div>';
    }).join('');

    container.innerHTML =
      '<div class="card-title">Perfiles del Semillero</div>' +
      '<div class="prf-cards-grid">' + cardsHtml + '</div>' +
      '<div class="prf-groups">' + groupsHtml + '</div>';
  }

  // ── API PÚBLICA ─────────────────────────────────────────────────────

  function updateAll(data) {
    renderInsights('mod-insights', data);
    renderProfileRanking('mod-ranking', data);
    renderSkillMap('mod-skills', data);
    renderTopSkills('mod-top-skills', data);
    renderTopInterests('mod-top-interests', data);
    renderProfiles('mod-profiles', data);
    if (window.TeamBuilder) window.TeamBuilder.setData(data);
  }

  window.DashboardModules = { updateAll: updateAll };

  // Auto-inicialización con RAW al cargar el script.
  // app.js ya ejecutó applyFilters() pero DashboardModules no existía aún.
  // Esta llamada puebla los tres módulos en la primera carga.
  if (window.DashboardData && window.DashboardData.RAW) {
    window.DashboardModules.updateAll(window.DashboardData.RAW);
  }

  // Delegación: expandir/colapsar grupos de perfil
  var profilesContainer = document.getElementById('mod-profiles');
  if (profilesContainer) {
    profilesContainer.addEventListener('click', function (e) {
      var header = e.target.closest('.prf-group-header');
      if (!header) return;
      var body  = header.nextElementSibling;
      var arrow = header.querySelector('.prf-group-arrow');
      var isOpen = body.classList.toggle('open');
      if (arrow) arrow.textContent = isOpen ? '▴' : '▾';
    });
  }

})();
