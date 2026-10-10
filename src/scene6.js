/* THE ALGEBRA ENGINE — Nivel 6: la torre de ascensores.
 * Escena vertical más alta que la pantalla. Abajo, el reloj de 4 espera en cuatro ascensores; arriba, los andenes de U(5),
 * donde se multiplica. Cada polea decide a qué andén lleva su cable. SUBIR transforma; BAJAR intenta deshacer el viaje.
 * El regreso sólo encaja si nadie comparte andén y nadie queda vacío; y la vuelta también tiene que conservar. */
'use strict';
window.TowerScene = function (App) {
const W = 1600, H = 900, ctx = Draw.ctx, AG = AlgebraGroups;
const P = AG.createTower();
const G = P.G, HH = P.H, LG = i => G.labels[i], LH = i => HH.labels[i];
const WORLD = { w: W, h: 1420 };
const SX = x => 380 + x * 240;
const PX = j => 300 + j * 260;
const TOP = { y: 300 }, PUL = { y: 470 }, GROUND = 1280, CAR_TOP = 520, CAR_BOT = 1220;
const ASM = { x: 1400, y: 500 };

const asm = makeAssembler();
const op = makeOperario(1240, 1214);
const S = Kit.base(App, 6, {
  world: WORLD,
  order: 'Que cada habitante suba a un andén y pueda BAJAR a su ascensor sin dudas, y que el camino de vuelta también conserve la operación.',
  groups: () => [G, HH], verdictAt: { x: 760, y: 62 }, ticketAt: { x: 1200, y: 830 }, stampAt: { x: 1150, y: 200 },
  cast: {
    op: { pos: () => ({ x: op.x - 30, y: op.y - 50 }), voice: 'op' },
    asm: { pos: () => ({ x: ASM.x - 60, y: ASM.y - 60 }), voice: 'asm' },
  },
  state: () => hintState(),
  hints: [
    { topic: 'subir', when: s => !s.climbed, tiers: [
      { text: 'Suba a todos (SUBIR) y vea en qué andén acaba cada uno.' },
      { who: 'asm', text: 'Arriba se multiplica, abajo se suma. Fíjese en eso.' },
      { who: 'asm', text: 'Mire cuántos acaban en cada andén.' }] },
    { topic: 'neutro', when: s => s.diag.kind === 'broken' && P.config.floors[0] !== HH.identity, tiers: [
      { text: 'El comprobador dice dónde se separan las rutas. Empiece por el 0.' },
      { who: 'asm', text: 'Abajo el neutro es el 0. Arriba, el neutro es el que no cambia al multiplicar.' },
      { who: 'asm', text: 'El 0 debe subir al andén 1: 1 × y = y.', point: () => ({ x: SX(0), y: PUL.y }) }] },
    { topic: 'roto', when: s => s.diag.kind === 'broken', tiers: [
      { text: t => 'Falla en ' + LG(t.diag.counterexample.a) + ' + ' + LG(t.diag.counterexample.b) + '. Mire el comprobador.' },
      { who: 'asm', text: 'Si el 1 sube al andén y, el 2 = 1 + 1 debe subir a y × y.' },
      { who: 'asm', text: 'Y el 3 = 2 + 1, a y × y × y. Todo lo decide el andén del 1.' }] },
    { topic: 'choque', when: s => s.diag.analysis.hom && !s.diag.analysis.injective, tiers: [
      { who: 'asm', text: 'Al bajar, dos pasajeros piden el mismo cable de vuelta. Me mareo.' },
      { text: t => 'Si f(2) = f(0), el andén del 1, multiplicado por sí mismo, da 1.' },
      { who: 'asm', text: 'Busque un andén que tarde cuatro multiplicaciones en volver al 1. ¿El 2? ¿El 3?' }] },
    { topic: 'bajar', when: s => s.diag.kind === 'iso' && !s.returned, tiers: [
      { text: 'Todos arriba, sin compartir. Ahora BAJAR: compruebe que el viaje se deshace.' }] },
  ],
});
const LINES = {
  pulley: [[['op', 'Cambio de cable. ¡Ñiiic!']], [['op', 'Esta polea chirría. Le pongo grasa… mañana.']], [['asm', 'Otro andén, otra cuenta.']]],
  share: [[['asm', 'Dos en el andén {y}: el {a} y el {b}.'], ['op', 'Así se hacen compañía.'], ['asm', 'Y yo no sabré a quién devolver.']]],
  emptyPlat: [[['asm', 'El andén {y} no recibe a nadie. Su cable de vuelta baja vacío.']]],
  dizzy: [[['asm', '¿El {a} o el {b}? ¿El {b} o el {a}? Me… mareo…'], ['op', 'Yo bajo por las escaleras.']], [['asm', 'Dos cables, una cabina. Imposible deshacer esto.']]],
  backOk: [[['asm', 'Ida y vuelta, sin dudar. Cada cable baja a su ascensor.']]],
  inverse: [[['asm', 'Y lo más bonito: también la vuelta conserva. Multiplicar arriba es sumar abajo.']]],
  broken: [[['op', 'Las cuentas no cuadran. ¿Pruebo a darle una patada?'], ['asm', 'Pruebe a mirar el comprobador.']], [['asm', 'Arriba y abajo no se ponen de acuerdo en ese par.']]],
};

/* ---------------- estado de escena ---------------- */
const cars = G.labels.map((_, x) => ({ x, y: CAR_BOT, w: 0 }));
const riders = G.labels.map((_, x) => { const c = makeCritter('src', x, SX(x), CAR_BOT + 40, speciesFor('Z4', x)); c.s = .78; c.home = { x: SX(x), y: CAR_BOT + 40 }; return c; });
const natives = HH.labels.map((_, j) => { const c = makeCritter('dst', j, PX(j), TOP.y - 4, speciesFor('U5', j)); c.s = .85; return c; });
let up = false, climbed = false, returned = false, lastDiag = null, ropeGlow = [0, 0, 0, 0], ropeWob = [0, 0, 0, 0], pulAng = P.config.floors.map(y => y * Math.PI / 2), stuck = [], dizzyRope = null;
function hintState() { return { climbed, returned, diag: P.diagnose() }; }

P.on((t, d) => {
  S.progress(); returned = false;
  if (S.run.active) { S.run.kill(); }
  if (d.label === 'floor') { const x = d.result.x; ropeWob[x] = 1; Sound.fam('gear'); S.later(.1, () => Sound.fam('gear')); S.dir.play(LINES, 'pulley', {}, { cooldown: 8 }); }
  if (d.label === 'undo' || d.label === 'reset') Sound.whoosh();
  // si estaban arriba, vuelven abajo sin animación de prueba (nueva configuración)
  if (up) { up = false; cars.forEach(c => { c.y = CAR_BOT; }); riders.forEach(r => { r.x = r.home.x; r.y = r.home.y; r.species = speciesFor('Z4', r.v); r.hat = null; r.ride = null; r.at = null; }); }
  S.verdict = null; stuck = []; dizzyRope = null; if (S.slip) S.slip.closing = true;
});

/* ---------------- subir ---------------- */
function ropePts(x, y) { const a = { x: SX(x), y: PUL.y - 36 }, b = { x: PX(y), y: TOP.y + 26 }, sag = 30; const pts = []; for (let k = 0; k <= 14; k++) { const t = k / 14; pts.push([U.lerp(a.x, b.x, t), U.lerp(a.y, b.y, t) + Math.sin(t * Math.PI) * sag]); } return pts; }
function plSlot(y, k) { return { x: PX(y) - 50 + k * 50, y: TOP.y - 4 }; }
function climb() {
  if (S.run.active) { S.run.scale = 5; return; }
  App.levelStarted(6); S.progress(); if (S.clip.target) S.clip.toggle();
  const d = P.diagnose(), f = P.config.floors, tw = S.run.tw;
  climbed = true; returned = false; stuck = []; dizzyRope = null; if (S.slip) S.slip.closing = true;
  cars.forEach(c => { c.y = CAR_BOT; }); riders.forEach(r => { r.x = r.home.x; r.y = r.home.y; r.species = speciesFor('Z4', r.v); r.hat = null; r.at = null; });
  S.run.start((function* () {
    S.cam.follow = () => ({ x: W / 2, y: Math.min(...cars.map(c => c.y)) + 120 });
    Sound.fam('hum');
    cars.forEach((c, x) => { tw.add(c, { y: CAR_BOT + 10 }, .15, { delay: x * .2, ease: Ease.out, done: () => tw.add(c, { y: CAR_TOP }, 1.7, { ease: Ease.inOut, done: () => { Sound.fam('bell', { vol: .6 }); } }) }); });
    riders.forEach((r, x) => { r.ride = cars[x]; });
    yield 2.6;
    S.cam.follow = null; S.cam.goto(W / 2, 450);
    // del ascensor al andén por el cable aéreo
    const counts = HH.labels.map(() => 0);
    for (let x = 0; x < G.n; x++) {
      const r = riders[x], y = f[x], k = counts[y]++, slot = plSlot(y, k + 1);
      r.ride = null; ropeGlow[x] = 1; Sound.fam('servo');
      Kit.travel(tw, r, ropePts(x, y).map(p => [p[0], p[1] + 40]).concat([[slot.x, slot.y]]), 1.2, { ease: Ease.inOut, antic: true, land: true, done: () => {
        r.species = speciesFor('U5', y); r.hat = { col: SRC_COL[x], label: LG(x) }; Sound.fam('transform'); S.puff(slot.x, slot.y - 30, 5, PAL.bone);
        const mates = riders.filter(q => q !== r && q.at === y); r.at = y;
        if (mates.length) { Sound.fam('collide'); Kit.react(r, 'surprise'); Kit.react(mates[0], 'surprise'); r.lookX = -1; mates[0].lookX = 1; }
      } });
      yield .45;
    }
    yield 1.4;
    up = true; lastDiag = d; S.verdict = d;
    if (d.kind === 'broken') {
      const c = d.counterexample;
      S.slip = Kit.RouteSlip(G, HH, f, c.a, c.b, { x: 440, y: 650, title: 'ARRIBA Y ABAJO NO CUADRAN EN ' + LG(c.a) + ' + ' + LG(c.b) });
      Sound.fam('fail'); operarioDo(op, 'facepalm', 2); S.dir.play(LINES, 'broken', {}, { force: true });
      return;
    }
    if (d.collision) { const [a, b] = d.collision.xs; S.dir.play(LINES, 'share', { y: LH(d.collision.y), a: LG(a), b: LG(b) }, { force: true }); }
    else if (d.empty.length) S.dir.play(LINES, 'emptyPlat', { y: LH(d.empty[0]) }, { force: true });
    else { asm.sing = 1.4; Sound.fam('clickin'); S.say('asm', 'Cada uno en su andén. Ahora, BAJAR.'); }
  })(), 'climb', () => riders.forEach(r => { r.ride = null; }));
}
riders.forEach(r => { r.at = null; });

/* ---------------- bajar ---------------- */
function descend() {
  if (S.run.active) { S.run.scale = 5; return; }
  if (!up) { S.say('asm', 'Primero hay que subir. No se deshace un viaje que no se ha hecho.'); return; }
  const d = P.diagnose(), f = P.config.floors, back = P.descend(), tw = S.run.tw;
  S.progress(); stuck = []; dizzyRope = null;
  if (d.kind === 'broken') { S.say('asm', 'Con las cuentas rotas no bajo a nadie. Arregle primero el par del comprobador.'); return; }
  S.run.start((function* () {
    S.cam.goto(W / 2, 450);
    asm.dir = -1; Sound.fam('hum');
    // los andenes con un solo pasajero bajan sin dudar; con dos, la cabina duda
    const ok = [], bad = [];
    back.forEach(b => { if (b.from.length === 1) ok.push(b); else if (b.from.length > 1) bad.push(b); });
    for (const b of ok) {
      const x = b.from[0], r = riders[x];
      ropeGlow[x] = 1;
      Kit.travel(tw, r, [[r.x, r.y]].concat(ropePts(x, b.y).slice().reverse().map(p => [p[0], p[1] + 40])), 1.1, { ease: Ease.inOut, done: () => { r.species = speciesFor('Z4', x); r.hat = null; r.ride = cars[x]; Sound.fam('transform'); Sound.tone(392 * Math.pow(2, x / 6), .22, { type: 'triangle', vol: .1 }); } });
      yield .3;
    }
    for (const b of bad) {
      const [a, c] = b.from; stuck.push(...b.from); dizzyRope = { y: b.y, from: b.from, t: 0 };
      b.from.forEach(x => { Kit.react(riders[x], 'confused', 3); riders[x].shake = .5; });
      asm.dizzy = 3; Sound.fam('fail');
      S.dir.play(LINES, 'dizzy', { a: LG(a), b: LG(c) }, { force: true });
    }
    yield 1.3;
    if (bad.length) {
      S.cam.goto(W / 2, 450);
      S.verdict = d; return;
    }
    // todos en su cabina: bajan a la vez, simétricos
    S.cam.follow = () => ({ x: W / 2, y: Math.max(...cars.map(c => c.y)) - 100 });
    cars.forEach((c, x) => tw.add(c, { y: CAR_BOT }, 1.6, { ease: Ease.inOut, delay: x * .1 }));
    yield 1.9;
    riders.forEach(r => { r.ride = null; r.x = r.home.x; r.y = r.home.y; Kit.react(r, 'relief', 2); r.at = null; });
    up = false; S.cam.follow = null;
    // canción palíndroma: subir y bajar suenan igual
    asm.sing = 3; asm.dir = 1;
    [523, 659, 784, 1046, 784, 659, 523].forEach((fq, i) => Sound.tone(fq, .2, { type: i % 2 ? 'triangle' : 'sine', vol: .12, delay: i * .1 }));
    S.dir.play(LINES, 'backOk', {}, { force: true });
    yield 2.2;
    S.cam.goto(W / 2, 520);
    // la vuelta también conserva: comprobador en sentido inverso
    const inv = []; f.forEach((y, x) => { inv[y] = x; });
    const u = HH.idx('2'), v = HH.idx('3');
    S.slip = Kit.RouteSlip(HH, G, inv, u, v, { x: 440, y: 650, title: 'LA VUELTA TAMBIÉN CONSERVA (arriba ×, abajo +)', reverse: true });
    S.dir.play(LINES, 'inverse', {}, { force: true, delay: .6 });
    yield 4;
    returned = true;
    const ev = P.evaluate(); S.verdict = d;
    if (ev.done) S.complete({ isomorfismo: { G: 'Z4', H: 'U5', f: f.slice(), from: 'máquina 6' } }, 'APROBADO: sube y baja sin dudar, y la vuelta conserva. Isomorfismo entre Z4 y U(5). Vuelva a la fábrica (Esc).');
  })(), 'descend');
}

/* ---------------- controles ---------------- */
function cycle(x) { if (S.run.active) S.run.kill(); const y = (P.config.floors[x] + 1) % HH.n; P.setFloor(x, y); App.announce('La polea del ' + LG(x) + ' lleva ahora al andén ' + LH(y)); }
function items() {
  const out = S.hudItems();
  G.labels.forEach((_, x) => out.push({ id: 'pulley' + x, r: 44, x: SX(x), y: PUL.y, label: 'Polea del ascensor ' + LG(x) + ': andén ' + LH(P.config.floors[x]) + ' (clic: siguiente)', act: () => cycle(x), hoverOutline: true, pri: 1 }));
  out.push({ id: 'climb', screen: true, x: 1390, y: 690, w: 180, h: 44, label: 'SUBIR (U)', act: climb, pri: 1 });
  out.push({ id: 'descend', screen: true, x: 1390, y: 746, w: 180, h: 44, label: 'BAJAR (B)', act: descend, pri: 1 });
  out.push({ id: 'goTop', screen: true, x: 1560, y: 110, w: 30, h: 360, label: 'Ir arriba (W)', act: () => S.cam.goto(W / 2, 450), pri: 3, nofocus: true });
  out.push({ id: 'goBot', screen: true, x: 1560, y: 470, w: 30, h: 200, label: 'Ir abajo (S)', act: () => S.cam.goto(W / 2, WORLD.h - 450), pri: 3, nofocus: true });
  return out;
}

/* ---------------- dibujo ---------------- */
function drawTower() {
  ctx.fillStyle = '#e5c29a'; ctx.fillRect(-1200, -800, W + 2400, WORLD.h + 1600);
  if (App.grain) { ctx.fillStyle = App.grain; ctx.fillRect(-1200, -800, W + 2400, WORLD.h + 1600); }
  // cielo raso con vigas y la planta alta
  ctx.fillStyle = '#c7c9df'; ctx.fillRect(-1200, -800, W + 2400, TOP.y + 840);
  for (let x = -1120; x < W + 1200; x += 160) Draw.line(x, 0, x + 40, TOP.y + 40, 2, 9000 + x, 'rgba(93,96,128,.25)');
  Draw.text('PLANTA ALTA · U(5): aquí se MULTIPLICA (módulo 5)', 110, 190, { size: 18, align: 'left', color: '#3d4170' });
  // ladrillos de la torre
  for (let y = TOP.y + 60; y < GROUND; y += 60) for (let x = (y / 60) % 2 ? -1200 : -1160; x < W + 1200; x += 80) Draw.rrect(x + 4, y + 4, 72, 52, 3, null, 1, 9100 + x + y, 'rgba(33,28,51,.08)');
  Deco.room(S.T, { lamps: [430, 690, 950, 1210], ceil: -60, len: 0, reach: 300, a: .14, clock: [1420, 720, 28], posters: [
    [1210, 790, 170, 126, 'ASCENSOR', ['capacidad:', '1 habitante', 'por andén'], { stripe: '#b8322a', rot: -.03 }],
    [1240, 990, 160, 120, 'RECUERDE', ['abajo se SUMA', 'arriba se', 'MULTIPLICA'], { stripe: '#3d4170', rot: .025 }]] });
  // andenes
  HH.labels.forEach((_, j) => {
    Draw.rrect(PX(j) - 110, TOP.y + 10, 220, 22, 4, '#8d5a2f', 3, 9200 + j);
    Draw.line(PX(j) - 90, TOP.y + 32, PX(j) - 110, TOP.y + 90, 4, 9210 + j); Draw.line(PX(j) + 90, TOP.y + 32, PX(j) + 110, TOP.y + 90, 4, 9220 + j);
    Draw.text('ANDÉN ' + LH(j), PX(j), TOP.y + 50, { size: 14, font: FONT.plate });
    if (j === HH.identity) Draw.text('neutro: 1 × y = y', PX(j), TOP.y + 70, { size: 14, color: PAL.plum });
    const n = natives[j]; n.x = PX(j) - 76; n.y = TOP.y + 6; drawCritter(n);
  });
  // cables aéreos (la función)
  const f = P.config.floors;
  G.labels.forEach((_, x) => {
    const pts = ropePts(x, f[x]), shared = f.filter(v => v === f[x]).length > 1;
    const wob = Math.sin(S.T * 18) * ropeWob[x] * 10;
    const pp = pts.map((p, k) => [p[0], p[1] + Math.sin(k / 14 * Math.PI) * wob]);
    if (ropeGlow[x] > 0) Draw.curve(pp, 10 + ropeGlow[x] * 8, 'rgba(251,239,220,' + ropeGlow[x] * .8 + ')');
    Draw.curve(pp, 4, shared ? PAL.bad : PAL.ink); Draw.curve(pp, 2, SRC_COL[x]);
  });
  if (dizzyRope) { const t = dizzyRope.t, sw = Math.sin(t * 8) * .5 + .5, y = dizzyRope.y; const a = dizzyRope.from[0], b = dizzyRope.from[1]; const pa = Kit.polyAt(ropePts(a, y), .85), pb = Kit.polyAt(ropePts(b, y), .85); const px = U.lerp(pa.x, pb.x, sw), py = U.lerp(pa.y, pb.y, sw); Draw.rrect(px - 22, py - 10, 44, 30, 5, '#c7c2a8', 2.5, 9300); Draw.text('?', px, py + 5, { size: 20, font: FONT.title, color: PAL.bad }); }
  // poleas (el control)
  G.labels.forEach((_, x) => {
    const cx = SX(x), cy = PUL.y;
    Draw.ellipse(cx, cy, 40, 40, PAL.mustard, 3, 9400 + x, S.kbd && S.focusId === 'pulley' + x ? PAL.ultra : PAL.ink);
    for (let k = 0; k < 4; k++) { const a = pulAng[x] + k * Math.PI / 2; Draw.line(cx, cy, cx + Math.cos(a) * 34, cy + Math.sin(a) * 34, 3, 9410 + k); }
    Draw.ellipse(cx, cy, 14, 14, PAL.bone, 2.5, 9420 + x);
    drawBead(speciesFor('U5', f[x]), cx + 52, cy - 14, 13);
    Draw.text('→ andén', cx + 52, cy + 12, { size: 13, color: PAL.inkSoft });
  });
  // huecos de ascensor
  G.labels.forEach((_, x) => {
    const cx = SX(x);
    Draw.rrect(cx - 50, PUL.y + 40, 100, GROUND - PUL.y - 40, 6, 'rgba(58,49,80,.18)', 3, 9500 + x);
    Draw.line(cx - 42, PUL.y + 40, cx - 42, GROUND, 2.5, 9510 + x); Draw.line(cx + 42, PUL.y + 40, cx + 42, GROUND, 2.5, 9520 + x);
    const c = cars[x];
    Draw.line(cx, PUL.y + 30, cx, c.y - 40, 2.5, 9530 + x);
    // contrapeso: baja cuando la cabina sube
    const cw = PUL.y + 60 + (CAR_BOT - c.y) * .9 + 60;
    Draw.line(cx + 30, PUL.y + 30, cx + 30, cw, 1.5, 9540 + x); Draw.rrect(cx + 22, cw, 16, 46, 3, '#6f6a55', 2, 9550 + x);
    Draw.rrect(cx - 40, c.y - 40, 80, 100, 8, '#c99a5e', 3, 9560 + x); Draw.line(cx - 40, c.y - 22, cx + 40, c.y - 22, 2, 9570 + x);
    Draw.text(LG(x), cx, c.y + 72, { size: 16, font: FONT.title });
  });
  // planta baja
  ctx.fillStyle = PAL.paper; ctx.fillRect(-1200, GROUND, W + 2400, WORLD.h - GROUND + 800);
  Draw.line(-1200, GROUND, W + 1200, GROUND, 5, 9600);
  Deco.floor(-1200, W + 1200, GROUND, 400);
  Draw.text('PLANTA BAJA · el reloj de 4: aquí se SUMA', 330, GROUND + 50, { size: 18, align: 'left', color: PAL.inkSoft });
  // ensamblador: la polea maestra
  drawAssembler(asm, ASM.x - 90, ASM.x + 90, ASM.y);
  Draw.text('POLEA MAESTRA', ASM.x, ASM.y + 58, { size: 12, font: FONT.plate });
  drawOperario(op, -4);
  riders.forEach(r => { if (r.ride) { r.x = SX(r.v); r.y = r.ride.y + 38; } drawCritter(r); Kit.drawMark(r); });
  S.drawParts();
}
function drawElevatorMap() {
  const x = 1575, y0 = 110, y1 = 670, sc = (y1 - y0) / WORLD.h;
  Draw.rrect(x - 12, y0 - 6, 24, y1 - y0 + 12, 8, 'rgba(251,239,220,.85)', 2, 9700);
  Draw.ellipse(x, y0 + TOP.y * sc, 4, 4, '#3d4170', 0, 9701); Draw.ellipse(x, y0 + GROUND * sc, 4, 4, PAL.inkSoft, 0, 9702);
  const vy = y0 + (S.cam.y - H / 2) * sc, vh = H * sc;
  Draw.rrect(x - 9, vy, 18, vh, 4, 'rgba(43,71,209,.15)', 2, 9703, PAL.ultra);
  Draw.text('▲', x, y0 - 18, { size: 14, color: PAL.inkSoft }); Draw.text('▼', x, y1 + 18, { size: 14, color: PAL.inkSoft });
}

/* ---------------- escena ---------------- */
let dragCam = null;
const goals = () => { const d = P.diagnose(), seen = climbed; return [
  { text: 'las sumas sobreviven (arriba: producto)', ok: seen && d.analysis.hom, seen },
  { text: 'nadie comparte andén', ok: seen && d.analysis.injective, seen },
  { text: 'ningún andén vacío', ok: seen && d.analysis.surjective, seen },
  { text: 'la vuelta también conserva', ok: returned, seen: returned }]; };
const scene = {
  enter() {
    window.__L6 = debug; S.cam.goto(W / 2, WORLD.h - 450); S.cam.snap();
    S.encIn('Orden nº 6: la torre. Que suban y que puedan bajar sin perder a nadie.', { leaveAfter: 8 });
    S.later(4.5, () => { S.cam.goto(W / 2, 450); S.say('asm', 'Desde aquí arriba lo controlo todo. Bueno, casi todo.'); }, 'intro');
    S.later(9, () => { S.say('op', 'Yo me quedo abajo. Me da vértigo.'); }, 'intro');
  },
  exit() { if (window.__L6 === debug) window.__L6 = null; },
  update(dt) {
    S.update(dt); updateAssembler(asm, dt); updateOperario(op, dt);
    ropeGlow = ropeGlow.map(v => Math.max(0, v - dt)); ropeWob = ropeWob.map(v => Math.max(0, v - dt * 1.5));
    const f = P.config.floors; pulAng = pulAng.map((a, x) => a + (f[x] * Math.PI / 2 - a) * Math.min(1, dt * 8));
    if (dizzyRope) dizzyRope.t += dt;
    riders.forEach(r => Kit.live(r, dt, { x: W / 2, y: TOP.y }));
    natives.forEach(n => Kit.live(n, dt, { x: W / 2, y: GROUND }));
  },
  render() {
    ctx.save(); S.cam.apply(ctx); drawTower(); ctx.restore();
    Draw.text('THE ALGEBRA ENGINE · MÁQUINA 6', 34, 26, { size: 15, font: FONT.plate, align: 'left', color: PAL.inkSoft, spacing: 2 });
    Draw.text('El ensamblador reversible', 32, 54, { size: 30, font: FONT.title, align: 'left', jitter: 1.2, seed: 39 });
    drawElevatorMap();
    Draw.rrect(1370, 670, 220, 140, 8, '#8d5a2f', 3, 9800);
    Kit.plate(1390, 690, 180, 44, 'SUBIR', { fill: '#dfe8c8', focus: S.kbd && S.focusId === 'climb' });
    Kit.plate(1390, 746, 180, 44, 'BAJAR', { fill: up ? '#e9d6f0' : '#d8d2c8', color: up ? PAL.ink : PAL.inkSoft, focus: S.kbd && S.focusId === 'descend' });
    S.drawHud(goals());
    S.drawFocus(items());
  },
  pointerDown(p) { S.kbd = false; S.cancel('intro'); S.progress(); const it = S.hit(items(), p); if (it) { it.act(); return; } dragCam = { y: p.y, cy: S.cam.ty }; },
  pointerMove(p) { S.pointer = { x: p.x, y: p.y, inside: true }; if (dragCam) { S.cam.goto(W / 2, dragCam.cy - (p.y - dragCam.y)); S.cam.snap(); App.setCursor('grabbing'); return; } const it = S.hit(items(), p); S.hoverId = it ? it.id : null; App.setCursor(it ? 'pointer' : 'grab'); },
  pointerUp() { dragCam = null; }, pointerLeave() { S.pointer.inside = false; dragCam = null; },
  key(e) {
    const k = e.key.toLowerCase();
    if (k === 'w') { S.cam.goto(W / 2, S.cam.ty - 300); return true; }
    if (k === 's') { S.cam.goto(W / 2, S.cam.ty + 300); return true; }
    if (S.navKey(e, items())) return true;
    if (k === 'u' || k === 'r') { climb(); return true; }
    if (k === 'b') { descend(); return true; }
    if (/^[0-3]$/.test(k)) { cycle(+k); return true; }
    if (k === 'z' || (e.ctrlKey && k === 'z')) { if (!P.undo().ok) S.say('op', 'Nada que deshacer.'); return true; }
    if (k === 'n') { P.reset(); return true; }
    return false;
  },
  hint: () => S.giveHint(), busy: () => S.run.active, skip: () => S.run.skip(),
  tableContext: () => ({ groups: [G, HH], highlight: S.slip ? S.slip.highlights() : {}, note: 'Arriba se multiplica módulo 5: la fila del 1 repite la cabecera.' }),
};
const debug = { P, S, climb, descend, cycle, items, up: () => up, returned: () => returned, stuck: () => stuck,
  fast() { for (let i = 0; i < 6000 && (S.run.active || S.timers.length); i++) scene.update(1 / 30); }, step(s) { for (let i = 0; i < s * 30; i++) scene.update(1 / 30); } };
scene.debug = () => debug;
return scene;
};
