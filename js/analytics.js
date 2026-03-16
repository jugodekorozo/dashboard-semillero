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

  // Núcleo activo: dispuesto a participar (willing=Sí) y tiempo >= 2h.
  function getActiveCore(data) {
    return data.filter(function (d) {
      return d.willing === 'Sí' &&
             (d.time === '2 Horas' || d.time === '3 Horas' || d.time === 'Más de 3 horas');
    });
  }

  // Núcleo estratégico: experiencia + disposición total + >=3h.
  function getStrategicCore(data) {
    return data.filter(function (d) {
      return d.previous === 'Sí' &&
             d.willing  === 'Sí' &&
             (d.time === '3 Horas' || d.time === 'Más de 3 horas');
    });
  }

  // Riesgo de rotación: inscritos en semestre 8 o egresados.
  // Devuelve { count, pct } sobre el total del subset filtrado.
  function getRotationRisk(data) {
    var n = data.length;
    if (!n) return { count: 0, pct: 0 };
    var semDist = getSemesterDistribution(data);
    var count = (semDist['8'] || 0) + (semDist['Egresado'] || 0);
    return { count: count, pct: Math.round(count / n * 100) };
  }

  // Diversidad de habilidades: número de skills únicas en el subset.
  function getSkillDiversity(data) {
    return Object.keys(skillFrequency(data)).length;
  }

  // Alta disponibilidad: time = "3 Horas" o "Más de 3 horas".
  function getHighAvailability(data) {
    return data.filter(function (d) {
      return d.time === '3 Horas' || d.time === 'Más de 3 horas';
    });
  }

  // Potencial editorial: escritura + diseño editorial + experiencia previa.
  function getEditorialPotential(data) {
    return data.filter(function (d) {
      return d.previous === 'Sí' &&
             d.skills.indexOf('Escritura / Redacción') !== -1 &&
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

  // Filtra estudiantes cuyo nombre, skills o topics contienen la query.
  function searchStudents(data, query) {
    if (!query || !query.trim()) return data;
    var q = query.toLowerCase().trim();
    return data.filter(function (d) {
      return d.name.toLowerCase().indexOf(q) !== -1 ||
             d.skills.some(function (s) { return s.toLowerCase().indexOf(q) !== -1; }) ||
             d.topics.some(function (t) { return t.toLowerCase().indexOf(q) !== -1; });
    });
  }

  // Ordena una copia del array por la clave dada.
  // key: 'score' | 'semester' | 'time' | 'skills'
  // direction: 'asc' | 'desc'
  var _semOrder  = { '1':1,'2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'Egresado':9 };
  var _timeOrder = { '1 Hora':1,'2 Horas':2,'3 Horas':3,'Más de 3 horas':4 };

  function sortStudents(data, key, direction) {
    if (!key) return data;
    return data.slice().sort(function (a, b) {
      var va, vb;
      if      (key === 'score')    { va = profileScore(a);        vb = profileScore(b); }
      else if (key === 'semester') { va = _semOrder[a.semester]  || 0; vb = _semOrder[b.semester]  || 0; }
      else if (key === 'time')     { va = _timeOrder[a.time]     || 0; vb = _timeOrder[b.time]     || 0; }
      else if (key === 'skills')   { va = a.skills.length;        vb = b.skills.length; }
      else return 0;
      return direction === 'asc' ? va - vb : vb - va;
    });
  }

  // Habilidades escasas (count ≤ 3): [{ name, count }], ordenadas asc, límite configurable.
  function getScarceSkills(data, limit) {
    return rareSkills(data, 3)
      .slice(0, normalizeLimit(limit, 5))
      .map(function (e) { return { name: e[0], count: e[1] }; });
  }

  // ── CLASIFICACIÓN DE PERFILES ────────────────────────────────────────

  // Habilidades de referencia por categoría
  var PROFILE_SKILLS = {
    visual:    ['Ilustración', 'Fotografía', 'Animación', 'Edición de video', 'Motion graphics'],
    technical: ['Animación', 'Edición de video', 'Motion graphics'],
    editorial: ['Escritura / Redacción', 'Diseño editorial'],
    org:       ['Organización de proyectos', 'Manejo de redes sociales', 'Diseño de marcas']
  };

  // Metadatos visuales de cada perfil (usados en modules.js)
  var PROFILE_META = {
    'Explorador visual': {
      icon: '🎨', color: 'var(--accent-3)', colorRgb: '242,153,46',
      description: 'Habilidades visuales múltiples y amplia curiosidad temática'
    },
    'Técnico': {
      icon: '⚙', color: 'var(--accent-2)', colorRgb: '231,2,124',
      description: 'Especialista en producción técnica audiovisual o digital'
    },
    'Conceptual': {
      icon: '📝', color: 'var(--accent)', colorRgb: '110,180,44',
      description: 'Perfil editorial, redacción e investigación académica'
    },
    'Productor': {
      icon: '⚡', color: '#7b8cde', colorRgb: '123,140,222',
      description: 'Experiencia previa, alta disponibilidad y capacidad organizativa'
    }
  };

  var PROFILES = ['Explorador visual', 'Técnico', 'Conceptual', 'Productor'];

  // Asigna un perfil creativo a un estudiante.
  // Puntaje por perfil:
  //   Explorador visual: +3 por skill visual, +1 si ≥2 temas, base +1 (perfil por defecto)
  //   Técnico:           +4 por skill técnica, +2 si time≥2h
  //   Conceptual:        +5 por skill editorial, +2 si ≥3 temas de interés
  //   Productor:         +5 si previous=Sí, +3 si time≥3h, +2 por skill organizativa
  // Empates: prioridad Productor > Conceptual > Técnico > Explorador visual
  function classifyProfile(d) {
    var tv = _timeOrder[d.time] || 0;

    function count(list) {
      return list.filter(function (s) { return d.skills.indexOf(s) !== -1; }).length;
    }

    var vC = count(PROFILE_SKILLS.visual);
    var tC = count(PROFILE_SKILLS.technical);
    var eC = count(PROFILE_SKILLS.editorial);
    var oC = count(PROFILE_SKILLS.org);

    var scores = {
      'Explorador visual': vC * 3 + (d.topics.length >= 2 ? 1 : 0) + 1,
      'Técnico':           tC * 4 + (tv >= 2 ? 2 : 0),
      'Conceptual':        eC * 5 + (d.topics.length >= 3 ? 2 : 0),
      'Productor':         (d.previous === 'Sí' ? 5 : 0) + (tv >= 3 ? 3 : 0) + oC * 2
    };

    // Recorrer en prioridad descendente; reemplazar solo si estrictamente mayor
    var order = ['Productor', 'Conceptual', 'Técnico', 'Explorador visual'];
    var best = order[0];
    for (var i = 1; i < order.length; i++) {
      if (scores[order[i]] > scores[best]) best = order[i];
    }

    return { profile: best, score: scores[best], scores: scores };
  }

  // Conteo de estudiantes por perfil: { 'Explorador visual': N, ... }
  function getProfileDistribution(data) {
    var counts = {};
    PROFILES.forEach(function (p) { counts[p] = 0; });
    data.forEach(function (d) {
      counts[classifyProfile(d).profile]++;
    });
    return counts;
  }

  // Estudiantes agrupados por perfil: { 'Explorador visual': [...], ... }
  function getStudentsByProfile(data) {
    var groups = {};
    PROFILES.forEach(function (p) { groups[p] = []; });
    data.forEach(function (d) {
      groups[classifyProfile(d).profile].push(d);
    });
    return groups;
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
    getActiveCore:       getActiveCore,
    getStrategicCore:    getStrategicCore,
    getRotationRisk:     getRotationRisk,
    getSkillDiversity:   getSkillDiversity,
    getHighAvailability: getHighAvailability,
    getEditorialPotential: getEditorialPotential,
    searchStudents:      searchStudents,
    sortStudents:        sortStudents,
    getScarceSkills:     getScarceSkills,
    classifyProfile:        classifyProfile,
    getProfileDistribution: getProfileDistribution,
    getStudentsByProfile:   getStudentsByProfile,
    PROFILES:               PROFILES,
    PROFILE_META:           PROFILE_META,
    rareSkills:             rareSkills,
    generateInsights:       generateInsights,
    PROJECT_TEMPLATES:      PROJECT_TEMPLATES,
    suggestTeam:            suggestTeam
  };

})();
