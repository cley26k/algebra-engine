/* THE ALGEBRA ENGINE — Nivel 8: el corazón de la fábrica (rediseño, iteración 6).
 * Una sola sala, sin cámara. En el centro late el corazón con CUATRO VÁLVULAS; cada válvula se enciende con algo
 * que ya se aprendió en una máquina anterior, y cada una está conectada a la estación que la controla:
 *   válvula 1 · EL ENGRANAJE CIERRA      ← estación A, engranaje de 8          (máquinas 1 y 2)
 *   válvula 2 · EN EL NEUTRO, SÓLO EL 0  ← estación B, la garra en los contenedores (máquina 2)
 *   válvula 3 · NINGÚN CONTENEDOR VACÍO  ← estación C, probador y trituradora   (máquina 3)
 *   válvula 4 · EL VIAJE SE DESHACE      ← estación D, ensamblador de vuelta    (máquina 6)
 * Las piezas recorren un circuito cerrado alrededor del corazón: muelle → f → contenedores → vuelta → muelle. */
'use strict';
window.HeartScene = function (App) {
const W = 1600, H = 900, ctx = Draw.ctx, AG = AlgebraGroups;
const P = AG.createHeart();
const G = P.G, HH = P.H, LG = i => G.labels[i], LH = i => HH.labels[i];
const DOCK = i => ({ x: 214 + i * 54, y: 784 });
const WHEEL = { x: 150, y: 486, r: 80 };
const PRESS = { x: 450, y: 660 };
const FEED_Y = 660, RET_Y = 868;
const BX = j => 530 + j * 100, BIN_Y = 772;
const RAIL = { y: 566, x0: 470, x1: 1300 };
const REG = { x: 1280, y: 214 };
const STATION = { x: 1452, y: 548 };
const HEART = { x: 800, y: 300 };
const VALVES = [
  { n: '1', title: 'EL ENGRANAJE CIERRA', from: 'máquinas 1 y 2', x: 525, y: 186, st: 'A', col: '#d98d1c' },
  { n: '2', title: 'EN EL NEUTRO, SÓLO EL 0', from: 'máquina 2', x: 525, y: 432, st: 'B', col: '#7c3b73' },
  { n: '3', title: 'NINGÚN CONTENEDOR VACÍO', from: 'máquina 3', x: 1075, y: 186, st: 'C', col: '#6f8436' },
  { n: '4', title: 'EL VIAJE SE DESHACE', from: 'máquina 6', x: 1075, y: 432, st: 'D', col: '#2b47d1' },
];
const BOXES = {
  A: { x: 36, y: 318, w: 392, h: 330, title: 'A · ENGRANAJE DE 8', from: 'máq. 2' },
  B: { x: 480, y: 604, w: 750, h: 248, title: 'B · CONTENEDORES Y GARRA', from: 'máq. 2' },
  C: { x: 1212, y: 104, w: 354, h: 316, title: 'C · PROBADOR Y TRITURADORA', from: 'máq. 3' },
  D: { x: 1340, y: 440, w: 226, h: 276, title: 'D · VUELTA', from: 'máq. 6' },
};

let claw;
const shred = makeShredder(1262, 640);
const asm = makeAssembler();
const op = makeOperario(442, 770);
const S = Kit.base(App, 8, {
  order: 'Encienda las cuatro válvulas del corazón. Cada una se repara con algo que ya sabe hacer.',
  groups: () => [G, HH], verdictAt: { x: 800, y: 488 }, ticketAt: { x: 1396, y: 726 }, stampAt: { x: 800, y: 300 },
  cast: {
    op: { pos: () => ({ x: op.x + 20, y: op.y - 50 }), voice: 'op' },
    claw: { pos: () => ({ x: claw.x + 40, y: claw.y - 30 }), voice: 'claw' },
    shred: { pos: () => ({ x: shred.x - 40, y: shred.y - 40 }), voice: 'shred' },
    reg: { pos: () => ({ x: REG.x, y: REG.y - 60 }), voice: 'claw' },
    asm: { pos: () => ({ x: STATION.x, y: STATION.y - 60 }), voice: 'asm' },
    heart: { pos: () => ({ x: HEART.x, y: HEART.y - 130 }), voice: 'enc' },
  },
  state: () => hintState(),
  hints: [
    { topic: 'bombear', when: s => !s.pumped, tiers: [
      { text: 'Estación A: elija a dónde va el 1 en la rueda y pulse BOMBEAR. Las válvulas se encienden según lo que pase.', point: () => WHEEL },
      { who: 'heart', text: 'Cada válvula mira una cosa. Siga las líneas de colores hasta su estación.' }] },
    { topic: 'cierre', when: s => !s.closes, tiers: [
      { who: 'op', text: 'Válvula 1 en rojo: el tren de engranajes no cierra. Cuatro vueltas y no vuelve al 0.' },
      { text: 'En el reloj, 1+1+1+1 = 0. Así que f(1) sumado cuatro veces debe dar 0 en el reloj de 8.' },
      { text: 'Con f(1) impar, cuatro veces f(1) nunca es múltiplo de 8. Pruebe un número par.' }] },
    { topic: 'nucleo', when: s => s.diag.analysis.hom && !s.diag.analysis.kernelTrivial, tiers: [
      { who: 'claw', text: 'Válvula 2: en el neutro hay más de uno. Esto ya lo vimos en mi taller (máquina 2).' },
      { text: 'Si dos comparten destino, su diferencia cae en el neutro. ¿Qué f(1) deja al 2 fuera del 0?' },
      { who: 'claw', text: 'Necesito un f(1) que tarde cuatro pasos en volver al 0: el 2 o el 6.' }] },
    { topic: 'vacios', when: s => s.diag.analysis.hom && s.diag.analysis.kernelTrivial && !s.diag.analysis.surjective, tiers: [
      { who: 'shred', text: 'Válvula 3: ¡contenedores sin visitas! Como en mi planta (máquina 3). ¿Puedo? ¿PUEDO?' },
      { text: 'Clic en los contenedores vacíos para marcarlos, PROBADOR y luego TRITURAR (estación C).' },
      { who: 'reg', text: 'Lo que quede tiene que ser cerrado. Los pares, {0, 2, 4, 6}, lo son.' }] },
    { topic: 'volver', when: s => s.diag.kind === 'iso' && !s.returned, tiers: [
      { who: 'asm', text: 'Válvula 4: falta deshacer el viaje, como en la torre (máquina 6). Pulse VOLVER.', point: () => ({ x: STATION.x, y: STATION.y }) }] },
  ],
});
const LINES = {
  noclose: [[['op', '¡Los engranajes rechinan! Cuatro vueltas y no vuelve al 0.'], ['heart', 'Válvula uno… atascada.']], [['op', 'Este diente no encaja con el primero.']]],
  closes: [[['heart', 'Válvula uno: abierta. El engranaje cierra.']]],
  kernelMany: [[['claw', 'Neutro: { {list} }. Dos piezas que ya no se distinguen.'], ['heart', 'Válvula dos… cerrada.']]],
  kernelOne: [[['claw', 'Neutro: sólo el 0. Válvula dos, ¡abierta!']]],
  empty: [[['shred', '¡{n} contenedores vacíos! ¡Banquete!'], ['reg', 'Primero, el probador.']]],
  full: [[['heart', 'Todos los contenedores con su visita. Válvula tres, abierta.']]],
  tag: [[['shred', '¡Ese!']], [['shred', '¡Ñam, marcado!']]],
  stuck: [[['asm', 'Dos en el {y}: ¿a cuál devuelvo? Me mareo.']]],
  back: [[['asm', 'Cada uno vuelve a su sitio. Ida y vuelta.'], ['heart', '…pum-pum. Pum-pum. ¡PUM-PUM!']]],
};

/* ---------------- estado ---------------- */
claw = makeClaw(RAIL.y, 1130); claw.y = RAIL.y + 50;
const dock = G.labels.map((_, i) => { const p = DOCK(i), c = makeCritter('src', i, p.x, p.y, speciesFor('Z4', i)); c.s = .72; c.hx = p.x; c.hy = p.y; return c; });
let pieces = [], counts = HH.labels.map(() => 0), pumped = false, returned = false, stuckBack = false, wheelAng = 0, gearClash = 0, heartBeat = 0, heal = 0, lastTest = null, regTape = [], regLight = 0, gone = HH.labels.map(() => 0), lift = HH.labels.map(() => 0);
const valveGlow = [0, 0, 0, 0];
function hintState() { const gm = P.gear(); return { pumped, closes: gm.closes, diag: P.diagnose(), returned }; }
const alive = j => P.config.codomain.indexOf(j) !== -1;
/** Estado de cada válvula: null (sin mirar), true (abierta), false (falla). */
function valves() {
  if (!pumped) return [null, null, null, null];
  const d = P.diagnose(), A = d.analysis, gm = P.gear();
  const v1 = gm.closes, v2 = v1 ? A.kernelTrivial : null, v3 = v1 && v2 ? (A.surjective && A.codomainReport.ok) : null, v4 = returned ? true : stuckBack ? false : null;
  return [v1, v2, v3, v4];
}
P.on((t, d) => {
  S.progress();
  if (d.label === 'return' || d.label === 'test') return;
  if (S.run.active) S.run.kill();
  const was = pumped && P.gear().closes;
  pieces = []; counts = HH.labels.map(() => 0); returned = false; stuckBack = false; pumped = false; S.verdict = null; if (S.slip) S.slip.closing = true;
  if (d.label === 'k') { Sound.fam('gear'); S.later(.08, () => Sound.fam('gear')); }
  if (d.label === 'tag') { S.dir.play(LINES, 'tag', {}, { cooldown: 3 }); shred.mood = 'eager'; shred.moodT = 1.5; lastTest = null; if (was) { pumped = true; recount(); } }
  if (d.label === 'undo' || d.label === 'reset' || d.label === 'restore') { HH.labels.forEach((_, j) => { if (alive(j)) { gone[j] = 0; lift[j] = 0; } }); lastTest = null; Sound.whoosh(); }
});
/** Al marcar contenedores no se borra lo bombeado: los contadores se recalculan sin animación. */
function recount() {
  const f = P.map(); counts = HH.labels.map(() => 0);
  pieces = G.labels.map((_, x) => { const y = f[x], k = counts[y]++, s = binSlot(y, k), p = makeCritter('src', x, s.x, s.y, speciesFor('Z8', y)); p.s = .56; p.origin = x; p.bin = alive(y) ? y : null; p.hat = { col: SRC_COL[x], label: LG(x) }; if (!alive(y)) p.alpha = 0; return p; });
}

/* ---------------- bombear ---------------- */
function binSlot(j, k) { return { x: BX(j) - 22 + (k % 3) * 22, y: BIN_Y - 4 - Math.floor(k / 3) * 22 }; }
function pump() {
  if (S.run.active) { S.run.scale = 5; return; }
  App.levelStarted(8); S.progress(); if (S.clip.target) S.clip.toggle();
  const gm = P.gear(), f = gm.f, d = P.diagnose(), tw = S.run.tw;
  pieces = []; counts = HH.labels.map(() => 0); pumped = false; returned = false; stuckBack = false; if (S.slip) S.slip.closing = true;
  S.run.start((function* () {
    valveGlow[0] = 1;
    if (!gm.closes) {
      pumped = true; gearClash = 1.4; Sound.fam('crack'); Sound.fam('fail'); heartBeat = 1; S.sparks(WHEEL.x + 90, WHEEL.y, 14, PAL.mustard);
      S.dir.play(LINES, 'noclose', {}, { force: true }); operarioDo(op, 'panic', 2);
      const c = d.counterexample;
      S.slip = Kit.RouteSlip(G, HH, f, c.a, c.b, { x: 440, y: 650, title: 'VÁLVULA 1 · EL ENGRANAJE NO CIERRA EN ' + LG(c.a) + ' + ' + LG(c.b) });
      S.verdict = d; return;
    }
    yield .2;
    for (let x = 0; x < G.n; x++) {
      const src = dock[x], p = makeCritter('src', x, src.x, src.y, speciesFor('Z4', x)); p.s = .56; p.moving = true; p.origin = x; pieces.push(p);
      poke(src, 6, -6); Sound.fam('pop');
      Kit.travel(tw, p, [[src.x, src.y], [src.x, FEED_Y - 8], [PRESS.x, FEED_Y - 8]], .7, { ease: Ease.linear, done: () => {
        Sound.fam('press'); p.species = speciesFor('Z8', f[x]); p.hat = { col: SRC_COL[x], label: LG(x) }; p.sx.v = 1.5; p.sy.v = .55; Sound.fam('transform');
        const y = f[x], k = counts[y]++, s = binSlot(y, k);
        if (!alive(y)) { Kit.travel(tw, p, [[PRESS.x, FEED_Y - 8], [PRESS.x + 40, FEED_Y + 50]], .4, { done: () => { p.alpha = 0; } }); return; }
        Kit.travel(tw, p, [[PRESS.x, FEED_Y - 8], [BX(y), FEED_Y - 8], [s.x, s.y]], .7 + (BX(y) - PRESS.x) / 1800, { ease: Ease.inOut, land: true, done: () => {
          p.moving = false; p.bin = y; Sound.fam('thud', { vol: .5 });
          const mates = pieces.filter(q => q !== p && q.bin === y && !q.moving);
          if (mates.length) { Sound.fam('collide'); Kit.react(p, 'surprise'); Kit.react(mates[0], 'anger'); }
        } });
      } });
      yield .45;
    }
    yield 2.0;
    pumped = true; Sound.fam('bell'); S.dir.play(LINES, 'closes', {}, { force: true }); heal = Math.max(heal, .25);
    // la garra inspecciona el neutro (válvula 2)
    valveGlow[1] = 1;
    const k0 = pieces.filter(p => p.bin === HH.identity && !p.moving);
    yield* clawSweep(k0);
    if (d.analysis.kernelTrivial) heal = Math.max(heal, .5);
    // los contenedores vacíos (válvula 3)
    valveGlow[2] = 1;
    const empties = P.config.codomain.filter(j => counts[j] === 0);
    if (empties.length) { S.dir.play(LINES, 'empty', { n: empties.length }, { force: true }); shred.mood = 'eager'; shred.moodT = 3; yield 1.2; }
    else if (d.analysis.kernelTrivial) { S.dir.play(LINES, 'full', {}, { force: true }); heal = Math.max(heal, .75); }
    S.verdict = d;
  })(), 'pump');
}
function* clawSweep(found) {
  const tw = S.run.tw;
  claw.mood = 'search'; Sound.fam('servo');
  tw.add(claw, { x: BX(HH.identity) }, .5, { ease: Ease.inOut }); yield .55;
  claw.mood = 'idle'; Sound.fam('bell', { vol: .6 });
  for (const p of found) {
    tw.add(claw, { x: p.x }, .2); yield .22; tw.add(claw, { y: p.y - 60 }, .25, { ease: Ease.in }); yield .27; tw.add(claw, { open: 0 }, .1); Sound.fam('grab'); yield .12;
    p.carried = true; tw.add(claw, { y: RAIL.y + 90 }, .3); yield .34; Kit.react(p, 'surprise');
    tw.add(claw, { y: p.y - 60 }, .25); yield .27; p.carried = false; tw.add(claw, { open: 1 }, .1); Sound.fam('release'); tw.add(claw, { y: RAIL.y + 50 }, .25); yield .27;
  }
  if (found.length > 1) { claw.mood = 'happy'; claw.moodT = 2; S.dir.play(LINES, 'kernelMany', { list: found.map(p => p.hat.label).join(', ') }, { force: true }); found.forEach(p => Kit.react(p, 'frustration', 2)); }
  else { claw.mood = 'frustrated'; claw.moodT = 2; S.dir.play(LINES, 'kernelOne', {}, { force: true }); }
  tw.add(claw, { x: 1130 }, .5); yield 1.0;
}

/* ---------------- C · probador y trituradora ---------------- */
function tagBin(j) { if (!alive(j) || S.run.active) return; P.tag(j); S.progress(); }
function test() {
  if (S.run.active) return;
  if (!P.config.tags.length) { S.say('reg', 'Nada marcado. Marque contenedores con un clic.'); return; }
  const r = P.test(); lastTest = r; regTape = []; S.progress(); valveGlow[2] = 1;
  S.run.start((function* () {
    regTape.push({ text: 'quedarían: ' + r.rest.length + ' contenedores', ok: null }); yield .35;
    if (r.visited.length) { regTape.push({ text: '✗ el ' + LH(r.visited[0]) + ' recibe visitas', ok: false }); regLight = -1; Sound.fam('fail'); shred.alto = 2; S.say('reg', '¡ALTO! El ' + LH(r.visited[0]) + ' tiene visitas.'); return; }
    if (!r.run.ok) {
      const fl = r.run.failure; regLight = -1; Sound.fam('fail'); shred.alto = 2; shred.shake = .5;
      regTape.push({ text: fl.kind === 'closure' ? '✗ ' + LH(fl.a) + ' + ' + LH(fl.b) + ' = ' + LH(fl.c) + ' se iría' : fl.kind === 'identity' ? '✗ falta el neutro' : '✗ el ' + LH(fl.a) + ' sin inverso', ok: false });
      S.say('reg', fl.kind === 'closure' ? '¡ALTO! ' + LH(fl.a) + ' + ' + LH(fl.b) + ' = ' + LH(fl.c) + ', y ese se iría. No queda un grupo.' : '¡ALTO! Lo que queda no es un grupo.');
      return;
    }
    for (const c of r.run.checks.slice(0, 5)) { regTape.push({ text: '✓ ' + LH(c.a) + ' + ' + LH(c.b) + ' = ' + LH(c.c), ok: true }); Sound.fam('gear', { vol: .5 }); yield .1; }
    regTape.push({ text: '✓ … los ' + r.run.checks.length + ' pares cierran', ok: true });
    regLight = 1; Sound.fam('discover'); S.say('reg', 'Lo que queda es un grupo. PERMISO para triturar.'); shred.mood = 'happy'; shred.moodT = 2;
  })(), 'test');
}
function doShred() {
  if (S.run.active) return;
  const c = P.config;
  if (!c.tags.length) { S.say('shred', 'Nada marcado. Qué pena.'); return; }
  if (!c.tested || !c.tested.ok) { shred.alto = 2; Sound.fam('fail'); S.say('reg', c.tested ? '¡ALTO! El probador dijo que no.' : '¡ALTO! Primero el probador.'); return; }
  const list = c.tags.slice(), tw = S.run.tw;
  S.run.start((function* () {
    for (const j of list) {
      tw.add(shred, { x: BX(j) }, .45, { ease: Ease.inOut }); Sound.fam('servo'); yield .5;
      tw.add(lift, { [j]: 1 }, .3); yield .3; shred.chew = 1; Sound.fam('shred'); yield .25;
      tw.add(gone, { [j]: 1 }, .35); S.confetti(BX(j), BIN_Y - 60, 10); yield .4;
    }
    P.shred(); lastTest = null; regTape = [];
    tw.add(shred, { x: 1262 }, .7, { ease: Ease.inOut }); yield .7;
    S.say('shred', '¡Delicioso, y legal! Bombee otra vez.');
  })(), 'shred');
}
function restore() { if (S.run.active) return; P.restoreCodomain(); S.say('shred', '¿Me hace devolverlos? …Vale. Aquí están.'); }

/* ---------------- D · volver ---------------- */
function goBack() {
  if (S.run.active) { S.run.scale = 5; return; }
  if (!pumped || !pieces.length) { S.say('asm', 'Primero hay que bombear. No se deshace un viaje que no se ha hecho.'); return; }
  const d = P.diagnose(), tw = S.run.tw;
  if (d.kind === 'broken') { S.say('asm', 'Con el engranaje sin cerrar no se puede volver.'); return; }
  S.progress(); valveGlow[3] = 1;
  S.run.start((function* () {
    asm.dir = -1; Sound.fam('hum');
    const multi = HH.labels.map((_, j) => pieces.filter(p => p.bin === j)).filter(l => l.length > 1);
    if (multi.length) {
      const l = multi[0]; asm.dizzy = 3; Sound.fam('fail'); l.forEach(p => Kit.react(p, 'confused', 3)); stuckBack = true;
      S.dir.play(LINES, 'stuck', { y: LH(l[0].bin) }, { force: true }); S.verdict = d; return;
    }
    pieces.forEach((p, k) => {
      if (p.bin === null || p.bin === undefined) return;
      p.moving = true;
      const home = DOCK(p.origin);
      Kit.travel(tw, p, [[p.x, p.y], [p.x, 700], [STATION.x - 20, 700], [STATION.x, STATION.y + 10]], 1 + k * .15, { ease: Ease.inOut, done: () => {
        p.species = speciesFor('Z4', p.origin); p.hat = null; Sound.fam('transform', { vol: .5 });
        Kit.travel(tw, p, [[STATION.x, STATION.y + 10], [STATION.x, RET_Y], [home.x, RET_Y], [home.x, home.y]], 2.2, { ease: Ease.inOut, land: true, done: () => { p.moving = false; p.home = true; Sound.fam('thud', { vol: .4 }); Kit.react(p, 'relief'); } });
      } });
    });
    yield 4.4;
    asm.sing = 3; asm.dir = 1;
    [523, 659, 784, 1046, 784, 659, 523].forEach((fq, i) => Sound.tone(fq, .2, { type: i % 2 ? 'triangle' : 'sine', vol: .12, delay: i * .1 }));
    S.dir.play(LINES, 'back', {}, { force: true });
    P.markReturned(true); returned = true;
    yield 1.2;
    const ev = P.evaluate(); S.verdict = ev.d;
    if (ev.done) yield* finale(ev);
  })(), 'back');
}
function* finale(ev) {
  S.tw.add({ get v() { return heal; }, set v(x) { heal = x; } }, { v: 1 }, 2.4);
  Sound.fam('repair'); S.confetti(HEART.x, HEART.y, 70);
  claw.mood = 'happy'; claw.moodT = 6; shred.mood = 'happy'; shred.moodT = 6; shred.chew = 3; asm.sing = 6; operarioDo(op, 'cheer', 6);
  dock.forEach((c, i) => S.later(i * .15, () => { Kit.react(c, 'pride', 3); }));
  S.say('claw', '¡Núcleo trivial! ¡No tengo nada que hacer! ¡Qué felicidad tan rara!');
  S.later(2.4, () => S.say('shred', '¡Y yo sólo me comí lo que tocaba! ¡Soy una profesional!'));
  S.later(4.6, () => S.say('op', '¡Y sin cinta adhesiva!'));
  yield 3;
  S.complete({ corazon: { G: 'Z4', H: 'Z8', f: P.map(), codomain: P.config.codomain.slice(), shredded: HH.labels.map((_, j) => j).filter(j => !alive(j)), from: 'máquina 8' } },
    'APROBADO. Las cuatro válvulas abiertas: x ↦ 2x es un isomorfismo entre el reloj de 4 y {0, 2, 4, 6}. Vuelva a ver la fábrica (Esc).');
}

/* ---------------- interacción ---------------- */
function turnWheel(dir) { if (S.run.active) S.run.kill(); const k = (P.config.k + (dir || 1) + HH.n) % HH.n; P.setK(k); S.progress(); const gm = P.gear(); App.announce('El 1 va al ' + LH(k) + '. ' + (gm.closes ? 'El tren cierra la vuelta.' : 'El tren NO cierra: cuatro vueltas dan ' + LH(gm.endsAt) + '.')); }
const PLATES = [
  ['pump', 'BOMBEAR (R)', 'BOMBEAR', () => pump(), { x: 52, y: 592, w: 172, h: 42 }, '#dfe8c8'],
  ['test', 'PROBADOR (P)', 'PROBADOR', () => test(), { x: 1206, y: 324, w: 172, h: 40 }, PAL.bone],
  ['shred', 'TRITURAR (T)', 'TRITURAR', () => doShred(), { x: 1384, y: 324, w: 170, h: 40 }, null],
  ['restore', 'DEVOLVER CONTENEDORES', 'DEVOLVER', () => restore(), { x: 1206, y: 370, w: 348, h: 34 }, PAL.bone],
  ['back', 'VOLVER (B)', 'VOLVER', () => goBack(), { x: 1360, y: 652, w: 186, h: 42 }, '#e9d6f0'],
];
function items() {
  const out = S.hudItems();
  out.push({ id: 'wheel', r: WHEEL.r + 8, x: WHEEL.x, y: WHEEL.y, label: 'Rueda: ¿a dónde va el 1? (clic: siguiente)', act: () => turnWheel(1), hoverOutline: true, pri: 2 });
  HH.labels.forEach((_, j) => { if (!alive(j)) return; out.push({ id: 'bin' + j, x: BX(j) - 46, y: BIN_Y - 60, w: 92, h: 104, label: 'Contenedor ' + LH(j) + ': ' + counts[j] + ' visitas' + (P.config.tags.indexOf(j) !== -1 ? ', marcado' : '') + ' (clic: marcar para triturar)', act: () => tagBin(j), hoverOutline: true, pri: 2 }); });
  PLATES.forEach(pl => out.push(Object.assign({ id: pl[0], label: pl[1], act: pl[3], pri: 1 }, pl[4])));
  VALVES.forEach((v, i) => out.push({ id: 'valve' + i, x: v.x - 125, y: v.y - 30, w: 250, h: 60, label: 'Válvula ' + v.n + ': ' + v.title.toLowerCase() + ' (estación ' + v.st + ', ' + v.from + ')', act: () => explainValve(i), pri: 3 }));
  return out;
}
function explainValve(i) {
  const st = valves()[i], v = VALVES[i];
  const T = [
    ['Válvula 1: el tren de engranajes tiene que cerrar: cuatro veces f(1) debe volver al 0. Rueda de la estación A.', 'op'],
    ['Válvula 2: en el contenedor neutro sólo puede caer el 0. La garra lo comprueba al bombear.', 'claw'],
    ['Válvula 3: ningún contenedor sin visitas. Marque, pruebe y triture en la estación C.', 'shred'],
    ['Válvula 4: el viaje tiene que poder deshacerse. VOLVER en la estación D.', 'asm']];
  S.say(T[i][1], T[i][0] + (st === true ? ' (abierta)' : st === false ? ' (falla)' : ''), { dur: 5 }); valveGlow[i] = 1;
}

/* ---------------- dibujo ---------------- */
function mix(a, b, t) { const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16); const r = (pa >> 16) + ((pb >> 16) - (pa >> 16)) * t, g = ((pa >> 8) & 255) + (((pb >> 8) & 255) - ((pa >> 8) & 255)) * t, bl = (pa & 255) + ((pb & 255) - (pa & 255)) * t; return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (bl | 0) + ')'; }
function drawHall() {
  const warm = heal;
  ctx.fillStyle = mix('#cfae8e', '#f0cfa4', warm); ctx.fillRect(-1200, -800, W + 2400, H + 1600);
  if (App.grain) { ctx.fillStyle = App.grain; ctx.fillRect(-1200, -800, W + 2400, H + 1600); }
  ctx.fillStyle = mix('#a98966', '#d9a77c', warm); ctx.fillRect(-1200, 852, W + 2400, 900);
  Deco.room(S.T, { wall: [-1200, -800, W + 1200, 852], lamps: [800], len: 0, reach: 520, a: .08 + .12 * warm });
  // rayos del corazón cuando late fuerte
  if (warm > .2) { ctx.save(); ctx.globalAlpha = .12 * warm; ctx.fillStyle = '#ffe9a8'; for (let k = 0; k < 14; k++) { const a = S.T * .1 + k / 14 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(HEART.x, HEART.y); ctx.lineTo(HEART.x + Math.cos(a) * 700, HEART.y + Math.sin(a) * 700); ctx.lineTo(HEART.x + Math.cos(a + .1) * 700, HEART.y + Math.sin(a + .1) * 700); ctx.fill(); } ctx.restore(); }
  Object.keys(BOXES).forEach(k => drawBox(k));
  drawVeins();
  // tubo de retorno (suelo) y tubería de alimentación
  Draw.curve([[DOCK(0).x - 20, RET_Y], [STATION.x, RET_Y]], 16, PAL.ink); Draw.curve([[DOCK(0).x - 20, RET_Y], [STATION.x, RET_Y]], 9, mix('#7a7f9f', '#a9b8ef', warm));
  Draw.text('TUBO DE RETORNO ←', 360, RET_Y - 16, { size: 11, font: FONT.plate, color: PAL.inkSoft });
  Draw.curve([[DOCK(0).x, FEED_Y], [BX(7) + 50, FEED_Y]], 14, PAL.ink); Draw.curve([[DOCK(0).x, FEED_Y], [BX(7) + 50, FEED_Y]], 8, PAL.olive);
  Draw.curve([[STATION.x, STATION.y + 40], [STATION.x, RET_Y]], 14, PAL.ink); Draw.curve([[STATION.x, STATION.y + 40], [STATION.x, RET_Y]], 7, mix('#7a7f9f', '#a9b8ef', warm));
  drawHeart();
  drawValves();
  // A · engranaje y muelle
  Draw.rrect(DOCK(0).x - 34, DOCK(0).y + 4, 54 * 3 + 68, 18, 4, '#a7744a', 3, 12110);
  drawGearRoom();
  Draw.rrect(PRESS.x - 30, PRESS.y - 76, 60, 64, 8, PAL.mustard, 3, 12120); Draw.text('f', PRESS.x, PRESS.y - 44, { size: 26, font: FONT.title });
  drawOperario(op, 6);
  // B · contenedores y garra
  drawClaw(claw, RAIL.x0, RAIL.x1);
  HH.labels.forEach((_, j) => drawBin(j));
  Draw.line(shred.x - 20, RAIL.y + 4, shred.x - 20, shred.y - 30, 2.5, 12140); Draw.line(shred.x + 20, RAIL.y + 4, shred.x + 20, shred.y - 30, 2.5, 12141);
  ctx.save(); ctx.translate(shred.x, shred.y); ctx.scale(.5, .5); ctx.translate(-shred.x, -shred.y); drawShredder(shred, shred.x, shred.x); ctx.restore();
  // C · regulador
  drawRegulator();
  // D · estación de vuelta
  drawAssembler(asm, STATION.x - 62, STATION.x + 62, STATION.y);
  // piezas
  dock.forEach(c => { if (!pieces.some(p => p.origin === c.v && p.home)) { drawCritter(c); Kit.drawMark(c); } });
  pieces.forEach(p => { if (p.carried) { p.x = claw.x; p.y = claw.y + 60; } if (p.alpha > 0) { drawCritter(p); Kit.drawMark(p); } });
  S.drawParts();
}
function drawBox(k) {
  const b = BOXES[k], vi = VALVES.findIndex(v => v.st === k), v = VALVES[vi], st = valves()[vi];
  ctx.save(); ctx.globalAlpha = .32; Draw.rrect(b.x, b.y, b.w, b.h, 12, '#fbefdc', 0, 12600 + b.x); ctx.restore();
  ctx.save(); ctx.setLineDash([10, 6]); Draw.rrect(b.x, b.y, b.w, b.h, 12, null, 2.5, 12601 + b.x, v.col); ctx.restore();
  // cabecera con medallón de la máquina de origen
  Draw.rrect(b.x + 10, b.y - 14, Draw.textWidth(b.title, 12, FONT.plate) + 26, 26, 4, PAL.bone, 2, 12602 + b.x, v.col);
  Draw.text(b.title, b.x + 23, b.y - 1, { size: 12, font: FONT.plate, align: 'left', color: PAL.ink });
  const mx = b.x + b.w - 26, my = b.y - 2;
  Draw.ellipse(mx, my, 22, 22, st === true ? '#dfe8c8' : PAL.bone, 2.5, 12603 + b.x, v.col);
  Draw.text(b.from, mx, my + 1, { size: 10, font: FONT.plate });
}
function drawVeins() {
  // de cada válvula a su estación: línea punteada del color de la válvula
  const tgt = { A: [BOXES.A.x + BOXES.A.w / 2, BOXES.A.y], B: [BOXES.B.x + 60, BOXES.B.y], C: [BOXES.C.x, BOXES.C.y + 90], D: [BOXES.D.x, BOXES.D.y + 40] };
  VALVES.forEach((v, i) => {
    const t = tgt[v.st], st = valves()[i], sx = v.x + (v.x < 800 ? -125 : 125);
    const pts = v.st === 'A' ? [[sx, v.y], [t[0] + 40, v.y], [t[0], t[1]]] : v.st === 'B' ? [[v.x - 40, v.y + 30], [v.x - 40, t[1] - 20], [t[0], t[1]]] : [[sx, v.y], [t[0] - 10, v.y], [t[0], t[1]]];
    ctx.save(); ctx.globalAlpha = st === true ? .95 : .6; Draw.curve(pts, 3, v.col, [7, 6]); ctx.restore();
    if (st === true && !Clock.reduced) { const u = (S.T * .5 + i * .25) % 1, q = polyAtPts(pts, u); Deco.glow(q.x, q.y, 12, 'rgba(255,240,170,A)', .8); }
  });
}
function polyAtPts(pts, u) { const n = pts.length - 1, k = Math.min(n - 1, Math.floor(u * n)), f = u * n - k; return { x: U.lerp(pts[k][0], pts[k + 1][0], f), y: U.lerp(pts[k][1], pts[k + 1][1], f) }; }
function drawHeart() {
  const vs = valves(), okN = vs.filter(v => v === true).length;
  const rate = heal > .9 ? 6 : 2 + okN, amp = heal > .9 ? .06 : .015 + okN * .01;
  const b = 1 + Math.sin(S.T * rate) * amp + heartBeat * Math.sin(S.T * 40) * .03, x = HEART.x, y = HEART.y;
  // arterias hacia las válvulas
  VALVES.forEach((v, i) => { const dx = v.x < 800 ? -1 : 1, dy = v.y < 300 ? -1 : 1, st = vs[i];
    const pts = [[x + dx * 70, y + dy * 40], [x + dx * 130, y + dy * 80], [v.x - dx * 122, v.y]];
    Draw.curve(pts, 22, PAL.ink); Draw.curve(pts, 14, st === true ? '#e0533f' : st === false ? '#7a3a33' : '#9a5a52'); });
  ctx.save(); ctx.translate(x, y); ctx.scale(b * 1.85, b * 1.85);
  Draw.shape([[0, 70], [-80, 0], [-74, -46], [-36, -60], [0, -30], [36, -60], [74, -46], [80, 0]], mix('#7a3a33', '#e0533f', heal), 3);
  ctx.globalAlpha = .25; Draw.ellipse(-40, -30, 18, 10, '#ffffff', 0, 12700); ctx.globalAlpha = 1;
  const face = { id: 1201, blink: 0, lookX: 0 }; const ex = heal > .9 ? 'happy' : heartBeat > .1 ? 'shock' : okN >= 2 ? 'idle' : 'sleepy';
  eyes(-22, -8, 8, face, { expr: ex, blink: 0 }); eyes(22, -8, 8, face, { expr: ex, blink: 0 }); mouth(0, 24, 12, heal > .9 || okN >= 3 ? 'happy' : 'sad');
  ctx.restore();
  Draw.text('EL CORAZÓN · ' + okN + ' de 4 válvulas', x, y + 150, { size: 14, font: FONT.plate, color: PAL.ink });
}
function drawValves() {
  const vs = valves();
  VALVES.forEach((v, i) => {
    const st = vs[i], g = valveGlow[i], hov = S.hoverId === 'valve' + i;
    if (st === true) Deco.glow(v.x, v.y, 140, 'rgba(180,240,140,A)', .35);
    if (g > 0) Deco.glow(v.x, v.y, 120, 'rgba(255,230,140,A)', .5 * g);
    Draw.rrect(v.x - 125, v.y - 30, 250, 60, 8, st === true ? '#dfe8c8' : st === false ? '#f3c3b8' : PAL.bone, hov ? 3.5 : 2.5, 12800 + i, st === false ? PAL.bad : v.col);
    // lámpara
    const lx = v.x - 98;
    Draw.ellipse(lx, v.y, 15, 15, st === true ? '#9be27a' : st === false ? '#ff6b4a' : '#5a4f63', 2.5, 12810 + i);
    Draw.text(v.n, lx, v.y + 1, { size: 15, font: FONT.title, color: PAL.bone });
    Draw.text(v.title, v.x + 14, v.y - 9, { size: 11.5, font: FONT.plate, color: PAL.ink });
    Draw.text('estación ' + v.st + ' · ' + v.from, v.x + 14, v.y + 12, { size: 14, color: st === false ? PAL.bad : PAL.inkSoft });
  });
}
function drawGearRoom() {
  const gm = P.gear(), f = gm.f;
  Draw.ellipse(WHEEL.x, WHEEL.y, WHEEL.r, WHEEL.r, '#e8b23c', 3, 12201);
  HH.labels.forEach((lab, j) => { const a = -Math.PI / 2 + j * Math.PI / 4 - wheelAng; Draw.text(lab, WHEEL.x + Math.cos(a) * (WHEEL.r - 20), WHEEL.y + Math.sin(a) * (WHEEL.r - 20), { size: 18, font: FONT.title, color: j === P.config.k ? PAL.bad : PAL.ink }); });
  Draw.shape([[WHEEL.x - 9, WHEEL.y - WHEEL.r - 14], [WHEEL.x + 9, WHEEL.y - WHEEL.r - 14], [WHEEL.x, WHEEL.y - WHEEL.r + 2]], PAL.bad, 2);
  Draw.ellipse(WHEEL.x, WHEEL.y, 12, 12, PAL.ink, 0, 12202);
  Draw.text('¿a dónde va el 1?', WHEEL.x, WHEEL.y - WHEEL.r - 30, { size: 16, color: PAL.inkSoft });
  const steps = [1, 2, 3, 0], sh = gearClash > 0 ? Math.sin(S.T * 60) * 4 * gearClash : 0;
  steps.forEach((x, i) => {
    const yy = 392 + i * 46, xx = 372, val = i < 3 ? f[x] : gm.endsAt;
    Draw.text(i < 3 ? 'f(' + LG(x) + ')' : '4·f(1)', xx - 26, yy, { size: 15, color: PAL.ink, align: 'right' });
    drawBead(speciesFor('Z8', val), xx + (i === 3 ? sh : 0), yy, 13);
    if (i < 3) Draw.text('+f(1) ↓', xx - 6, yy + 23, { size: 11, color: PAL.inkSoft });
  });
  Draw.text(gm.closes ? '✓ vuelve al 0' : '✗ NO vuelve al 0', 340, 392 + 3 * 46 + 34, { size: 15, color: gm.closes ? PAL.good : PAL.bad });
}
function drawBin(j) {
  const x = BX(j), a = 1 - gone[j];
  if (a <= .01) { Draw.text('triturado', x, BIN_Y + 20, { size: 13, color: PAL.inkSoft }); return; }
  ctx.save(); ctx.globalAlpha = a; ctx.translate(0, -lift[j] * 110);
  const tagged = P.config.tags.indexOf(j) !== -1;
  Draw.shape([[x - 42, BIN_Y - 30], [x + 42, BIN_Y - 30], [x + 34, BIN_Y + 38], [x - 34, BIN_Y + 38]], j === HH.identity ? '#cdb8d9' : '#c7c2a8', 2.5);
  drawBead(speciesFor('Z8', j), x - 12, BIN_Y + 24, 11);
  Draw.text(String(counts[j]), x + 22, BIN_Y + 24, { size: 15, font: FONT.title, color: counts[j] ? PAL.ink : PAL.bad });
  if (j === HH.identity) Draw.text('NEUTRO', x, BIN_Y + 54, { size: 10, font: FONT.plate, color: PAL.plum });
  if (tagged) { ctx.save(); ctx.translate(x + 34, BIN_Y - 36); ctx.rotate(.2); Draw.shape([[-14, 0], [14, 0], [14, 24], [0, 30], [-14, 24]], '#e4776a', 2.5); Draw.text('×', 0, 13, { size: 16, color: PAL.bone }); ctx.restore(); }
  if (pumped && !counts[j] && !S.run.active && !Clock.reduced && P.gear().closes) { const w = Math.sin(S.T * 10) * 5; Draw.line(x - 30, BIN_Y - 30, x - 30, BIN_Y - 66, 2.5, 12300 + j); Draw.shape([[x - 30, BIN_Y - 66], [x - 8 + w, BIN_Y - 61], [x - 30, BIN_Y - 54]], PAL.bad, 2); }
  ctx.restore();
}
function drawRegulator() {
  const x = REG.x, y = REG.y;
  Draw.rrect(x - 48, y - 62, 96, 110, 12, '#5b6a96', 3, 12400);
  Draw.ellipse(x, y - 24, 18, 18, regLight > 0 ? '#b9e08a' : regLight < 0 ? '#f0705f' : '#e9ecf8', 2.5, 12401); Draw.text('+', x, y - 23, { size: 18, font: FONT.title });
  Draw.text('REGULADOR', x, y + 14, { size: 10, font: FONT.plate, color: PAL.bone }); Draw.text('DE CIERRE', x, y + 28, { size: 10, font: FONT.plate, color: PAL.bone });
  const lines = regTape.slice(-6), tx = x + 64;
  Draw.rrect(tx, y - 66, 214, 150, 3, PAL.bone, 2, 12402);
  if (!lines.length) { Draw.text('marque contenedores', tx + 107, y - 20, { size: 15, color: PAL.inkSoft }); Draw.text('(clic) y pulse PROBADOR', tx + 107, y + 2, { size: 15, color: PAL.inkSoft }); }
  lines.forEach((l, i) => Draw.text(l.text, tx + 10, y - 50 + i * 22, { size: 14, align: 'left', color: l.ok === false ? PAL.bad : l.ok ? PAL.good : PAL.ink }));
}

/* ---------------- escena ---------------- */
const goals = () => { const vs = valves(); return VALVES.map((v, i) => ({ text: 'válvula ' + v.n + ': ' + v.title.toLowerCase(), ok: vs[i] === true, seen: vs[i] !== null })); };
const scene = {
  enter() {
    window.__L8 = debug;
    S.encIn('Orden final: el corazón de la fábrica. Cuatro válvulas, y cada una se arregla con algo que usted ya sabe hacer.', { leaveAfter: 9 });
    S.later(5.5, () => S.say('heart', 'pum…  …pum.  …  …pum.'), 'intro');
    S.later(8, () => S.say('op', 'Le puse cinta. No funcionó.'), 'intro');
  },
  exit() { if (window.__L8 === debug) window.__L8 = null; },
  update(dt) {
    S.update(dt); updateShredder(shred, dt); updateAssembler(asm, dt); updateOperario(op, dt);
    claw.moodT -= dt; if (claw.moodT < 0 && claw.mood !== 'search') claw.mood = 'idle';
    const t = P.config.k * Math.PI / 4; wheelAng += (t - wheelAng) * Math.min(1, dt * 8);
    gearClash = Math.max(0, gearClash - dt); heartBeat = Math.max(0, heartBeat - dt * .5); regLight *= Math.pow(.7, dt);
    for (let i = 0; i < 4; i++) valveGlow[i] = Math.max(0, valveGlow[i] - dt * .8);
    dock.forEach(c => Kit.live(c, dt, { x: WHEEL.x, y: WHEEL.y })); pieces.forEach(p => Kit.live(p, dt));
  },
  render() {
    drawHall();
    Draw.text('THE ALGEBRA ENGINE · MÁQUINA 8', 34, 26, { size: 15, font: FONT.plate, align: 'left', color: PAL.inkSoft, spacing: 2 });
    Draw.text('El corazón de la fábrica', 32, 54, { size: 30, font: FONT.title, align: 'left', jitter: 1.2, seed: 41 });
    PLATES.forEach(pl => { const r = pl[4]; Kit.plate(r.x, r.y, r.w, r.h, pl[2], { fill: pl[0] === 'shred' ? (lastTest && lastTest.ok ? '#f0b3a8' : '#d8d2c8') : pl[5], size: 13, focus: (S.kbd && S.focusId === pl[0]) || S.hoverId === pl[0] }); });
    S.drawHud(goals());
    S.drawFocus(items());
  },
  pointerDown(p) { S.kbd = false; S.cancel('intro'); S.progress(); const it = S.hit(items(), p); if (it) it.act(); },
  pointerMove(p) { S.pointer = { x: p.x, y: p.y, inside: true }; const it = S.hit(items(), p); S.hoverId = it ? it.id : null; App.setCursor(it ? 'pointer' : 'default'); },
  pointerUp() {}, pointerLeave() { S.pointer.inside = false; },
  key(e) {
    const k = e.key.toLowerCase();
    if (S.navKey(e, items())) return true;
    if (k === 'r') { pump(); return true; }
    if (k === 'p') { test(); return true; }
    if (k === 't') { doShred(); return true; }
    if (k === 'b') { goBack(); return true; }
    if (k === 'g') { turnWheel(1); return true; }
    if (/^[0-7]$/.test(k)) { tagBin(+k); return true; }
    if (k === 'z' || (e.ctrlKey && k === 'z')) { if (!P.undo().ok) S.say('op', 'Nada que deshacer.'); return true; }
    if (k === 'n') { P.reset(); return true; }
    return false;
  },
  hint: () => S.giveHint(), busy: () => S.run.active, skip: () => S.run.skip(),
  tableContext: () => ({ groups: [G, HH], highlight: S.slip ? S.slip.highlights() : {}, note: 'En el reloj de 8, los pares {0, 2, 4, 6} forman un grupo dentro.' }),
};
const debug = { P, S, pump, test, doShred, goBack, turnWheel, tagBin, restore, items, valves, returned: () => returned, pieces: () => pieces,
  fast() { for (let i = 0; i < 8000 && (S.run.active || S.timers.length); i++) scene.update(1 / 30); }, step(s) { for (let i = 0; i < s * 30; i++) scene.update(1 / 30); } };
scene.debug = () => debug;
return scene;
};
