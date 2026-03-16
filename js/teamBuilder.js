(function () {

  var TEAM_SIZE_DEFAULT = 4;
  var D = window.DashboardDomain; // reglas de dominio centralizadas

  // ── HELPERS ─────────────────────────────────────────────────────────

  // Unión de arrays sin duplicados
  function union(a, b) {
    return a.concat(b.filter(function (x) { return a.indexOf(x) === -1; }));
  }

  // ── balanceSkills ────────────────────────────────────────────────────
  // Devuelve un score 0-1 que mide cuántas skills únicas cubre el equipo
  // respecto al total de skills del pool completo.
  function balanceSkills(members, allSkills) {
    if (!members.length || !allSkills.length) return 0;
    var covered = members.reduce(function (acc, m) {
      return union(acc, m.skills);
    }, []);
    return covered.length / allSkills.length;
  }

  // ── evaluateTeam ─────────────────────────────────────────────────────
  // Puntuación de equilibrio de un equipo (mayor = más balanceado).
  // Criterios:
  //   1. Diversidad de semestres (D.getSemesterRank, menor spread = menor diversidad → invertida)
  //   2. Cobertura de skills únicas
  //   3. Disponibilidad media (D.getTimeRank promedio)
  //   4. Presencia de experiencia previa (bonus por cada miembro con Sí)
  function evaluateTeam(members, allSkills) {
    if (!members.length) return 0;

    // 1 — Diversidad de semestres (normalizada 0-1, mayor spread = más diverso)
    var semVals = members.map(function (m) { return D.getSemesterRank(m.semester); });
    var semMin = Math.min.apply(null, semVals);
    var semMax = Math.max.apply(null, semVals);
    var semDiversity = members.length > 1 ? (semMax - semMin) / 8 : 0;

    // 2 — Cobertura de habilidades
    var skillCoverage = balanceSkills(members, allSkills);

    // 3 — Disponibilidad media (escala 1-4 → 0-1)
    var avgTime = members.reduce(function (s, m) { return s + D.getTimeRank(m.time); }, 0) / members.length;
    var timeScore = (avgTime - 1) / 3;

    // 4 — Proporción con experiencia previa
    var expScore = members.filter(function (m) { return m.previous === 'Sí'; }).length / members.length;

    // Ponderación
    return semDiversity * 0.3 + skillCoverage * 0.35 + timeScore * 0.2 + expScore * 0.15;
  }

  // ── generateTeams ────────────────────────────────────────────────────
  // Divide todos los estudiantes del subset filtrado en equipos balanceados.
  // Algoritmo greedy:
  //   1. Ordenar estudiantes por profileScore desc (disponibilidad alta primero)
  //   2. Distribuir "serpentina": equipo 0, 1, 2, …, N-1, N-1, …, 1, 0, 0, …
  //      para equilibrar la distribución inicial
  //   3. Por cada equipo, calcular score con evaluateTeam y adjuntar metadata
  //
  // Devuelve: [{ id, members[], combinedSkills[], combinedInterests[], score, avgTime, expCount }]
  function generateTeams(data, teamSize) {
    var size = (teamSize && teamSize > 1) ? Math.floor(teamSize) : TEAM_SIZE_DEFAULT;
    var n = data.length;
    if (!n) return [];

    // Recopilar todas las skills del pool para evaluación
    var allSkills = data.reduce(function (acc, d) {
      return union(acc, d.skills);
    }, []);

    // Ordenar por profileScore (usando la función de analytics si está disponible)
    var sorted = data.slice().sort(function (a, b) {
      var sa = window.DashboardAnalytics ? window.DashboardAnalytics.profileScore(a) : 0;
      var sb = window.DashboardAnalytics ? window.DashboardAnalytics.profileScore(b) : 0;
      return sb - sa;
    });

    // Crear equipos vacíos
    var numTeams = Math.ceil(n / size);
    var teams = [];
    for (var i = 0; i < numTeams; i++) teams.push([]);

    // Distribución serpentina (snake draft)
    var ascending = true;
    var teamIdx = 0;
    sorted.forEach(function (student, idx) {
      teams[teamIdx].push(student);
      if (ascending) {
        if (teamIdx === numTeams - 1) { ascending = false; }
        else                          { teamIdx++; }
      } else {
        if (teamIdx === 0)            { ascending = true; }
        else                          { teamIdx--; }
      }
    });

    // Construir resultado
    return teams
      .filter(function (members) { return members.length > 0; })
      .map(function (members, i) {
        var combinedSkills    = members.reduce(function (acc, m) { return union(acc, m.skills); }, []).sort();
        var combinedInterests = members.reduce(function (acc, m) { return union(acc, m.topics); }, []).sort();
        var avgTime = members.reduce(function (s, m) { return s + D.getTimeRank(m.time); }, 0) / members.length;
        var expCount = members.filter(function (m) { return m.previous === 'Sí'; }).length;
        var willingYes = members.filter(function (m) { return m.willing === 'Sí'; }).length;
        var score = evaluateTeam(members, allSkills);

        // Compatibilidad de disponibilidad (todos tienen ≥ tiempo mínimo del equipo)
        var minTime = Math.min.apply(null, members.map(function (m) { return D.getTimeRank(m.time); }));
        var compatible = members.every(function (m) { return D.getTimeRank(m.time) >= minTime; });

        return {
          id:                i + 1,
          members:           members,
          combinedSkills:    combinedSkills,
          combinedInterests: combinedInterests,
          score:             Math.round(score * 100),
          avgTime:           avgTime,
          expCount:          expCount,
          willingYes:        willingYes,
          compatible:        compatible
        };
      });
  }

  // ── RENDER ───────────────────────────────────────────────────────────

  var _currentData  = [];
  var _teamSize     = TEAM_SIZE_DEFAULT;
  var _panelOpen    = false;

  var timeShort = {
    '1 Hora':         '1h',
    '2 Horas':        '2h',
    '3 Horas':        '3h',
    'Más de 3 horas': '+3h'
  };

  function avgTimeLabel(avg) {
    if (avg < 1.5) return '~1h';
    if (avg < 2.5) return '~2h';
    if (avg < 3.5) return '~3h';
    return '~+3h';
  }

  function renderPanel() {
    var panel = document.getElementById('team-builder-panel');
    if (!panel) return;

    if (!_panelOpen) {
      panel.innerHTML = '';
      return;
    }

    var n = _currentData.length;
    if (!n) {
      panel.innerHTML = '<div class="mod-empty">Sin datos en el filtro actual.</div>';
      return;
    }

    // Selector de tamaño de equipo
    var sizeOptions = [2, 3, 4, 5, 6].map(function (s) {
      return '<option value="' + s + '"' + (s === _teamSize ? ' selected' : '') + '>' + s + ' personas</option>';
    }).join('');

    var teams = generateTeams(_currentData, _teamSize);
    var numTeams = teams.length;

    var cardsHtml = teams.map(function (team) {
      var membersHtml = team.members.map(function (m) {
        var semLabel = m.semester === 'Egresado' ? 'Egres.' : 'Sem.' + m.semester;
        var expPill  = m.previous === 'Sí' ? '<span class="pill pill-green" title="Experiencia previa">Exp.</span>' : '';
        var timePill = '<span class="pill">' + (timeShort[m.time] || m.time) + '</span>';
        return '<div class="tb-member">' +
          '<span class="tb-member-name">' + m.name + '</span>' +
          '<span class="tb-member-pills">' +
            '<span class="pill">' + semLabel + '</span>' +
            timePill + expPill +
          '</span>' +
        '</div>';
      }).join('');

      var skillsHtml = team.combinedSkills.map(function (s) {
        return '<span class="pill pill-topic">' + s + '</span>';
      }).join('');

      var interestsHtml = team.combinedInterests.slice(0, 4).map(function (t) {
        return '<span class="pill">' + t + '</span>';
      }).join('');
      if (team.combinedInterests.length > 4) {
        interestsHtml += '<span class="pill" style="opacity:0.55">+' + (team.combinedInterests.length - 4) + '</span>';
      }

      var scoreColor = team.score >= 70 ? 'var(--accent)' : team.score >= 45 ? 'var(--accent-3)' : 'var(--muted)';

      return '<div class="tb-team-card">' +
        '<div class="tb-team-header">' +
          '<span class="tb-team-number">Equipo ' + team.id + '</span>' +
          '<div class="tb-team-stats">' +
            '<span class="tb-stat">' + team.members.length + ' miembros</span>' +
            '<span class="tb-stat">' + avgTimeLabel(team.avgTime) + '/sem</span>' +
            (team.expCount ? '<span class="tb-stat pill-green">' + team.expCount + ' con exp.</span>' : '') +
            '<span class="tb-score" style="color:' + scoreColor + '">' + team.score + '<span style="font-size:9px;opacity:0.7"> /100</span></span>' +
          '</div>' +
        '</div>' +
        '<div class="tb-section-label">Miembros</div>' +
        '<div class="tb-members">' + membersHtml + '</div>' +
        '<div class="tb-section-label">Habilidades combinadas</div>' +
        '<div class="tb-tags">' + skillsHtml + '</div>' +
        '<div class="tb-section-label">Temas de interés</div>' +
        '<div class="tb-tags">' + interestsHtml + '</div>' +
      '</div>';
    }).join('');

    panel.innerHTML =
      '<div class="tb-controls">' +
        '<label class="tb-label">Personas por equipo</label>' +
        '<select class="tb-size-select">' + sizeOptions + '</select>' +
        '<span class="tb-summary">' + numTeams + ' equipo' + (numTeams !== 1 ? 's' : '') + ' de ' + n + ' inscritos</span>' +
      '</div>' +
      '<div class="tb-grid">' + cardsHtml + '</div>';
  }

  function togglePanel() {
    _panelOpen = !_panelOpen;
    var btn = document.getElementById('team-builder-toggle');
    var panel = document.getElementById('team-builder-panel');
    if (btn) {
      btn.textContent = _panelOpen ? '✕ Cerrar sugeridor' : '⚡ Sugerir equipos';
      btn.classList.toggle('active', _panelOpen);
    }
    if (panel) {
      panel.classList.toggle('open', _panelOpen);
    }
    renderPanel();
  }

  function setData(data) {
    _currentData = data;
    if (_panelOpen) renderPanel();
  }

  // ── API PÚBLICA ──────────────────────────────────────────────────────

  window.TeamBuilder = {
    setData:       setData,
    togglePanel:   togglePanel,
    generateTeams: generateTeams
  };

  // Wire toggle button
  var toggleBtn = document.getElementById('team-builder-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', togglePanel);
  }

  // Delegación: cambio de tamaño de equipo en el panel
  var tbPanel = document.getElementById('team-builder-panel');
  if (tbPanel) {
    tbPanel.addEventListener('change', function (e) {
      if (e.target.classList.contains('tb-size-select')) {
        var n = parseInt(e.target.value, 10);
        if (n > 1) {
          _teamSize = n;
          renderPanel();
        }
      }
    });
  }

})();
