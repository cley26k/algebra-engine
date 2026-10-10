/* THE ALGEBRA ENGINE — Nivel 7: el caso de los gemelos imposibles (rediseño, iteración 6).
 * Un caso de detective en tres pasos, siempre a la vista en el EXPEDIENTE:
 *   1 · MEDIR VUELTAS — clic en un habitante: la noria de su mundo lo combina consigo mismo hasta que vuelve a casa
 *       y cuenta los pasos (su orden). Cada medida cae en la HUELLA de su mundo (cuántos tardan 1, 2, 3 o 4 pasos).
 *   2 · PROBAR EL PUENTE — si existiera la traducción, ¿adónde iría el 1? Como el 1 lo decide todo
 *       (f(2) = f(1)∘f(1)…), basta probar los cuatro gemelos: todos chocan.
 *   3 · INFORME — cuatro líneas que siguen el razonamiento; cada hueco cambia con un clic y se comprueba con lo medido. */
'use strict';
window.LabScene = function (App) {
const W = 1600, H = 900, ctx = Draw.ctx, AG = AlgebraGroups;
const P = AG.createCase();
const G = P.G, HH = P.H;
const JAR = {
  G: { x: 250, y: 455, r: 158, K: G, name: 'EL RELOJ DE 4', note: 'aquí se suma: 3 + 1 = 0', tint: 'rgba(239,201,162,.55)' },
  H: { x: 1350, y: 455, r: 158, K: HH, name: 'LOS GEMELOS DE KLEIN', note: 'a∘a = e · a∘b = c', tint: 'rgba(199,201,223,.55)' },
};
const NORIA = side => ({ x: JAR[side].x, y: 712 });
const BOARD = { x: 470, y: 78, w: 660, h: 580 };
const FP = { x: BOARD.x + 24, y: BOARD.y + 150, w: BOARD.w - 48, h: 150 };
const REPORT = { x: BOARD.x + 24, y: BOARD.y + 336 };
const STAMP = { x: BOARD.x + BOARD.w - 196, y: BOARD.y + BOARD.h - 56, w: 176, h: 42 };
const BR = { x: 470, y: 690, w: 660, h: 190 };
const SEL = y => ({ x: BR.x + 70 + y * 62, y: BR.y + 92 });
const OUT = x => ({ x: BR.x + 360 + x * 72, y: BR.y + 92 });

const op = makeOperario(1190, 806);
const S = Kit.base(App, 7, {
  order: '¿Se puede traducir el reloj de 4 a los gemelos de Klein sin perder nada? Mida, pruebe y redacte el informe. Pruebas, no presentimientos.',
  groups: () => [G, HH], clipAt: { x: 26, y: 84 }, ticketAt: { x: 1200, y: 600 }, stampAt: { x: 800, y: 470 },
  cast: {
    op: { pos: () => ({ x: op.x, y: op.y - 70 }), voice: 'op' },
    G0: { pos: () => crit('G', 0), voice: 0 }, G1: { pos: () => crit('G', 1), voice: 1 }, G2: { pos: () => crit('G', 2), voice: 2 }, G3: { pos: () => crit('G', 3), voice: 3 },
    H0: { pos: () => crit('H', 0), voice: 0 }, H1: { pos: () => crit('H', 1), voice: 1 }, H2: { pos: () => crit('H', 2), voice: 2 }, H3: { pos: () => crit('H', 3), voice: 3 },
  },
  state: () => hintState(),
  hints: [
    { topic: 'medir', when: s => s.stage === 1, tiers: [
      { text: 'Paso 1: haga clic en un habitante. La noria lo combina consigo mismo hasta que vuelve a casa, y cuenta los pasos.', point: () => crit('G', 1) },
      { text: 'Esos pasos son su huella. Mida a los ocho: cuatro del reloj y cuatro gemelos.' },
      { text: t => 'Faltan por medir: ' + t.missing.join(', ') + '.' }] },
    { topic: 'puente', when: s => s.stage === 2, tiers: [
      { text: 'Paso 2: si la traducción existiera, el 1 iría a algún gemelo. Pruebe cada uno en el puente.', point: () => SEL(1) },
      { text: 'El 1 lo decide todo: f(2) = f(1)∘f(1), f(3) = f(2)∘f(1). Mire con quién choca el 2.' },
      { text: t => 'Faltan por probar en el puente: ' + t.untried.join(', ') + '.' }] },
    { topic: 'informe', when: s => s.stage === 3, tiers: [
      { text: 'Paso 3: rellene el informe. Cada hueco cambia con un clic; la marca de la derecha dice si la línea se sostiene.', point: () => ({ x: REPORT.x + 200, y: REPORT.y + 30, screen: true }) },
      { text: t => t.lineHint },
      { text: 'Línea 1: el 1 (o el 3) tarda 4 pasos. Línea 2: ninguno más de 2. Línea 3: conserva. Línea 4: no existe.' }] },
    { topic: 'sello', when: s => s.stage === 4 && !s.stamped, tiers: [{ text: 'El informe se sostiene. Selle IMPOSIBLE.', point: () => ({ x: STAMP.x + 88, y: STAMP.y + 20, screen: true }) }] },
  ],
});
const LINES = {
  four: [[['G{x}', '¡Cuatro pasos para volver al 0!'], ['op', 'Eso es mucho girar. Apuntado en la huella.']], [['G{x}', '¡Uno, dos, tres… y cuatro! ¡En casa!']]],
  twin: [[['H{x}', '¡Yo vuelvo en dos! {l}∘{l} = e.'], ['op', 'Como todos los gemelos, sospecho.']], [['H{x}', 'Dos pasos y en casa.']]],
  home: [[['op', 'El neutro ya está en casa: 1 paso. Ése no cuenta mucho.']]],
  two: [[['G{x}', 'Dos pasos: 2 + 2 = 0.']]],
  fpDone: [[['op', 'Mire las huellas: en el reloj, dos tardan 4 pasos. En los gemelos… nadie.'], ['op', 'Una traducción reversible no puede inventarse vueltas. Pero probémoslo en el puente.']]],
  bridge: [[['op', 'Si el 1 va al {y}, el 2 va a {y}∘{y} = e… ¡y el 0 ya estaba en e! Choque.']], [['op', 'Con el {y}: f(2) = f(0). Dos al mismo sitio.']]],
  bridgeE: [[['op', 'Si el 1 va a e, choca directamente con el 0.']]],
  allTried: [[['op', 'Los cuatro gemelos chocan. Y como el 1 lo decide todo, no queda ninguna traducción por probar.'], ['enc', 'Bien. Ahora, el informe. Por escrito.']]],
  lineOk: [[['op', 'Esa línea se sostiene.']], [['op', 'Correcto. Siguiente.']]],
  proofOk: [[['op', 'Cuatro líneas, cada una apoyada en lo que medimos. Ni una biyección probada a ciegas.']]],
};
const WHY = {
  unmeasured: () => 'Eso aún no lo ha medido la noria. Mídalo primero.',
  mismatch: r => 'Eso no es lo que midió la noria: tarda ' + r.real + (r.real === 1 ? ' paso.' : ' pasos.'),
  weak: () => 'Cierto, pero no sirve: los gemelos también tienen a alguien así. Busque una vuelta que ellos no puedan imitar.',
  wrong2: () => 'Recuerde el puente: f(1)∘f(1) = f(1 + 1). Si f(1) volviera antes que el 1, arrastraría a otro al mismo sitio.',
  wrong3: () => 'Las tres líneas de arriba dicen lo contrario. Léalas en voz alta.',
  premature: () => 'Primero las líneas 1, 2 y 3: la conclusión se apoya en ellas.',
};

/* ---------------- habitantes ---------------- */
const crits = { G: [], H: [] };
const SPOT = [[-70, -60], [70, -60], [-70, 50], [70, 50]];
['G', 'H'].forEach(side => { const J = JAR[side]; J.K.labels.forEach((_, i) => { const c = makeCritter('src', i, J.x + SPOT[i][0], J.y + SPOT[i][1], speciesFor(J.K.key, i)); c.s = .82; c.hx = c.x; c.hy = c.y; c.ax = c.x; c.ay = c.y; c.side = side; c.wander = { t: U.rand(1, 3), tx: c.x, ty: c.y }; crits[side].push(c); }); });
function crit(side, i) { const c = crits[side][i]; return { x: c.x, y: c.y - 50 }; }
const rep = { G: { c: null, step: 0, seq: null, busy: false, tape: null }, H: { c: null, step: 0, seq: null, busy: false, tape: null } };
let bridge = { y: null, t: 0, f: null, collision: null }, stamped = false, flash = [], fpPop = {}, lineFlash = [0, 0, 0, 0], lastLine = null;
let fpDoneSaid = false, triedSaid = false;
function hintState() {
  const pr = P.proof(), bad = pr.lines.findIndex(l => !l.ok);
  const lineHint = bad === -1 ? 'Todo en orden.' : 'La línea ' + (bad + 1) + ' aún no se sostiene: ' + reasonText(bad, pr.lines[bad]);
  return { stage: P.stage(), stamped,
    missing: ['G', 'H'].reduce((a, s) => a.concat(JAR[s].K.labels.filter((_, i) => P.facts.orders[s][i] === undefined).map(l => (s === 'G' ? 'el ' : '') + l)), []),
    untried: HH.labels.filter((_, y) => !P.facts.tried[y]), lineHint };
}
function reasonText(i, r) {
  if (r.why === 'incomplete') return 'tiene huecos sin rellenar.';
  if (r.why === 'wrong') return (i === 2 ? WHY.wrong2() : WHY.wrong3());
  return (WHY[r.why] || (() => ''))(r);
}
P.on(() => S.progress());

/* ---------------- 1 · la noria de vueltas ---------------- */
function repeat(c) {
  const side = c.side, R = rep[side], K = JAR[side].K;
  if (R.busy) return;
  const r = P.repeat(side, c.v); App.levelStarted(7); S.progress();
  R.busy = true; R.c = c.v; R.seq = r.powers; R.step = 0; R.tape = [K.labels[c.v]];
  const ped = NORIA(side);
  const t = makeCritter('src', c.v, c.x, c.y, speciesFor(K.key, c.v)); t.s = .78; t.side = side; flash.push(t);
  c.alpha = .25;
  Kit.travel(S.tw, t, [[c.x, c.y], [ped.x, ped.y - 46]], .45, { hops: 1, land: true, done: () => {
    const next = () => {
      R.step++;
      if (R.step >= R.seq.length) {
        const o = R.seq.length; R.busy = false; R.done = { v: c.v, o, t: S.T };
        Sound.fam('bell'); fpPop[side + c.v] = S.T;
        if (side === 'G' && o === 4) { Sound.fam('discover'); Kit.react(t, 'pride', 2.5); S.dir.play(LINES, 'four', { x: c.v }, { force: true }); }
        else if (o === 1) S.dir.play(LINES, 'home', {}, { cooldown: 4 });
        else if (side === 'H') S.dir.play(LINES, 'twin', { x: c.v, l: K.labels[c.v] }, { cooldown: 4 });
        else S.dir.play(LINES, 'two', { x: c.v }, { cooldown: 4 });
        S.later(1.2, () => { S.tw.add(t, { alpha: 0 }, .3, { done: () => { flash = flash.filter(q => q !== t); } }); c.alpha = 1; poke(c, 6, -6); });
        if (!fpDoneSaid && P.measuredAll('G') && P.measuredAll('H')) { fpDoneSaid = true; S.later(2.2, () => S.dir.play(LINES, 'fpDone', {}, { force: true })); }
        return;
      }
      // un clon salta encima y se combinan: x, x∘x, x∘x∘x…
      const clone = makeCritter('src', c.v, ped.x + 80, ped.y - 46, speciesFor(K.key, c.v)); clone.s = .56; flash.push(clone);
      Kit.travel(S.tw, clone, [[ped.x + 80, ped.y - 46], [ped.x + 36, ped.y - 120], [ped.x, ped.y - 56]], .42, { done: () => {
        flash = flash.filter(q => q !== clone); Sound.fam('press', { vol: .55 });
        const v = R.seq[R.step]; t.species = speciesFor(K.key, v); t.sx.v = 1.4; t.sy.v = .6; R.tape.push(K.labels[v]);
        if (v === K.identity) { S.puff(ped.x, ped.y - 46, 6, '#e9d6f0'); Kit.react(t, 'surprise', 1.2); }
        S.later(Clock.reduced ? .12 : .3, next);
      } });
    };
    if (R.seq.length === 1) { R.step = 0; S.later(.3, next); } else S.later(.2, next);
  } });
}

/* ---------------- 2 · el puente ---------------- */
function tryBridge(y) {
  if (P.stage() < 2) { S.say('op', 'Primero las huellas: mida a los ocho en sus norias.'); Kit.react(op, 'confused'); return; }
  const r = P.bridge(y); App.levelStarted(7); S.progress();
  bridge = { y, t: 0, f: r.f, collision: r.collision };
  Sound.fam('servo');
  S.later(2.0, () => {
    Sound.fam('crack'); Sound.fam('fail', { vol: .55 }); op.expr = 'shock'; op.exprT = 1.4;
    S.dir.play(LINES, y === HH.identity ? 'bridgeE' : 'bridge', { y: HH.labels[y] }, { force: true });
    if (!triedSaid && P.triedAll()) { triedSaid = true; S.later(3.2, () => S.dir.play(LINES, 'allTried', {}, { force: true })); }
  });
}

/* ---------------- 3 · el informe ---------------- */
function cycleField(line, key) {
  if (P.stage() < 3) { S.say('op', P.stage() === 1 ? 'El informe va al final: primero mida las vueltas.' : 'Antes del informe, pruebe el puente con los cuatro gemelos.'); return; }
  P.cycle(line, key); Sound.fam('clickin'); lastLine = line;
  const r = P.checkLine(line); lineFlash[line] = 1;
  S.cancel('lineSay');
  S.later(.7, () => {
    const r2 = P.checkLine(line);
    if (r2.ok) { if (P.proof().ok) { Sound.fam('discover'); S.dir.play(LINES, 'proofOk', {}, { force: true }); } else S.dir.play(LINES, 'lineOk', {}, { cooldown: 2 }); }
    else if (r2.why !== 'incomplete') S.say('op', reasonText(line, r2), { dur: 4.5 });
  }, 'lineSay');
  return r;
}
function stamp() {
  S.enc.tx = 90; S.later(.5, () => { S.enc.stamp = 1; });
  const pr = P.proof();
  if (!pr.ok) {
    S.later(.9, () => { Sound.fam('fail'); S.enc.expr = 'stern'; S.enc.exprT = 2.5;
      const st = P.stage();
      S.say('enc', st === 1 ? 'Sin medidas no hay informe. Las norias, técnico.' : st === 2 ? 'Le falta probar el puente con todos los gemelos.' : 'El informe tiene líneas que no se sostienen. Revíselas.', { dur: 4 }); });
    return;
  }
  stamped = true; S.stampText = 'IMPOSIBLE';
  S.later(.9, () => {
    Sound.fam('press');
    S.say('enc', 'Prueba aceptada: el 1 tarda 4 pasos, en Klein nadie pasa de 2, y una traducción reversible conserva los pasos. No existe.', { dur: 6.5 });
    S.complete({ orden: { groups: ['Z4', 'V4'], from: 'máquina 7' } }, 'IMPOSIBLE, y demostrado. Mismo tamaño, huellas distintas. Vuelva a la fábrica (Esc).');
  });
}

/* ---------------- maquetación del informe ---------------- */
const SEGS = [
  ['1. En el reloj, el', { k: 'x' }, 'tarda', { k: 'n' }, 'pasos en volver al 0.'],
  ['2. En los gemelos, ninguno tarda más de', { k: 'max' }, 'pasos.'],
  ['3. Una traducción reversible', { k: 'keep' }, 'los pasos de cada uno.'],
  ['4. Por tanto, esa traducción', { k: 'exists' }, '.'],
];
function fieldText(line, k) { const v = P.config.report[line][k]; if (v === null) return '…'; if (k === 'x') return G.labels[v]; return String(v); }
function layoutLine(i) {
  const y = REPORT.y + 34 + i * 54; let x = REPORT.x + 8; const out = [];
  SEGS[i].forEach(seg => {
    if (typeof seg === 'string') { const w = Draw.textWidth(seg, 20, FONT.hand); out.push({ text: seg, x, y, w }); x += w + 8; }
    else { const wmax = Math.max(46, ...P.LINES[i].fields.find(f => f.key === seg.k).opts.map(o => Draw.textWidth(seg.k === 'x' ? G.labels[o] : String(o), 20, FONT.hand) + 26)); out.push({ field: seg.k, x, y: y - 17, w: wmax, h: 34 }); x += wmax + 8; }
  });
  return out;
}

/* ---------------- interacción ---------------- */
function items() {
  const out = S.hudItems();
  ['G', 'H'].forEach(side => {
    const J = JAR[side];
    crits[side].forEach(c => { const o = P.facts.orders[side][c.v]; out.push({ id: side + 'c' + c.v, r: 40, x: c.hx, y: c.hy - 30, label: J.name.toLowerCase() + ': ' + J.K.labels[c.v] + (o ? ' (vuelve en ' + o + ')' : ' — clic: a la noria'), act: () => clickCrit(c), pri: 1, hoverOutline: true }); });
  });
  HH.labels.forEach((l, y) => { const p = SEL(y); out.push({ id: 'sel' + y, r: 26, x: p.x, y: p.y, label: 'Puente: suponer f(1) = ' + l, act: () => tryBridge(y), pri: 1, hoverOutline: true }); });
  SEGS.forEach((_, i) => layoutLine(i).forEach(s => { if (s.field) out.push({ id: 'f' + i + s.field, x: s.x, y: s.y, w: s.w, h: s.h, label: 'Informe, línea ' + (i + 1) + ': ' + fieldText(i, s.field) + ' (clic: cambiar)', act: () => cycleField(i, s.field), pri: 1, hoverOutline: true }); }));
  out.push({ id: 'stamp', x: STAMP.x, y: STAMP.y, w: STAMP.w, h: STAMP.h, label: 'Sellar IMPOSIBLE (S)', act: stamp, pri: 1, hoverOutline: true });
  return out;
}
function clickCrit(c) { if (rep[c.side].busy) { S.say('op', 'La noria está ocupada. Un momento.'); return; } Sound.fam('grab'); repeat(c); }

/* ---------------- dibujo ---------------- */
function drawLab() {
  ctx.fillStyle = '#e3c7a2'; ctx.fillRect(-1200, -800, W + 2400, H + 1600);
  if (App.grain) { ctx.fillStyle = App.grain; ctx.fillRect(-1200, -800, W + 2400, H + 1600); }
  ctx.fillStyle = '#b98a5a'; ctx.fillRect(-1200, 780, W + 2400, 940);
  Deco.room(S.T, { wall: [-1200, -800, W + 1200, 780], floor: [780, -1200, W + 1200, 300], lamps: [250, 1350], len: 0, reach: 560, a: .1 });
  // lupa gigante y archivador: decorado de detective
  Deco.poster(1180, 96, 140, 104, 'SE PROHÍBEN', ['los presenti-', 'mientos'], { stripe: '#b8322a', rot: .04, size: 15 });
  ['G', 'H'].forEach(side => drawJar(side));
  drawBoard(); drawBridge();
  drawOperario(op, bridge.y !== null ? -8 : 0);
  flash.forEach(c => { drawCritter(c); Kit.drawMark(c); });
  S.drawParts();
}
function drawJar(side) {
  const J = JAR[side], K = J.K, R = rep[side];
  Draw.rrect(J.x - J.r - 18, J.y + J.r - 36, (J.r + 18) * 2, 40, 8, '#8d5a2f', 3, 10100 + J.x);
  Draw.ellipse(J.x, J.y - 10, J.r, J.r * .92, J.tint, 3, 10110 + J.x);
  ctx.save(); ctx.globalAlpha = .5; Draw.curve([[J.x - J.r * .7, J.y - J.r * .45], [J.x - J.r * .5, J.y - J.r * .75], [J.x - J.r * .1, J.y - J.r * .88]], 6, '#ffffff'); ctx.restore();
  // rótulo del mundo, en el estante
  Draw.rrect(J.x - 130, J.y + J.r - 30, 260, 28, 4, PAL.bone, 2, 10105 + J.x);
  Draw.text(J.name, J.x, J.y + J.r - 16, { size: 13, font: FONT.plate, spacing: 1.5 });
  Draw.text(J.note, J.x, J.y - J.r - 26, { size: 17, color: PAL.inkSoft });
  crits[side].forEach(c => {
    c.x = U.lerp(c.x, c.hx, .1); c.y = U.lerp(c.y, c.hy, .1);
    ctx.save(); ctx.globalAlpha = c.alpha; drawCritter(c); ctx.restore(); Kit.drawMark(c);
    const o = P.facts.orders[side][c.v];
    if (o) { const pop = Math.min(1, (S.T - (fpPop[side + c.v] || 0)) * 4); ctx.save(); ctx.translate(c.hx, c.hy + 28); ctx.scale(Ease.back(pop), Ease.back(pop)); Draw.rrect(-44, -11, 88, 22, 11, o === 4 ? '#f3c3b8' : '#efe3f3', 2, 10140 + c.v, o === 4 ? PAL.bad : PAL.plum); Draw.text('vuelve en ' + o, 0, 0, { size: 14, color: o === 4 ? PAL.bad : PAL.plum }); ctx.restore(); }
  });
  // la noria de vueltas
  const n = NORIA(side), spin = R.busy ? S.T * 3 : S.T * .3;
  Draw.rrect(n.x - 60, n.y - 6, 120, 34, 8, '#6f6a55', 3, 10120 + J.x);
  ctx.save(); ctx.translate(n.x, n.y - 6); ctx.scale(1, .28); Scenery.gear(0, 0, 60, 12, spin, '#c7c2a8', 2.5); ctx.restore();
  for (let k = 0; k < 4; k++) { const on = R.seq && k < Math.max(R.step, R.busy ? 0 : R.seq.length); Draw.ellipse(n.x - 36 + k * 24, n.y + 14, 6, 6, on ? '#ffe27a' : '#3a3150', 1.5, 10122 + k); }
  Draw.text('NORIA DE VUELTAS', n.x, n.y + 46, { size: 12, font: FONT.plate, spacing: 1 });
  // cinta con el recorrido: 1 → 2 → 3 → 0
  if (R.tape) {
    const txt = R.tape.join(' → ') + (R.busy ? ' …' : '   ·   ' + R.seq.length + (R.seq.length === 1 ? ' paso' : ' pasos'));
    const w = Draw.textWidth(txt, 17, FONT.hand) + 24;
    Draw.rrect(n.x - w / 2, n.y + 60, w, 28, 4, PAL.bone, 2, 10125 + J.x); Draw.text(txt, n.x, n.y + 74, { size: 17, color: PAL.plum });
  } else Draw.text('clic en un habitante', n.x, n.y + 74, { size: 15, color: PAL.inkSoft });
}
function drawBoard() {
  const B = BOARD, st = P.stage();
  Draw.rrect(B.x + 6, B.y + 8, B.w, B.h, 6, 'rgba(33,28,51,.25)', 0, 10199);
  Draw.rrect(B.x, B.y, B.w, B.h, 6, '#c99a5e', 3.5, 10200);
  Draw.rrect(B.x + 12, B.y + 12, B.w - 24, B.h - 24, 4, '#f4e6c8', 2, 10201);
  Draw.text('EXPEDIENTE Nº 7 · ¿SON GEMELOS DE VERDAD?', B.x + B.w / 2, B.y + 32, { size: 14, font: FONT.plate, spacing: 1.5 });
  // los tres pasos
  const steps = ['1 · MEDIR VUELTAS', '2 · PROBAR EL PUENTE', '3 · INFORME'];
  steps.forEach((s, i) => {
    const x = B.x + 24 + i * 208, y = B.y + 50, done = st > i + 1, cur = st === i + 1 || (i === 2 && st === 4 && !stamped);
    Draw.rrect(x, y, 196, 34, 5, done ? '#dfe8c8' : cur ? '#f6e27a' : '#e6dccb', cur ? 3 : 2, 10202 + i, cur ? PAL.ultra : PAL.ink);
    Draw.text((done ? '✓ ' : '') + s, x + 98, y + 17, { size: 13, font: FONT.plate, color: done ? PAL.good : PAL.ink });
  });
  const INSTR = ['Clic en cada habitante: la noria cuenta cuántos pasos tarda en volver a casa.', 'Si existiera la traducción, ¿adónde iría el 1? Pruebe los cuatro gemelos en el puente (abajo).', 'Rellene el informe: cada hueco cambia con un clic. ✓ = la línea se sostiene.', 'Todo se sostiene: selle IMPOSIBLE.'];
  Draw.text(stamped ? 'Caso cerrado.' : INSTR[st - 1], B.x + B.w / 2, B.y + 106, { size: 19, color: PAL.ultra });
  // huellas
  const F = FP; Draw.text('HUELLAS · ¿cuántos tardan…', F.x, F.y - 14, { size: 12, font: FONT.plate, align: 'left', spacing: 1, color: PAL.plum });
  const cols = [1, 2, 3, 4], cw = (F.w - 130) / 4, both = P.measuredAll('G') && P.measuredAll('H');
  cols.forEach((n, k) => { const cx = F.x + 130 + k * cw + cw / 2; Draw.text(n + (n === 1 ? ' paso' : ' pasos'), cx, F.y + 10, { size: 15, color: PAL.inkSoft }); });
  ['G', 'H'].forEach((side, r) => {
    const y = F.y + 34 + r * 56, fp = P.fingerprint(side);
    Draw.text(side === 'G' ? 'el reloj' : 'los gemelos', F.x, y + 22, { size: 18, align: 'left' });
    cols.forEach((n, k) => {
      const x = F.x + 130 + k * cw;
      Draw.rrect(x + 4, y, cw - 8, 46, 4, 'rgba(255,255,255,.5)', 1.5, 10230 + r * 4 + k, 'rgba(33,28,51,.35)');
      fp[n].forEach((v, j) => { const pop = Math.min(1, (S.T - (fpPop[side + v] || 0)) * 4); drawBead(speciesFor(JAR[side].K.key, v), x + 26 + j * 32, y + 23, 13 * Ease.back(pop)); });
      if (both && !fp[n].length && n === 4) Draw.text('nadie', x + cw / 2, y + 23, { size: 17, color: PAL.bad });
    });
  });
  if (both) {
    const x = F.x + 130 + 3 * cw; ctx.save(); ctx.setLineDash([7, 5]); Draw.rrect(x - 2, F.y + 26, cw + 4, 120, 6, null, 3, 10240, PAL.bad); ctx.restore();
    Draw.text('¡las huellas no coinciden!', x + cw / 2 - 40, F.y + 162, { size: 17, color: PAL.bad });
  }
  // informe
  Draw.line(B.x + 24, REPORT.y - 4, B.x + B.w - 24, REPORT.y - 4, 1.5, 10250, 'rgba(33,28,51,.3)');
  Draw.text('INFORME DEL TÉCNICO', REPORT.x, REPORT.y + 8, { size: 12, font: FONT.plate, align: 'left', spacing: 1, color: PAL.plum });
  const locked = st < 3, pr = P.proof();
  ctx.save(); if (locked) ctx.globalAlpha = .42;
  SEGS.forEach((_, i) => {
    const segs = layoutLine(i), r = pr.lines[i];
    segs.forEach(s => {
      if (s.text) Draw.text(s.text, s.x, s.y, { size: 20, align: 'left' });
      else {
        const hov = S.hoverId === 'f' + i + s.field || (S.kbd && S.focusId === 'f' + i + s.field);
        Draw.rrect(s.x, s.y, s.w, s.h, 5, hov ? '#fff3c4' : '#fbf4e4', 2.5, 10260 + i * 3 + s.x, hov ? PAL.ultra : PAL.ink);
        const v = P.config.report[i][s.field];
        if (s.field === 'x' && v !== null) drawBead(speciesFor('Z4', v), s.x + s.w / 2, s.y + s.h / 2, 12);
        else Draw.text(fieldText(i, s.field), s.x + s.w / 2, s.y + s.h / 2 + 1, { size: 20, color: v === null ? PAL.inkSoft : PAL.ultra });
      }
    });
    const ix = B.x + B.w - 40, iy = REPORT.y + 34 + i * 54, f = lineFlash[i];
    if (r.ok) { Draw.ellipse(ix, iy, 13 + f * 4, 13 + f * 4, PAL.good, 2, 10280 + i); Draw.curve([[ix - 6, iy], [ix - 1, iy + 5], [ix + 7, iy - 6]], 3, PAL.bone); }
    else if (r.why !== 'incomplete') { Draw.ellipse(ix, iy, 13 + f * 4, 13 + f * 4, '#f0b3a8', 2, 10284 + i, PAL.bad); Draw.text('✗', ix, iy + 1, { size: 16, color: PAL.bad }); }
  });
  ctx.restore();
  if (locked) Draw.text(st === 1 ? '(se abre tras medir y probar el puente)' : '(se abre tras probar el puente con los cuatro)', B.x + B.w - 30, REPORT.y + 8, { size: 15, color: PAL.inkSoft, align: 'right' });
  // sello
  const ready = pr.ok && !stamped;
  if (ready) Deco.glow(STAMP.x + STAMP.w / 2, STAMP.y + STAMP.h / 2, 90, 'rgba(255,120,90,A)', .35 + Math.sin(S.T * 4) * .15);
  Kit.plate(STAMP.x, STAMP.y, STAMP.w, STAMP.h, 'SELLAR: IMPOSIBLE', { color: PAL.bad, size: 13, fill: ready ? '#f6dfb8' : '#e9e1d2', focus: S.kbd && S.focusId === 'stamp' });
}
function drawBridge() {
  const b = BR, st = P.stage();
  Draw.rrect(b.x, b.y, b.w, b.h, 8, st === 2 ? 'rgba(246,226,122,.35)' : 'rgba(251,239,220,.3)', st === 2 ? 3 : 2, 10300, st === 2 ? PAL.ultra : 'rgba(33,28,51,.4)');
  Draw.text('PUENTE DE PRUEBA · si existiera la traducción, ¿adónde iría el 1?', b.x + b.w / 2, b.y + 20, { size: 13, font: FONT.plate, spacing: .5 });
  Draw.curve([[b.x + 20, b.y + 170], [b.x + b.w / 2, b.y + 128], [b.x + b.w - 20, b.y + 170]], 8, PAL.ink); Draw.curve([[b.x + 20, b.y + 170], [b.x + b.w / 2, b.y + 128], [b.x + b.w - 20, b.y + 170]], 4, '#a7744a');
  Draw.text('f(1) =', b.x + 26, b.y + 58, { size: 20, align: 'left' });
  HH.labels.forEach((l, y) => {
    const p = SEL(y), tried = P.facts.tried[y], on = bridge.y === y;
    if (on) Deco.glow(p.x, p.y, 34, 'rgba(255,214,120,A)', .6);
    drawBead(speciesFor('V4', y), p.x, p.y, 20);
    if (tried) { Draw.line(p.x + 10, p.y - 30, p.x + 22, p.y - 18, 3, 10310 + y, PAL.bad); Draw.line(p.x + 22, p.y - 30, p.x + 10, p.y - 18, 3, 10311 + y, PAL.bad); }
  });
  Draw.text('probados: ' + Object.keys(P.facts.tried).length + ' de 4', b.x + 166, b.y + 136, { size: 15, color: PAL.inkSoft });
  if (bridge.f) {
    const n = Math.min(4, Math.floor(bridge.t / .45) + 1), order = [1, 2, 3, 0];
    const expl = { 1: 'supuesto', 2: '= f(1)∘f(1)', 3: '= f(2)∘f(1)', 0: '(el neutro)' };
    order.slice(0, n).forEach(x => {
      const p = OUT(x === 0 ? 0 : x), col = bridge.collision && bridge.collision.xs.indexOf(x) !== -1 && n >= 4;
      Draw.text('f(' + x + ')', p.x, p.y - 40, { size: 16 }); Draw.text(expl[x], p.x, p.y + 32, { size: 13, color: PAL.inkSoft });
      drawBead(speciesFor('V4', bridge.f[x]), p.x, p.y, 16);
      if (col) { Draw.ellipse(p.x, p.y, 25, 25, null, 3.5, 10320 + x, PAL.bad); }
    });
    if (n >= 4 && bridge.collision) { const xs = bridge.collision.xs; Draw.text('f(' + xs[0] + ') = f(' + xs[1] + ') → dos al mismo sitio: no es reversible', b.x + 470, b.y + 156, { size: 16, color: PAL.bad }); }
  } else Draw.text(st < 2 ? '(primero, las huellas)' : '← elija un gemelo', b.x + 470, b.y + 92, { size: 17, color: PAL.inkSoft });
}

/* ---------------- escena ---------------- */
const goals = () => { const st = P.stage(); return [
  { text: 'medir las vueltas de los ocho', ok: st > 1, seen: Object.keys(P.facts.orders.G).length + Object.keys(P.facts.orders.H).length > 0 },
  { text: 'probar el puente con los 4 gemelos', ok: st > 2, seen: st >= 2 },
  { text: 'un informe que se sostenga', ok: st > 3, seen: st >= 3 },
  { text: 'sellar IMPOSIBLE', ok: stamped, seen: st >= 4 }]; };
const scene = {
  enter() {
    window.__L7 = debug;
    S.encIn('Orden nº 7: dicen que son gemelos porque tienen cuatro cada uno. Investigue. Y tráigame pruebas, no presentimientos.', { leaveAfter: 9 });
    S.later(6.5, () => { S.say('op', 'Yo probaría las 24 traducciones una por una.'); }, 'intro');
    S.later(9.5, () => { S.say('enc', 'Veinticuatro formularios. Ni hablar. Siga el expediente: paso 1, medir vueltas.'); }, 'intro');
  },
  exit() { if (window.__L7 === debug) window.__L7 = null; },
  update(dt) {
    S.update(dt); updateOperario(op, dt);
    bridge.t += dt; lineFlash = lineFlash.map(f => Math.max(0, f - dt * 3));
    ['G', 'H'].forEach(side => crits[side].forEach(c => {
      Kit.live(c, dt, null);
      if (Clock.reduced) return;
      c.wander.t -= dt;
      if (c.wander.t < 0) { const a = U.rand(0, Math.PI * 2), r = U.rand(4, 16); c.wander = { t: U.rand(2, 5), tx: c.ax + Math.cos(a) * r, ty: c.ay + Math.sin(a) * r * .6 }; }
      c.hx += (c.wander.tx - c.hx) * dt * .5; c.hy += (c.wander.ty - c.hy) * dt * .5;
    }));
    flash.forEach(c => Kit.live(c, dt));
  },
  render() {
    ctx.save(); S.cam.apply(ctx); drawLab(); ctx.restore();
    Draw.text('THE ALGEBRA ENGINE · MÁQUINA 7', 34, 26, { size: 15, font: FONT.plate, align: 'left', color: PAL.inkSoft, spacing: 2 });
    Draw.text('Los gemelos imposibles', 32, 54, { size: 30, font: FONT.title, align: 'left', jitter: 1.2, seed: 40 });
    S.drawHud(goals());
    S.drawFocus(items());
  },
  pointerDown(p) { S.kbd = false; S.cancel('intro'); S.progress(); const it = S.hit(items(), p); if (it) it.act(); },
  pointerMove(p) { S.pointer = { x: p.x, y: p.y, inside: true }; const it = S.hit(items(), p); S.hoverId = it ? it.id : null; App.setCursor(it ? 'pointer' : 'default'); },
  pointerUp() {}, pointerLeave() { S.pointer.inside = false; },
  key(e) {
    const k = e.key.toLowerCase();
    if (S.navKey(e, items())) return true;
    if (k === 's') { stamp(); return true; }
    if (k === 'z' || (e.ctrlKey && k === 'z')) { if (!P.undo().ok) S.say('op', 'Nada que deshacer en el informe.'); return true; }
    return false;
  },
  hint: () => S.giveHint(), busy: () => false, skip: () => {},
  tableContext: () => ({ groups: [G, HH], highlight: {}, note: 'En V4 la diagonal es toda e: todos vuelven en 2 pasos como mucho.' }),
};
const debug = { P, S, crits, repeat, tryBridge, cycleField, stamp, items, stamped: () => stamped,
  setLine(line, key, v) { P.set(line, key, v); }, measureAll() { ['G', 'H'].forEach(s => crits[s].forEach(c => { P.repeat(s, c.v); })); },
  fast() { for (let i = 0; i < 6000 && (S.timers.length || rep.G.busy || rep.H.busy); i++) scene.update(1 / 30); }, step(s) { for (let i = 0; i < s * 30; i++) scene.update(1 / 30); } };
scene.debug = () => debug;
return scene;
};
