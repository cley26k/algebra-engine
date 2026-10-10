/* THE ALGEBRA ENGINE — Nivel 4: la sala de espejos.
 * Cuatro espejos de feria, uno por cada habitante del reloj; cada espejo muestra su reflejo en el mundo espejo.
 * Girar un espejo cambia el reflejo. Una pasarela lleva parejas al arco de suma (ruta ▲) mientras sus reflejos
 * se combinan en el aire (ruta ●); una balanza colgada del techo compara. Si el neutro no se refleja en el neutro,
 * todo el mundo espejo tiembla: los reflejos se comportan de forma incoherente. */
'use strict';
window.MirrorScene = function (App) {
const W = 1600, H = 900, ctx = Draw.ctx, AG = AlgebraGroups;
const P = AG.createMirrors();
const G = P.G, HH = P.H, LG = i => G.labels[i], LH = i => '«' + HH.labels[i] + '»';
const MX = x => 300 + x * 240;
const MIR = { top: 168, bot: 448 };
const FLOOR = 610, WALK = { x0: 140, x1: 1300, y: 770 }, PLAT = [{ x: 190 }, { x: 270 }];
const ARCH = { x: 1310, y: 700 }, FUSE_B = { x: 1180, y: 118 }, SCALE = { x: 1440, y: 96 };
const DESK = { x: 1380, y: 776 };

const op = makeOperario(1490, 560);
const S = Kit.base(App, 4, {
  order: 'Llevar el reloj de 4 al mundo espejo sin que las dos rutas se separen, y que ningún reflejo se quede sin visitas.',
  groups: () => [G, HH], verdictAt: { x: 760, y: 62 }, ticketAt: { x: 1180, y: 840 }, stampAt: { x: 1180, y: 300 },
  cast: {
    op: { pos: () => ({ x: op.x - 20, y: op.y - 40 }), voice: 'op', screen: true },
    mirror: { pos: () => ({ x: 760, y: 150 }), voice: 'mirror', screen: true },
  },
  state: () => hintState(),
  hints: [
    { topic: 'temblor', when: s => !s.walked && !s.identityOk, tiers: [
      { who: 'mirror', text: 'Los reflejos tiemblan desde que se encendió la sala. Algo no cuadra desde el principio.' },
      { text: 'Ponga a pasear al 0 con el 0. 0 + 0 = 0. ¿Qué dirán sus reflejos?', point: () => ({ x: MX(0), y: FLOOR - 40, screen: true }) },
      { text: 'Clic en el 0, otra vez clic en el 0 (va dos veces a la pasarela) y PASEAR.' }] },
    { topic: 'neutro', when: s => !s.identityOk, tiers: [
      { who: 'mirror', text: 'El 0 se suma consigo mismo y no cambia. Su reflejo, combinado consigo mismo, sí cambia.' },
      { text: 'Toque los reflejos de los espejos: ¿cuál no cambia a nadie al combinarse?', point: () => ({ x: MX(0), y: 300, screen: true }) },
      { who: 'mirror', text: 'En este mundo el neutro se llama «1». Gire el espejo del 0.' }] },
    { topic: 'roto', when: s => s.diag.kind === 'broken', tiers: [
      { text: t => 'Pruebe la pareja ' + LG(t.diag.counterexample.a) + ' + ' + LG(t.diag.counterexample.b) + ' en la pasarela y mire dónde se separan las rutas.' },
      { who: 'mirror', text: 'Si el 1 se refleja en y, el 2 = 1 + 1 debe reflejarse en y ⊙ y.' },
      { who: 'mirror', text: 'Aquí, y ⊙ y siempre da «1». Así que el espejo del 2 debe mostrar «1».' }] },
    { topic: 'visitas', when: s => s.diag.analysis.hom && !s.diag.analysis.surjective, tiers: [
      { who: 'mirror', text: 'Todo cuadra, pero el reflejo «0» no aparece en ningún espejo.' },
      { text: '¿Puede el 1 reflejarse en «0» sin romper nada? Pruébelo y haga desfilar a todos.' }] },
    { topic: 'desfile', when: s => s.diag.analysis.hom && s.diag.analysis.surjective, tiers: [
      { text: 'Parece en orden. Haga DESFILAR a las 16 parejas para certificarlo.', point: () => ({ x: DESK.x + 90, y: DESK.y + 66, screen: true }) }] },
  ],
});
const LINES = {
  flip: [[['op', 'Le doy la vuelta… ¡zas!']], [['op', 'Este espejo tiene dos caras, como mi cuñado.']], [['mirror', 'Otra cara, otro reflejo.']]],
  same: [[['mirror', '▲ y ● coinciden. El reflejo de la suma es la combinación de los reflejos.']], [['op', '¡Mira, encajan!'], ['mirror', 'Encajan porque la operación se conserva.']]],
  diff: [
    [['mirror', '▲ dice {A}, ● dice {B}. Los reflejos no se ponen de acuerdo.'], ['op', 'Le paso un trapo y seguro que se arregla.'], ['mirror', 'No es suciedad. Es aritmética.']],
    [['mirror', 'La suma ve un reflejo, los reflejos combinados ven otro. Se agrieta.']],
  ],
  identity: [[['mirror', '0 + 0 = 0, pero {f0} ⊙ {f0} = {B}. El neutro de allá no es el que yo muestro.'], ['op', '¡Pero si los dos se llaman 0!'], ['mirror', 'El nombre no importa. Importa cómo opera.']]],
  neutralYes: [[['mirror', '{y} no cambia a nadie: {y} ⊙ x = x. Es el NEUTRO de este mundo.']]],
  neutralNo: [[['mirror', '{y} cambia a alguien: no es el neutro.']]],
  parade: [[['op', '¡Desfile! Todos de dos en dos.']], [['mirror', 'Dieciséis parejas, dieciséis reflejos.']]],
  paradeOk: [[['mirror', 'Las dieciséis parejas se reflejan sin una sola grieta.']]],
};

/* ---------------- estado de escena ---------------- */
const walkers = G.labels.map((_, x) => { const c = makeCritter('src', x, MX(x), FLOOR, speciesFor('Z4', x)); c.s = .9; c.hx = c.x; c.hy = c.y; return c; });
let onWalk = [], tokens = [], flipAnim = [0, 0, 0, 0], cracks = [0, 0, 0, 0], wobble = 1, walked = false, lastDiag = null, beam = Spring(0), panA = null, panB = null, showNeutral = null, walkT = 0, certified = false, scaleText = null;
const reflect = G.labels.map((_, x) => { const c = makeCritter('dst', x, MX(x), 380, speciesFor('MIRROR', P.config.faces[x])); c.s = .9; return c; });
function hintState() { const d = P.diagnose(); return { walked, identityOk: d.analysis.identityOk, diag: d }; }

P.on((t, d) => {
  S.progress(); certified = false;
  if (S.run.active) { S.run.kill(); tokens = []; }
  if (d.label === 'flip') { const x = d.result.x; flipAnim[x] = 1; Sound.fam('glass'); S.later(.12, () => Sound.fam('slide')); cracks[x] = 0; S.dir.play(LINES, 'flip', {}, { cooldown: 7 }); }
  if (d.label === 'undo' || d.label === 'reset') { flipAnim = flipAnim.map(() => 1); Sound.whoosh(); }
  S.verdict = null; panA = panB = null; beam.target = 0; scaleText = null;
});

/* ---------------- interacción ---------------- */
function board(x) {
  if (S.run.active) return;
  App.levelStarted(4); S.progress();
  if (onWalk.length >= 2) onWalk = [];
  onWalk.push(x); Sound.fam('clickin'); poke(walkers[x], 6, -8);
  App.announce('En la pasarela: ' + onWalk.map(LG).join(' y ') + (onWalk.length === 2 ? '. Pulsa PASEAR.' : '. Elige otro.'));
}
function flip(x) { if (S.run.active) S.run.kill(); P.flip(x); App.announce('El espejo del ' + LG(x) + ' muestra ahora ' + LH(P.config.faces[x])); }
function neutralProbe(x) {
  const y = P.config.faces[x], r = P.neutralTest(y);
  showNeutral = { x, y, r, t: 0 }; Sound.fam('glass'); S.progress();
  S.dir.play(LINES, r.every(q => q.same) ? 'neutralYes' : 'neutralNo', { y: LH(y) }, { force: true, cooldown: 0 });
  if (r.every(q => q.same)) { Sound.fam('discover'); Kit.react(reflect[x], 'pride', 2); } else Kit.react(reflect[x], 'confused', 1.6);
}
function walk() {
  if (S.run.active) { S.run.scale = 5; return; }
  if (onWalk.length < 2) { S.say('op', 'Hacen falta dos en la pasarela. Clic en dos habitantes.'); return; }
  const [a, b] = onWalk, w = P.walk(a, b), tw = S.run.tw, f = P.config.faces;
  walked = true; S.progress(); if (S.clip.target) S.clip.toggle();
  panA = panB = null; tokens = []; beam.target = 0; if (S.slip) S.slip.closing = true; scaleText = null;
  S.run.start((function* () {
    // los dos suben a la pasarela
    const ta = makeCritter('src', a, MX(a), FLOOR, speciesFor('Z4', a)), tb = makeCritter('src', b, MX(b), FLOOR, speciesFor('Z4', b));
    ta.s = tb.s = .78; tokens.push(ta, tb);
    Kit.travel(tw, ta, [[MX(a), FLOOR], [PLAT[0].x, WALK.y - 4]], .5, { hops: 1, antic: true }); Kit.travel(tw, tb, [[MX(b), FLOOR], [PLAT[1].x, WALK.y - 4]], .5, { hops: 1, antic: true, delay: .1 });
    // ruta ●: sus reflejos salen de los espejos a la vez
    const ra = makeCritter('dst', 0, MX(a), 330, speciesFor('MIRROR', f[a])), rb = makeCritter('dst', 0, MX(b), 330, speciesFor('MIRROR', f[b]));
    ra.s = rb.s = .66; ra.flag = 'B'; rb.flag = 'B'; ra.ghost = rb.ghost = true; tokens.push(ra, rb);
    Sound.fam('glass');
    yield .65;
    walkT = 1; Sound.fam('hum');
    Kit.travel(tw, ta, [[PLAT[0].x, WALK.y - 4], [ARCH.x - 24, WALK.y - 4]], 1.3, { ease: Ease.inOut });
    Kit.travel(tw, tb, [[PLAT[1].x, WALK.y - 4], [ARCH.x + 24, WALK.y - 4]], 1.3, { ease: Ease.inOut });
    Kit.travel(tw, ra, [[MX(a), 330], [MX(a) + 60, 200], [FUSE_B.x - 26, FUSE_B.y]], 1.3, { ease: Ease.inOut });
    Kit.travel(tw, rb, [[MX(b), 330], [MX(b) + 30, 180], [FUSE_B.x + 26, FUSE_B.y]], 1.3, { ease: Ease.inOut });
    yield 1.35; walkT = 0;
    // fusiones
    Sound.fam('press'); S.puff(ARCH.x, WALK.y - 30, 6, PAL.mustard); Sound.fam('glass'); S.puff(FUSE_B.x, FUSE_B.y, 6, '#dfe3f3');
    tokens = tokens.filter(q => q !== ta && q !== tb && q !== ra && q !== rb);
    const sA = makeCritter('src', w.s, ARCH.x, WALK.y - 4, speciesFor('Z4', w.s)); sA.s = .82; sA.flag = 'A'; sA.sx.v = 1.6; sA.sy.v = .5; tokens.push(sA);
    const sB = makeCritter('dst', 0, FUSE_B.x, FUSE_B.y, speciesFor('MIRROR', w.B)); sB.s = .7; sB.flag = 'B'; sB.ghost = true; sB.sx.v = 1.6; sB.sy.v = .5; tokens.push(sB);
    yield .35;
    // ▲: la suma camina hasta su espejo, que muestra su reflejo; ● va a su platillo
    Kit.travel(tw, sA, [[ARCH.x, WALK.y - 4], [MX(w.s) + 60, FLOOR + 20], [MX(w.s), FLOOR]], 1.1, { hops: 3 });
    Kit.travel(tw, sB, [[FUSE_B.x, FUSE_B.y], [SCALE.x + 90, SCALE.y + 150]], 1.1, { ease: Ease.inOut, done: () => { panB = sB; Sound.fam('clickin'); beam.vel -= 3; } });
    yield 1.15;
    flipAnim[w.s] = Math.max(flipAnim[w.s], .3); Sound.fam('glass');
    const rA = makeCritter('dst', 0, MX(w.s), 330, speciesFor('MIRROR', w.A)); rA.s = .7; rA.flag = 'A'; rA.ghost = true; tokens.push(rA);
    Kit.travel(tw, rA, [[MX(w.s), 330], [SCALE.x - 90, SCALE.y + 150]], 1.0, { ease: Ease.inOut, done: () => { panA = rA; Sound.fam('clickin'); beam.vel += 3; } });
    yield 1.1;
    // comparación sincronizada con el estado lógico
    scaleText = w;
    if (w.ok) {
      beam.target = 0; Sound.fam('bell'); [rA, sB].forEach(c => Kit.react(c, 'relief', 2)); S.dir.play(LINES, 'same', {}, { cooldown: 6 });
    } else {
      beam.target = w.A === HH.identity ? .2 : -.2; Sound.fam('crack'); Sound.fam('fail');
      [w.s, a, b].forEach(x => { cracks[x] = 1; }); [rA, sB].forEach(c => { Kit.react(c, 'frustration', 2.6); c.shake = .8; });
      S.slip = Kit.RouteSlip(G, HH, f, a, b, { x: 300, y: 640, title: 'LA PAREJA ' + LG(a) + ' + ' + LG(b) + ' SE SEPARA AQUÍ' });
      if (a === G.identity && b === G.identity) S.dir.play(LINES, 'identity', { f0: LH(f[0]), B: LH(w.B) }, { force: true });
      else S.dir.play(LINES, 'diff', { A: LH(w.A), B: LH(w.B) }, { force: true });
      Kit.react(op, 'surprise'); operarioDo(op, 'shrug', 2); op.tool = 'tape'; op.toolT = 2;
    }
    yield 1.6;
    tokens = tokens.filter(q => q !== sA);
    onWalk = [];
  })(), 'walk');
}
/* desfile: las 16 parejas, deprisa; se detiene en la primera divergencia */
function parade() {
  if (S.run.active) { S.run.scale = 5; return; }
  App.levelStarted(4); S.progress(); if (S.clip.target) S.clip.toggle();
  const d = P.diagnose(), f = P.config.faces;
  S.dir.play(LINES, 'parade', {}, { cooldown: 10 });
  if (S.slip) S.slip.closing = true; panA = panB = null; tokens = [];
  S.run.start((function* () {
    for (const p of d.analysis.pairs) {
      scaleText = { a: p.a, b: p.b, s: p.sumG, A: p.routeA, B: p.routeB, fa: p.fa, fb: p.fb, ok: p.ok };
      walkers[p.a].hop = 8; walkers[p.b].hop = 8; S.later(.08, () => { walkers[p.a].hop = 0; walkers[p.b].hop = 0; });
      Sound.fam(p.ok ? 'gear' : 'crack', { vol: .5 });
      if (!p.ok) {
        beam.target = .2; [p.sumG, p.a, p.b].forEach(x => { cracks[x] = 1; });
        S.slip = Kit.RouteSlip(G, HH, f, p.a, p.b, { x: 300, y: 650, title: 'EL DESFILE SE DETIENE EN ' + LG(p.a) + ' + ' + LG(p.b) });
        Sound.fam('fail'); S.verdict = d; lastDiag = d;
        return;
      }
      beam.target = 0;
      yield .16;
    }
    S.verdict = d; lastDiag = d; certified = true;
    if (d.analysis.surjective) {
      S.dir.play(LINES, 'paradeOk', {}, { force: true }); Sound.fam('discover'); reflect.forEach(r => Kit.react(r, 'pride', 2));
      yield 1;
      S.complete({ identidad: { G: 'Z4', H: 'MIRROR', f: f.slice(), from: 'máquina 4' } },
        'APROBADO: el neutro se refleja en el neutro y las dieciséis parejas cuadran. Vuelva a la fábrica (Esc).');
    } else {
      const empty = d.empty.map(LH).join(', ');
      S.say('mirror', 'Ni una grieta. Pero el reflejo ' + empty + ' no aparece en ningún espejo: es homomorfismo, aún no sobreyectivo.', { dur: 5 });
    }
  })(), 'parade');
}

function items() {
  const out = S.hudItems();
  G.labels.forEach((_, x) => {
    out.push({ id: 'walker' + x, screen: true, x: MX(x) - 40, y: FLOOR - 80, w: 80, h: 90, label: 'Habitante ' + LG(x) + ': subir a la pasarela', act: () => board(x), hoverOutline: true, pri: 2 });
    out.push({ id: 'mirror' + x, screen: true, x: MX(x) - 70, y: MIR.top, w: 140, h: MIR.bot - MIR.top - 46, label: 'Reflejo del ' + LG(x) + ': ' + LH(P.config.faces[x]) + ' (clic: ¿es el neutro?)', act: () => neutralProbe(x), hoverOutline: true, pri: 3 });
    out.push({ id: 'flip' + x, screen: true, x: MX(x) - 26, y: MIR.bot - 40, w: 52, h: 34, label: 'Girar el espejo del ' + LG(x), act: () => flip(x), hoverOutline: true, pri: 1 });
  });
  out.push({ id: 'walk', screen: true, x: DESK.x, y: DESK.y, w: 180, h: 44, label: 'PASEAR la pareja (R)', act: walk, pri: 1 });
  out.push({ id: 'parade', screen: true, x: DESK.x, y: DESK.y + 56, w: 180, h: 44, label: 'DESFILE de las 16 parejas (D)', act: parade, pri: 1 });
  return out;
}

/* ---------------- dibujo ---------------- */
function drawRoom() {
  // mundo espejo (arriba): azulado, plateado
  ctx.fillStyle = '#d7d8e8'; ctx.fillRect(-1200, -800, W + 2400, 1250);
  ctx.save(); ctx.globalAlpha = .25; for (let k = -6; k < 15; k++) Draw.line(k * 210 - 100, 0, k * 210 + 80, 450, 18, 8000 + k, '#ffffff'); ctx.restore();
  // suelo real (abajo): papel cálido
  ctx.fillStyle = PAL.paper; ctx.fillRect(-1200, 450, W + 2400, 1250);
  if (App.grain) { ctx.fillStyle = App.grain; ctx.fillRect(-1200, -800, W + 2400, H + 1600); }
  Deco.stars(-1200, -800, W + 2400, 1240, S.T, 70, 44);
  Deco.room(S.T, { lamps: [720, 1020], len: 0, reach: 420, a: .1, posters: [[1078, 512, 150, 104, 'SALA DE ESPEJOS', ['no se asuste', 'de su reflejo'], { stripe: '#5d6080', rot: .03 }]] });
  Draw.line(-1200, 450, W + 1200, 450, 6, 8010, '#5d6080'); Draw.line(-1200, 456, W + 1200, 456, 2, 8011, '#ffffff');
  Draw.text('MUNDO ESPEJO · ⊙: iguales → «1», distintos → «0»', 1120, 420, { size: 16, align: 'left', color: '#5d6080' });
  Draw.text('EL RELOJ DE 4 · aquí se suma', 40, 486, { size: 16, align: 'left', color: PAL.inkSoft });
  // espejos
  G.labels.forEach((_, x) => drawMirror(x));
  // pasarela
  Draw.rrect(WALK.x0, WALK.y, WALK.x1 - WALK.x0, 22, 11, '#5b6a96', 3, 8020);
  ctx.save(); ctx.beginPath(); ctx.rect(WALK.x0 + 6, WALK.y + 2, WALK.x1 - WALK.x0 - 12, 18); ctx.clip();
  for (let x = WALK.x0 - 40; x < WALK.x1; x += 40) Draw.line(x + (S.T * 120 * walkT) % 40, WALK.y + 2, x + (S.T * 120 * walkT) % 40 + 12, WALK.y + 20, 2, 8021, '#c1cbef');
  ctx.restore();
  Draw.text('PASARELA', WALK.x0 + 10, WALK.y + 46, { size: 13, font: FONT.plate, align: 'left', color: PAL.inkSoft });
  PLAT.forEach((p, i) => { Draw.ellipse(p.x, WALK.y + 2, 30, 8, onWalk[i] !== undefined ? '#f6e27a' : '#c1cbef', 2, 8022 + i); Draw.text(i ? 'b' : 'a', p.x, WALK.y + 30, { size: 15, color: PAL.inkSoft }); if (onWalk[i] !== undefined && !S.run.active) drawBead(speciesFor('Z4', onWalk[i]), p.x, WALK.y - 22, 14); });
  // arco de suma (real) y punto de combinación (espejo)
  Draw.curve([[ARCH.x - 60, WALK.y], [ARCH.x - 60, ARCH.y - 60], [ARCH.x, ARCH.y - 110], [ARCH.x + 60, ARCH.y - 60], [ARCH.x + 60, WALK.y]], 10, PAL.ink); Draw.curve([[ARCH.x - 60, WALK.y], [ARCH.x - 60, ARCH.y - 60], [ARCH.x, ARCH.y - 110], [ARCH.x + 60, ARCH.y - 60], [ARCH.x + 60, WALK.y]], 5, PAL.mustard);
  Draw.text('+', ARCH.x, ARCH.y - 84, { size: 26, font: FONT.title });
  Draw.ellipse(FUSE_B.x, FUSE_B.y, 36, 36, null, 2.5, 8030, '#5d6080'); Draw.text('⊙', FUSE_B.x, FUSE_B.y - 52, { size: 22, color: '#5d6080' });
  // balanza colgante
  drawScale();
  drawOperario(op, -6);
  // habitantes
  walkers.forEach(c => { c.x = c.hx; c.y = c.hy - (onWalk.indexOf(c.v) !== -1 && !S.run.active ? 10 : 0); drawCritter(c); Kit.drawMark(c); });
  tokens.forEach(t => drawToken(t));
  // pupitre
  Draw.rrect(DESK.x - 20, DESK.y - 20, 220, 140, 8, '#8d5a2f', 3, 8040);
  Kit.plate(DESK.x, DESK.y, 180, 44, 'PASEAR', { fill: '#dfe8c8', focus: S.kbd && S.focusId === 'walk' });
  Kit.plate(DESK.x, DESK.y + 56, 180, 44, 'DESFILE (16)', { focus: S.kbd && S.focusId === 'parade' });
  S.drawParts();
}
function drawMirror(x) {
  const cx = MX(x), top = MIR.top, bot = MIR.bot, fa = flipAnim[x], sc = Math.abs(Math.cos(fa * Math.PI)) * .9 + .1;
  // marco de feria
  Draw.rrect(cx - 78, top - 20, 156, bot - top + 20, 60, '#7c3b73', 3.5, 8100 + x);
  ctx.save(); ctx.translate(cx, (top + bot) / 2); ctx.scale(sc, 1); ctx.translate(-cx, -(top + bot) / 2);
  Draw.rrect(cx - 62, top - 6, 124, bot - top - 8, 52, '#e9ecf8', 2.5, 8110 + x);
  ctx.save(); ctx.globalAlpha = .55; Draw.line(cx - 34, top + 20, cx - 12, top + 80, 5, 8120 + x, '#ffffff'); ctx.restore();
  // el reflejo: f(x); tiembla si el neutro no se refleja en el neutro
  const r = reflect[x]; r.species = speciesFor('MIRROR', P.config.faces[x]);
  const wob = wobble * (Clock.reduced ? .3 : 1);
  r.x = cx + Math.sin(S.T * 7 + x) * 4 * wob; r.y = 330;
  ctx.save(); ctx.translate(r.x, r.y); ctx.scale(1 + Math.sin(S.T * 5 + x * 2) * .14 * wob, 1 - Math.sin(S.T * 5 + x * 2) * .1 * wob); ctx.translate(-r.x, -r.y);
  drawCritter(r); ctx.restore(); Kit.drawMark(r);
  if (cracks[x] > .02) { ctx.save(); ctx.globalAlpha = cracks[x]; Draw.curve([[cx - 50, top + 40], [cx - 10, top + 110], [cx + 20, top + 100], [cx + 50, top + 190]], 2, PAL.ink); Draw.curve([[cx - 10, top + 110], [cx - 30, top + 200]], 2, PAL.ink); ctx.restore(); }
  ctx.restore();
  // pomo para girar el espejo
  Draw.rrect(cx - 24, bot - 38, 48, 30, 6, '#5d6080', 2.5, 8130 + x, S.kbd && S.focusId === 'flip' + x ? PAL.ultra : PAL.ink);
  Draw.curve([[cx - 12, bot - 30], [cx, bot - 18], [cx + 12, bot - 30]], 2.5, PAL.bone); Draw.curve([[cx + 6, bot - 34], [cx + 12, bot - 30], [cx + 8, bot - 23]], 2.5, PAL.bone);
  Draw.text('girar', cx, bot - 50, { size: 13, color: '#5d6080' });
  // neutro detectado
  if (showNeutral && showNeutral.x === x && showNeutral.t < 5) {
    const n = showNeutral, yy = top + 20;
    Draw.rrect(cx - 92, yy - 44, 184, 30 + n.r.length * 22, 6, PAL.bone, 2, 8140);
    n.r.forEach((q, k) => Draw.text(LH(n.y) + ' ⊙ ' + LH(q.z) + ' = ' + LH(q.r) + (q.same ? '  igual' : '  cambia'), cx, yy - 26 + k * 22, { size: 15, color: q.same ? PAL.good : PAL.bad }));
  }
}
function drawScale() {
  const S0 = SCALE, a = beam.v;
  Draw.line(S0.x, 0, S0.x, S0.y, 3, 8200);
  const dx = Math.cos(a) * 92, dy = Math.sin(a) * 92;
  Draw.line(S0.x - dx, S0.y - dy, S0.x + dx, S0.y + dy, 5, 8201); Draw.ellipse(S0.x, S0.y, 8, 8, PAL.mustard, 2.5, 8202);
  [[-1, 'A', panA], [1, 'B', panB]].forEach(([sg, lab, tok]) => {
    const px = S0.x + sg * dx, py = S0.y + sg * dy;
    Draw.line(px, py, px - 22, py + 150, 1.5, 8203 + sg); Draw.line(px, py, px + 22, py + 150, 1.5, 8204 + sg);
    Draw.shape([[px - 34, py + 150], [px + 34, py + 150], [px + 24, py + 162], [px - 24, py + 162]], lab === 'A' ? '#f1c27a' : '#c99ac0', 2.5);
    if (lab === 'A') Draw.shape([[px - 48, py + 146], [px - 32, py + 152], [px - 48, py + 158]], PAL.ochre, 2); else Draw.ellipse(px + 42, py + 152, 7, 7, PAL.plum, 2, 8205);
    if (tok) { tok.x = px; tok.y = py + 150; }
    else if (scaleText && !S.run.active) drawBead(speciesFor('MIRROR', lab === 'A' ? scaleText.A : scaleText.B), px, py + 132, 13);
  });
  if (scaleText) {
    const w = scaleText;
    Draw.text('▲ f(' + LG(w.a) + ' + ' + LG(w.b) + ') = ' + LH(w.A), S0.x, S0.y + 200, { size: 16, color: '#3d4170' });
    Draw.text('● ' + LH(w.fa === undefined ? P.config.faces[w.a] : w.fa) + ' ⊙ ' + LH(w.fb === undefined ? P.config.faces[w.b] : w.fb) + ' = ' + LH(w.B), S0.x, S0.y + 222, { size: 16, color: '#3d4170' });
  }
}
function drawToken(t) {
  if (t.ghost) { ctx.save(); ctx.globalAlpha = .9; drawCritter(t); ctx.restore(); Kit.drawMark(t); return; }
  drawCritter(t); Kit.drawMark(t);
}

/* ---------------- escena ---------------- */
const goals = () => { const d = P.diagnose(), seen = walked || certified; return [
  { text: 'el neutro va al neutro: f(e) = e', ok: d.analysis.identityOk && seen, seen },
  { text: 'las 16 parejas cuadran', ok: certified && d.analysis.hom, seen: certified || !!lastDiag },
  { text: 'ningún reflejo sin visitas', ok: certified && d.analysis.surjective, seen: certified }]; };
const scene = {
  enter() {
    window.__L4 = debug;
    S.encIn('Orden nº 4: la sala de espejos. Ojo: allí el neutro no se llama como aquí.', { leaveAfter: 8 });
    S.later(5.5, () => { S.say('mirror', 'Bienvenido. Mis reflejos tiemblan desde esta mañana. No sé por qué.'); }, 'intro');
    S.later(9.5, () => { S.say('op', 'Les he pasado un trapo. Siguen temblando.'); operarioDo(op, 'shrug', 2); }, 'intro');
  },
  exit() { if (window.__L4 === debug) window.__L4 = null; },
  update(dt) {
    S.update(dt); updateOperario(op, dt); stepSpring(beam, dt, 120, 8);
    const target = P.diagnose().analysis.identityOk ? 0 : 1; wobble += (target - wobble) * Math.min(1, dt * 2);
    flipAnim = flipAnim.map(v => Math.max(0, v - dt * 2.2)); cracks = cracks.map(v => Math.max(0, v - dt * .08));
    if (showNeutral) showNeutral.t += dt;
    walkers.forEach(c => Kit.live(c, dt, S.pointer.inside ? S.pointer : { x: c.x, y: 300 }));
    reflect.forEach(c => Kit.live(c, dt, { x: c.x, y: 600 }));
    tokens.forEach(c => Kit.live(c, dt));
  },
  render() {
    drawRoom();
    Draw.text('THE ALGEBRA ENGINE · MÁQUINA 4', 34, 26, { size: 15, font: FONT.plate, align: 'left', color: '#5d6080', spacing: 2 });
    Draw.text('El espejo de las identidades', 32, 54, { size: 30, font: FONT.title, align: 'left', jitter: 1.2, seed: 37 });
    S.drawHud(goals());
    S.drawFocus(items());
  },
  pointerDown(p) { S.kbd = false; S.cancel('intro'); S.progress(); const it = S.hit(items(), p); if (it) it.act(); },
  pointerMove(p) { S.pointer = { x: p.x, y: p.y, inside: true }; const it = S.hit(items(), p); S.hoverId = it ? it.id : null; App.setCursor(it ? 'pointer' : 'default'); },
  pointerUp() {}, pointerLeave() { S.pointer.inside = false; },
  key(e) {
    if (S.navKey(e, items())) return true;
    const k = e.key.toLowerCase();
    if (/^[0-3]$/.test(k)) { board(+k); return true; }
    if (k === 'r') { walk(); return true; }
    if (k === 'd') { parade(); return true; }
    if (k === 'z' || (e.ctrlKey && k === 'z')) { if (!P.undo().ok) S.say('op', 'Nada que deshacer.'); return true; }
    if (k === 'n') { P.reset(); onWalk = []; return true; }
    return false;
  },
  hint: () => S.giveHint(), busy: () => S.run.active, skip: () => S.run.skip(),
  tableContext: () => ({ groups: [G, HH], highlight: S.slip ? S.slip.highlights() : {}, note: 'En el espejo, la fila del «1» repite la cabecera: es el neutro.' }),
};
const debug = { P, S, board, flip, walk, parade, neutralProbe, items, onWalk: () => onWalk, certified: () => certified, wobble: () => wobble,
  fast() { for (let i = 0; i < 6000 && (S.run.active || S.timers.length); i++) scene.update(1 / 30); }, step(s) { for (let i = 0; i < s * 30; i++) scene.update(1 / 30); } };
scene.debug = () => debug;
return scene;
};
