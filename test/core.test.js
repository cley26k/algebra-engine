// Pruebas del núcleo matemático y del estado lógico.  Ejecutar:  node test/core.test.js
const assert = require('assert');
const C = require('../src/core.js');

let passed = 0;
function t(name, fn) {
  try { fn(); passed++; console.log('  ✓ ' + name); }
  catch (e) { console.log('  ✗ ' + name + '\n    ' + e.message); process.exitCode = 1; }
}

const Z4 = C.Zn(4), Z2 = C.Zn(2);
const mod2 = C.fromFunction(Z4, x => x % 2);

console.log('Núcleo matemático');
t('1. identidad Z4→Z4 conserva la suma (y es isomorfismo)', () => {
  const r = C.checkHomomorphism(Z4, Z4, [0, 1, 2, 3]);
  assert.strictEqual(r.isHomomorphism, true);
  assert.strictEqual(r.isIsomorphism, true);
});
t('2. f(x)=x mod 2 de Z4 a Z2 conserva la suma', () => {
  const r = C.checkHomomorphism(Z4, Z2, mod2);
  assert.deepStrictEqual(mod2, [0, 1, 0, 1]);
  assert.strictEqual(r.isHomomorphism, true);
  assert.ok(r.pairs.every(p => p.routeA === p.routeB));
});
t('3. f(x)=0 constante conserva la operación (pero no es sobreyectiva)', () => {
  const r = C.checkHomomorphism(Z4, Z2, [0, 0, 0, 0]);
  assert.strictEqual(r.isHomomorphism, true);
  assert.strictEqual(r.surjective, false);
});
t('4. x mod 2 NO es inyectiva (0 y 2 comparten imagen; 1 y 3 también)', () => {
  const r = C.checkHomomorphism(Z4, Z2, mod2);
  assert.strictEqual(r.injective, false);
  assert.deepStrictEqual(r.collisions, [{ image: 0, sources: [0, 2] }, { image: 1, sources: [1, 3] }]);
  assert.deepStrictEqual(r.kernel, [0, 2]);
});
t('5. x mod 2 NO es isomorfismo', () => {
  const r = C.checkHomomorphism(Z4, Z2, mod2);
  assert.strictEqual(r.surjective, true);
  assert.strictEqual(r.bijective, false);
  assert.strictEqual(r.isIsomorphism, false);
});
t('6. asignaciones que no conservan la suma se rechazan', () => {
  for (const f of [[0, 1, 1, 0], [1, 0, 1, 0], [0, 1, 1, 1], [1, 1, 1, 1], [0, 0, 1, 1]]) {
    const r = C.checkHomomorphism(Z4, Z2, f);
    assert.strictEqual(r.isHomomorphism, false, 'aceptó ' + f);
    assert.ok(r.counterexample, 'sin contraejemplo para ' + f);
  }
  // f(0)=1 → el contraejemplo más útil es 0+0
  assert.deepStrictEqual(
    [C.checkHomomorphism(Z4, Z2, [1, 0, 1, 0]).counterexample.a, C.checkHomomorphism(Z4, Z2, [1, 0, 1, 0]).counterexample.b], [0, 0]);
});
t('6b. exhaustivo: de las 16 funciones totales Z4→Z2 sólo 2 son homomorfismos', () => {
  const homs = [];
  for (let k = 0; k < 16; k++) {
    const f = [0, 1, 2, 3].map(i => (k >> i) & 1);
    if (C.checkHomomorphism(Z4, Z2, f).isHomomorphism) homs.push(f.join(''));
  }
  assert.deepStrictEqual(homs.sort(), ['0000', '0101']);
});
t('7. el validador comprueba los 16 pares ordenados', () => {
  const r = C.checkHomomorphism(Z4, Z2, mod2);
  assert.strictEqual(r.checkedPairs, 16);
  const keys = new Set(r.pairs.map(p => p.a + ',' + p.b));
  assert.strictEqual(keys.size, 16);
  // un fallo en un solo par (3,3) debe detectarse aunque los demás coincidan
  const r2 = C.checkHomomorphism(Z4, Z2, [0, 1, 0, 0]);
  assert.strictEqual(r2.isHomomorphism, false);
});
t('8. aritmética modular correcta, incluida la reducción', () => {
  assert.strictEqual(Z4.op(3, 3), 2); assert.strictEqual(Z4.op(2, 2), 0); assert.strictEqual(Z4.op(3, 1), 0);
  assert.strictEqual(Z2.op(1, 1), 0); assert.strictEqual(Z2.op(1, 0), 1);
  assert.strictEqual(C.mod(-1, 4), 3);
  // destino con ficha 4: ({0,1}, +4) no es cerrado y no es grupo
  const H4 = C.additiveStructure([0, 1], 4);
  assert.deepStrictEqual(C.closureFailures(H4), [{ a: 1, b: 1, result: 2 }]);
  assert.strictEqual(C.groupReport(H4).isGroup, false);
  assert.strictEqual(C.checkHomomorphism(Z4, H4, mod2).isHomomorphism, false);
  assert.strictEqual(C.groupReport(Z2).isGroup, true);
});
t('8b. función parcial: nunca se certifica', () => {
  const r = C.checkHomomorphism(Z4, Z2, [0, 1, null, 1]);
  assert.strictEqual(r.total, false); assert.strictEqual(r.isHomomorphism, false);
  assert.ok(r.pairs.some(p => p.status === 'undefined'));
});

console.log('Estado del nivel');
function solve(L) {
  L.insertBlock('ARRANCA'); L.insertBlock('COMPARTIDO'); L.setChip(2);
  [0, 1, 0, 1].forEach((y, x) => L.plug(x, y));
}
t('el estado inicial no se puede ejecutar (falta ARRANCA)', () => {
  const L = C.createLevel();
  assert.deepStrictEqual(L.preflight().problems, ['motor']);
  assert.strictEqual(L.run().ran, false);
});
t('EXCLUSIVO bloquea compartir destino; COMPARTIDO lo permite', () => {
  const L = C.createLevel();
  assert.ok(L.plug(0, 0).ok); assert.strictEqual(L.plug(2, 0).rejected, true);
  L.insertBlock('COMPARTIDO');
  assert.deepStrictEqual(L.plug(2, 0).shared, [0, 2]);
});
t('bloque en ranura equivocada se rechaza (gramática)', () => {
  const L = C.createLevel();
  assert.strictEqual(L.insertBlock('ARRANCA', 'ley').rejected, true);
  assert.strictEqual(L.config.slots.ley, 'CONSERVA');
});
t('resolver el nivel → homomorfismo, orden completa, no isomorfismo', () => {
  const L = C.createLevel(); solve(L);
  const r = L.run();
  assert.strictEqual(r.verdict, 'homomorphism'); assert.strictEqual(r.order.done, true);
  assert.strictEqual(r.check.isIsomorphism, false);
  assert.deepStrictEqual(L.reverse(0), { y: 0, sources: [0, 2], unique: false });
});
t('con la ficha 4 el mapa correcto falla en 1+1 (resultado se escapa)', () => {
  const L = C.createLevel(); L.insertBlock('ARRANCA'); L.insertBlock('COMPARTIDO');
  [0, 1, 0, 1].forEach((y, x) => L.plug(x, y));
  const r = L.run();
  assert.strictEqual(r.verdict, 'broken');
  assert.strictEqual(r.check.counterexample.status, 'escape');
  assert.strictEqual(r.check.counterexample.routeB, 2);
});
t('constante 0 → homomorfismo certificado pero orden incompleta (nadie visita al 1)', () => {
  const L = C.createLevel(); L.insertBlock('ARRANCA'); L.insertBlock('COMPARTIDO'); L.setChip(2);
  [0, 1, 2, 3].forEach(x => L.plug(x, 0));
  const r = L.run();
  assert.strictEqual(r.verdict, 'homomorphism'); assert.strictEqual(r.order.done, false);
});
t('sin CONSERVA la máquina traduce sin comprobar; sin TODO acepta parciales sin certificar', () => {
  const L = C.createLevel(); solve(L); L.removeBlock('CONSERVA');
  assert.strictEqual(L.run().verdict, 'unchecked');
  L.insertBlock('CONSERVA'); L.unplug(3);
  assert.strictEqual(L.run().verdict, 'incomplete');
  L.removeBlock('TODO');
  assert.strictEqual(L.run().verdict, 'uncertifiable');
});
t('9. deshacer / reiniciar / reejecutar mantienen la coherencia', () => {
  const L = C.createLevel(); solve(L);
  const good = JSON.stringify(L.config);
  assert.strictEqual(L.run().verdict, 'homomorphism');
  L.plug(3, 0);                                  // rompemos
  assert.strictEqual(L.run().verdict, 'broken');
  L.undo();
  assert.strictEqual(JSON.stringify(L.config), good);
  assert.strictEqual(L.run().verdict, 'homomorphism');
  L.reset();
  assert.deepStrictEqual(L.config.map, [null, null, null, null]);
  assert.strictEqual(L.run().ran, false);
  L.undo();                                      // el reinicio también se deshace
  assert.strictEqual(JSON.stringify(L.config), good);
  // repetir la ejecución da el mismo resultado (sin estado oculto)
  assert.strictEqual(JSON.stringify(L.run()), JSON.stringify(L.run()));
  // deshacer hasta el principio vuelve al estado inicial exacto
  while (L.canUndo()) L.undo();
  assert.strictEqual(JSON.stringify(L.config), JSON.stringify(C.initialConfig()));
});
t('10. cambiar a EXCLUSIVO con destinos compartidos expulsa a los últimos en llegar (y notifica)', () => {
  const L = C.createLevel(); solve(L);
  const events = []; L.on((type, d) => events.push(d));
  const res = L.insertBlock('EXCLUSIVO');
  assert.deepStrictEqual(L.config.map, [0, 1, null, null]);
  assert.deepStrictEqual(res.evicted.map(e => e.x), [2, 3]);
  assert.strictEqual(events.length, 1);
  L.undo(); assert.deepStrictEqual(L.config.map, [0, 1, 0, 1]);
});
t('las fichas no se duplican ni se pierden', () => {
  const L = C.createLevel();
  for (const step of [() => L.setChip(2), () => L.removeChip(), () => L.setChip(4), () => L.setChip(2), () => L.undo(), () => L.reset()]) {
    step();
    const all = [L.config.chip, ...L.config.belly].filter(v => v !== null).sort();
    assert.deepStrictEqual(all, [2, 4]);
  }
});

console.log(`\n${passed} pruebas superadas` + (process.exitCode ? ' — HAY FALLOS' : ''));
