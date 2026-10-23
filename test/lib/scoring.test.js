// Ejecutar con: node --test test/lib/
const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('./scoring.js');

// Caso de prueba del CLAUDE.md: 42 años, 95 kg, 176 cm, grasa 25, P5 +0, P6 +0.075, adherencia 11.
function base(overrides) {
  return Object.assign({
    p1: 42, p2: { value: 95, unit: 'kg' }, p3: 176,
    p4: 'barriga', p5: 'sentado', p6: 'd1_2',
    // adherencia: 2+1+1+1+1+1+1+3 = 11
    p7: 'h6_7', p8: 'alto', p9: 'v3_4', p10: 'finde', p11: 'noche', p12: 'rebote_pocas', p13: 'familia', p14: 'tranquilo',
    // motivación: 2+2+2+2+2 = 10
    p15: ['barriga', 'energia'], p16: 'm6_2a', p17: 'frustra', p18: 8, p19: 'mes',
    // inversión: 4+3+1+3 = 11
    p20: 'empresa', p21: ['nutricionista', 'gym'], p22: 'menos30', p23: 'coach',
    p24: ['ninguna']
  }, overrides);
}

test('caso de prueba del documento', () => {
  const r = S.computeResult(base());
  assert.equal(r.bmr, 1845);
  assert.equal(r.maintenance, 2352);
  assert.equal(r.deficitPct, 15);
  assert.equal(r.calories, 2000);
  assert.equal(r.kg90, 4.1);
  assert.equal(r.protein, 171);
  assert.equal(r.scores.adherence, 11);
  assert.equal(r.profile, 'estrategia');
  assert.equal(r.title, 'Puedes hacer déficit, pero con estrategia: 2.000 kcal');
  assert.equal(r.medicalAlert, false);
  assert.deepEqual(r.brakes, []);
});

test('resumen para el setter igual al ejemplo', () => {
  const r = S.computeResult(base());
  assert.equal(r.summary,
    'Empresario, 42 años, 95 kg. Le molesta la barriga y la falta de energía. Probó nutricionista y gimnasio, rebota en las dietas. Quiere empezar este mes. Calorías: 2.000.');
});

test('nivel A: motivación ≥10 e inversión ≥8', () => {
  const r = S.computeResult(base());
  assert.equal(r.scores.motivation, 10);
  assert.equal(r.scores.investment, 11);
  assert.equal(r.level, 'A');
});

test('nivel B: motivación ≥10 con inversión <8', () => {
  const r = S.computeResult(base({ p20: 'empleado', p21: ['apps'], p22: 'nada', p23: 'plan' }));
  assert.equal(r.scores.investment, 2);
  assert.equal(r.level, 'B');
});

test('nivel B: motivación 6–9 con inversión ≥8', () => {
  const r = S.computeResult(base({ p18: 5 }));
  assert.equal(r.scores.motivation, 8);
  assert.equal(r.level, 'B');
});

test('nivel C: motivación e inversión bajas', () => {
  const r = S.computeResult(base({ p15: ['fotos'], p16: 'menos6m', p17: 'nada', p18: 3, p19: 'meses', p20: 'estudiante', p21: ['nada'], p22: 'nada', p23: 'gratis' }));
  assert.equal(r.scores.motivation, 3);
  assert.equal(r.scores.investment, 0);
  assert.equal(r.level, 'C');
});

test('nivel C siempre si es "solo curiosidad"', () => {
  const r = S.computeResult(base({ p19: 'curiosidad', p18: 10 }));
  assert.ok(r.scores.motivation >= 6 && r.scores.investment >= 8); // sin la regla sería B
  assert.equal(r.level, 'C');
});

test('alerta médica: mantiene números y la agrega al resumen', () => {
  const r = S.computeResult(base({ p24: ['diabetes', 'medicacion'] }));
  assert.equal(r.medicalAlert, true);
  assert.deepEqual(r.conditions, ['diabetes', 'medicacion']);
  assert.equal(r.calories, 2000);
  assert.match(r.summary, /Alerta médica: diabetes\/prediabetes y medicación diaria\./);
});

test('TCA: perfil "Primero, un profesional" sin calorías', () => {
  const r = S.computeResult(base({ p24: ['tca'] }));
  assert.equal(r.profile, 'profesional');
  assert.equal(r.title, 'Tu salud va primero');
  assert.equal(r.calories, null);
  assert.equal(r.kg90, null);
  assert.equal(r.protein, null);
  assert.equal(r.medicalAlert, true);
  assert.match(r.summary, /no aplica/);
});

test('menor de 18: termina sin resultado', () => {
  assert.deepEqual(S.computeResult({ p1: 17 }), { underage: true });
  assert.equal(S.isUnderage(17), true);
  assert.equal(S.isUnderage(18), false);
});

test('perfiles por adherencia', () => {
  const alta = S.computeResult(base({ p7: 'h7', p8: 'bajo', p9: 'nunca', p10: 'no', p11: 'casi_nunca', p12: 'mantuve', p13: 'yo', p14: 'tranquilo' }));
  assert.equal(alta.scores.adherence, 24);
  assert.equal(alta.profile, 'acelerar');
  assert.equal(alta.deficitPct, 20);

  const baja = S.computeResult(base({ p7: 'menos5', p8: 'tope', p9: 'v5', p10: 'varias', p11: 'ansiedad', p12: 'rebote_varias', p13: 'lo_que_haya', p14: 'no_aguanto' }));
  assert.equal(baja.scores.adherence, 0);
  assert.equal(baja.profile, 'suave');
  assert.equal(baja.deficitPct, 10);
  assert.equal(baja.brakes.length, 2); // máximo 2 frenos
  assert.match(baja.brakes[0], /Duermes menos de 5 horas/);
});

test('ajuste por grasa y límites 10–25 %', () => {
  const alta = { p7: 'h7', p8: 'bajo', p9: 'nunca', p10: 'no', p11: 'casi_nunca', p12: 'mantuve', p13: 'yo', p14: 'tranquilo' };
  assert.equal(S.computeResult(base(Object.assign({ p4: 'sobrepeso' }, alta))).deficitPct, 25); // 20 + 5
  assert.equal(S.computeResult(base({ p4: 'barriga_grande' })).deficitPct, 20);                 // 15 + 5
  assert.equal(S.computeResult(base({ p4: 'marcado' })).deficitPct, 10);                        // 15 − 5
  const baja = { p7: 'menos5', p8: 'tope', p9: 'v5', p10: 'varias', p11: 'ansiedad', p12: 'rebote_varias', p13: 'lo_que_haya', p14: 'no_aguanto' };
  assert.equal(S.computeResult(base(Object.assign({ p4: 'marcado' }, baja))).deficitPct, 10);   // 10 − 5 → mínimo 10
});

test('calorías nunca bajan de la TMB ni de 1.500', () => {
  const r = S.computeResult(base({ p1: 60, p2: { value: 55, unit: 'kg' }, p3: 160, p4: 'sobrepeso' }));
  assert.ok(r.calories >= 1500);
  assert.ok(r.calories >= r.bmr - 25); // redondeo a 50
  assert.equal(r.calories % 50, 0);
});

test('peso en libras', () => {
  assert.equal(S.weightKg({ value: 209.4, unit: 'lb' }), 95);
  assert.equal(S.computeResult(base({ p2: { value: 209.4, unit: 'lb' } })).calories, 2000);
});

test('inversión suma +1 si tiene quien cocine', () => {
  assert.equal(S.computeResult(base({ p13: 'servicio' })).scores.investment, 12);
});

test('topes: P15 máximo 4 y P21 máximo 6', () => {
  const r = S.computeResult(base({ p15: ['barriga', 'energia', 'ropa', 'medico', 'pareja', 'fotos'], p21: ['cirugia', 'entrenador', 'coach'] }));
  assert.equal(r.scores.motivation, 12); // 4 + 2 + 2 + 2 + 2
  assert.equal(r.scores.investment, 4 + 6 + 1 + 3);
});

test('el servidor rechaza respuestas inválidas en vez de confiar en el navegador', () => {
  assert.throws(() => S.computeResult(base({ p7: 'inventada' })), /Opción inválida/);
  assert.throws(() => S.computeResult(base({ p15: [] })), /Falta respuesta/);
  assert.throws(() => S.computeResult(base({ p24: ['ninguna', 'tca'] })), /no se combina/);
  assert.throws(() => S.computeResult(base({ p21: ['gym', 'gym'] })), /repetida/);
  assert.throws(() => S.computeResult(base({ p3: 300 })), /fuera de rango/);
  assert.throws(() => S.computeResult(base({ p18: 11 })), /fuera de rango/);
});

test('las 24 preguntas están definidas', () => {
  assert.equal(S.QUESTIONS.length, 24);
  assert.deepEqual(S.QUESTIONS.map(q => q.id), Array.from({ length: 24 }, (_, i) => 'p' + (i + 1)));
});
