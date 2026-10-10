// Pruebas de grupos genéricos y de los niveles 2–8.  Ejecutar:  node test/groups.test.js
const assert = require('assert');
const A = require('../src/groups.js');
const { GROUPS: Gs, analyze } = A;
let passed = 0;
function t(name, fn) { try { fn(); passed++; console.log('  ✓ ' + name); } catch (e) { console.log('  ✗ ' + name + '\n    ' + e.message); process.exitCode = 1; } }
const idx = (G, labs) => labs.map(l => G.idx(l));
const lab = (G, f) => f.map(i => G.labels[i]);

console.log('Grupos');
t('todos los grupos cumplen los axiomas', () => { for (const k in Gs) assert.ok(A.groupAxioms(Gs[k]).isGroup, k); });
t('identidades reales: Z4→0, U5→1, espejo→1, V4→e', () => {
  assert.strictEqual(Gs.Z4.labels[Gs.Z4.identity], '0'); assert.strictEqual(Gs.U5.labels[Gs.U5.identity], '1');
  assert.strictEqual(Gs.MIRROR.labels[Gs.MIRROR.identity], '1'); assert.strictEqual(Gs.V4.labels[Gs.V4.identity], 'e');
});
t('tablas: 3+3=2 en Z4, 2×3=1 en U5, 0⊙0=1 en el espejo, a∘b=c en V4', () => {
  const g = Gs.Z4; assert.strictEqual(g.labels[g.op(g.idx('3'), g.idx('3'))], '2');
  const u = Gs.U5; assert.strictEqual(u.labels[u.op(u.idx('2'), u.idx('3'))], '1');
  const m = Gs.MIRROR; assert.strictEqual(m.labels[m.op(m.idx('0'), m.idx('0'))], '1');
  const v = Gs.V4; assert.strictEqual(v.labels[v.op(v.idx('a'), v.idx('b'))], 'c');
});
t('órdenes: Z4 = [1,2,4,4], V4 = [1,2,2,2], U5 = [1,2,4,4]', () => {
  assert.deepStrictEqual(A.orderProfile(Gs.Z4), [1, 2, 4, 4]);
  assert.deepStrictEqual(A.orderProfile(Gs.V4), [1, 2, 2, 2]);
  assert.deepStrictEqual(A.orderProfile(Gs.U5), [1, 2, 4, 4]);
  assert.deepStrictEqual(lab(Gs.Z4, A.powers(Gs.Z4, 1)), ['1', '2', '3', '0']);
});
t('subgrupos de Z4: {0,2} sí; {0,1}, {0,2,3}, {1,3} no (con testigo)', () => {
  assert.ok(A.subgroupReport(Gs.Z4, [0, 2]).ok);
  assert.strictEqual(A.subgroupReport(Gs.Z4, [0, 1]).failure.kind, 'closure');
  const r = A.subgroupReport(Gs.Z4, [0, 2, 3]); assert.strictEqual(r.ok, false);
  assert.strictEqual(A.subgroupReport(Gs.Z4, [1, 3]).failure.kind, 'identity');
});

console.log('Homomorfismos genéricos');
t('identidad Z4→Z4: isomorfismo, núcleo {0}', () => { const r = analyze(Gs.Z4, Gs.Z4, [0, 1, 2, 3]); assert.ok(r.iso && r.kernelTrivial && r.inverseHom); });
t('x mod 2: Z4→Z2 epimorfismo, no monomorfismo, núcleo {0,2}', () => {
  const r = analyze(Gs.Z4, Gs.Z2, [0, 1, 0, 1]);
  assert.ok(r.hom && r.epi && !r.mono && !r.iso); assert.deepStrictEqual(r.kernel, [0, 2]); assert.strictEqual(r.checkedPairs, 16);
});
t('f(0)=0 no basta: biyección que no conserva la suma se rechaza', () => {
  const r = analyze(Gs.Z4, Gs.Z4, [0, 1, 3, 2]); assert.ok(!r.hom && r.injective && r.surjective && !r.iso && !r.mono && !r.epi);
});
t('el núcleo usa la identidad real: espejo, f = par→"1"', () => {
  const f = idx(Gs.MIRROR, ['1', '0', '1', '0']);
  const r = analyze(Gs.Z4, Gs.MIRROR, f); assert.ok(r.hom && r.identityOk && r.surjective); assert.deepStrictEqual(r.kernel, [0, 2]);
});
t('espejo: conectar "0" con "0" por apariencia falla en 0+0', () => {
  const r = analyze(Gs.Z4, Gs.MIRROR, idx(Gs.MIRROR, ['0', '1', '0', '1']));
  assert.ok(!r.hom && !r.identityOk); assert.deepStrictEqual([r.counterexample.a, r.counterexample.b], [0, 0]);
});
t('sólo dos homomorfismos Z4→espejo y sólo uno sobreyectivo', () => {
  const hs = A.allHoms(Gs.Z4, Gs.MIRROR).map(f => lab(Gs.MIRROR, f).join(''));
  assert.deepStrictEqual(hs.sort(), ['1010', '1111']);
});
t('Z4 ≅ U5 (2 isomorfismos), Z4 ≇ V4 (0 de 24), Aut(V4) = 6', () => {
  assert.deepStrictEqual(A.isomorphisms(Gs.Z4, Gs.U5).map(f => lab(Gs.U5, f).join('')).sort(), ['1243', '1342']);
  assert.strictEqual(A.permutations([0, 1, 2, 3]).length, 24);
  assert.strictEqual(A.isomorphisms(Gs.Z4, Gs.V4).length, 0);
  assert.strictEqual(A.isomorphisms(Gs.V4, Gs.V4).length, 6);
});
t('inclusión {0,2}→Z4: monomorfismo no sobreyectivo; sobre {0,2} es epimorfismo', () => {
  const f = idx(Gs.Z4, ['0', '2']);
  const r = analyze(Gs.SUB2, Gs.Z4, f); assert.ok(r.mono && !r.surjective && !r.epi); assert.deepStrictEqual(lab(Gs.Z4, r.unreached), ['1', '3']);
  const r2 = analyze(Gs.SUB2, Gs.Z4, f, [0, 2]); assert.ok(r2.epi && r2.iso && r2.codomainReport.ok);
});
t('codominio que no es grupo: no hay epimorfismo aunque sea sobreyectiva', () => {
  const r = analyze(Gs.SUB2, Gs.Z4, [0, 1], [0, 1]); // {0,1} no es subgrupo
  assert.ok(!r.codomainReport.ok && !r.epi);
});
t('función parcial nunca es homomorfismo', () => { assert.ok(!analyze(Gs.Z4, Gs.Z2, [0, 1, null, 1]).hom); });

console.log('Niveles');
t('N2: el inicial (×2) tiene núcleo {0,2}; la identidad y la negación lo resuelven', () => {
  const P = A.createPuzzle(2);
  let e = P.evaluate(); assert.ok(e.analysis.hom && !e.done); assert.deepStrictEqual(e.analysis.kernel, [0, 2]);
  [0, 1, 2, 3].forEach((y, x) => P.plug(x, y)); assert.ok(P.evaluate().done);
  P.reset(); [0, 3, 2, 1].forEach((y, x) => P.plug(x, y)); assert.ok(P.evaluate().done);
  P.reset(); [0, 1, 0, 1].forEach((y, x) => P.plug(x, y)); assert.ok(!P.evaluate().analysis.hom);  // contraejemplo
  // los únicos homomorfismos Z4→Z4 con núcleo trivial son los automorfismos
  assert.deepStrictEqual(A.allHoms(Gs.Z4, Gs.Z4).filter(f => analyze(Gs.Z4, Gs.Z4, f).kernelTrivial).length, 2);
});
t('N3: cable soldado; triturar sólo vale si queda un subgrupo con la imagen', () => {
  const P = A.createPuzzle(3);
  assert.strictEqual(P.plug(0, 1).reason, 'locked');
  assert.strictEqual(P.shred([2]).reason, 'reached');
  assert.strictEqual(P.shred([1]).reason, 'subgroup');           // {0,2,3} no es cerrado
  assert.strictEqual(P.shred([0]).reason, 'reached');
  assert.ok(!P.evaluate().done);
  assert.ok(P.shred([1, 3]).ok);
  const e = P.evaluate(); assert.ok(e.done && e.analysis.epi); assert.deepStrictEqual(e.codomain, [0, 2]);
  P.undo(); assert.strictEqual(P.config.codomain.length, 4);
});
t('N4: hay que mandar el 0 al neutro del espejo ("1")', () => {
  const P = A.createPuzzle(4);
  assert.ok(!P.evaluate().done);
  ['1', '0', '1', '0'].forEach((l, x) => P.plug(x, Gs.MIRROR.idx(l))); assert.ok(P.evaluate().done);
  P.reset(); [1, 1, 1, 1].forEach((y, x) => P.plug(x, y)); const e = P.evaluate(); assert.ok(e.analysis.hom && !e.done);
});
t('N5: la verdad de cada copiadora y el parte', () => {
  const P = A.createCopies();
  assert.deepStrictEqual(P.machines.map(m => m.truth), [
    { hom: true, injective: false, surjective: true }, { hom: true, injective: true, surjective: false }, { hom: false, injective: true, surjective: true }]);
  assert.ok(!P.evaluate().done);
  P.machines.forEach((M, m) => A.PROPS.forEach(p => P.setDiag(m, p, M.truth[p])));
  assert.ok(P.evaluate().done);
  P.setDiag(2, 'hom', true); const e = P.evaluate(); assert.ok(!e.done); assert.deepStrictEqual(e.wrong, [{ m: 2, prop: 'hom' }]);
  assert.deepStrictEqual(P.test(0, 'injective').collisions.map(c => c.xs), [[0, 2], [1, 3]]);
  assert.deepStrictEqual(P.test(1, 'surjective').unreached, [1, 3]);
});
t('N6: el inicial conserva pero no es inyectivo; 2^x y 3^x son isomorfismos con inversa homomorfismo', () => {
  const P = A.createPuzzle(6), U = Gs.U5;
  let e = P.evaluate(); assert.ok(e.analysis.hom && !e.analysis.injective && !e.done);
  ['1', '2', '4', '3'].forEach((l, x) => P.plug(x, U.idx(l))); e = P.evaluate(); assert.ok(e.done && e.analysis.inverseHom);
  P.reset(); ['1', '3', '4', '2'].forEach((l, x) => P.plug(x, U.idx(l))); assert.ok(P.evaluate().done);
  P.reset(); ['1', '2', '3', '4'].forEach((l, x) => P.plug(x, U.idx(l))); e = P.evaluate(); assert.ok(!e.analysis.hom && e.analysis.injective && !e.done);
  assert.deepStrictEqual(P.reverse(U.idx('1')).sources.length, 1);
});
t('N7: declarar imposible exige medir un orden 4 en Z4 y todos los de V4', () => {
  const P = A.createTwins();
  assert.ok(!P.evaluate().analysis.iso);
  assert.strictEqual(P.declareImpossible().reason, 'measureH');
  [0, 1, 2, 3].forEach(i => P.measure('H', i));
  assert.strictEqual(P.declareImpossible().reason, 'noWitness');
  P.measure('G', 2); assert.strictEqual(P.declareImpossible().ok, false);     // orden 2 existe en V4
  const m = P.measure('G', 1); assert.strictEqual(m.order, 4);
  const d = P.declareImpossible(); assert.ok(d.ok); assert.strictEqual(d.order, 4); assert.deepStrictEqual(d.hOrders, [1, 2, 2, 2]);
  P.plug(0, 1); assert.deepStrictEqual(P.config.map.slice().sort(), [0, 1, 2, 3]);  // sigue siendo biyección
});
t('N8: hay que elegir k=2 o 6, triturar los impares y es isomorfismo sobre {0,2,4,6}', () => {
  const P = A.createPuzzle(8);
  let e = P.evaluate(); assert.ok(e.analysis.hom && !e.analysis.kernelTrivial);
  assert.strictEqual(P.shred([1, 3, 5, 7]).ok, true);
  e = P.evaluate(); assert.ok(!e.done && !e.analysis.surjective);           // imagen {0,4} ≠ {0,2,4,6}
  P.reset(); [0, 2, 4, 6].forEach((y, x) => P.plug(x, y));
  assert.strictEqual(P.shred([1, 2, 3, 5, 6, 7]).reason, 'reached');
  assert.strictEqual(P.shred([1, 3]).reason, 'subgroup');
  assert.ok(P.shred([1, 3, 5, 7]).ok); e = P.evaluate(); assert.ok(e.done && e.analysis.iso && e.analysis.inverseHom);
  P.reset(); [0, 6, 4, 2].forEach((y, x) => P.plug(x, y)); P.shred([1, 3, 5, 7]); assert.ok(P.evaluate().done);
  P.reset(); [0, 2, 4, 6].forEach((y, x) => P.plug(x, y)); assert.ok(!P.evaluate().done);  // sin triturar: no sobreyectiva
  // no se puede enchufar a un destino triturado
  P.shred([1, 3, 5, 7]); assert.strictEqual(P.plug(0, 1).reason, 'shredded');
});
t('deshacer y reiniciar son coherentes en todos los puzles', () => {
  for (const id of [2, 3, 4, 6, 8]) {
    const P = A.createPuzzle(id), start = JSON.stringify(P.config);
    P.plug(1, 0); P.plug(2, 1); if (P.def.shredder) P.shred([1, 3]);
    P.reset(); assert.strictEqual(JSON.stringify(P.config), start);
    P.undo(); while (P.canUndo()) P.undo(); assert.strictEqual(JSON.stringify(P.config), start, 'nivel ' + id);
  }
});
console.log(`\n${passed} pruebas superadas` + (process.exitCode ? ' — HAY FALLOS' : ''));
