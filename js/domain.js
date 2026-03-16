// ── domain.js ────────────────────────────────────────────────────────
// Reglas de dominio compartidas por todos los módulos.
// Cargado primero (antes de charts.js, app.js, analytics.js, teamBuilder.js)
// para que cada IIFE lo encuentre disponible al ejecutarse.
// ─────────────────────────────────────────────────────────────────────

(function () {

  // Rango numérico de disponibilidad temporal.
  // Usado en: profileScore, sortStudents, classifyProfile, getActiveCore,
  //           getStrategicCore, getHighAvailability, generateInsights, evaluateTeam
  var TIME_RANK = {
    '1 Hora':         1,
    '2 Horas':        2,
    '3 Horas':        3,
    'Más de 3 horas': 4
  };

  // Rango numérico de semestres para sorting y comparación.
  // Usado en: sortStudents (analytics.js), populateFilters (app.js), evaluateTeam (teamBuilder.js)
  var SEMESTER_RANK = {
    '1': 1, '2': 2, '3': 3, '4': 4,
    '5': 5, '6': 6, '7': 7, '8': 8,
    'Egresado': 9
  };

  // Orden canónico de semestres para distribución fija (getSemesterDistribution).
  var SEMESTER_ORDER = ['1', '2', '3', '4', '5', '6', '7', '8', 'Egresado'];

  // Grupos de habilidades usados en la clasificación de perfiles y análisis de cobertura.
  // Referencia única: cualquier cambio aquí se propaga a classifyProfile y demás funciones.
  var VISUAL_SKILLS    = ['Ilustración', 'Fotografía', 'Animación', 'Edición de video', 'Motion graphics'];
  var TECH_SKILLS      = ['Animación', 'Edición de video', 'Motion graphics'];
  var EDITORIAL_SKILLS = ['Escritura / Redacción', 'Diseño editorial'];
  var ORG_SKILLS       = ['Organización de proyectos', 'Manejo de redes sociales', 'Diseño de marcas'];

  // Devuelve el rango numérico de una cadena de tiempo (0 si no reconocida).
  function getTimeRank(t) {
    return TIME_RANK[t] || 0;
  }

  // Devuelve el rango numérico de un semestre (0 si no reconocido).
  function getSemesterRank(s) {
    return SEMESTER_RANK[s] || 0;
  }

  window.DashboardDomain = {
    TIME_RANK:       TIME_RANK,
    SEMESTER_RANK:   SEMESTER_RANK,
    SEMESTER_ORDER:  SEMESTER_ORDER,
    VISUAL_SKILLS:   VISUAL_SKILLS,
    TECH_SKILLS:     TECH_SKILLS,
    EDITORIAL_SKILLS: EDITORIAL_SKILLS,
    ORG_SKILLS:      ORG_SKILLS,
    getTimeRank:     getTimeRank,
    getSemesterRank: getSemesterRank
  };

})();
