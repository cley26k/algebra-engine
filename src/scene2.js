/* THE ALGEBRA ENGINE — Nivel 2: el taller de inspección.
 * Un taller más ancho que la pantalla: muelle → cinta → estampadora con tren de engranajes → bandejas.
 * Encima, un riel con la garra inspectora. Al fondo, la mesa de inspección y la lupa comparadora.
 * Mecánica: girar UNA rueda (¿a dónde va el 1?), observar las bandejas, investigar el núcleo con la garra
 * y descubrir con la lupa que dos piezas con el mismo destino tienen su diferencia en el neutro. */
'use strict';
window.ClawScene = function (App) {
const W = 1600, H = 900, ctx = Draw.ctx, AG = AlgebraGroups;
const P = AG.createWorkshop();
const G = P.G, HH = P.H, LG = i => G.labels[i];
const WORLD = { w: 2800, h: 900 };
const DOCK = i => ({ x: 214 + i * 62, y: 560 });
const BELT = { x0: 420, x1: 2400, y: 704 };
const PRESS = { x: 900, top: 360 };
const TRAY = j => ({ x: 1620 + j * 220, y: 800 });
const RAIL = { y: 150, x0: 300, x1: 2600 };
const BENCH = { x: 2440, y: 640, w: 180 };
const LUPA = { x: 2530, y: 470 };
const WHEEL = { x: 1130, y: 420, r: 80 };
const DIALS = [{ x: 0, lab: 'f(0)', px: 1236, py: 556 }, { x: 1, lab: 'f(1)', px: WHEEL.x, py: WHEEL.y }, { x: 2, lab: 'f(2)', px: 1316, py: 336 }, { x: 3, lab: 'f(3)', px: 1338, py: 470 }];

/* ---------------- reparto y repertorio ---------------- */
let claw;
const op = makeOperario(760, 618);
const S = Kit.base(App, 2, {
  world: WORLD, order: 'Que la garra no encuentre nada en el neutro salvo la identidad, sin romper las sumas.',
  groups: () => [G, HH], verdictAt: { x: 800, y: 74 }, ticketAt: { x: 1440, y: 820 }, stampAt: { x: 1300, y: 160 },
  cast: {
    op: { pos: () => ({ x: op.x + 40, y: op.y - 40 }), voice: 'op' },
    claw: { pos: () => ({ x: claw.x, y: claw.y - 40 }), voice: 'claw' },
  },
  state: () => hintState(),
  hints: [
    { topic: 'arrancar', when: s => !s.ran, tiers: [
      { text: 'Primero, mirar. Arranque la cinta y fíjese en qué bandeja cae cada pieza.', point: () => ({ x: LEVER.x, y: LEVER.y - 40 }) },
      { who: 'claw', text: 'A mí sólo me interesa la bandeja del neutro: la del 0.', point: () => ({ x: TRAY(0).x, y: TRAY(0).y - 40 }) },
      { who: 'claw', text: 'Con la rueda en 2, cuente cuántas piezas acaban en la bandeja del 0.' }] },
    { topic: 'roto', when: s => s.diag && s.diag.kind === 'broken', tiers: [
      { text: 'La estampadora se atasca. Lea el comprobador: ahí está el par que falla.' },
      { who: 'claw', text: 'Desacoplados, los diales van por libre. Acoplados, las sumas se respetan solas.' },
      { text: 'Pulse ACOPLAR en la palanca del tren de engranajes.', point: () => ({ x: CLUTCH.x, y: CLUTCH.y }) }] },
    { topic: 'todo-neutro', when: s => s.diag && s.diag.analysis.hom && s.k === HH.identity && s.coupled, tiers: [
      { who: 'claw', text: 'Todo al neutro. Para mí es fiesta, para usted es un desastre.' },
      { text: 'Si el 1 va al 0, todos van al 0. Gire la rueda.', point: () => WHEEL }] },
    { topic: 'lupa', when: s => s.ran && s.diag && s.diag.analysis.hom && !s.diag.analysis.kernelTrivial && !s.insight, tiers: [
      { who: 'claw', text: 'Dos piezas distintas en el neutro. ¿Qué tendrán en común?' },
      { who: 'claw', text: 'Use la lupa: elija dos piezas de la misma bandeja (clic en una y en otra).', point: () => ({ x: LUPA.x, y: LUPA.y }) },
      { who: 'claw', text: 'Pruebe la lupa con el 0 y el 2 de la bandeja del neutro.' }] },
    { topic: 'girar', when: s => s.diag && s.diag.analysis.hom && !s.diag.analysis.kernelTrivial, tiers: [
      { who: 'claw', text: 'Si el 2 cae en el neutro, es que f(1) + f(1) = 0.' },
      { text: 'Busque un destino para el 1 que, sumado consigo mismo, no dé 0.', point: () => WHEEL },
      { who: 'claw', text: 'En este reloj, 2 + 2 = 0. ¿Y 1 + 1? ¿Y 3 + 3?' }] },
    { topic: 'comprobar', when: s => s.diag && s.diag.analysis.hom && s.diag.analysis.kernelTrivial, tiers: [
      { text: 'Parece prometedor. Arranque la cinta para que la garra lo certifique.', point: () => ({ x: LEVER.x, y: LEVER.y - 40 }) }] },
  ],
});
const cam = S.cam;
claw = makeClaw(RAIL.y, 2300); claw.y = RAIL.y + 60;
const LEVER = { x: 640, y: 640 };
const CLUTCH = { x: 1020, y: 300 };
const LINES = {
  meet: [
    [['op', 'Bueno, por lo menos han llegado juntos. ¿Eso cuenta como ahorrar combustible?'], ['claw', 'No. Quiero saber si todavía podemos distinguir quién era quién.']],
    [['op', 'Mira, gemelos.'], ['claw', 'No son gemelos. Uno era el {a} y el otro el {b}. Ahora llevan la misma cara.']],
    [['claw', 'Dos piezas, un destino. Anotado.'], ['op', '¿Y no basta con mirarles el sombrero?'], ['claw', 'El sombrero no viaja más allá. Al otro lado sólo llega la cara.']],
  ],
  kernelMany: [
    [['claw', 'Neutro ocupado por: {list}. Más de uno.'], ['op', '¿Y eso es malo?'], ['claw', 'Es información. Quien cae en el neutro se vuelve invisible para la suma.']],
    [['claw', 'Bandeja del neutro: {list}. La identidad nunca falta. Los demás sobran.']],
  ],
  kernelOne: [
    [['claw', 'Bandeja del neutro: sólo el 0. Nada interesante que atrapar.'], ['op', '¿Y eso no es bueno?'], ['claw', 'Para la máquina sí. Para mí, un aburrimiento.']],
    [['claw', 'Sólo la identidad. Nadie más se esconde en el neutro.']],
  ],
  jam: [
    [['op', '¡Atasco! Tranquilos, tengo un martillo.'], ['claw', 'Antes de golpear, lea el comprobador.']],
    [['op', 'Le pongo cinta y listo.'], ['claw', 'La cinta no arregla una suma.']],
  ],
  decouple: [[['op', '¡Libertad para los diales!'], ['claw', 'Libertad para romper las sumas, querrá decir.']], [['op', 'Ahora cada uno va a su aire.']]],
  couple: [[['op', 'Engranajes en su sitio. Clac.']], [['claw', 'Acoplados: girar el 1 arrastra a todos.']]],
  wheel: [[['op', '¡Vuelta a la rueda!']], [['op', 'Y si giro esto… se mueven todos.']], [['claw', 'El 2 sigue al 1 dos veces. El 3, tres veces.']]],
  compareSame: [
    [['claw', '{b} − {a} = {d}. Y el {d}… cae en el neutro.'], ['claw', 'Si dos comparten destino, su diferencia acaba en la bandeja del 0. Siempre.']],
    [['claw', 'Diferencia: {d}. Destino de la diferencia: el neutro. No es casualidad.']],
  ],
  compareDiff: [[['claw', '{b} − {a} = {d}, que va al {fd}. No es el neutro: estos dos sí se distinguen.']]],
};

/* ---------------- piezas ---------------- */
const dock = G.labels.map((_, i) => { const p = DOCK(i), c = makeCritter('src', i, p.x, p.y, speciesFor('Z4', i)); c.s = .8; c.hx = p.x; c.hy = p.y; return c; });
let pieces = [];      // viajeros y residentes de las bandejas
let bench = [];       // piezas que la garra pone en la mesa
let sel = [];         // selección para la lupa
let lupa = { busy: false, show: null, t: 0, light: 0 };
let press = { y: 0, glow: 0 };
let beltT = 0, beltOn = 0, wheelAng = 0, insight = false, ran = false, lastDiag = null, gearsApart = 0;
const dialAng = [0, 0, 0, 0];

function hintState() { const c = P.config; return { ran, diag: lastDiag, k: c.k, coupled: c.coupled, insight }; }

/* ---------------- cambios lógicos → mundo ---------------- */
P.on((t, d) => {
  S.progress();
  if (S.run.active) { S.run.kill(); S.dir.play(LINES, 'jam', {}, { force: true }); }
  pieces.forEach(p => S.tw.add(p, { alpha: 0 }, .3)); S.later(.32, () => { pieces = []; });
  bench = []; sel = []; S.verdict = null; lastDiag = null; if (S.slip) S.slip.closing = true;
  const lab = d.label;
  if (lab === 'k') { Sound.fam('gear'); S.later(.08, () => Sound.fam('gear')); S.dir.play(LINES, 'wheel', {}, { cooldown: 8 }); op.expr = 'focus'; op.exprT = 1; }
  if (lab === 'decouple') { Sound.fam('crack'); S.dir.play(LINES, 'decouple', {}); }
  if (lab === 'manual') Sound.fam('clickin');
  if (lab === 'undo') Sound.whoosh();
});

/* ---------------- la ejecución ---------------- */
function lead() { const moving = pieces.filter(p => p.moving); return moving.length ? moving[moving.length - 1] : null; }
function trayPieces(j) { return pieces.filter(p => p.tray === j && !p.moving && p.alpha > .5); }
function slotIn(j, k) { const t = TRAY(j); return { x: t.x - 52 + (k % 3) * 52, y: t.y - 6 - Math.floor(k / 3) * 30 }; }
function runBelt() {
  if (S.run.active) { S.run.scale = 6; return; }
  App.levelStarted(2); S.progress(); if (S.clip.target) S.clip.toggle();
  pieces = []; bench = []; sel = []; S.verdict = null; if (S.slip) S.slip.closing = true;
  const d = P.diagnose(), f = P.map();
  ran = true; lastDiag = null;
  Sound.fam('hum'); beltOn = 1;
  S.run.start((function* () {
    cam.follow = () => { const l = lead(); return l ? { x: l.x + 120, y: 450 } : null; };
    const tw = S.run.tw;
    for (let x = 0; x < G.n; x++) {
      const src = dock[x], p = makeCritter('src', x, src.x, src.y, speciesFor('Z4', x));
      p.s = .74; p.moving = true; p.origin = x; pieces.push(p);
      poke(src, 6, -6); setExpr(src, 'happy', 1);
      // del muelle a la cinta, luego hasta la estampadora
      Kit.travel(tw, p, [[src.x, src.y], [src.x + 40, src.y - 50], [BELT.x0 + 10, 600], [BELT.x0 + 30, BELT.y - 4]], .7, { hops: 1, antic: true, land: true, done: () => {
        Kit.travel(tw, p, [[BELT.x0 + 30, BELT.y - 4], [PRESS.x, BELT.y - 4]], 1.1, { ease: Ease.linear, done: () => stamp(p, x, f[x]) });
      } });
      yield .9;
    }
    yield 3.2;
    beltOn = 0;
    // reacciones de quienes comparten bandeja
    const shared = HH.labels.map((_, j) => trayPieces(j)).filter(l => l.length > 1);
    shared.forEach((l, k) => S.bus.emit('meet', { list: l }, .2 + k * .6));
    yield shared.length ? 1.2 : .2;
    if (!d.analysis.hom) {
      cam.follow = null; cam.goto(1100, 450);
      press.glow = 1; Sound.fam('fail'); operarioDo(op, 'panic', 2.4); op.tool = 'hammer'; op.toolT = 2;
      const c = d.counterexample;
      S.slip = Kit.RouteSlip(G, HH, f, c.a, c.b, { x: 520, y: 650, title: 'LA ESTAMPADORA SE ATASCA EN ESTE PAR' });
      S.dir.play(LINES, 'jam', {}, { force: true, delay: .4 });
      yield 2.6;
    } else {
      yield* inspect(d);
    }
    lastDiag = d; S.verdict = d; cam.follow = null;
    const ev = P.evaluate();
    if (ev.done) S.complete({ nucleo: { G: 'Z4', H: 'Z4', f: [0, 2, 0, 2], from: 'máquina 2, antes de reparar' }, monomorfismo: { G: 'Z4', H: 'Z4', f: ev.map, from: 'máquina 2' } },
      'APROBADO: la garra no encuentra a nadie en el neutro salvo al 0. Monomorfismo. Vuelva a la fábrica (Esc).');
  })(), 'belt');
}
function stamp(p, x, y) {
  const tw = S.run.tw;
  // anticipación: la prensa sube un poco, luego cae
  tw.add(press, { y: -18 }, .14, { ease: Ease.out, done: () => tw.add(press, { y: 1 }, .1, { ease: Ease.in, done: () => {
    Sound.fam('press'); S.puff(PRESS.x, BELT.y - 30, 6, PAL.bone); press.glow = .6;
    p.species = speciesFor('Z4', y); p.hat = { col: SRC_COL[x], label: LG(x) }; p.sx.v = 1.5; p.sy.v = .55; Sound.fam('transform');
    tw.add(press, { y: 0 }, .3, { ease: Ease.out });
    const t = TRAY(y), k = pieces.filter(q => q.tray === y).length, slot = slotIn(y, k);
    p.tray = y;
    Kit.travel(tw, p, [[PRESS.x, BELT.y - 4], [t.x, BELT.y - 4]], .9 + (t.x - PRESS.x) / 1400, { ease: Ease.linear, delay: .15, done: () => {
      // el pistón empuja la pieza a su bandeja
      Sound.fam('clickin');
      Kit.travel(tw, p, [[t.x, BELT.y - 4], [slot.x, BELT.y - 50], [slot.x, slot.y]], .45, { ease: Ease.in, land: true, done: () => {
        p.moving = false; Sound.fam('thud'); p.hx = slot.x; p.hy = slot.y;
        const mates = trayPieces(y).filter(q => q !== p);
        if (mates.length) { Sound.fam('collide'); Kit.react(p, 'surprise'); Kit.react(mates[0], 'surprise'); p.lookX = -1; mates[0].lookX = 1; }
      } });
    } });
  } }) });
}
/* reacciones encadenadas al compartir bandeja: protestar, imitarse o esconderse */
S.bus.on('meet', e => {
  const [a, b] = e.list, mode = U.pick(['protest', 'imitate', 'hide']);
  if (mode === 'protest') { Kit.react(a, 'anger', 2.4); Kit.react(b, 'anger', 2.4); a.shake = .6; b.shake = .6; Sound.fam('collide'); }
  if (mode === 'imitate') { [a, b].forEach((c, i) => S.later(i * .25, () => { c.hop = 0; S.tw.add(c, { hop: 18 }, .15, { ease: Ease.out, done: () => S.tw.add(c, { hop: 0 }, .2, { ease: Ease.in }) }); Kit.react(c, 'confused', 1.6); })); }
  if (mode === 'hide') { Kit.react(b, 'shame', 2.4); S.tw.add(b, { hx: a.hx + 18, s: .6 }, .4, { ease: Ease.back }); }
  S.dir.play(LINES, 'meet', { a: a.hat.label, b: b.hat.label }, { cooldown: 12 });
});
/* la garra recorre el riel, encuentra el neutro y lleva sus piezas a la mesa */
function* inspect(d) {
  const tw = S.run.tw, eH = HH.identity, tray = TRAY(eH);
  cam.follow = () => ({ x: claw.x - 100, y: 430 });
  claw.mood = 'search'; Sound.fam('servo');
  // barrido de búsqueda con frenada precisa
  for (let j = HH.n - 1; j >= 0; j--) { tw.add(claw, { x: TRAY(j).x }, .35, { ease: Ease.inOut }); Sound.fam('gear'); yield .42; if (j === eH) break; }
  claw.mood = 'idle'; Sound.fam('bell'); yield .25;
  const found = trayPieces(eH);
  for (let k = 0; k < found.length; k++) {
    const p = found[k];
    tw.add(claw, { x: p.x }, .3, { ease: Ease.inOut }); yield .32;
    tw.add(claw, { y: claw.y - 16 }, .12, { ease: Ease.out }); yield .14;                 // anticipación
    tw.add(claw, { y: p.y - 70 }, .32, { ease: Ease.in }); yield .34;
    tw.add(claw, { open: 0 }, .12); Sound.fam('grab'); yield .16;
    p.carried = true; Kit.react(p, 'surprise', 1.4);
    tw.add(claw, { y: RAIL.y + 60 }, .4, { ease: Ease.inOut }); yield .42;
    const slot = { x: BENCH.x - 50 + bench.length * 44, y: BENCH.y - 12 };
    tw.add(claw, { x: slot.x }, .7 + Math.abs(slot.x - claw.x) / 2400, { ease: Ease.inOut }); yield .8 + Math.abs(slot.x - p.x) / 2400;
    tw.add(claw, { y: slot.y - 70 }, .35, { ease: Ease.inOut }); yield .37;
    tw.add(claw, { open: 1 }, .12); Sound.fam('release');
    p.carried = false; p.x = slot.x; p.y = slot.y; p.hx = slot.x; p.hy = slot.y; p.onBench = true; bench.push(p); pieces = pieces.filter(q => q !== p);
    tw.add(claw, { y: RAIL.y + 60 }, .3); yield .32;
    if (k === 0) { cam.follow = null; cam.goto(BENCH.x - 120, 470); }
  }
  if (found.length > 1) {
    claw.mood = 'happy'; claw.moodT = 3;
    bench.forEach(b => Kit.react(b, 'frustration', 2.6));
    S.dir.play(LINES, 'kernelMany', { list: '{ ' + bench.map(b => b.hat.label).join(', ') + ' }' }, { force: true });
  } else {
    claw.mood = 'frustrated'; claw.moodT = 3; Sound.fam('fail', { vol: .5 });
    S.dir.play(LINES, 'kernelOne', {}, { force: true });
  }
  yield 2.2;
}
/* la lupa comparadora: diferencia de dos piezas y adónde va */
function pick(p) {
  if (lupa.busy || S.run.active) return;
  const i = sel.indexOf(p);
  if (i !== -1) { sel.splice(i, 1); Sound.fam('drag'); return; }
  sel.push(p); Sound.fam('clickin'); Kit.react(p, 'surprise', .8);
  App.announce('Elegida la pieza que era el ' + p.hat.label + '. ' + (sel.length === 1 ? 'Elige otra para la lupa.' : ''));
  if (sel.length === 2) compare(sel[0], sel[1]);
}
function compare(pa, pb) {
  const a = pa.origin, b = pb.origin, r = P.compare(a, b), tw = S.run.tw;
  lupa.busy = true; S.progress();
  S.run.start((function* () {
    cam.follow = null; cam.goto(LUPA.x - 260, 470);
    for (const p of [pa, pb]) {
      tw.add(claw, { x: p.x }, .5, { ease: Ease.inOut }); yield .52;
      tw.add(claw, { y: p.y - 70 }, .3, { ease: Ease.in }); yield .32; tw.add(claw, { open: 0 }, .1); Sound.fam('grab'); yield .12;
      const copy = makeCritter('src', 0, p.x, p.y, p.species); copy.s = .6; copy.hat = p.hat; copy.carried = true; bench.push(copy); copy.temp = true;
      tw.add(claw, { y: RAIL.y + 60 }, .3); yield .32;
      tw.add(claw, { x: LUPA.x + (p === pa ? -30 : 30) }, .6, { ease: Ease.inOut }); yield .62;
      tw.add(claw, { y: LUPA.y - 40 }, .3); yield .32; tw.add(claw, { open: 1 }, .1); Sound.fam('release');
      copy.carried = false; copy.x = LUPA.x + (p === pa ? -30 : 30); copy.y = LUPA.y + 10; yield .1;
      tw.add(claw, { y: RAIL.y + 60 }, .3); yield .3;
    }
    lupa.show = r; lupa.t = 0; Sound.fam('glass');
    yield 1.4;
    lupa.light = r.inKernel ? 1 : -1;
    if (r.inKernel && r.d !== G.identity) {
      Sound.fam('discover'); Kit.react(claw, 'understand'); claw.mood = 'happy'; claw.moodT = 3;
      if (!insight) { insight = true; S.clip.text = 'Que la garra no encuentre nada en el neutro salvo la identidad. Descubierto: si dos piezas comparten destino, su diferencia cae en el neutro.'; }
      S.dir.play(LINES, 'compareSame', { a: LG(a), b: LG(b), d: LG(r.d) }, { force: true });
    } else if (r.d === G.identity) S.say('claw', 'Es la misma pieza dos veces. Diferencia: 0. Eso no demuestra nada.');
    else S.dir.play(LINES, 'compareDiff', { a: LG(a), b: LG(b), d: LG(r.d), fd: LG(r.fd) }, { force: true });
    yield 3;
  })(), 'lupa', () => { lupa.busy = false; sel = []; bench = bench.filter(b => !b.temp); });
}

/* ---------------- controles ---------------- */
function turnWheel(dir) { const k = (P.config.k + (dir || 1) + HH.n) % HH.n; P.setK(k); App.announce('La rueda manda el 1 al ' + LG(k) + '. El tren de engranajes da: ' + P.map().map((y, x) => LG(x) + '→' + LG(y)).join(', ')); }
function clutch() { if (P.config.coupled) { P.decouple(); App.announce('Diales desacoplados: cada uno va por libre.'); } else { P.setK(P.map()[1]); S.dir.play(LINES, 'couple', {}); Sound.fam('clickin'); App.announce('Diales acoplados.'); } }
function dialClick(x) {
  if (P.config.coupled) { if (x === 1) turnWheel(1); else { S.say('op', 'Ese dial lo mueve el engranaje. Para tocarlo hay que desacoplar.'); Sound.fam('fail', { vol: .4 }); } return; }
  const f = P.map(); P.setManual(x, (f[x] + 1) % HH.n);
}
function items() {
  const out = S.hudItems();
  out.push({ id: 'lever', x: LEVER.x - 40, y: LEVER.y - 130, w: 90, h: 150, label: 'Arrancar la cinta (R)', act: runBelt, hoverOutline: true, pri: 2 });
  out.push({ id: 'wheel', r: WHEEL.r + 10, x: WHEEL.x, y: WHEEL.y, label: 'Rueda: ¿a dónde va el 1? (clic: siguiente)', act: () => turnWheel(1), hoverOutline: true, pri: 3 });
  out.push({ id: 'clutch', x: CLUTCH.x - 30, y: CLUTCH.y - 50, w: 60, h: 90, label: P.config.coupled ? 'Desacoplar los diales' : 'Acoplar los diales', act: clutch, hoverOutline: true, pri: 2 });
  DIALS.filter(d => d.x !== 1).forEach(d => out.push({ id: 'dial' + d.x, r: 44, x: d.px, y: d.py, label: 'Dial ' + d.lab + (P.config.coupled ? ' (acoplado)' : ''), act: () => dialClick(d.x), hoverOutline: true, pri: 2 }));
  pieces.filter(p => !p.moving && p.tray !== undefined).forEach(p => out.push({ id: 'piece' + p.origin, r: 30, x: p.x, y: p.y - 26, label: 'Pieza que era el ' + p.hat.label + ', en la bandeja del ' + LG(p.tray) + ' (elegir para la lupa)', act: () => pick(p), hoverOutline: true, pri: 1 }));
  bench.filter(b => !b.temp && !b.carried).forEach(p => out.push({ id: 'bench' + p.origin, r: 30, x: p.x, y: p.y - 26, label: 'Pieza de la mesa que era el ' + p.hat.label + ' (elegir para la lupa)', act: () => pick(p), hoverOutline: true, pri: 1 }));
  out.push({ id: 'lupa', r: 60, x: LUPA.x, y: LUPA.y - 30, label: 'Lupa comparadora: elige dos piezas de las bandejas', act: () => { if (sel.length < 2) S.say('claw', 'Elija dos piezas de las bandejas y yo se las traigo.'); }, hoverOutline: true, pri: 4 });
  return out;
}

/* ---------------- dibujo ---------------- */
function drawWorld() {
  // suelo y pared del taller
  ctx.fillStyle = PAL.paper; ctx.fillRect(-1200, -800, WORLD.w + 2400, WORLD.h + 1600);
  if (App.grain) { ctx.fillStyle = App.grain; ctx.fillRect(-1200, -800, WORLD.w + 2400, WORLD.h + 1600); }
  ctx.fillStyle = '#d9a77c'; ctx.fillRect(-1200, 760, WORLD.w + 2400, 940);
  for (let x = -1200; x < WORLD.w + 1200; x += 120) Draw.line(x, 760, x - 60, 900, 1.5, 5000 + x, 'rgba(33,28,51,.12)');
  Deco.room(S.T, { wall: [-1200, -800, WORLD.w + 1200, 760], floor: [760, -1200, WORLD.w + 1200, 300], lamps: [200, 650, 1250, 1700, 2250], len: 0, reach: 520,
    clock: [1680, 300, 26], posters: [
      [570, 420, 140, 112, 'AVISO', ['lo que cae en', 'la bandeja del 0', 'es el NÚCLEO'], { stripe: '#b8322a', rot: -.03 }],
      [1480, 430, 150, 118, 'DÍAS SIN ATASCOS', [], { big: '0', bigSize: 48, rot: .025 }],
      [1820, 430, 150, 112, 'LA GARRA', ['no muerde', '(casi nunca)'], { stripe: '#3d5a4a', rot: -.02 }]] });
  for (let x = 80; x < WORLD.w; x += 340) { Draw.rrect(x, 230, 120, 160, 6, '#e8c08e', 2, 5100 + x); Draw.line(x + 60, 230, x + 60, 390, 1.5, 5101 + x); Draw.line(x, 310, x + 120, 310, 1.5, 5102 + x); }
  Draw.text('MUELLE', 300, 640, { size: 16, font: FONT.plate, color: PAL.inkSoft, spacing: 2 });
  Draw.text('BANDEJAS DE INSPECCIÓN', 1950, 880, { size: 16, font: FONT.plate, color: PAL.inkSoft, spacing: 2 });
  // muelle (estante elevado con rampa hasta la cinta)
  Draw.rrect(170, 572, 250, 30, 4, '#a7744a', 3, 5200);
  Draw.line(190, 602, 190, 760, 5, 5205); Draw.line(400, 602, 400, 760, 5, 5206);
  Draw.shape([[420, 576], [436, 576], [BELT.x0 + 30, BELT.y], [BELT.x0 + 4, BELT.y]], '#b98a5a', 2.5);
  dock.forEach(c => { Draw.ellipse(c.hx, c.hy + 4, 26, 6, 'rgba(33,28,51,.18)', 0, 5201 + c.v); });
  // cinta
  Draw.rrect(BELT.x0, BELT.y, BELT.x1 - BELT.x0, 26, 13, '#4b4536', 3, 5300);
  ctx.save(); ctx.beginPath(); ctx.rect(BELT.x0 + 6, BELT.y + 2, BELT.x1 - BELT.x0 - 12, 22); ctx.clip();
  for (let x = BELT.x0 - 30; x < BELT.x1; x += 30) Draw.line(x + (beltT % 30), BELT.y + 2, x + (beltT % 30) + 10, BELT.y + 24, 2, 5301, '#8a7f63');
  ctx.restore();
  for (let x = BELT.x0 + 40; x < BELT.x1; x += 160) { Draw.line(x, BELT.y + 26, x - 10, 760, 4, 5310 + x); }
  // bandejas
  HH.labels.forEach((_, j) => {
    const t = TRAY(j), n = trayPieces(j).length;
    Draw.shape([[t.x - 90, t.y - 30], [t.x + 90, t.y - 30], [t.x + 76, t.y + 20], [t.x - 76, t.y + 20]], j === HH.identity ? '#cdb8d9' : '#c7c2a8', 3);
    drawBead(speciesFor('Z4', j), t.x, t.y + 42, 15);
    if (j === HH.identity) Draw.text('NEUTRO', t.x + 50, t.y + 44, { size: 12, font: FONT.plate, color: PAL.plum });
    // pistón y compuerta sobre la cinta
    Draw.rrect(t.x - 8, BELT.y - 70, 16, 40, 3, '#8a8466', 2, 5400 + j);
    if (n === 0 && ran && !S.run.active) Draw.text('vacía', t.x, t.y - 6, { size: 15, color: PAL.inkSoft });
  });
  // riel
  drawRail();
  // estampadora
  drawPress();
  drawGears();
  // palanca
  const la = S.run.active ? .3 : -1.1;
  Draw.rrect(LEVER.x - 20, LEVER.y - 14, 40, 34, 6, PAL.oliveDeep, 3, 5500);
  const ex = LEVER.x + Math.cos(la) * 110, ey = LEVER.y + Math.sin(la) * 110;
  Draw.line(LEVER.x, LEVER.y, ex, ey, 8, 5501); Draw.line(LEVER.x, LEVER.y, ex, ey, 3.5, 5502, PAL.bone); Draw.ellipse(ex, ey, 16, 16, PAL.bad, 3, 5503);
  ctx.save(); ctx.translate(ex + 10, ey + 14); ctx.rotate(.2); Draw.rrect(-6, 14, 86, 22, 3, PAL.bone, 2, 5504); Draw.text(S.run.active ? 'MÁS RÁPIDO' : 'ARRANCAR', 37, 25, { size: 11, font: FONT.plate }); ctx.restore();
  // mesa de inspección y lupa
  Draw.rrect(BENCH.x - 90, BENCH.y, BENCH.w + 40, 24, 4, '#8d5a2f', 3, 5600);
  Draw.line(BENCH.x - 70, BENCH.y + 24, BENCH.x - 70, 760, 5, 5601); Draw.line(BENCH.x + 110, BENCH.y + 24, BENCH.x + 110, 760, 5, 5602);
  Draw.text('MESA DE INSPECCIÓN', BENCH.x, BENCH.y + 52, { size: 13, font: FONT.plate, color: PAL.inkSoft });
  drawLupa();
  // operario
  drawOperario(op, (S.pointer.inside ? S.cam.toWorld(S.pointer).x - op.x : 0) / 60);
  // criaturas
  dock.forEach(c => { c.x = c.hx; c.y = c.hy; drawCritter(c); Kit.drawMark(c); });
  pieces.forEach(p => { if (!p.carried) { if (!p.moving) { p.x = U.lerp(p.x, p.hx, .2); p.y = U.lerp(p.y, p.hy, .2); } drawCritter(p); Kit.drawMark(p); } });
  sel.forEach(p => { ctx.save(); ctx.setLineDash([5, 4]); Draw.ellipse(p.x, p.y - 24, 34, 34, null, 3, 5700, PAL.ultra); ctx.restore(); });
  bench.forEach(b => { if (!b.carried) { drawCritter(b); Kit.drawMark(b); } });
  // la garra (encima de todo lo del taller)
  drawClaw(claw, RAIL.x0, RAIL.x1);
  const carried = pieces.concat(bench).find(p => p.carried);
  if (carried) { carried.x = claw.x; carried.y = claw.y + 70; drawCritter(carried); }
  if (claw.mark) Kit.drawMark(claw);
  S.drawParts();
}
function drawRail() {
  for (let x = RAIL.x0 + 100; x < RAIL.x1; x += 500) Draw.line(x, 0, x, RAIL.y - 10, 4, 5800 + x);
}
function drawPress() {
  const x = PRESS.x, top = PRESS.top, headY = 560 + press.y * 80 + (press.y < 0 ? press.y : 0);
  Draw.rrect(x - 70, top, 20, 380, 4, PAL.oliveDeep, 3, 5900); Draw.rrect(x + 50, top, 20, 380, 4, PAL.oliveDeep, 3, 5901);
  Draw.rrect(x - 84, top - 40, 168, 50, 10, PAL.mustard, 3, 5902);
  Draw.text('ESTAMPADORA', x, top - 15, { size: 13, font: FONT.plate });
  Draw.line(x, top + 10, x, headY, 10, 5903); Draw.line(x, top + 10, x, headY, 4, 5904, PAL.bone);
  Draw.rrect(x - 46, headY, 92, 46, 6, press.glow > 0 ? '#f6e27a' : '#c7c2a8', 3, 5905);
  Draw.text('f', x, headY + 24, { size: 24, font: FONT.title });
  // cable de transmisión hacia el tren de engranajes
  Draw.curve([[x + 84, top - 10], [x + 140, top - 60], [WHEEL.x - 90, WHEEL.y - 40]], 4, PAL.ink, [8, 6]);
}
function drawGears() {
  const c = P.config, f = P.map();
  Draw.rrect(990, 230, 420, 432, 14, '#3a3150', 3, 6000);
  Draw.text('TREN DE ENGRANAJES', 1200, 254, { size: 13, font: FONT.plate, color: PAL.bone, spacing: 2 });
  Draw.text('rueda grande: ¿a dónde va el 1?', 1200, 280, { size: 15, color: '#f3e6c8' });
  // engranajes intermedios (se separan al desacoplar)
  const apart = gearsApart * 22;
  [[1232, 360], [1250, 420], [1190, 520]].forEach((g, i) => {
    const pts = [], rot = wheelAng * (i % 2 ? -1.6 : 1.6);
    for (let k = 0; k < 20; k++) { const a = rot + k / 20 * Math.PI * 2, r = k % 2 ? 16 : 21; pts.push([g[0] + Math.cos(a) * r + apart * (i - 1), g[1] + Math.sin(a) * r + apart]); }
    Draw.shape(pts, PAL.olive, 2.2); Draw.ellipse(g[0] + apart * (i - 1), g[1] + apart, 5, 5, PAL.bone, 1.5, 6010 + i);
  });
  // diales
  DIALS.forEach(d => {
    const big = d.x === 1, r = big ? WHEEL.r : 44, y = f[d.x];
    Draw.ellipse(d.px, d.py, r, r, big ? '#e8b23c' : PAL.bone, 3, 6020 + d.x);
    HH.labels.forEach((lab, j) => { const a = -Math.PI / 2 + j * Math.PI / 2 - dialAng[d.x]; Draw.text(lab, d.px + Math.cos(a) * (r - (big ? 22 : 15)), d.py + Math.sin(a) * (r - (big ? 22 : 15)), { size: big ? 22 : 15, font: FONT.title, color: j === y ? PAL.bad : PAL.ink }); });
    Draw.shape([[d.px - 8, d.py - r - 12], [d.px + 8, d.py - r - 12], [d.px, d.py - r + 2]], PAL.bad, 2);
    Draw.ellipse(d.px, d.py, big ? 12 : 7, big ? 12 : 7, PAL.ink, 0, 6030 + d.x);
    Draw.text(d.lab, d.px, d.py + r + (big ? 18 : 14), { size: big ? 18 : 15, color: PAL.bone });
  });
  // embrague
  const cx = CLUTCH.x, cy = CLUTCH.y;
  Draw.rrect(cx - 14, cy - 40, 28, 80, 8, '#1a1528', 2.5, 6040, PAL.bone);
  const ky = c.coupled ? cy - 22 : cy + 22;
  Draw.ellipse(cx, ky, 14, 14, c.coupled ? PAL.good : PAL.bad, 2.5, 6041, PAL.bone);
  Draw.text(c.coupled ? 'ACOPLADO' : 'SUELTO', cx, cy + 56, { size: 11, font: FONT.plate, color: PAL.bone });
  if (c.coupled) Draw.text('f(2) = f(1)+f(1) · f(3) = f(2)+f(1) · f(0) = f(3)+f(1)', 1200, 640, { size: 14, color: '#c9c2e0' });
  else Draw.text('cada dial por libre: las sumas ya no están garantizadas', 1200, 640, { size: 14, color: '#f0b3a8' });
}
function drawLupa() {
  const x = LUPA.x, y = LUPA.y;
  Draw.line(x, y + 40, x, BENCH.y, 5, 6100); Draw.rrect(x - 40, y + 30, 80, 14, 4, PAL.oliveDeep, 2.5, 6101);
  Draw.ellipse(x, y - 50, 60, 60, '#5d6080', 3.5, 6102); Draw.ellipse(x, y - 50, 48, 48, lupa.light > 0 ? '#f6e27a' : lupa.light < 0 ? '#e9ecf8' : '#dfe3f3', 2.5, 6103);
  Draw.line(x + 42, y - 8, x + 70, y + 24, 7, 6104);
  Draw.text('LUPA', x, y + 62, { size: 12, font: FONT.plate, color: PAL.inkSoft });
  const r = lupa.show;
  if (r) {
    const st = Math.min(3, Math.floor(lupa.t / .5));
    Draw.text(LG(r.b) + ' − ' + LG(r.a), x, y - 66, { size: 22, font: FONT.title });
    if (st >= 1) Draw.text('= ' + LG(r.d), x, y - 36, { size: 22, font: FONT.title, color: PAL.plum });
    if (st >= 2) { Draw.text('f(' + LG(r.d) + ') = ' + LG(r.fd), x, y - 128, { size: 20, color: r.inKernel ? PAL.plum : PAL.ink }); }
    if (st >= 3) Draw.text(r.inKernel ? '¡cae en el neutro!' : 'no es el neutro', x, y - 154, { size: 18, color: r.inKernel ? PAL.plum : PAL.inkSoft });
  } else if (sel.length === 1) Draw.text('elige otra pieza', x, y - 50, { size: 15, color: PAL.inkSoft });
  else Draw.text('?', x, y - 50, { size: 34, font: FONT.title, color: PAL.inkSoft });
}
function drawMinimap() {
  const x0 = 540, x1 = 1060, y = 30, sc = (x1 - x0) / WORLD.w;
  Draw.rrect(x0 - 6, y - 14, x1 - x0 + 12, 28, 6, 'rgba(251,239,220,.85)', 2, 6200);
  [['muelle', 300], ['prensa', 860], ['engranajes', 1220], ['bandejas', 1950], ['mesa', 2480]].forEach(([n, wx]) => { Draw.ellipse(x0 + wx * sc, y, 3, 3, PAL.inkSoft, 0, 6201); Draw.text(n, x0 + wx * sc, y + 22, { size: 12, color: PAL.inkSoft }); });
  const vx = x0 + (cam.x - W / 2 / cam.z) * sc, vw = W / cam.z * sc;
  Draw.rrect(vx, y - 10, vw, 20, 4, 'rgba(43,71,209,.15)', 2, 6202, PAL.ultra);
  Draw.ellipse(x0 + claw.x * sc, y - 6, 4, 4, '#ff6b4a', 0, 6203);
}

/* ---------------- escena ---------------- */
let dragCam = null;
const goals = () => { const e = P.evaluate(), seen = !!lastDiag; return [{ text: 'las sumas sobreviven', ok: seen && e.d.analysis.hom, seen }, { text: 'en el neutro sólo la identidad', ok: seen && e.d.analysis.hom && e.d.analysis.kernelTrivial, seen }]; };
const scene = {
  enter() {
    window.__L2 = debug; cam.goto(800, 450); cam.snap();
    S.encIn('Orden nº 2: la garra encuentra demasiadas piezas en el neutro. Quiero que no encuentre nada… salvo la identidad.', { leaveAfter: 9 });
    S.later(6, () => { if (!ran) { S.say('claw', 'Arranque la cinta. Yo vigilo desde arriba.'); claw.mood = 'search'; claw.moodT = 2; } }, 'intro');
  },
  exit() { if (window.__L2 === debug) window.__L2 = null; },
  update(dt) {
    S.update(dt);
    beltT += dt * 90 * (beltOn || (S.run.active && S.run.tag === 'belt') ? 1 : 0);
    press.glow = Math.max(0, press.glow - dt);
    gearsApart += ((P.config.coupled ? 0 : 1) - gearsApart) * Math.min(1, dt * 6);
    const f = P.map();
    DIALS.forEach(d => { const target = f[d.x] * Math.PI / 2; dialAng[d.x] += (target - dialAng[d.x]) * Math.min(1, dt * 8); });
    wheelAng = dialAng[1];
    lupa.t += dt; if (lupa.light) lupa.light *= Math.pow(.6, dt);
    const look = S.pointer.inside ? cam.toWorld(S.pointer) : { x: PRESS.x, y: 500 };
    dock.forEach(c => { Kit.live(c, dt, look); c.actT -= dt; if (c.actT < 0 && !Clock.reduced) { c.actT = U.rand(4, 9); poke(c, 4, -5); } });
    pieces.concat(bench).forEach(p => Kit.live(p, dt, p.moving ? null : { x: claw.x, y: claw.y }));
    updateOperario(op, dt);
    claw.lens = Math.sin(S.T * 2) * .5; claw.moodT -= dt; if (claw.moodT < 0 && claw.mood !== 'search') claw.mood = 'idle';
    if (claw.markT !== undefined) { claw.markT -= dt; if (claw.markT <= 0) claw.mark = null; }
    if (!S.run.active && !dragCam) { /* deriva suave hacia lo que el jugador mira */ }
  },
  render() {
    ctx.save(); cam.apply(ctx); drawWorld(); ctx.restore();
    Draw.text('THE ALGEBRA ENGINE · MÁQUINA 2', 34, 26, { size: 15, font: FONT.plate, align: 'left', color: PAL.inkSoft, spacing: 2 });
    Draw.text('La garra del núcleo', 32, 54, { size: 30, font: FONT.title, align: 'left', jitter: 1.2, seed: 35 });
    drawMinimap();
    S.drawHud(goals());
    if (cam.x < 1200 && !S.run.active) Draw.text('arrastra el fondo o usa A/D para recorrer el taller →', 1240, 880, { size: 16, color: PAL.inkSoft });
    S.drawFocus(items());
  },
  pointerDown(p) {
    S.kbd = false; S.cancel('intro'); S.progress();
    if (p.y < 50 && p.x > 534 && p.x < 1066) { cam.goto((p.x - 540) / (520) * WORLD.w, 450); return; }
    const it = S.hit(items(), p);
    if (it) { it.act(); return; }
    dragCam = { x: p.x, cx: cam.tx };
  },
  pointerMove(p) {
    S.pointer = { x: p.x, y: p.y, inside: true };
    if (dragCam) { cam.goto(dragCam.cx - (p.x - dragCam.x) / cam.z, cam.ty); cam.snap(); App.setCursor('grabbing'); return; }
    const it = S.hit(items(), p); S.hoverId = it ? it.id : null; App.setCursor(it ? 'pointer' : 'grab');
  },
  pointerUp() { dragCam = null; },
  pointerLeave() { S.pointer.inside = false; dragCam = null; },
  key(e) {
    const k = e.key.toLowerCase();
    if (k === 'a') { cam.goto(cam.tx - 300, cam.ty); return true; }
    if (k === 'd') { cam.goto(cam.tx + 300, cam.ty); return true; }
    if (S.navKey(e, items())) return true;
    if (k === 'r') { runBelt(); return true; }
    if (k === 'z' || (e.ctrlKey && k === 'z')) { if (!P.undo().ok) S.say('op', 'No hay nada que deshacer.'); return true; }
    if (k === 'n') { P.reset(); return true; }
    if (k === 'g') { turnWheel(1); return true; }
    if (k === 'escape' && sel.length) { sel = []; return true; }
    return false;
  },
  hint: () => S.giveHint(),
  busy: () => S.run.active,
  skip: () => S.run.skip(),
  tableContext: () => ({ groups: [G], highlight: S.slip ? S.slip.highlights() : lupa.show ? { Z4: { r: lupa.show.b, c: G.inverse(lupa.show.a) } } : {}, note: 'En el reloj de 4, x + x = 0 sólo para el 0 y el 2.' }),
};
const debug = { P, S, claw, pieces: () => pieces, bench: () => bench, runBelt, turnWheel, clutch, dialClick, pick, compare, items, insight: () => insight, lastDiag: () => lastDiag,
  fast() { for (let i = 0; i < 6000 && (S.run.active || S.timers.length); i++) scene.update(1 / 30); }, step(s) { for (let i = 0; i < s * 30; i++) scene.update(1 / 30); } };
scene.debug = () => debug;
return scene;
};
