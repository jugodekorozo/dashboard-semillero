(function () {

  // Replica privada de count() de charts.js (no expuesta globalmente).
  // Maneja tanto campos escalares como campos array (lines, topics, skills, goals).
  function countField(arr, key) {
    return arr.reduce(function (acc, d) {
      var v = Array.isArray(d[key]) ? d[key] : [d[key]];
      v.forEach(function (x) {
        acc[x] = (acc[x] || 0) + 1;
      });
      return acc;
    }, {});
  }

  function normalizeLimit(limit, fallback) {
    if (limit === undefined) return fallback;
    var n = Number(limit);
    if (!isFinite(n) || n <= 0) return fallback;
    return Math.floor(n);
  }

  function topCountEntries(freq, limit) {
    return Object.entries(freq)
      .sort(function (a, b) { return b[1] - a[1]; })
      .slice(0, normalizeLimit(limit, 5));
  }

  // Score numérico por estudiante.
  // tiempo: 1h=1, 2h=2, 3h=3, +3h=4
  // experiencia previa: Sí=+3
  // disposición eventos: Sí=+2, Tal vez=+1, No=+0
  // habilidades: +1 por cada skill ofrecida
  function profileScore(d) {
    var score = 0;
    if (d.time === '1 Hora')              score += 1;
    else if (d.time === '2 Horas')        score += 2;
    else if (d.time === '3 Horas')        score += 3;
    else if (d.time === 'Más de 3 horas') score += 4;

    if (d.previous === 'Sí') score += 3;

    if (d.willing === 'Sí')           score += 2;
    else if (d.willing === 'Tal vez') score += 1;

    score += d.skills.length;
    return score;
  }

  // Devuelve copia del array ordenada por profileScore descendente.
  function availabilityRanking(data) {
    return data.slice().sort(function (a, b) {
      return profileScore(b) - profileScore(a);
    });
  }

  // Objeto { skill: count } con todas las habilidades del subconjunto.
  function skillFrequency(data) {
    return countField(data, 'skills');
  }

  // Top habilidades: [{ name, count }]
  function getTopSkills(data, limit) {
    return topCountEntries(countField(data, 'skills'), limit).map(function (e) {
      return { name: e[0], count: e[1] };
    });
  }

  // Top intereses (topics): [{ name, count }]
  function getTopInterests(data, limit) {
    return topCountEntries(countField(data, 'topics'), limit).map(function (e) {
      return { name: e[0], count: e[1] };
    });
  }

  // Perfiles con mayor disponibilidad: [{ ...student, score }]
  function getMostAvailableStudents(data, limit) {
    var max = normalizeLimit(limit, 5);
    return availabilityRanking(data)
      .slice(0, max)
      .map(function (d) {
        return Object.assign({}, d, { score: profileScore(d) });
      });
  }

  // Distribución fija por semestre (incluye semestres sin registros con 0).
  function getSemesterDistribution(data) {
    var semCount = countField(data, 'semester');
    var order = ['1', '2', '3', '4', '5', '6', '7', '8', 'Egresado'];
    return order.reduce(function (acc, sem) {
      acc[sem] = semCount[sem] || 0;
      return acc;
    }, {});
  }

  // Núcleo estratégico: experiencia + disposición total + >=3h.
  function getStrategicCore(data) {
    return data.filter(function (d) {
      return d.previous === 'Sí' &&
             d.willing  === 'Sí' &&
             (d.time === '3 Horas' || d.time === 'Más de 3 horas');
    });
  }

  // Potencial editorial: escritura + diseño editorial.
  function getEditorialPotential(data) {
    return data.filter(function (d) {
      return d.skills.indexOf('Escritura / Redacción') !== -1 &&
             d.skills.indexOf('Diseño editorial') !== -1;
    });
  }

  // Plantillas de proyecto: habilidades requeridas + tamaño de equipo por tipo.
  var PROJECT_TEMPLATES = {
    editorial: {
      key:      'editorial',
      label:    'Publicación editorial',
      icon:     '📄',
      skills:   ['Escritura / Redacción', 'Diseño editorial', 'Fotografía', 'Organización de proyectos'],
      size:     4,
      criterion: 'Producir una publicación académica, revista o catálogo del semillero'
    },
    audiovisual: {
      key:      'audiovisual',
      label:    'Producción audiovisual',
      icon:     '🎬',
      skills:   ['Edición de video', 'Animación', 'Fotografía', 'Manejo de redes sociales'],
      size:     4,
      criterion: 'Producir contenido audiovisual o animado de divulgación'
    },
    articulo: {
      key:      'articulo',
      label:    'Artículo académico',
      icon:     '✍',
      skills:   ['Escritura / Redacción', 'Ilustración', 'Organización de proyectos'],
      size:     3,
      criterion: 'Investigar, redactar e ilustrar un artículo para publicación académica'
    },
    exposicion: {
      key:      'exposicion',
      label:    'Exposición de diseño',
      icon:     '🖼',
      skills:   ['Ilustración', 'Diseño de marcas', 'Fotografía', 'Organización de proyectos'],
      size:     4,
      criterion: 'Curar y montar una exposición de proyectos de diseño'
    },
    campana: {
      key:      'campana',
      label:    'Campaña gráfica',
      icon:     '📢',
      skills:   ['Diseño de marcas', 'Ilustración', 'Manejo de redes sociales', 'Escritura / Redacción'],
      size:     4,
      criterion: 'Diseñar y difundir una campaña visual de comunicación'
    },
    investigacion: {
      key:      'investigacion',
      label:    'Investigación-creación',
      icon:     '🔬',
      skills:   ['Escritura / Redacción', 'Ilustración', 'Fotografía', 'Organización de proyectos'],
      size:     5,
      criterion: 'Desarrollar un proyecto de investigación-creación con producción y documentación'
    }
  };

  // Sugiere equipo óptimo para un conjunto de habilidades requeridas.
  // Prioridad: (1) mayor matchCount, (2) mayor profileScore.
  // Devuelve: [{ ...student, matchedSkills, missingSkills, matchCount, score, reason }]
  function suggestTeam(data, requiredSkills, size) {
    if (size === undefined) size = 4;
    return data.slice()
      .map(function (d) {
        var matched = requiredSkills.filter(function (s) {
          return d.skills.indexOf(s) !== -1;
        });
        var missing = requiredSkills.filter(function (s) {
          return d.skills.indexOf(s) === -1;
        });
        var reason;
        if (matched.length === requiredSkills.length) {
          reason = 'Cubre todas las habilidades requeridas del proyecto.';
        } else if (matched.length > 0) {
          reason = 'Aporta ' + matched.length + ' de ' + requiredSkills.length + ': ' + matched.join(', ') + '.';
        } else {
          reason = 'Seleccionado por disponibilidad y experiencia general.';
        }
        return Object.assign({}, d, {
          matchedSkills: matched,
          missingSkills: missing,
          matchCount:    matched.length,
          score:         profileScore(d),
          reason:        reason
        });
      })
      .sort(function (a, b) {
        if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount;
        return b.score - a.score;
      })
      .slice(0, size);
  }

  // Array de [skill, count] donde count <= threshold, ordenado asc por count.
  // Con los 53 registros completos devuelve [] (ninguna skill llega a ≤3).
  // Aparece con subconjuntos filtrados pequeños.
  function rareSkills(data, threshold) {
    if (threshold === undefined) threshold = 3;
    var freq = skillFrequency(data);
    return Object.entries(freq)
      .filter(function (e) { return e[1] <= threshold; })
      .sort(function (a, b) { return a[1] - b[1]; });
  }

  // Genera array de insight objects activos según condiciones del subset.
  // Estructura: { type, icon, title, value, context, action }
  function generateInsights(data) {
    var insights = [];
    var n = data.length;
    if (!n) return insights;

    var semCount = getSemesterDistribution(data);
    var sem8Count  = semCount['8']        || 0;
    var gradCount  = semCount['Egresado'] || 0;
    var atRisk     = sem8Count + gradCount;

    // R1 — Riesgo de rotación (>30% en sem 8 o egresado)
    if (atRisk / n > 0.30) {
      insights.push({
        type: 'risk',
        icon: '⚠',
        title: 'Alta rotación potencial',
        value: atRisk + ' inscritos (' + Math.round(atRisk / n * 100) + '%)',
        context: 'Están en semestre 8 o son egresados (' + sem8Count + ' + ' + gradCount + '). Riesgo de abandono al graduarse.',
        action: 'Priorizar retención o planear convocatoria de reemplazo.'
      });
    }

    // F1 — Habilidad dominante (siempre activo)
    var freq = skillFrequency(data);
    var freqEntries = topCountEntries(freq, Number.MAX_SAFE_INTEGER);
    if (freqEntries.length) {
      var top = freqEntries[0];
      insights.push({
        type: 'strength',
        icon: '✦',
        title: 'Habilidad dominante',
        value: top[0],
        context: top[1] + ' de ' + n + ' inscritos (' + Math.round(top[1] / n * 100) + '%) la ofrecen.',
        action: 'Asignar proyectos que aprovechen esta fortaleza colectiva del semillero.'
      });
    }

    // H1 — Habilidades críticas escasas (count ≤ 2)
    var ultraRare = freqEntries.filter(function (e) { return e[1] <= 2; });
    if (ultraRare.length) {
      insights.push({
        type: 'warning',
        icon: '△',
        title: 'Habilidades críticas escasas',
        value: ultraRare.length + ' habilidad' + (ultraRare.length > 1 ? 'es' : ''),
        context: ultraRare.map(function (e) { return e[0] + ' (' + e[1] + ')'; }).join(', ') + '.',
        action: 'Considerar capacitación o búsqueda de perfiles complementarios.'
      });
    }

    // O1 — Núcleo estratégico (experiencia + disposición + ≥3h)
    var core = getStrategicCore(data);
    if (core.length) {
      var coreNames = core.slice(0, 2).map(function (d) { return d.name.split(' ')[0]; }).join(', ');
      insights.push({
        type: 'opportunity',
        icon: '↗',
        title: 'Núcleo estratégico',
        value: core.length + ' perfil' + (core.length > 1 ? 'es' : ''),
        context: 'Experiencia + disposición total + ≥3h/semana. ' + coreNames + (core.length > 2 ? ' y otros.' : '.'),
        action: 'Asignarles roles de liderazgo en proyectos activos de investigación.'
      });
    }

    // O2 — Potencial editorial (escritura + diseño editorial simultáneos)
    var editorial = getEditorialPotential(data);
    if (editorial.length >= 2) {
      insights.push({
        type: 'opportunity',
        icon: '↗',
        title: 'Potencial editorial',
        value: editorial.length + ' perfil' + (editorial.length > 1 ? 'es' : ''),
        context: 'Combinan Escritura/Redacción y Diseño Editorial: capacidad para producir publicaciones completas.',
        action: 'Vincular a proyectos de divulgación o publicaciones académicas del semillero.'
      });
    }

    // A1 — Disponibilidad limitada (<35% con ≥3h)
    var highTime = data.filter(function (d) {
      return d.time === '3 Horas' || d.time === 'Más de 3 horas';
    }).length;
    if (highTime / n < 0.35) {
      insights.push({
        type: 'warning',
        icon: '△',
        title: 'Disponibilidad limitada',
        value: highTime + ' inscritos (' + Math.round(highTime / n * 100) + '%)',
        context: 'Solo el ' + Math.round(highTime / n * 100) + '% dispone de ≥3h semanales para proyectos sostenidos.',
        action: 'Ajustar carga o dividir proyectos en módulos de menor dedicación.'
      });
    }

    // G1 — Brecha generacional (semestre 2 ausente)
    if (!semCount['2'] && n > 10) {
      insights.push({
        type: 'info',
        icon: 'ℹ',
        title: 'Brecha generacional',
        value: 'Semestre 2 ausente',
        context: 'No hay inscritos de segundo semestre en el conjunto actual.',
        action: 'Difundir la convocatoria entre estudiantes de primer y segundo año.'
      });
    }

    return insights;
  }

  window.DashboardAnalytics = {
    profileScore:        profileScore,
    availabilityRanking: availabilityRanking,
    skillFrequency:      skillFrequency,
    getTopSkills:        getTopSkills,
    getTopInterests:     getTopInterests,
    getMostAvailableStudents: getMostAvailableStudents,
    getSemesterDistribution:  getSemesterDistribution,
    getStrategicCore:    getStrategicCore,
    getEditorialPotential:getEditorialPotential,
    rareSkills:          rareSkills,
    generateInsights:    generateInsights,
    PROJECT_TEMPLATES:   PROJECT_TEMPLATES,
    suggestTeam:         suggestTeam
  };

})();
