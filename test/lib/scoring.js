/*
 * Test "¿Estás listo para un déficit calórico?" — lógica compartida front/back.
 *
 * Las respuestas se guardan como IDs de opción (nunca como puntos), así el servidor
 * puede recalcular todo con este mismo archivo sin confiar en lo que mande el navegador.
 * Funciona en el navegador (window.NousScoring) y en Node (module.exports).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.NousScoring = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var LB_TO_KG = 0.4536;
  var MIN_AGE = 18;

  var BLOCKS = {
    1: 'Tus datos',
    2: 'Tus hábitos',
    3: 'Lo que quieres cambiar',
    4: 'Lo que has intentado',
    5: 'Tu salud'
  };

  // pts: adherencia (bloque 2), motivación (bloque 3) o inversión (bloque 4).
  var QUESTIONS = [
    // ---- Bloque 1 · Datos ----
    { id: 'p1', block: 1, type: 'number', field: 'age', text: '¿Qué edad tienes?', unit: 'años', min: 10, max: 90 },
    { id: 'p2', block: 1, type: 'weight', field: 'weight', text: '¿Cuánto pesas?', min: 40, max: 250 },
    { id: 'p3', block: 1, type: 'number', field: 'height', text: '¿Cuánto mides?', unit: 'cm', min: 140, max: 220 },
    { id: 'p4', block: 1, type: 'single', text: '¿Cuál se parece más a tu cuerpo hoy?', options: [
      { id: 'marcado', label: 'Marcado, se ven abdominales', fat: 15 },
      { id: 'atletico', label: 'Algo de barriga, pero atlético', fat: 20 },
      { id: 'barriga', label: 'Barriga notoria', fat: 25 },
      { id: 'barriga_grande', label: 'Barriga grande y cintura ancha', fat: 30 },
      { id: 'sobrepeso', label: 'Sobrepeso evidente en todo el cuerpo', fat: 35 }
    ] },
    { id: 'p5', block: 1, type: 'single', text: '¿Cuánto te mueves en un día normal?', options: [
      { id: 'sentado', label: 'Casi todo el día sentado', factor: 0 },
      { id: 'poco', label: 'Camino algo, menos de 6.000 pasos', factor: 0.10 },
      { id: 'medio', label: 'Entre 6.000 y 10.000 pasos', factor: 0.20 },
      { id: 'activo', label: 'De pie o caminando casi todo el día', factor: 0.30 }
    ] },
    { id: 'p6', block: 1, type: 'single', text: '¿Cuántos días a la semana entrenas?', options: [
      { id: 'ninguno', label: 'Ninguno', factor: 0 },
      { id: 'd1_2', label: '1 a 2 días', factor: 0.075 },
      { id: 'd3_4', label: '3 a 4 días', factor: 0.15 },
      { id: 'd5', label: '5 o más días', factor: 0.225 }
    ] },

    // ---- Bloque 2 · Hábitos → Adherencia (0–24) ----
    { id: 'p7', block: 2, type: 'single', text: '¿Cuántas horas duermes por noche?', options: [
      { id: 'menos5', label: 'Menos de 5 horas', pts: 0 },
      { id: 'h5_6', label: 'Entre 5 y 6 horas', pts: 1 },
      { id: 'h6_7', label: 'Entre 6 y 7 horas', pts: 2 },
      { id: 'h7', label: '7 horas o más', pts: 3 }
    ] },
    { id: 'p8', block: 2, type: 'single', text: '¿Cómo está tu nivel de estrés?', options: [
      { id: 'tope', label: 'Al tope casi todos los días', pts: 0 },
      { id: 'alto', label: 'Alto varios días a la semana', pts: 1 },
      { id: 'manejable', label: 'Manejable', pts: 2 },
      { id: 'bajo', label: 'Bajo', pts: 3 }
    ] },
    { id: 'p9', block: 2, type: 'single', text: '¿Cuántas veces por semana comes fuera, por delivery o en el trabajo?', options: [
      { id: 'v5', label: '5 o más veces', pts: 0 },
      { id: 'v3_4', label: '3 a 4 veces', pts: 1 },
      { id: 'v1_2', label: '1 a 2 veces', pts: 2 },
      { id: 'nunca', label: 'Casi nunca', pts: 3 }
    ] },
    { id: 'p10', block: 2, type: 'single', text: '¿Cómo es tu consumo de alcohol?', options: [
      { id: 'varias', label: 'Varias veces por semana', pts: 0 },
      { id: 'finde', label: 'Fines de semana, y no poco', pts: 1 },
      { id: 'social', label: 'Social, poco', pts: 2 },
      { id: 'no', label: 'No tomo', pts: 3 }
    ] },
    { id: 'p11', block: 2, type: 'single', text: '¿Cuándo te cuesta más controlar lo que comes?', options: [
      { id: 'ansiedad', label: 'Por estrés o ansiedad, sin darme cuenta', pts: 0 },
      { id: 'noche', label: 'En la noche, después de cenar', pts: 1 },
      { id: 'salto', label: 'Me salto comidas y llego con mucha hambre', pts: 1 },
      { id: 'casi_nunca', label: 'Casi nunca me cuesta', pts: 3 }
    ] },
    { id: 'p12', block: 2, type: 'single', text: '¿Cómo te ha ido con las dietas antes?', options: [
      { id: 'rebote_varias', label: 'Varias veces: bajo y recupero todo o más', pts: 0 },
      { id: 'rebote_pocas', label: 'Una o dos veces: bajé y recuperé', pts: 1 },
      { id: 'nunca', label: 'Nunca he hecho una en serio', pts: 2 },
      { id: 'mantuve', label: 'Bajé y me mantuve', pts: 3 }
    ] },
    { id: 'p13', block: 2, type: 'single', text: '¿Quién se encarga de tu comida?', options: [
      { id: 'lo_que_haya', label: 'Como lo que haya o pido delivery', pts: 0 },
      { id: 'familia', label: 'Mi pareja o familia, sin control de lo que como', pts: 1 },
      { id: 'yo', label: 'Yo me organizo', pts: 3 },
      { id: 'servicio', label: 'Tengo quien cocine (empleada o servicio)', pts: 3, inv: 1 }
    ] },
    { id: 'p14', block: 2, type: 'single', text: 'Si desde mañana tuvieras que comer un 20 % menos…', options: [
      { id: 'no_aguanto', label: 'No aguantaría: hambre y mal humor', pts: 0 },
      { id: 'costaria', label: 'Me costaría, sobre todo de noche', pts: 1 },
      { id: 'si_resultados', label: 'Aguanto si veo resultados', pts: 2 },
      { id: 'tranquilo', label: 'Tranquilo, controlo el hambre', pts: 3 }
    ] },

    // ---- Bloque 3 · Dolor y deseo → Motivación (0–16) ----
    { id: 'p15', block: 3, type: 'multi', max: 4, text: '¿Qué es lo que más te molesta hoy de tu físico?', hint: 'Puedes elegir varias.', options: [
      { id: 'barriga', label: 'La barriga, no me gusta verme sin camisa', short: 'la barriga' },
      { id: 'energia', label: 'La falta de energía', short: 'la falta de energía' },
      { id: 'ropa', label: 'La ropa no me queda bien', short: 'que la ropa no le queda' },
      { id: 'medico', label: 'El médico me dijo que baje de peso', short: 'que el médico le pidió bajar de peso' },
      { id: 'pareja', label: 'Me siento inseguro con mi pareja', short: 'la inseguridad con su pareja' },
      { id: 'fotos', label: 'No me gusta cómo salgo en fotos', short: 'cómo sale en fotos' },
      { id: 'imagen', label: 'No doy la imagen que mi negocio necesita', short: 'no dar la imagen que su negocio necesita' }
    ] },
    { id: 'p16', block: 3, type: 'single', text: '¿Hace cuánto te molesta?', options: [
      { id: 'menos6m', label: 'Menos de 6 meses', pts: 1 },
      { id: 'm6_2a', label: 'Entre 6 meses y 2 años', pts: 2 },
      { id: 'mas2a', label: 'Más de 2 años', pts: 3 }
    ] },
    { id: 'p17', block: 3, type: 'single', text: 'Si en 12 meses sigues igual que hoy…', options: [
      { id: 'nada', label: 'No pasa nada', pts: 0 },
      { id: 'molesta', label: 'Me molestaría, pero puedo vivir con eso', pts: 1 },
      { id: 'frustra', label: 'Me frustraría bastante', pts: 2 },
      { id: 'no_puedo', label: 'No me lo puedo permitir: salud, imagen y negocio', pts: 3 }
    ] },
    { id: 'p18', block: 3, type: 'scale', min: 1, max: 10, text: 'Del 1 al 10, ¿qué tan importante es para ti cambiar tu físico en los próximos 90 días?' },
    { id: 'p19', block: 3, type: 'single', text: '¿Cuándo quieres empezar?', options: [
      { id: 'semana', label: 'Esta semana', pts: 3, short: 'Quiere empezar esta semana' },
      { id: 'mes', label: 'Este mes', pts: 2, short: 'Quiere empezar este mes' },
      { id: 'meses', label: 'En unos meses', pts: 1, short: 'Quiere empezar en unos meses' },
      { id: 'curiosidad', label: 'Solo tengo curiosidad', pts: 0, short: 'Hizo el test por curiosidad' }
    ] },

    // ---- Bloque 4 · Lo intentado → Inversión (0–17) ----
    { id: 'p20', block: 4, type: 'single', text: '¿A qué te dedicas?', options: [
      { id: 'empresa', label: 'Tengo empresa propia con equipo', pts: 4, short: 'Empresario' },
      { id: 'gerente', label: 'Soy gerente o director', pts: 3, short: 'Gerente/director' },
      { id: 'independiente', label: 'Independiente o consultor', pts: 3, short: 'Independiente' },
      { id: 'empleado', label: 'Empleado', pts: 1, short: 'Empleado' },
      { id: 'estudiante', label: 'Estudiante o sin trabajo fijo', pts: 0, short: 'Estudiante/sin trabajo fijo' }
    ] },
    { id: 'p21', block: 4, type: 'multi', max: 6, exclusive: 'nada', text: '¿Qué has probado para mejorar tu físico?', hint: 'Puedes elegir varias.', options: [
      { id: 'nada', label: 'Nada todavía', pts: 0 },
      { id: 'apps', label: 'Apps o planes gratis', pts: 0, short: 'apps gratis' },
      { id: 'gym', label: 'Gimnasio por mi cuenta', pts: 1, short: 'gimnasio' },
      { id: 'pastillas', label: 'Pastillas, quemadores o inyecciones', pts: 2, short: 'quemadores o inyecciones' },
      { id: 'nutricionista', label: 'Nutricionista', pts: 2, short: 'nutricionista' },
      { id: 'entrenador', label: 'Entrenador personal', pts: 3, short: 'entrenador personal' },
      { id: 'coach', label: 'Coach o programa online', pts: 3, short: 'coach online' },
      { id: 'esteticos', label: 'Tratamientos estéticos', pts: 3, short: 'tratamientos estéticos' },
      { id: 'cirugia', label: 'Cirugía (lipo, manga, balón)', pts: 4, short: 'cirugía' }
    ] },
    { id: 'p22', block: 4, type: 'single', text: '¿Cuánto gastas al mes en suplementos?', options: [
      { id: 'nada', label: 'Nada', pts: 0 },
      { id: 'menos30', label: 'Menos de $30', pts: 1 },
      { id: 'd30_80', label: 'Entre $30 y $80', pts: 2 },
      { id: 'mas80', label: 'Más de $80', pts: 3 }
    ] },
    { id: 'p23', block: 4, type: 'single', text: '¿Cómo te gustaría lograrlo?', options: [
      { id: 'gratis', label: 'Solo con información gratis', pts: 0 },
      { id: 'plan', label: 'Con un plan para seguir por mi cuenta', pts: 1 },
      { id: 'coach', label: 'Con un coach 1 a 1 que me haga seguimiento', pts: 3 }
    ] },

    // ---- Bloque 5 · Salud ----
    { id: 'p24', block: 5, type: 'multi', exclusive: 'ninguna', text: '¿Tienes alguna de estas condiciones?', hint: 'Puedes elegir varias.', options: [
      { id: 'diabetes', label: 'Diabetes o prediabetes', short: 'diabetes/prediabetes' },
      { id: 'presion', label: 'Presión alta o problemas del corazón', short: 'presión alta/corazón' },
      { id: 'tiroides', label: 'Tiroides', short: 'tiroides' },
      { id: 'medicacion', label: 'Tomo medicación a diario', short: 'medicación diaria' },
      { id: 'tca', label: 'Trastorno de la conducta alimentaria (actual o pasado)', short: 'TCA' },
      { id: 'ninguna', label: 'Ninguna' }
    ] }
  ];

  var BY_ID = {};
  QUESTIONS.forEach(function (q) { BY_ID[q.id] = q; });

  var PROFILES = {
    acelerar: { name: 'Listo para acelerar', title: 'Estás listo para un déficit: tu número es {cal} kcal' },
    estrategia: { name: 'Listo, con estrategia', title: 'Puedes hacer déficit, pero con estrategia: {cal} kcal' },
    suave: { name: 'Déficit suave primero', title: 'Hoy un déficit fuerte te haría rebotar: empieza con {cal} kcal' },
    profesional: { name: 'Primero, un profesional', title: 'Tu salud va primero' }
  };

  // "Frenos": se muestran hasta 2, en este orden, cuando la respuesta suma 0.
  var BRAKES = {
    p7: 'Duermes menos de 5 horas: con poco sueño sube el hambre y cuesta mucho más sostener el déficit.',
    p9: 'Comes fuera 5 o más veces por semana: ahí se esconden muchas calorías, así que esas comidas hay que planificarlas.',
    p10: 'Tomas alcohol varias veces por semana: suma calorías y frena la pérdida de grasa.',
    p11: 'Comes por estrés o ansiedad sin darte cuenta: necesitas una estrategia para esos momentos, no solo fuerza de voluntad.',
    p14: 'Hoy te costaría mucho comer menos: por eso tu déficit tiene que empezar de forma progresiva.'
  };

  // ---------- utilidades ----------
  function option(qid, oid) {
    var q = BY_ID[qid];
    if (!q || !q.options) throw new Error('Pregunta desconocida: ' + qid);
    for (var i = 0; i < q.options.length; i++) if (q.options[i].id === oid) return q.options[i];
    throw new Error('Opción inválida en ' + qid + ': ' + oid);
  }

  function list(qid, value) {
    if (!Array.isArray(value) || value.length === 0) throw new Error('Falta respuesta en ' + qid);
    var q = BY_ID[qid];
    var seen = {};
    var opts = value.map(function (oid) {
      if (seen[oid]) throw new Error('Opción repetida en ' + qid + ': ' + oid);
      seen[oid] = true;
      return option(qid, oid);
    });
    if (q.exclusive && seen[q.exclusive] && opts.length > 1) throw new Error('"' + q.exclusive + '" no se combina con otras en ' + qid);
    return opts;
  }

  function num(value, name, min, max) {
    var n = typeof value === 'string' ? Number(value.replace(',', '.')) : value;
    if (typeof n !== 'number' || !isFinite(n)) throw new Error('Valor inválido: ' + name);
    if (n < min || n > max) throw new Error(name + ' fuera de rango (' + min + '–' + max + ')');
    return n;
  }

  function sum(opts, key) {
    return opts.reduce(function (t, o) { return t + (o[key] || 0); }, 0);
  }

  function round1(n) { return Math.round(n * 10) / 10; }

  function formatInt(n) {
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  function weightKg(answer) {
    // answer: { value, unit: 'kg' | 'lb' }  o un número (kg)
    var a = typeof answer === 'object' && answer !== null ? answer : { value: answer, unit: 'kg' };
    var unit = a.unit === 'lb' ? 'lb' : 'kg';
    var v = num(a.value, 'Peso', unit === 'lb' ? 88 : 40, unit === 'lb' ? 550 : 250);
    return unit === 'lb' ? round1(v * LB_TO_KG) : v;
  }

  function isUnderage(age) {
    var n = typeof age === 'string' ? Number(age) : age;
    return typeof n === 'number' && isFinite(n) && n < MIN_AGE;
  }

  // ---------- cálculo principal ----------
  function computeResult(answers) {
    if (!answers || typeof answers !== 'object') throw new Error('Sin respuestas');

    var age = num(answers.p1, 'Edad', 0, 90);
    if (age < MIN_AGE) return { underage: true };
    var weight = weightKg(answers.p2);
    var height = num(answers.p3, 'Altura', 140, 220);

    var p4 = option('p4', answers.p4);
    var p5 = option('p5', answers.p5);
    var p6 = option('p6', answers.p6);
    var fat = p4.fat;

    // Adherencia (P7–P14)
    var habit = ['p7', 'p8', 'p9', 'p10', 'p11', 'p12', 'p13', 'p14'].map(function (id) { return option(id, answers[id]); });
    var adherence = sum(habit, 'pts');

    // Motivación (P15–P19)
    var p15 = list('p15', answers.p15);
    var p18 = num(answers.p18, 'Importancia', 1, 10);
    var p18pts = p18 >= 9 ? 3 : p18 === 8 ? 2 : p18 === 7 ? 1 : 0;
    var p19 = option('p19', answers.p19);
    var motivation = Math.min(p15.length, 4) + option('p16', answers.p16).pts + option('p17', answers.p17).pts + p18pts + p19.pts;

    // Inversión (P20–P23 + P13 servicio)
    var p20 = option('p20', answers.p20);
    var p21 = list('p21', answers.p21);
    var investment = p20.pts + Math.min(sum(p21, 'pts'), 6) + option('p22', answers.p22).pts + option('p23', answers.p23).pts + (habit[6].inv || 0);

    // Salud (P24)
    var p24 = list('p24', answers.p24);
    var conditions = p24.filter(function (o) { return o.id !== 'ninguna'; });
    var medicalAlert = conditions.length > 0;
    var tca = conditions.some(function (o) { return o.id === 'tca'; });

    // Fórmulas
    var bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    var maintenance = bmr * (1.2 + p5.factor + p6.factor);
    var deficit = adherence >= 17 ? 20 : adherence >= 9 ? 15 : 10;
    if (fat >= 30) deficit += 5;
    else if (fat === 15) deficit -= 5;
    deficit = Math.min(25, Math.max(10, deficit));
    var calories = Math.round(Math.max(maintenance * (1 - deficit / 100), bmr, 1500) / 50) * 50;
    var kg90 = round1(Math.max(0, maintenance - calories) * 90 / 7700);
    var protein = Math.round(2.4 * weight * (1 - fat / 100));

    // Perfil que ve el lead
    var profile = tca ? 'profesional' : adherence >= 17 ? 'acelerar' : adherence >= 9 ? 'estrategia' : 'suave';

    // Nivel interno (el lead no lo ve)
    var level;
    if (p19.id === 'curiosidad') level = 'C';
    else if (motivation >= 10 && investment >= 8) level = 'A';
    else if ((motivation >= 10 && investment < 8) || (motivation >= 6 && motivation <= 9 && investment >= 8)) level = 'B';
    else level = 'C';

    var brakes = ['p7', 'p9', 'p10', 'p11', 'p14']
      .filter(function (id) { return option(id, answers[id]).pts === 0; })
      .slice(0, 2)
      .map(function (id) { return BRAKES[id]; });

    var showNumbers = profile !== 'profesional';

    return {
      underage: false,
      profile: profile,
      profileName: PROFILES[profile].name,
      title: PROFILES[profile].title.replace('{cal}', formatInt(calories)),
      level: level,
      scores: { adherence: adherence, motivation: motivation, investment: investment },
      medicalAlert: medicalAlert,
      conditions: conditions.map(function (o) { return o.id; }),
      brakes: brakes,
      data: { age: age, weightKg: weight, heightCm: height, bodyFat: fat },
      bmr: Math.round(bmr),
      maintenance: Math.round(maintenance),
      deficitPct: deficit,
      calories: showNumbers ? calories : null,
      kg90: showNumbers ? kg90 : null,
      protein: showNumbers ? protein : null,
      summary: buildSummary({
        age: age, weight: weight, p15: p15, p20: p20, p21: p21, p12: habit[5], p19: p19,
        calories: showNumbers ? calories : null, conditions: conditions
      })
    };
  }

  function joinEs(items) {
    if (items.length <= 1) return items.join('');
    return items.slice(0, -1).join(', ') + ' y ' + items[items.length - 1];
  }

  function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  // Resumen para el setter, ej.: "Empresario, 42 años, 95 kg. Le molesta la barriga y la falta
  // de energía. Probó nutricionista y gimnasio, rebota en las dietas. Quiere empezar este mes. Calorías: 2.000."
  function buildSummary(s) {
    var parts = [s.p20.short + ', ' + s.age + ' años, ' + formatInt(s.weight) + ' kg.'];
    parts.push('Le molesta ' + joinEs(s.p15.map(function (o) { return o.short; })) + '.');

    var tried = s.p21.filter(function (o) { return o.short; }).map(function (o) { return o.short; });
    var diet = s.p12.id === 'rebote_varias' || s.p12.id === 'rebote_pocas' ? 'rebota en las dietas'
      : s.p12.id === 'mantuve' ? 'bajó y mantuvo con dietas' : 'nunca hizo dieta en serio';
    parts.push(capitalize((tried.length ? 'probó ' + joinEs(tried) : 'no ha probado nada') + ', ' + diet + '.'));

    parts.push(s.p19.short + '.');
    if (s.conditions.length) parts.push('Alerta médica: ' + joinEs(s.conditions.map(function (o) { return o.short; })) + '.');
    parts.push(s.calories ? 'Calorías: ' + formatInt(s.calories) + '.' : 'Calorías: no aplica (derivar a profesional).');
    return parts.join(' ');
  }

  return {
    QUESTIONS: QUESTIONS,
    BLOCKS: BLOCKS,
    PROFILES: PROFILES,
    MIN_AGE: MIN_AGE,
    LB_TO_KG: LB_TO_KG,
    computeResult: computeResult,
    isUnderage: isUnderage,
    weightKg: weightKg,
    formatInt: formatInt
  };
});
