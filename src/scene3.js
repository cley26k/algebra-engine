/* THE ALGEBRA ENGINE — Nivel 3: la planta de clasificación.
 * Una instalación que ocupa la pantalla: tolva → cinta → tambor clasificador → rampas → contenedores con contador.
 * La función está soldada (inclusión {0,2} → Z4). Lo único que se puede tocar es el conjunto de llegada.
 * La trituradora, colgada de una grúa, quiere comérselo todo; el regulador comprueba que lo que quede sea un grupo. */
'use strict';
window.PlantScene = function (App) {
const W = 1600, H = 900, ctx = Draw.ctx, AG = AlgebraGroups;
const P = AG.createPlant();
const G = P.G, HH = P.H, LG = i => G.labels[i], LH = i => HH.labels[i];
const BIN = j => ({ x: 380 + j * 270, y: 650 });
const HOPPER = { x: 300, y: 196 };
const DRUM = { x: 800, y: 300, r: 64 };
const GANTRY = { y: 452, x0: 80, x1: 1340 };
const REG = { x: 1470, y: 200 };
const DESK = { x: 1370, y: 690 };
const PARK = 150;

const shred = makeShredder(PARK, 476); shred.speed = .2;
const S = Kit.base(App, 3, {
  order: 'Que ningún contenedor se quede sin visitas. La función está soldada: sólo se puede tocar el conjunto de llegada.',
  groups: () => [G, HH], verdictAt: { x: 800, y: 70 }, ticketAt: { x: 1180, y: 96 }, stampAt: { x: 1100, y: 160 },
  cast: {
    shred: { pos: () => ({ x: shred.x + 40, y: shred.y - 70 }), voice: 'shred', screen: true },
    reg: { pos: () => ({ x: REG.x - 40, y: REG.y - 30 }), voice: 'claw', screen: true },
    bin0: { pos: () => res(0), voice: 0, screen: true }, bin1: { pos: () => res(1), voice: 1, screen: true }, bin2: { pos: () => res(2), voice: 2, screen: true }, bin3: { pos: () => res(3), voice: 3, screen: true },
  },
  state: () => hintState(),
  hints: [
    { topic: 'producir', when: s => !s.produced, tiers: [
      { text: 'Primero, observe. Ponga la planta a PRODUCIR y mire los contadores.', point: () => ({ x: DESK.x + 90, y: DESK.y + 10, screen: true }) },
      { text: 'Cada pieza de la tolva cae en un contenedor. Cuente cuántas llegan a cada uno.' },
      { text: 'Fíjese en qué rampas no se usan nunca.' }] },
    { topic: 'periscopio', when: s => s.produced && !s.peeked, tiers: [
      { who: 'bin1', text: '¡Eh! ¡Aquí! ¿Por qué nunca baja nadie por mi rampa?', point: () => ({ x: BIN(1).x, y: BIN(1).y, screen: true }) },
      { text: 'Pulse sobre un contenedor vacío: el periscopio mira quién debería llegar.' },
      { text: 'El periscopio del 1 no ve a nadie en la tolva. La función nunca va allí.' }] },
    { topic: 'visitado', when: s => s.tags.some(y => P.preimages(y).length), tiers: [
      { who: 'shred', text: 'Ejem… ese contenedor tiene visitas. Hasta yo sé que eso no se tritura.' },
      { text: 'Sólo se puede quitar lo que nadie visita. Mire los contadores.' }] },
    { topic: 'marcar', when: s => !s.tags.length && s.codomain.length === 4, tiers: [
      { who: 'shred', text: '¿Me dejas comer los que nadie visita? ¿Sí? ¿SÍ?' },
      { text: 'Marque con la etiqueta roja los contenedores vacíos (clic en el contenedor, luego MARCAR).' },
      { text: 'Pruebe a marcar el 1 y el 3, y pase el PROBADOR DE CIERRE.' }] },
    { topic: 'cierre', when: s => s.lastTest && !s.lastTest.ok && s.lastTest.run.failure && s.lastTest.run.failure.kind === 'closure', tiers: [
      { who: 'reg', text: t => 'Mire mi cinta: ' + LH(t.lastTest.run.failure.a) + ' + ' + LH(t.lastTest.run.failure.b) + ' = ' + LH(t.lastTest.run.failure.c) + ', y ese contenedor se iría.' },
      { text: 'Lo que quede tiene que ser cerrado: sumar dos supervivientes no puede caer en un contenedor triturado.' },
      { who: 'reg', text: 'Si quita el 1, el 3 + 2 lo vuelve a pedir. Quítelos juntos.' }] },
    { topic: 'probar', when: s => s.tags.length && !s.lastTest, tiers: [
      { who: 'reg', text: 'Antes de triturar, el PROBADOR DE CIERRE. Normas de la casa.', point: () => ({ x: DESK.x + 90, y: DESK.y + 66, screen: true }) }] },
    { topic: 'triturar', when: s => s.lastTest && s.lastTest.ok, tiers: [
      { who: 'shred', text: '¡Permiso concedido! Pulsa TRITURAR. ¡PULSA TRITURAR!', point: () => ({ x: DESK.x + 90, y: DESK.y + 122, screen: true }) }] },
    { topic: 'final', when: s => s.codomain.length < 4, tiers: [{ text: 'Vuelva a producir: veamos si ahora todos reciben visita.' }] },
  ],
});
const LINES = {
  tag: [[['shred', '¡SÍ! ¡Ese! ¡Ñam!']], [['shred', '¡Mmmm, contenedor!']], [['shred', '¿Ése también? ¡Qué día tan bonito!']]],
  untag: [[['shred', 'Oh. Vale. No pasa nada. (Sí pasa.)']], [['shred', '¿Ya no? …bueno.']]],
  eager: [
    [['shred', '¿Y si lo trituramos TODO? Así nadie se queda sin visitas.'], ['reg', 'Así no quedaría nada que visitar.']],
    [['shred', '¡El 0 me mira raro! ¿Lo trituro?'], ['reg', 'Es el neutro. Sin él, no hay grupo.']],
    [['shred', 'Tengo los dientes recién afilados.']],
  ],
  empty: [
    [['bin{y}', '¡Eh! ¡Aquí abajo! ¡Contenedor disponible!']],
    [['bin{y}', 'Otra vez nadie. Ya me sé el contador de memoria: cero.']],
    [['bin{y}', '¿Hola? ¿Hay alguien en la tolva que quiera venir?']],
  ],
  testFailClosure: [[['reg', '¡ALTO! {a} + {b} = {c}, y el {c} iría a la trituradora. Lo que queda no se cierra.'], ['shred', 'Pero si es sólo un poquito…']]],
  testFailVisited: [[['reg', '¡ALTO! El {y} recibe visitas. Contador: {n}. No se tritura lo que se usa.'], ['shred', 'Me lo imaginaba. (No me lo imaginaba.)']]],
  testFailId: [[['reg', '¡ALTO! Sin el neutro no queda un grupo.']]],
  testOk: [[['reg', 'Lo que queda, { {rest} }, está cerrado, tiene neutro y cada uno su inverso. PERMISO.'], ['shred', '¡¡¡PERMISO!!!']]],
  shredDone: [[['shred', '¡DELICIOSO! Y no me he comido nada que no tocara.']], [['shred', '¡Crunch! Contenedores vacíos, contenedores digeridos.']]],
};

/* ---------------- estado de escena ---------------- */
const counters = [0, 0, 0, 0], shown = [0, 0, 0, 0];
const residents = HH.labels.map((_, j) => { const b = BIN(j), c = makeCritter('dst', j, b.x, b.y - 8, speciesFor('Z4', j)); c.s = .9; c.hx = c.x; c.hy = c.y; return c; });
let pieces = [], periscope = { y: null, t: 0 }, drumAng = 0, drumTarget = 0, regTape = [], regLight = 0, gone = { 1: 0, 2: 0, 3: 0, 0: 0 };
let produced = false, peeked = false, lastTest = null, selBin = null, permit = 0, beltT = 0;
const binLift = [0, 0, 0, 0];
function res(j) { const r = residents[j]; return { x: r.x + 10, y: r.y - 60 }; }
function hintState() { const c = P.config; return { produced, peeked, tags: c.tags, codomain: c.codomain, lastTest }; }
const alive = j => P.config.codomain.indexOf(j) !== -1;

P.on((t, d) => {
  S.progress();
  if (d.label === 'tag') { const r = d.result; if (r.tagged) { S.dir.play(LINES, 'tag', {}, { cooldown: 2 }); shred.mood = 'eager'; shred.moodT = 2; Sound.fam('clickin'); } else { S.dir.play(LINES, 'untag', {}, { cooldown: 2 }); shred.mood = 'sad'; shred.moodT = 1.5; Sound.fam('drag'); } lastTest = null; permit = 0; }
  if (d.label === 'undo' || d.label === 'reset') { lastTest = null; permit = 0; HH.labels.forEach((_, j) => { if (alive(j)) gone[j] = 0; }); Sound.whoosh(); }
});

/* ---------------- producción ---------------- */
function chutePts(j) { const b = BIN(j); return [[DRUM.x, DRUM.y + 20], [DRUM.x + (b.x - DRUM.x) * .35, DRUM.y + 120], [b.x, 520], [b.x, b.y - 20]]; }
function produce() {
  if (S.run.active) { S.run.scale = 5; return; }
  App.levelStarted(3); S.progress(); if (S.clip.target) S.clip.toggle();
  if (periscope.y !== null) periscope.y = null;
  counters.fill(0);
  const tw = S.run.tw;
  S.run.start((function* () {
    const n = 8;
    for (let k = 0; k < n; k++) {
      const x = k % 2, y = P.f[x], p = makeCritter('src', 0, HOPPER.x, HOPPER.y + 40, speciesFor('SUB2', x)); p.s = .55; pieces.push(p);
      Sound.fam('pop', { vol: .6 });
      Kit.travel(tw, p, [[HOPPER.x, HOPPER.y + 40], [HOPPER.x + 40, 262], [DRUM.x - DRUM.r - 6, 262]], .7, { ease: Ease.linear, done: () => {
        drumTarget = Math.atan2(BIN(y).x - DRUM.x, 200) * -1; Sound.fam('gear');
        Kit.travel(tw, p, [[DRUM.x - DRUM.r, 262], [DRUM.x, DRUM.y]], .2, { done: () => {
          p.species = speciesFor('Z4', y); p.hat = { col: SRC_COL[[0, 2][x]], label: LG(x) }; Sound.fam('transform', { vol: .5 });
          if (!alive(y)) { Kit.travel(tw, p, [[DRUM.x, DRUM.y], [DRUM.x, DRUM.y + 60]], .2, { done: () => { pieces = pieces.filter(q => q !== p); } }); return; }
          Kit.travel(tw, p, chutePts(y), .8, { ease: Ease.in, done: () => {
            pieces = pieces.filter(q => q !== p); counters[y]++; Sound.fam('thud', { vol: .5 }); S.puff(BIN(y).x, BIN(y).y - 10, 4, PAL.bone);
            const r = residents[y]; hopC(r, 14); Kit.react(r, 'relief', 1.2);
          } });
        } });
      } });
      yield .5;
    }
    yield 2;
    produced = true;
    const d = P.diagnose(); S.verdict = d;
    const empties = P.config.codomain.filter(j => counters[j] === 0);
    empties.forEach((j, k) => { const r = residents[j]; Kit.react(r, 'frustration', 2.5); S.later(.4 + k * 2.6, () => S.dir.play(LINES, 'empty', { y: j }, { cooldown: 0, force: true })); });
    if (!empties.length && P.evaluate().done) {
      yield 1.2;
      S.complete({ imagen: { G: 'SUB2', H: 'Z4', f: P.f, from: 'máquina 3, antes de triturar' }, sobreyectividad: { G: 'SUB2', H: 'Z4', f: P.f, from: 'máquina 3, antes de triturar' },
        epimorfismo: { G: 'SUB2', H: 'Z4', f: P.f, codomain: P.config.codomain.slice(), shredded: [0, 1, 2, 3].filter(j => !alive(j)), from: 'máquina 3' } },
        'APROBADO: todo contenedor que queda recibe visitas y lo que queda es un grupo. Epimorfismo (y como nadie comparte, isomorfismo con {0, 2}). Vuelva a la fábrica (Esc).');
    }
  })(), 'produce');
}
function hopC(c, h) { S.tw.add(c, { hop: h }, .15, { ease: Ease.out, done: () => S.tw.add(c, { hop: 0 }, .2, { ease: Ease.in }) }); }

/* ---------------- periscopio, etiquetas, probador, trituradora ---------------- */
function peek(j) {
  if (!alive(j)) return;
  selBin = j; periscope = { y: j, t: 0 }; peeked = true; S.progress(); Sound.fam('servo');
  const pre = P.preimages(j);
  App.announce('Periscopio del ' + LH(j) + ': ' + (pre.length ? 'llegan ' + pre.map(LG).join(' y ') : 'no llega nadie de la tolva'));
  if (!pre.length) S.later(.6, () => Kit.react(residents[j], 'shame', 2));
}
function tag(j) { if (!alive(j)) return; P.tag(j); App.announce((P.config.tags.indexOf(j) !== -1 ? 'Marcado' : 'Desmarcado') + ' el contenedor ' + LH(j)); }
function test() {
  if (S.run.active) return;
  if (!P.config.tags.length) { S.say('reg', 'No hay nada marcado. Nada que comprobar.'); return; }
  const r = P.test(); lastTest = r; S.progress(); regTape = []; permit = 0;
  const tw = S.run.tw;
  S.run.start((function* () {
    Sound.fam('servo'); regLight = 0;
    regTape.push({ text: 'quedarían: { ' + r.rest.map(LH).join(', ') + ' }', ok: null }); yield .5;
    if (r.visited.length) {
      const y = r.visited[0]; regTape.push({ text: '✗ el ' + LH(y) + ' recibe visitas', ok: false }); regLight = -1; Sound.fam('fail');
      Kit.react(residents[y], 'anger', 2.5); S.dir.play(LINES, 'testFailVisited', { y: LH(y), n: counters[y] || '?' }, { force: true }); shred.alto = 2; shred.mood = 'sad'; shred.moodT = 2;
      return;
    }
    if (r.run.failure && r.run.failure.kind === 'identity') { regTape.push({ text: '✗ falta el neutro (0)', ok: false }); regLight = -1; Sound.fam('fail'); S.dir.play(LINES, 'testFailId', {}, { force: true }); shred.alto = 2; return; }
    regTape.push({ text: '✓ el neutro sigue', ok: true }); Sound.fam('clickin'); yield .4;
    // pares, de uno en uno, hasta el primer fallo (que se escenifica de verdad)
    for (const c of r.run.checks) {
      const ok = c.ok;
      if (!ok) {
        // dos habitantes saltan al embudo, se suman y el resultado vuela hacia su contenedor… que se iría
        const ra = residents[c.a], rb = residents[c.b];
        const ta = makeCritter('dst', c.a, ra.x, ra.y, speciesFor('Z4', c.a)), tb = makeCritter('dst', c.b, rb.x, rb.y, speciesFor('Z4', c.b)); ta.s = tb.s = .6; pieces.push(ta, tb);
        Kit.travel(tw, ta, [[ra.x, ra.y], [ra.x, 300], [REG.x - 20, REG.y + 30]], .9, { hops: 0 }); Kit.travel(tw, tb, [[rb.x, rb.y], [rb.x, 320], [REG.x + 20, REG.y + 30]], .9);
        yield 1; pieces = pieces.filter(q => q !== ta && q !== tb); Sound.fam('press');
        const out = makeCritter('dst', c.c, REG.x, REG.y + 200, speciesFor('Z4', c.c)); out.s = .7; pieces.push(out); Kit.react(out, 'surprise', 2);
        const b = BIN(c.c); Kit.travel(tw, out, [[REG.x, REG.y + 200], [(REG.x + b.x) / 2, 360], [b.x, b.y - 30]], 1.1, { ease: Ease.inOut });
        yield 1.15; Sound.fam('crack'); shred.alto = 2.4; shred.shake = .6; regLight = -1; S.puff(b.x, b.y - 30, 8, PAL.bad);
        S.tw.add(out, { alpha: 0 }, .6, { delay: .6, done: () => { pieces = pieces.filter(q => q !== out); } });
        regTape.push({ text: '✗ ' + LH(c.a) + ' + ' + LH(c.b) + ' = ' + LH(c.c) + ' → contenedor marcado', ok: false }); Sound.fam('fail');
        S.dir.play(LINES, 'testFailClosure', { a: LH(c.a), b: LH(c.b), c: LH(c.c) }, { force: true });
        return;
      }
      regTape.push({ text: '✓ ' + LH(c.a) + ' + ' + LH(c.b) + ' = ' + LH(c.c), ok: true }); Sound.fam('gear', { vol: .6 });
      yield .22;
    }
    regTape.push({ text: '✓ cada uno con su inverso', ok: true }); yield .3;
    regLight = 1; permit = 1; Sound.fam('discover'); shred.mood = 'happy'; shred.moodT = 3;
    S.dir.play(LINES, 'testOk', { rest: r.rest.map(LH).join(', ') }, { force: true });
  })(), 'test');
}
function doShred() {
  if (S.run.active) return;
  const c = P.config;
  if (!c.tags.length) { S.say('shred', 'Nada marcado. Nada que comer. Qué tristeza.'); return; }
  if (!c.tested || !c.tested.ok) { shred.alto = 2; shred.shake = .5; Sound.fam('fail'); S.say('reg', c.tested ? '¡ALTO! El probador dijo que no.' : '¡ALTO! Primero, el probador de cierre.'); return; }
  const list = c.tags.slice(), tw = S.run.tw;
  S.run.start((function* () {
    for (const j of list) {
      const b = BIN(j);
      tw.add(shred, { x: b.x }, .9, { ease: Ease.inOut }); Sound.fam('servo'); yield .95;
      tw.add(shred, { y: shred.y - 14 }, .15, { ease: Ease.out }); yield .16;       // anticipación
      tw.add(binLift, { [j]: 1 }, .5, { ease: Ease.inOut }); yield .5;
      shred.chew = 1.4; Sound.fam('shred'); Sound.chomp(); yield .4;
      tw.add(gone, { [j]: 1 }, .6); S.puff(b.x, 520, 14, '#b8a77a'); S.confetti(b.x, 500, 14); yield .8;
      tw.add(shred, { y: 476 }, .2); yield .2;
    }
    P.shred(); permit = 0; lastTest = null; regTape = [];
    S.dir.play(LINES, 'shredDone', {}, { force: true }); shred.mood = 'happy'; shred.moodT = 3;
    tw.add(shred, { x: PARK }, 1.2, { ease: Ease.inOut }); yield 1.3;
    S.verdict = P.diagnose();
  })(), 'shred');
}

/* ---------------- interacción ---------------- */
function items() {
  const out = S.hudItems();
  HH.labels.forEach((_, j) => { if (!alive(j)) return; const b = BIN(j); out.push({ id: 'bin' + j, screen: true, x: b.x - 100, y: b.y - 80, w: 200, h: 170, label: 'Contenedor ' + LH(j) + ': ' + (produced ? counters[j] + ' visitas' : 'sin producir') + (P.config.tags.indexOf(j) !== -1 ? ', marcado para triturar' : '') + ' (periscopio)', act: () => peek(j), hoverOutline: true, pri: 3 }); });
  if (selBin !== null && alive(selBin)) { const b = BIN(selBin); out.push({ id: 'tag', screen: true, x: b.x + 22, y: b.y + 92, w: 90, h: 34, label: (P.config.tags.indexOf(selBin) !== -1 ? 'Quitar etiqueta del ' : 'Marcar para triturar el ') + LH(selBin), act: () => tag(selBin), pri: 1 }); }
  out.push({ id: 'produce', screen: true, x: DESK.x, y: DESK.y - 20, w: 180, h: 44, label: 'PRODUCIR (R)', act: produce, pri: 1 });
  out.push({ id: 'test', screen: true, x: DESK.x, y: DESK.y + 36, w: 180, h: 44, label: 'PROBADOR DE CIERRE (P)', act: test, pri: 1 });
  out.push({ id: 'shred', screen: true, x: DESK.x, y: DESK.y + 92, w: 180, h: 44, label: 'TRITURAR (T)', act: doShred, pri: 1 });
  out.push({ id: 'shredder', screen: true, x: shred.x - 74, y: shred.y - 60, w: 148, h: 180, label: 'La trituradora', act: () => { S.dir.play(LINES, 'eager', {}, { cooldown: 0 }); shred.mood = 'eager'; shred.moodT = 2; shred.chew = .3; }, pri: 4, hoverOutline: true });
  return out;
}

/* ---------------- dibujo ---------------- */
function drawPlant() {
  ctx.fillStyle = '#e7bf95'; ctx.fillRect(-1200, -800, W + 2400, H + 1600);
  if (App.grain) { ctx.fillStyle = App.grain; ctx.fillRect(-1200, -800, W + 2400, H + 1600); }
  // vigas y suelo industrial
  for (let x = 40 - 1100; x < W + 1100; x += 220) { Draw.line(x, -800, x, 820, 6, 7000 + x, 'rgba(33,28,51,.18)'); }
  Draw.line(-1200, 120, W + 1200, 120, 5, 7001, 'rgba(33,28,51,.2)');
  ctx.fillStyle = '#c99064'; ctx.fillRect(-1200, 820, W + 2400, 900);
  for (let x = -1240; x < W + 1200; x += 80) Draw.line(x, 820, x + 40, 900, 2, 7002 + x, 'rgba(33,28,51,.15)');
  Deco.room(S.T, { wall: [-1200, -800, W + 1200, 820], lamps: [720, 1180], len: 0, reach: 560, clock: [1480, 82, 24], posters: [
    [570, 112, 150, 126, 'PROHIBIDO', ['triturar', 'sin probar', 'el cierre'], { stripe: '#b8322a', rot: -.035 }],
    [1090, 118, 176, 118, '¿ES UN GRUPO?', ['· ¿cierra al sumar?', '· ¿está el neutro?'], { stripe: '#3d5a4a', rot: .02, size: 16 }]] });
  // tolva
  Draw.shape([[HOPPER.x - 110, HOPPER.y - 70], [HOPPER.x + 110, HOPPER.y - 70], [HOPPER.x + 30, HOPPER.y + 40], [HOPPER.x - 30, HOPPER.y + 40]], '#7c8a4a', 3);
  Draw.text('TOLVA {0, 2}', HOPPER.x, HOPPER.y - 46, { size: 14, font: FONT.plate, color: PAL.bone });
  [0, 1].forEach(x => drawBead(speciesFor('SUB2', x), HOPPER.x - 30 + x * 60, HOPPER.y - 14, 15));
  Draw.text('soldado: 0 → 0, 2 → 2', 60, 320, { size: 16, align: 'left', color: PAL.inkSoft });
  // cinta hacia el tambor
  Draw.rrect(HOPPER.x + 20, 270, DRUM.x - DRUM.r - HOPPER.x - 20, 18, 9, '#4b4536', 3, 7010);
  ctx.save(); ctx.beginPath(); ctx.rect(HOPPER.x + 26, 272, DRUM.x - DRUM.r - HOPPER.x - 32, 14); ctx.clip();
  for (let x = HOPPER.x; x < DRUM.x; x += 26) Draw.line(x + (beltT % 26), 272, x + (beltT % 26) + 8, 286, 2, 7011, '#8a7f63');
  ctx.restore();
  // rampas: las que nunca se usan están oxidadas y con telarañas
  HH.labels.forEach((_, j) => {
    const pts = chutePts(j), used = P.preimages(j).length > 0, a = 1 - gone[j];
    if (a <= .01) { const b = BIN(j); Draw.rrect(b.x - 40, 500, 80, 22, 3, '#a7744a', 2.5, 7020 + j); Draw.text('CLAUSURADO', b.x, 511, { size: 10, font: FONT.plate }); return; }
    ctx.save(); ctx.globalAlpha = a;
    Draw.curve(pts, 30, PAL.ink); Draw.curve(pts, 22, used ? '#b9b3a0' : '#a98966');
    if (!used) {
      const m = K2(pts, .55);
      for (let k = 0; k < 5; k++) Draw.line(m.x - 18, m.y - 18 + k * 9, m.x + 18, m.y - 10 + k * 7, 1, 7030 + k, 'rgba(255,255,255,.6)');
      Draw.curve([[m.x - 20, m.y - 20], [m.x, m.y], [m.x + 20, m.y - 20]], 1, 'rgba(255,255,255,.6)');
      Draw.text('óxido', m.x + 34, m.y, { size: 13, color: PAL.inkSoft });
    }
    ctx.restore();
  });
  // tambor clasificador
  Draw.ellipse(DRUM.x, DRUM.y, DRUM.r, DRUM.r, PAL.mustard, 3.5, 7040);
  for (let k = 0; k < 6; k++) { const a = drumAng + k * Math.PI / 3; Draw.line(DRUM.x, DRUM.y, DRUM.x + Math.cos(a) * (DRUM.r - 8), DRUM.y + Math.sin(a) * (DRUM.r - 8), 3, 7041 + k); }
  Draw.ellipse(DRUM.x, DRUM.y, 16, 16, PAL.bone, 2.5, 7048);
  Draw.text('CLASIFICADOR', DRUM.x, DRUM.y - DRUM.r - 14, { size: 13, font: FONT.plate });
  // grúa de la trituradora
  Draw.rrect(GANTRY.x0, GANTRY.y - 12, GANTRY.x1 - GANTRY.x0, 16, 4, '#6f6a55', 3, 7050);
  for (let x = GANTRY.x0 + 20; x < GANTRY.x1; x += 40) Draw.ellipse(x, GANTRY.y - 4, 2.5, 2.5, PAL.ink, 0, 7051);
  // contenedores
  HH.labels.forEach((_, j) => drawBin(j));
  // trituradora
  Draw.line(shred.x - 40, GANTRY.y, shred.x - 40, shred.y - 60, 3, 7060); Draw.line(shred.x + 40, GANTRY.y, shred.x + 40, shred.y - 60, 3, 7061);
  drawShredder(shred, shred.x, shred.x);
  // regulador
  drawRegulator();
  // periscopio
  drawPeriscope();
  pieces.forEach(p => { drawCritter(p); Kit.drawMark(p); });
  // pupitre
  Draw.rrect(DESK.x - 20, DESK.y - 40, 220, 200, 8, '#8d5a2f', 3, 7100);
  const ok = lastTest && lastTest.ok;
  Kit.plate(DESK.x, DESK.y - 20, 180, 44, 'PRODUCIR', { focus: S.kbd && S.focusId === 'produce', fill: '#dfe8c8' });
  Kit.plate(DESK.x, DESK.y + 36, 180, 44, 'PROBAR CIERRE', { focus: S.kbd && S.focusId === 'test' });
  Kit.plate(DESK.x, DESK.y + 92, 180, 44, 'TRITURAR', { focus: S.kbd && S.focusId === 'shred', fill: ok ? '#f0b3a8' : '#d8d2c8', color: ok ? PAL.bad : PAL.inkSoft });
  if (permit) { ctx.save(); ctx.translate(DESK.x + 170, DESK.y + 100); ctx.rotate(-.3); Draw.text('PERMISO', 0, 0, { size: 13, font: FONT.plate, color: PAL.good, spacing: 1 }); ctx.restore(); }
  S.drawParts();
}
function K2(pts, u) { return Kit.polyAt(pts, u); }
function drawBin(j) {
  const b = BIN(j), a = 1 - gone[j], lift = binLift[j] * (1 - gone[j]);
  if (a <= .01) { Draw.ellipse(b.x, b.y + 90, 90, 14, 'rgba(33,28,51,.18)', 0, 7200 + j); Draw.text('triturado', b.x, b.y + 90, { size: 15, color: PAL.inkSoft }); return; }
  ctx.save(); ctx.globalAlpha = a; ctx.translate(0, -lift * 140);
  const tagged = P.config.tags.indexOf(j) !== -1, sel = selBin === j;
  Draw.shape([[b.x - 100, b.y - 10], [b.x + 100, b.y - 10], [b.x + 84, b.y + 130], [b.x - 84, b.y + 130]], j === HH.identity ? '#cdb8d9' : '#c7c2a8', 3);
  Draw.line(b.x - 96, b.y + 20, b.x + 96, b.y + 20, 2, 7210 + j);
  // contador mecánico de visitas
  Draw.rrect(b.x - 40, b.y + 46, 80, 40, 4, '#1a1528', 2.5, 7220 + j, PAL.bone);
  const v = shown[j], d0 = Math.floor(v) % 10, frac = v - Math.floor(v);
  ctx.save(); ctx.beginPath(); ctx.rect(b.x - 36, b.y + 50, 72, 32); ctx.clip();
  Draw.text(String(d0), b.x, b.y + 66 - frac * 30, { size: 26, font: FONT.title, color: PAL.bone }); Draw.text(String((d0 + 1) % 10), b.x, b.y + 96 - frac * 30, { size: 26, font: FONT.title, color: PAL.bone });
  ctx.restore();
  Draw.text('visitas', b.x, b.y + 104, { size: 14, color: PAL.inkSoft });
  drawBead(speciesFor('Z4', j), b.x - 70, b.y + 34, 13);
  if (j === HH.identity) Draw.text('NEUTRO', b.x + 64, b.y + 34, { size: 11, font: FONT.plate, color: PAL.plum });
  if (tagged) { // etiqueta roja colgante
    ctx.save(); ctx.translate(b.x + 70, b.y + 60); ctx.rotate(.2 + Math.sin(S.T * 3) * .05);
    Draw.line(0, -40, 0, 0, 1.5, 7230); Draw.shape([[-26, 0], [26, 0], [26, 40], [0, 52], [-26, 40]], '#e4776a', 2.5); Draw.text('TRITURAR', 0, 22, { size: 9, font: FONT.plate, color: PAL.bone });
    ctx.restore();
  }
  if (sel) {
    Kit.plate(b.x + 22, b.y + 92, 90, 34, tagged ? 'QUITAR' : 'MARCAR', { size: 12, fill: tagged ? PAL.bone : '#f0b3a8', focus: S.kbd && S.focusId === 'tag' });
  }
  const r = residents[j]; r.x = r.hx; r.y = r.hy; drawCritter(r); Kit.drawMark(r);
  if (produced && counters[j] === 0 && !S.run.active && !Clock.reduced) { // bandera para llamar la atención
    const fx = r.x + 26, fy = r.y - 40, w = Math.sin(S.T * 10) * 8;
    Draw.line(fx, fy + 30, fx, fy - 20, 2.5, 7240); Draw.shape([[fx, fy - 20], [fx + 26 + w, fy - 14], [fx, fy - 6]], PAL.bad, 2);
  }
  ctx.restore();
}
function drawRegulator() {
  const x = REG.x, y = REG.y;
  Draw.shape([[x - 70, y - 40], [x + 70, y - 40], [x + 24, y + 40], [x - 24, y + 40]], '#c7c2a8', 3);
  Draw.rrect(x - 60, y + 40, 120, 150, 12, '#5b6a96', 3, 7300);
  Draw.ellipse(x, y + 80, 22, 22, regLight > 0 ? '#b9e08a' : regLight < 0 ? '#f0705f' : '#e9ecf8', 2.5, 7301);
  Draw.text('+', x, y + 81, { size: 22, font: FONT.title });
  Draw.text('REGULADOR', x, y + 130, { size: 12, font: FONT.plate, color: PAL.bone, spacing: 1 });
  Draw.text('DE CIERRE', x, y + 148, { size: 12, font: FONT.plate, color: PAL.bone, spacing: 1 });
  // cinta impresa
  const lines = regTape.slice(-7), h = 24 + lines.length * 22;
  Draw.rrect(x - 108, y + 196, 216, Math.max(40, h), 3, PAL.bone, 2, 7302);
  if (!lines.length) Draw.text('(sin pruebas)', x, y + 216, { size: 15, color: PAL.inkSoft });
  lines.forEach((l, i) => Draw.text(l.text, x - 98, y + 214 + i * 22, { size: 15, align: 'left', color: l.ok === false ? PAL.bad : l.ok ? PAL.good : PAL.ink }));
}
function drawPeriscope() {
  if (periscope.y === null || !alive(periscope.y)) return;
  const j = periscope.y, b = BIN(j), t = Math.min(1, periscope.t * 3), top = b.y - 20 - t * 150;
  Draw.rrect(b.x - 112, top, 18, b.y - 20 - top, 3, '#6f6a55', 2.5, 7400);
  Draw.rrect(b.x - 124, top - 14, 42, 22, 4, '#6f6a55', 2.5, 7401); Draw.ellipse(b.x - 86, top - 3, 8, 8, '#dfe3f3', 2, 7402);
  if (t < 1) return;
  const pre = P.preimages(j), cx = b.x - 100, cy = top - 70;
  Draw.rrect(cx - 110, cy - 40, 220, 66, 8, PAL.bone, 2.5, 7403);
  Draw.text('¿quién viene al ' + LH(j) + '?', cx, cy - 22, { size: 16 });
  if (pre.length) { pre.forEach((x, k) => drawBead(speciesFor('SUB2', x), cx - 20 * (pre.length - 1) + k * 40, cy + 6, 13)); Draw.text('→ ' + LH(j), cx + 50, cy + 6, { size: 16 }); }
  else Draw.text('nadie de la tolva', cx, cy + 6, { size: 17, color: PAL.bad });
}

/* ---------------- escena ---------------- */
const goals = () => { const e = P.evaluate(), seen = produced; return [
  { text: 'las sumas sobreviven', ok: e.d.analysis.hom, seen },
  { text: 'el destino sigue siendo un grupo', ok: e.d.analysis.codomainReport.ok, seen },
  { text: 'ningún contenedor sin visitas', ok: seen && e.d.analysis.surjective && P.config.codomain.every(j => counters[j] > 0), seen }]; };
const scene = {
  enter() {
    window.__L3 = debug;
    S.encIn('Orden nº 3: hay contenedores que nadie visita. La trituradora se los quiere comer. Que coma… dentro de la ley.', { leaveAfter: 10 });
    S.later(6.5, () => { S.dir.play(LINES, 'eager', {}, { force: true }); shred.mood = 'eager'; shred.moodT = 3; }, 'intro');
  },
  exit() { if (window.__L3 === debug) window.__L3 = null; },
  update(dt) {
    S.update(dt); updateShredder(shred, dt);
    beltT += dt * (S.run.active && S.run.tag === 'produce' ? 80 : 0);
    drumAng += (drumTarget - drumAng) * Math.min(1, dt * 8) + (S.run.active && S.run.tag === 'produce' ? dt * .5 : 0);
    for (let j = 0; j < 4; j++) shown[j] += (counters[j] - shown[j]) * Math.min(1, dt * 6);
    periscope.t += dt; regLight *= Math.pow(.7, dt);
    residents.forEach(r => Kit.live(r, dt, S.pointer.inside ? S.pointer : { x: HOPPER.x, y: HOPPER.y }));
    pieces.forEach(p => Kit.live(p, dt));
  },
  render() {
    drawPlant();
    Draw.text('THE ALGEBRA ENGINE · MÁQUINA 3', 34, 26, { size: 15, font: FONT.plate, align: 'left', color: PAL.inkSoft, spacing: 2 });
    Draw.text('La trituradora de destinos', 32, 54, { size: 30, font: FONT.title, align: 'left', jitter: 1.2, seed: 36 });
    S.drawHud(goals());
    S.drawFocus(items());
  },
  pointerDown(p) { S.kbd = false; S.cancel('intro'); S.progress(); const it = S.hit(items(), p); if (it) it.act(); else { selBin = null; periscope.y = null; } },
  pointerMove(p) { S.pointer = { x: p.x, y: p.y, inside: true }; const it = S.hit(items(), p); S.hoverId = it ? it.id : null; App.setCursor(it ? 'pointer' : 'default'); },
  pointerUp() {}, pointerLeave() { S.pointer.inside = false; },
  key(e) {
    if (S.navKey(e, items())) return true;
    const k = e.key.toLowerCase();
    if (k === 'r') { produce(); return true; }
    if (k === 'p') { test(); return true; }
    if (k === 't') { doShred(); return true; }
    if (k === 'm' && selBin !== null) { tag(selBin); return true; }
    if (/^[0-3]$/.test(k)) { peek(+k); return true; }
    if (k === 'z' || (e.ctrlKey && k === 'z')) { if (!P.undo().ok) S.say('shred', 'Nada que deshacer. Como mis bocados.'); return true; }
    if (k === 'n') { P.reset(); return true; }
    return false;
  },
  hint: () => S.giveHint(), busy: () => S.run.active, skip: () => S.run.skip(),
  tableContext: () => { const hl = {}; if (lastTest && lastTest.run.failure && lastTest.run.failure.kind === 'closure') hl.Z4 = { r: lastTest.run.failure.a, c: lastTest.run.failure.b }; return { groups: [HH], highlight: hl, note: 'Lo que quede debe ser cerrado: fila y columna dentro, resultado dentro.' }; },
};
const debug = { P, S, shred, counters, produce, peek, tag, test, doShred, items, lastTest: () => lastTest,
  fast() { for (let i = 0; i < 6000 && (S.run.active || S.timers.length); i++) scene.update(1 / 30); }, step(s) { for (let i = 0; i < s * 30; i++) scene.update(1 / 30); } };
scene.debug = () => debug;
return scene;
};
