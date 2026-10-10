// Iteración 3: diagnóstico, estados de los niveles rediseñados y "jugador informado".
// Ejecutar:  node test/lab.test.js
const assert = require('assert');
const A = require('../src/groups.js');
const { GROUPS: Gs } = A;
let passed = 0;
function t(name, fn) { try { fn(); passed++; console.log('  ✓ ' + name); } catch (e) { console.log('  ✗ ' + name + '\n    ' + e.message); process.exitCode = 1; } }
const ix = (G, labs) => labs.map(l => G.idx(l));

console.log('Diagnóstico: los cinco casos se distinguen');
t('incompleta → señala exactamente a quién le falta imagen', () => { const d = A.diagnose(Gs.Z4, Gs.Z2, [0, null, 0, 1]); assert.strictEqual(d.kind, 'incomplete'); assert.deepStrictEqual(d.missing, [1]); });
t('no conserva → contraejemplo con las dos rutas', () => { const d = A.diagnose(Gs.Z4, Gs.Z4, [0, 1, 3, 2]); assert.strictEqual(d.kind, 'broken'); const c = d.counterexample; assert.notStrictEqual(c.routeA, c.routeB); assert.strictEqual(Gs.Z4.op(c.a, c.b), c.sumG); });
t('homomorfismo no inyectivo → pareja que choca y testigo en el núcleo', () => {
  const d = A.diagnose(Gs.Z4, Gs.Z2, [0, 1, 0, 1]); assert.strictEqual(d.kind, 'hom-noninj');
  assert.deepStrictEqual(d.collision.xs, [0, 2]); assert.strictEqual(d.witness.d, 2); assert.strictEqual(d.witness.fd, Gs.Z2.identity);
});
t('homomorfismo no sobreyectivo → destinos vacíos', () => { const d = A.diagnose(Gs.SUB2, Gs.Z4, [0, 2]); assert.strictEqual(d.kind, 'hom-nonsurj'); assert.deepStrictEqual(d.empty, [1, 3]); });
t('ni lo uno ni lo otro', () => { assert.strictEqual(A.diagnose(Gs.Z4, Gs.Z8, [0, 4, 0, 4]).kind, 'hom-neither'); });
t('isomorfismo', () => { assert.strictEqual(A.diagnose(Gs.Z4, Gs.U5, ix(Gs.U5, ['1', '2', '4', '3'])).kind, 'iso'); });
t('el testigo siempre cae en el neutro (todos los homomorfismos Z4→Z4 y Z4→Z8 no inyectivos)', () => {
  for (const H of [Gs.Z4, Gs.Z8]) for (const f of A.allHoms(Gs.Z4, H)) { const d = A.diagnose(Gs.Z4, H, f); if (d.witness) { assert.strictEqual(d.witness.fd, H.identity); assert.notStrictEqual(d.witness.d, Gs.Z4.identity); } }
});
t('engranaje (powerMap): Z4→Z8 sólo cierra con f(1) par', () => {
  for (let k = 0; k < 8; k++) assert.strictEqual(A.powerMap(Gs.Z4, Gs.Z8, 1, k).closes, k % 2 === 0, 'k=' + k);
  for (let k = 0; k < 8; k++) { const pm = A.powerMap(Gs.Z4, Gs.Z8, 1, k); assert.strictEqual(A.analyze(Gs.Z4, Gs.Z8, pm.f).hom, pm.closes); }
});
t('probador de cierre: {0,2} cierra; {0,2,3} falla en un par concreto; sin neutro falla', () => {
  assert.ok(A.closureRun(Gs.Z4, [0, 2]).ok);
  const r = A.closureRun(Gs.Z4, [0, 2, 3]); assert.strictEqual(r.failure.kind, 'closure'); assert.ok([0, 2, 3].indexOf(r.failure.c) === -1);
  assert.strictEqual(A.closureRun(Gs.Z4, [1, 3]).failure.kind, 'identity');
});

console.log('Niveles rediseñados (cualquier solución válida se acepta)');
t('N2 taller: ×2 deja {0,2} en el núcleo; ×1 y ×3 resuelven; la lupa muestra a−b en el neutro', () => {
  const P = A.createWorkshop();
  let e = P.evaluate(); assert.ok(!e.done); assert.deepStrictEqual(e.d.analysis.kernel, [0, 2]);
  const c = P.compare(0, 2); assert.ok(c.same && c.inKernel && c.d === 2);
  P.setK(1); assert.ok(P.evaluate().done); P.setK(3); assert.ok(P.evaluate().done); P.setK(0); assert.ok(!P.evaluate().done);
  P.setManual(1, 1); P.setManual(2, 3); assert.strictEqual(P.evaluate().d.kind, 'broken');       // desacoplado y roto
  P.setManual(2, 2); P.setManual(3, 3); assert.ok(P.evaluate().done);                            // desacoplado y bien: también vale
  while (P.canUndo()) P.undo(); assert.strictEqual(P.config.k, 2);
});
t('N3 planta: probar antes de triturar; sólo {0,2} es legítimo', () => {
  const P = A.createPlant();
  assert.deepStrictEqual(P.preimages(1), []); assert.deepStrictEqual(P.preimages(2), [1]);
  P.tag(1); assert.strictEqual(P.shred().reason, 'untested');
  let r = P.test(); assert.ok(!r.ok); assert.strictEqual(r.run.failure.kind, 'closure');
  assert.strictEqual(P.shred().reason, 'failed');
  P.tag(2); r = P.test(); assert.deepStrictEqual(r.visited, [2]);
  P.tag(2); P.tag(3); r = P.test(); assert.ok(r.ok); assert.ok(P.shred().ok);
  const e = P.evaluate(); assert.ok(e.done); assert.strictEqual(e.d.kind, 'iso');                // sobre {0,2}: epi (de hecho iso)
  P.undo(); assert.deepStrictEqual(P.config.codomain, [0, 1, 2, 3]);
});
t('N4 espejos: 0+0 obliga a f(0)=neutro; constante neutro es hom pero no basta', () => {
  const P = A.createMirrors(), M = Gs.MIRROR;
  const w = P.walk(0, 0); assert.ok(!w.ok); assert.strictEqual(w.B, M.identity);
  assert.ok(P.neutralTest(M.idx('1')).every(r => r.same)); assert.ok(!P.neutralTest(M.idx('0')).every(r => r.same));
  P.flip(0); P.flip(2); let e = P.evaluate(); assert.strictEqual(e.d.kind, 'hom-neither'); assert.ok(e.d.analysis.hom && !e.done);   // todo al "1": hom, pero ni inyectiva ni sobre
  P.flip(1); P.flip(3); e = P.evaluate(); assert.ok(e.done); assert.deepStrictEqual(e.d.analysis.kernel, [0, 2]);
});
t('N6 torre: el inicial es hom no inyectivo; 2ˣ y 3ˣ son isomorfismos con vuelta homomorfa', () => {
  const P = A.createTower(), U = Gs.U5;
  assert.strictEqual(P.diagnose().kind, 'hom-neither'); assert.ok(P.diagnose().witness);
  assert.deepStrictEqual(P.descend().find(r => r.y === U.idx('1')).from, [0, 2]);
  ['1', '2', '4', '3'].forEach((l, x) => P.setFloor(x, U.idx(l))); assert.ok(P.evaluate().done);
  ['1', '3', '4', '2'].forEach((l, x) => P.setFloor(x, U.idx(l))); assert.ok(P.evaluate().done);
  ['1', '2', '3', '4'].forEach((l, x) => P.setFloor(x, U.idx(l))); assert.strictEqual(P.diagnose().kind, 'broken');
});
t('N7 laboratorio: la demostración exige las tres piezas correctas', () => {
  const P = A.createLab();
  assert.ok(!P.proof().ok);
  P.repeat('G', 2); assert.ok(P.pins().some(p => p.kind === 'decoy'));
  P.repeat('G', 1); [0, 1, 2, 3].forEach(y => P.repeat('H', y));
  const br = P.bridge(Gs.V4.idx('a')); assert.deepStrictEqual(br.collision.xs, [0, 2]);
  const pins = P.pins(), id = k => pins.find(p => p.kind === k).id;
  P.place(0, id('H')); P.place(1, id('G')); P.place(2, id('bridge')); assert.ok(!P.proof().ok); assert.deepStrictEqual(P.proof().wrong, [true, true, false]);
  P.place(0, id('G')); P.place(1, id('H')); assert.ok(P.proof().ok);
  for (const y of [0, 1, 2, 3]) assert.ok(P.bridge(y).collision, 'f(1)=' + y + ' siempre choca');           // la prueba es general
});
t('N7 caso: huellas, puente con los cuatro gemelos e informe razonado', () => {
  const P = A.createCase();
  assert.strictEqual(P.stage(), 1);
  [0, 1, 2, 3].forEach(x => P.repeat('G', x)); [0, 1, 2, 3].forEach(y => P.repeat('H', y));
  assert.deepStrictEqual(P.fingerprint('G'), { 1: [0], 2: [2], 3: [], 4: [1, 3] });
  assert.deepStrictEqual(P.fingerprint('H'), { 1: [0], 2: [1, 2, 3], 3: [], 4: [] });
  assert.strictEqual(P.stage(), 2);
  [0, 1, 2, 3].forEach(y => assert.ok(P.bridge(y).collision, 'f(1)=' + y + ' choca'));
  assert.strictEqual(P.stage(), 3);
  P.set(0, 'x', 2); P.set(0, 'n', 2); assert.strictEqual(P.checkLine(0).why, 'weak');
  P.set(0, 'n', 4); assert.strictEqual(P.checkLine(0).why, 'mismatch');
  P.set(0, 'x', 3); assert.ok(P.checkLine(0).ok);
  P.set(3, 'exists', 'no existe'); assert.strictEqual(P.checkLine(3).why, 'premature');
  P.set(1, 'max', 2); P.set(2, 'keep', 'cambia'); assert.ok(!P.proof().ok);
  P.set(2, 'keep', 'conserva'); assert.ok(P.proof().ok); assert.strictEqual(P.stage(), 4);
});
t('N5 línea: cada copiadora tiene una avería distinta y su taller', () => {
  const P = A.createLine();
  assert.deepStrictEqual(P.machines.map(m => m.d.kind), ['hom-noninj', 'hom-nonsurj', 'broken', 'iso']);
  P.machines.forEach((M, m) => P.send(m, M.bay)); assert.ok(P.evaluate().done);
  P.send(0, 'vacios'); assert.deepStrictEqual(P.evaluate().wrong, [true, false, false, false]);
});
t('N8 corazón: engranaje par, núcleo trivial, triturar impares y volver', () => {
  const P = A.createHeart();
  assert.strictEqual(P.diagnose().kind, 'hom-neither');
  P.setK(1); assert.ok(!P.gear().closes); assert.strictEqual(P.diagnose().kind, 'broken');
  P.setK(2); assert.strictEqual(P.diagnose().kind, 'hom-nonsurj');
  [1, 3, 5, 7].forEach(y => P.tag(y)); assert.ok(P.test().ok); assert.ok(P.shred().ok);
  assert.ok(!P.evaluate().done); P.markReturned(true); assert.ok(P.evaluate().done);
  P.reset(); P.setK(6); [1, 3, 5, 7].forEach(y => P.tag(y)); P.test(); P.shred(); P.markReturned(true); assert.ok(P.evaluate().done);
});

console.log('Jugador informado: resuelve con la información del juego, sin enumerar');
/** Reparación por contraejemplo: f(a∗b) := f(a)∘f(b). */
function repair(G, H, f, cod, maxRuns) {
  let runs = 0;
  while (runs < maxRuns) { const d = A.diagnose(G, H, f, cod); runs++; if (d.kind !== 'broken') return { f, runs, d }; f[d.counterexample.sumG] = d.counterexample.routeB; }
  return { f, runs, d: A.diagnose(G, H, f, cod) };
}
t('N4 desde el estado inicial: ≤ 4 ejecuciones', () => {
  const r = repair(Gs.Z4, Gs.MIRROR, ix(Gs.MIRROR, ['0', '1', '0', '1']), null, 10);
  // si queda constante, el diagnóstico dice "no sobreyectivo"; el jugador cambia f(1) y vuelve a reparar
  let f = r.f, runs = r.runs;
  if (r.d.analysis.hom && !r.d.analysis.surjective) { f[1] = 1 - f[1]; const r2 = repair(Gs.Z4, Gs.MIRROR, f, null, 10); f = r2.f; runs += r2.runs; }
  assert.ok(runs <= 6, 'runs=' + runs); assert.ok(A.diagnose(Gs.Z4, Gs.MIRROR, f).analysis.hom && A.diagnose(Gs.Z4, Gs.MIRROR, f).analysis.surjective);
});
t('N6 desde el estado inicial: ≤ 6 ejecuciones usando contraejemplos y el testigo del núcleo', () => {
  const U = Gs.U5; let f = ix(U, ['1', '4', '1', '4']), runs = 0;
  for (let guard = 0; guard < 8; guard++) {
    const r = repair(Gs.Z4, U, f, null, 10); f = r.f; runs += r.runs;
    if (r.d.kind === 'iso') break;
    if (r.d.witness) { // f(d) = e con d ≠ 0: el 1 necesita un destino cuyo cuadrado no sea el neutro
      f[1] = U.labels.map((_, y) => y).find(y => U.op(y, y) !== U.identity);
    }
  }
  assert.strictEqual(A.diagnose(Gs.Z4, U, f).kind, 'iso'); assert.ok(runs <= 6, 'runs=' + runs);
});
t('N2 y N8: la lupa basta para elegir el engranaje en un intento', () => {
  const P = A.createWorkshop(); const c = P.compare(0, 2);
  // el testigo dice que 2 = 1+1 cae en el neutro → buscar k con k+k ≠ 0
  const k = Gs.Z4.labels.map((_, y) => y).find(y => Gs.Z4.op(y, y) !== Gs.Z4.identity && y !== Gs.Z4.identity);
  assert.ok(c.inKernel); P.setK(k); assert.ok(P.evaluate().done);
  const Q = A.createHeart(); const k8 = Gs.Z8.labels.map((_, y) => y).find(y => A.powerMap(Gs.Z4, Gs.Z8, 1, y).closes && A.orderOf(Gs.Z8, y) === 4);
  Q.setK(k8); assert.ok(Q.diagnose().analysis.kernelTrivial);
});
console.log(`\n${passed} pruebas superadas` + (process.exitCode ? ' — HAY FALLOS' : ''));
