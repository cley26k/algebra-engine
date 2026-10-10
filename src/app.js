/* THE ALGEBRA ENGINE — campaña: bucle, escenas, mapa de la fábrica, pausa, cuaderno, informes y guardado. */
'use strict';
(function () {
const W = 1600, H = 900;
const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
Draw.ctx = ctx;
const liveEl = document.getElementById('live');
const AG = AlgebraGroups, GS = AG.GROUPS;

/* ================================================================
 * GUARDADO
 * ============================================================== */
const SAVE_KEY = 'algebra-engine-v2';
function freshSave() { return { v: 2, repaired: {}, started: {}, notes: {}, examples: {}, last: 1, intro1: false, finale: false, finaleShown: false, comicSeen: false, comics: {}, briefed: {}, settings: { reduced: null, level: 2, music: 2 } }; }
function loadSave() {
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && s.v === 2) { const f = freshSave(); const out = Object.assign(f, s); out.settings = Object.assign(freshSave().settings, s.settings || {}); out.briefed = out.briefed || {}; return out; } } catch (e) { /* almacenamiento no disponible */ }
  return freshSave();
}
const save = loadSave();
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* sin persistencia: el juego sigue */ } }

const mq = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : null;
const settings = { reduced: save.settings.reduced !== null ? save.settings.reduced : !!(mq && mq.matches) };
Sound.level = save.settings.level;
Music.level = save.settings.music;

/* ================================================================
 * NIVELES, CUADERNO E INFORMES
 * ============================================================== */
const LV = AG.LEVELS;
const unlocked = id => id === 1 || !!save.repaired[id - 1];
const nextAvailable = () => { for (let i = 1; i <= 8; i++) if (!save.repaired[i] && unlocked(i)) return i; return null; };

const NOTE_UNLOCKS = { 1: ['homomorfismo'], 2: ['nucleo', 'monomorfismo'], 3: ['imagen', 'sobreyectividad', 'epimorfismo'], 4: ['identidad'], 6: ['isomorfismo'], 7: ['orden'] };
const ENTRIES = [
  { key: 'homomorfismo', title: 'Homomorfismo', from: 1, mode: 'hom', formula: 'f(a ∗ b) = f(a) ∘ f(b)',
    lines: ['Una traducción entre dos grupos que respeta la operación.', 'Combinar y luego traducir (▲) da lo mismo que', 'traducir y luego combinar (●), para TODOS los pares.'],
    always: true },
  { key: 'nucleo', title: 'Núcleo', from: 2, mode: 'kernel', formula: 'ker f = { g ∈ G : f(g) = e_H }',
    lines: ['Los elementos que caen en el neutro del destino.', 'Siempre contiene al neutro del origen.', 'Si atrapa algo más, la máquina confunde elementos.'] },
  { key: 'monomorfismo', title: 'Monomorfismo', from: 2, mode: 'mono', formula: 'homomorfismo + inyectivo  ⇔  ker f = { e }',
    lines: ['Un homomorfismo que nunca junta a dos en el mismo destino.', 'Para homomorfismos basta mirar el núcleo:', 'si f(a) = f(b), entonces a·b⁻¹ está en el núcleo.'] },
  { key: 'imagen', title: 'Imagen', from: 3, mode: 'image', formula: 'Im f = { f(g) : g ∈ G }',
    lines: ['Los destinos que de verdad reciben visita.', 'No es lo mismo que el conjunto de llegada.', 'La imagen de un homomorfismo siempre es un subgrupo.'] },
  { key: 'sobreyectividad', title: 'Sobreyectividad', from: 3, mode: 'surj', formula: 'Im f = conjunto de llegada',
    lines: ['Ningún destino se queda sin visitas.', 'Es una propiedad de la función, se compruebe o no', 'que conserve la operación (eso va aparte).'] },
  { key: 'epimorfismo', title: 'Epimorfismo', from: 3, mode: 'epi', formula: 'en grupos: epimorfismo ⇔ homomorfismo sobreyectivo',
    lines: ['Un homomorfismo que llega a todo el destino.', 'Si recortas el destino para lograrlo, lo que queda', 'tiene que seguir siendo un grupo.'] },
  { key: 'isomorfismo', title: 'Isomorfismo', from: 6, mode: 'iso', formula: 'homomorfismo + inyectivo + sobreyectivo',
    lines: ['Se puede ir y volver sin perder a nadie.', 'La vuelta también conserva la operación.', 'Tener el mismo tamaño no basta.'] },
  { key: 'orden', title: 'Orden de un elemento', from: 7, mode: 'order', formula: 'ord(x) = menor n ≥ 1 con xⁿ = e',
    lines: ['Cuántas vueltas da x hasta volver al neutro.', 'Un isomorfismo conserva los órdenes.', 'Por eso Z4 y V4 no son gemelos de verdad.'] },
];
const REPORTS = {
  1: { mode: 'hom', ex: 'homomorfismo', lines: [
    'Para los 16 pares, sumar y luego traducir dio lo mismo que traducir y luego sumar.',
    'Eso es un homomorfismo: f(a + b) = f(a) + f(b).',
    'El cuatro no desapareció: la máquina agrupa por paridad. Pares al 0, impares al 1.',
    'Pero 0 y 2 llegan al mismo nido: conserva la operación, no la identidad de cada uno.'] },
  2: { mode: 'kernel', ex: 'nucleo', lines: [
    'Con la máquina ×2 la garra atrapó al 0 y al 2: los dos caían en el neutro.',
    'Con la tuya sólo atrapa al 0. Núcleo = {0}: nadie más cae en el neutro.',
    'Para homomorfismos, núcleo trivial ⇔ inyectiva: si f(a) = f(b), a − b cae en el núcleo.',
    'Un homomorfismo inyectivo se llama monomorfismo.'] },
  3: { mode: 'epi', ex: 'epimorfismo', lines: [
    'La inclusión {0, 2} → Z4 conserva la suma y no confunde a nadie, pero 1 y 3 no recibían visitas.',
    'Imagen = {0, 2}. El conjunto de llegada era más grande que la imagen.',
    'Al triturar 1 y 3 quedó {0, 2}, que es un subgrupo: ahora la función es sobreyectiva.',
    'Homomorfismo sobreyectivo = epimorfismo. Triturar sólo vale si lo que queda es un grupo.'] },
  4: { mode: 'hom', ex: 'identidad', lines: [
    'En el espejo el neutro es el 1, porque 1 ⊙ x = x para todo x.',
    'Todo homomorfismo manda el neutro al neutro: f(e) = f(e ∗ e) = f(e) ∘ f(e) obliga a f(e) = e.',
    'Por eso unir 0 con 0 "porque se parecen" fallaba en el par 0 + 0.',
    'El neutro se reconoce por cómo opera, no por cómo se llama.'] },
  5: { mode: 'copies', lines: [
    'A conserva la suma pero junta al 0 y al 2: no es inyectiva.',
    'B conserva la suma pero nadie visita al 1 ni al 3: no es sobreyectiva.',
    'C es biyectiva y aun así no conserva la suma: f(1 + 1) = 3 pero f(1) + f(1) = 2.',
    'D lo cumple todo: sale de fábrica. Cada propiedad se comprueba por separado: los choques y los vacíos son averías distintas.'] },
  6: { mode: 'iso', ex: 'isomorfismo', lines: [
    'Tu máquina lleva la suma de Z4 al producto de U(5) y conserva la operación.',
    'Es inyectiva y sobreyectiva, y el camino de vuelta también conserva: isomorfismo.',
    'Nombres distintos, operaciones distintas, misma estructura.',
    'La máquina inicial (1, 4, 1, 4) conservaba la operación pero no podía volver.'] },
  7: { mode: 'order', ex: 'orden', lines: [
    'En Z4 el 1 necesita cuatro pasos para volver al 0: tiene orden 4.',
    'En V4 todos vuelven a e en dos pasos como mucho.',
    'Un isomorfismo conserva órdenes: f(1) tendría que tener orden 4, y no hay ninguno.',
    'Mismo tamaño, estructuras distintas: Z4 y V4 no son isomorfos.'] },
  8: { mode: 'iso', ex: 'corazon', lines: [
    'Tu máquina x → 2x lleva Z4 a Z8 conservando la suma, con núcleo {0}: monomorfismo.',
    'Tras triturar los impares, el destino {0, 2, 4, 6} es un subgrupo igual a la imagen: epimorfismo.',
    'Las dos cosas a la vez: isomorfismo entre Z4 y {0, 2, 4, 6}, reversible en los dos sentidos.',
    'Construir, comprobar, inspeccionar, recortar y volver: la fábrica entera en una máquina.'] },
};
const DEFAULT_EX = {
  homomorfismo: null, identidad: { G: 'Z4', H: 'MIRROR', f: [1, 0, 1, 0] },
  nucleo: { G: 'Z4', H: 'Z4', f: [0, 2, 0, 2] }, monomorfismo: { G: 'Z4', H: 'Z4', f: [0, 1, 2, 3] },
  imagen: { G: 'SUB2', H: 'Z4', f: [0, 2] }, sobreyectividad: { G: 'SUB2', H: 'Z4', f: [0, 2] }, epimorfismo: { G: 'SUB2', H: 'Z4', f: [0, 2], codomain: [0, 2], shredded: [1, 3] },
  isomorfismo: { G: 'Z4', H: 'U5', f: [0, 1, 3, 2] }, orden: { groups: ['Z4', 'V4'] }, corazon: { G: 'Z4', H: 'Z8', f: [0, 2, 4, 6], codomain: [0, 2, 4, 6], shredded: [1, 3, 5, 7] },
};
const exampleFor = k => save.examples[k] || DEFAULT_EX[k];

/* ================================================================
 * API PARA LAS ESCENAS
 * ============================================================== */
const App = {
  W, H, settings, save, GS,
  announce(msg) { liveEl.textContent = ''; setTimeout(() => { liveEl.textContent = msg; }, 30); },
  setCursor(c) { canvas.style.cursor = c; },
  levelStarted(id) { if (!save.started[id]) { save.started[id] = true; save.last = id; persist(); } },
  markIntro() { save.intro1 = true; persist(); },
  persist,
  levelComplete(id, examples) {
    const first = !save.repaired[id];
    save.repaired[id] = true; save.last = Math.min(8, id + 1);
    (NOTE_UNLOCKS[id] || []).forEach(k => { save.notes[k] = true; });
    if (examples) Object.assign(save.examples, examples);
    if (id === 8) save.finale = true;
    persist();
    if (first) { const n = NOTE_UNLOCKS[id]; if (n && n.length) later(1.2, () => { notebookPulse = 3; }); }
    return first;
  },
  showReport(id) { openOverlay('report', { id }); },
  openNotebook(key) { openOverlay('notebook', { key }); },
  goto,
  exampleFor, ENTRIES, REPORTS,
  view: { w: 1760, h: 990, ox: 80, oy: 45 },
  newGame() {
    const keep = save.settings, f = freshSave();
    Object.keys(save).forEach(k => delete save[k]); Object.assign(save, f); save.settings = keep; persist();
    App.playComic('intro');
  },
  openBrief(id) { openOverlay('brief', { id }); },
  comicId: 'intro',
  /** Cómic de introducción ('intro') o de una máquina (1–8); al terminar, el cómic de máquina entra en ella. */
  playComic(id) { App.comicId = id; goto('comic'); },
};
window.App = App;

/* ================================================================
 * ESCENAS Y TRANSICIONES
 * ============================================================== */
let scene = null, sceneId = null, trans = null, overlay = null, notebookPulse = 0;
const timers = [];
function later(t, fn) { timers.push({ t, fn }); }
function makeScene(id) {
  if (id === 'map') return MapScene();
  if (id === 'title') return window.TitleScene(App);
  if (id === 'comic') return window.ComicScene(App);
  if (id === 1) return window.Level1Scene(App);
  const NEW = { 2: 'ClawScene', 3: 'PlantScene', 4: 'MirrorScene', 5: 'LineScene', 6: 'TowerScene', 7: 'LabScene', 8: 'HeartScene' };
  return window[NEW[id]](App);
}
function sceneEntered(id) {
  const mood = scene.music || (id === 'map' ? (save.finale ? 'finale' : 'map') : 'level');
  Music.setMood(mood, typeof id === 'number' ? [0, 0, 2, -3, 5, 3, -2, 7, 4][id] : 0);
  if (typeof id === 'number' && !save.briefed[id] && BRIEFS[id]) openOverlay('brief', { id, auto: true });
}
function goto(id, origin) {
  if (trans) return;
  const o = origin || { x: W / 2, y: H / 2 }; closeOverlay();
  if (!scene) { scene = makeScene(id); sceneId = id; scene.enter && scene.enter(); sceneEntered(id); return; }
  trans = { to: id, t: 0, phase: 'out', o, dur: settings.reduced ? .18 : .45 };
  Sound.whoosh();
}
function updateTransition(dt) {
  if (!trans) return;
  trans.t += dt;
  if (trans.phase === 'out' && trans.t >= trans.dur) {
    scene.exit && scene.exit();
    scene = makeScene(trans.to); sceneId = trans.to; scene.enter && scene.enter(); tableP.target = 0; tableP.sel = null; sceneEntered(sceneId);
    if (typeof sceneId === 'number') { save.last = sceneId; persist(); }
    trans.phase = 'in'; trans.t = 0; trans.o = { x: W / 2, y: H / 2 };
  } else if (trans.phase === 'in' && trans.t >= trans.dur) trans = null;
}

/* ================================================================
 * EL MAPA DE LA FÁBRICA
 * ============================================================== */
function MapScene() {
  const ST = [
    { id: 1, x: 250, y: 295 }, { id: 2, x: 580, y: 265 }, { id: 3, x: 910, y: 295 }, { id: 4, x: 1250, y: 265 },
    { id: 5, x: 1270, y: 700 }, { id: 6, x: 930, y: 730 }, { id: 7, x: 590, y: 700 }, { id: 8, x: 250, y: 730 },
  ];
  const tw = new Tweens();
  const enc = makeEncargado(110, 630);
  let sel = null, card = 0, focus = null, hover = null, t = 0;
  const wig = {}; ST.forEach(s => { wig[s.id] = Spring(0); });
  const bubbles = [], parts = [];
  let finaleT = -1;
  /* ---- la vía: Catmull-Rom por debajo de las estaciones ---- */
  const CTRL = [[-200, 380, 0], [60, 370, 0]].concat(ST.slice(0, 4).map(s => [s.x, s.y + 70, s.id]), [[1480, 420, 0], [1520, 560, 0], [1450, 730, 0]], ST.slice(4).map(s => [s.x, s.y + 70, s.id]), [[60, 805, 0], [-200, 815, 0]]);
  const TRACK = [], STU = {};
  (function () {
    let from = 0;
    for (let j = 0; j < CTRL.length - 1; j++) {
      const p0 = CTRL[Math.max(0, j - 1)], p1 = CTRL[j], p2 = CTRL[j + 1], p3 = CTRL[Math.min(CTRL.length - 1, j + 2)];
      if (p1[2]) { from = p1[2]; STU[from] = TRACK.length; }
      const n = Math.max(6, Math.round(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 9));
      for (let i = 0; i < n; i++) {
        const u = i / n, u2 = u * u, u3 = u2 * u;
        const f = (a, b, c, d) => .5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (-a + 3 * b - 3 * c + d) * u3);
        TRACK.push({ x: f(p0[0], p1[0], p2[0], p3[0]), y: f(p0[1], p1[1], p2[1], p3[1]), from });
      }
    }
    TRACK.push({ x: CTRL[CTRL.length - 1][0], y: CTRL[CTRL.length - 1][1], from });
    TRACK.forEach((q, i) => { const a = TRACK[Math.max(0, i - 1)], b = TRACK[Math.min(TRACK.length - 1, i + 1)], l = Math.hypot(b.x - a.x, b.y - a.y) || 1; q.tx = (b.x - a.x) / l; q.ty = (b.y - a.y) / l; });
  })();
  const cart = { u: STU[1] - 30, v: 0 };
  function segState(from) { return from === 0 ? 'ok' : save.repaired[from] ? 'ok' : unlocked(from) ? 'rust' : 'broken'; }
  function drawTrack() {
    const N = TRACK.length;
    const pass = (w, col, filter, off) => { ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = col; ctx.lineWidth = w; let on = false; ctx.beginPath();
      for (let i = 0; i < N; i++) { const q = TRACK[i], ok = filter(q, i); const x = q.x - q.ty * (off || 0), y = q.y + q.tx * (off || 0);
        if (ok && !on) { ctx.moveTo(x, y); on = true; } else if (ok) ctx.lineTo(x, y); else on = false; }
      ctx.stroke(); };
    pass(40, 'rgba(33,28,51,.10)', () => true, 0);
    pass(30, '#b8ab92', () => true, 0);
    // traviesas
    for (let i = 0; i < N; i += 2) { const q = TRACK[i], st = segState(q.from); if (st === 'broken' && (i * 7) % 5 === 0) continue;
      const tilt = st === 'broken' ? Math.sin(i * 1.7) * .35 : 0, nx = -q.ty, ny = q.tx, ca = Math.cos(tilt), sa = Math.sin(tilt), dx = nx * ca - ny * sa, dy = nx * sa + ny * ca;
      Draw.line(q.x - dx * 15, q.y - dy * 15, q.x + dx * 15, q.y + dy * 15, 5, 2450 + i, st === 'ok' ? '#6b4a2e' : '#7a6750'); }
    const gap = (q, i) => segState(q.from) !== 'broken' || (Math.floor(i / 5) % 3 !== 1);
    [-8, 8].forEach(o => {
      pass(5, '#3a3036', gap, o);
      pass(3, '#9a5a32', (q, i) => segState(q.from) !== 'ok' && gap(q, i), o);
      pass(2.5, '#8c93a3', q => segState(q.from) === 'ok', o);
      pass(1, '#eef1f6', q => segState(q.from) === 'ok', o - 1);
    });
    // brillo que recorre los tramos reparados
    if (!settings.reduced) { const k = Math.floor((t * 60) % N); for (let d = 0; d < 6; d++) { const q = TRACK[(k + d) % N]; if (segState(q.from) === 'ok' && q.from) { ctx.save(); ctx.globalAlpha = .5 - d * .08; Draw.ellipse(q.x - q.ty * 8, q.y + q.tx * 8, 3, 3, '#ffffff', 0, 2470); ctx.restore(); } } }
  }
  function drawCart() {
    if (Math.abs(cart.v) > 5 && !settings.reduced) { const q0 = TRACK[U.clamp(Math.round(cart.u), 0, TRACK.length - 1)]; Deco.smoke(q0.x, q0.y - 40, t, { n: 5, h: 60, r: 6, a: .35, rate: .8, wind: -Math.sign(cart.v) * .6 }); }
    const i = U.clamp(Math.round(cart.u), 0, TRACK.length - 1), q = TRACK[i], a = Math.atan2(q.ty, q.tx), flip = q.tx < 0;
    ctx.save(); ctx.translate(q.x, q.y - 6); ctx.rotate(flip ? a + Math.PI : a);
    const bob = Math.abs(cart.v) > 5 ? Math.sin(t * 18) * 1.5 : 0;
    Draw.ellipse(-16, 8, 7, 7, '#4a4050', 2, 2480); Draw.ellipse(16, 8, 7, 7, '#4a4050', 2, 2481);
    Draw.rrect(-26, -12 + bob, 52, 20, 4, PAL.mustard, 2.5, 2482);
    Draw.line(0, -12 + bob, 0, -34 + bob, 3, 2483); const pump = Math.sin(t * (Math.abs(cart.v) > 5 ? 9 : 1)) * .4;
    Draw.line(-16 * Math.cos(pump), -34 + bob - 16 * Math.sin(pump), 16 * Math.cos(pump), -34 + bob + 16 * Math.sin(pump), 3, 2484);
    [[-14, PAL.c1], [13, PAL.c3]].forEach(([dx, col], k) => { const hy = -20 + bob + Math.sin(t * 6 + k) * 1.5; Draw.ellipse(dx, hy, 9, 9, col, 2, 2485 + k); Draw.ellipse(dx - 3, hy - 2, 2, 2.4, PAL.ink, 0, 2487); Draw.ellipse(dx + 3, hy - 2, 2, 2.4, PAL.ink, 0, 2488); });
    ctx.restore();
  }
  function cartTarget() { const id = sel || nextAvailable() || 8; return STU[id] !== undefined ? STU[id] - 2 : 0; }
  function state(id) { return save.repaired[id] ? 'reparada' : !unlocked(id) ? 'averiada' : save.started[id] ? 'en reparación' : 'disponible'; }
  function say(text, dur) { bubbles.length = 0; bubbles.push({ text, t: 0, dur: dur || Math.max(2.4, text.length * .06) }); App.announce(text); enc.talk = Math.min(2.5, text.length * .05); }
  function select(id) {
    const s = ST.find(q => q.id === id); sel = id; card = 0; tw.add({ get v() { return card; }, set v(x) { card = x; } }, { v: 1 }, settings.reduced ? .1 : .35, { ease: Ease.back });
    wig[id].vel += 14; Sound.clunk();
    enc.tx = U.clamp(s.x + 140, 70, W - 70);
    const st = state(id);
    if (st === 'averiada') say('Esa sigue averiada. Primero la nº ' + (id - 1) + '.');
    else if (st === 'reparada') say(U.pick(['Reparada. Puede volver a probarla.', 'Funciona. Formulario archivado.']));
    else say(U.pick(['Orden nº ' + id + '. Rellene lo que haga falta.', 'Esta máquina hace cosas raras. Arréglela.']));
    App.announce('Máquina ' + id + ': ' + LV[id].name + '. Estado: ' + st + '.');
  }
  function enterLevel(id) { if (!(save.comics && save.comics[id]) && window.LEVEL_COMICS && window.LEVEL_COMICS[id]) App.playComic(id); else goto(id, ST.find(q => q.id === id)); }
  function cardRect() { const s = ST.find(q => q.id === sel); const w = 360, h = 230; return { x: U.clamp(s.x - w / 2, 20, W - w - 20), y: s.y < 450 ? s.y + 92 : s.y - 92 - h, w, h }; }
  function cardButtons() {
    if (!sel) return [];
    const r = cardRect(), st = state(sel), out = [];
    if (st !== 'averiada') out.push({ id: 'enter', label: st === 'reparada' ? 'VOLVER A PROBAR' : 'ENTRAR', x: r.x + 18, y: r.y + r.h - 50, w: 170, h: 36, act: () => enterLevel(sel) });
    if (st === 'reparada') out.push({ id: 'report', label: '¿QUÉ PASÓ?', x: r.x + 200, y: r.y + r.h - 50, w: 140, h: 36, act: () => App.showReport(sel) });
    else if (st !== 'averiada' && save.comics && save.comics[sel]) out.push({ id: 'comicbtn', label: 'VER CÓMIC', x: r.x + 200, y: r.y + r.h - 50, w: 140, h: 36, act: () => App.playComic(sel) });
    return out;
  }
  function items() {
    const list = [];
    cardButtons().forEach(b => list.push(Object.assign({ kind: 'btn' }, b)));
    ST.forEach(s => list.push({ id: 'st' + s.id, kind: 'station', x: s.x - 90, y: s.y - 90, w: 180, h: 160, label: 'Máquina ' + s.id + ': ' + LV[s.id].name + ' (' + state(s.id) + ')', act: () => select(s.id) }));
    const nx = nextAvailable();
    if (nx) list.push({ id: 'continue', kind: 'btn', x: 690, y: 38, w: 220, h: 54, label: 'Continuar: máquina ' + nx, act: () => { select(nx); } });
    return list;
  }
  function hitAt(p) { const its = items(); return its.find(o => o.kind === 'btn' && inside(p, o)) || its.find(o => inside(p, o)) || null; }
  function drawStationArt(id, x, y, rep, k) {
    const sp = t * (rep ? 1 : .1);
    if (id === 1) { Draw.rrect(x - 50, y - 50, 100, 90, 12, PAL.mustard, 3, 2001 + k); Draw.rrect(x - 36, y - 32, 72, 40, 5, '#3a3150', 2.5, 2002); [0, 1, 2].forEach(i => Draw.curve([[x - 30, y - 24 + i * 12], [x, y - 14 + i * 6], [x + 30, y - 24 + (2 - i) * 12]], 2.5, SRC_COL[i])); Draw.rrect(x - 18, y - 74, 36, 26, 6, PAL.mustard, 3, 2003); }
    if (id === 2) { Draw.rrect(x - 50, y - 30, 100, 70, 12, PAL.mustard, 3, 2011); Draw.line(x - 60, y - 70, x + 60, y - 70, 6, 2012, '#6f6a55'); const cx = x + Math.sin(sp * 1.5) * 40; Draw.line(cx, y - 70, cx, y - 46, 2, 2013); Draw.curve([[cx - 10, y - 30], [cx - 10, y - 44], [cx + 10, y - 44], [cx + 10, y - 30]], 3.5, PAL.ink); Draw.ellipse(cx, y - 50, 6, 6, '#ff6b4a', 2, 2014); }
    if (id === 3) { Draw.shape([[x - 60, y - 56], [x + 60, y - 56], [x + 40, y - 20], [x - 40, y - 20]], '#7c8a4a', 3); Draw.rrect(x - 48, y - 22, 96, 66, 10, '#596a33', 3, 2021); for (let i = 0; i < 6; i++) Draw.shape([[x - 30 + i * 10, y + 18], [x - 22 + i * 10, y + 18], [x - 26 + i * 10, y + 26]], PAL.bone, 1); Draw.line(x - 26, y - 4, x - 6, y + 2, 3, 2022); Draw.line(x + 26, y - 4, x + 6, y + 2, 3, 2023); }
    if (id === 4) { Draw.line(x, y + 40, x, y + 6, 5, 2031); Draw.ellipse(x, y - 24, 34, 46, '#5d6080', 3, 2032); Draw.ellipse(x, y - 24, 26, 38, '#dfe3f3', 2.5, 2033); Draw.line(x - 12, y - 44, x - 2, y - 20, 3, 2034, '#ffffff'); }
    if (id === 5) { [-46, 0, 46].forEach((dx, i) => { Draw.rrect(x + dx - 20, y - 20, 40, 50, 6, [PAL.mustard, '#cfa148', '#b98c34'][i], 3, 2041 + i); Draw.rrect(x + dx - 13, y - 40 - (rep ? Math.abs(Math.sin(sp * 2 + i)) * 6 : 0), 26, 22, 2, PAL.bone, 2, 2044 + i); }); }
    if (id === 6) { const r = 26; [x - 38, x + 38].forEach((cx, i) => { Draw.ellipse(cx, y - 6, r, r, i ? PAL.ultraPale : '#f1c27a', 3, 2051 + i); for (let q = 0; q < 3; q++) { const a = sp * (i ? -2 : 2) + q * 2.09; Draw.line(cx, y - 6, cx + Math.cos(a) * 20, y - 6 + Math.sin(a) * 20, 2, 2053 + q); } }); Draw.line(x - 38, y - 32, x + 38, y - 32, 4, 2056); Draw.line(x - 38, y + 20, x + 38, y + 20, 4, 2057); }
    if (id === 7) { Draw.ellipse(x - 44, y + 6, 30, 18, PAL.island, 2.5, 2061); Draw.ellipse(x + 44, y + 6, 30, 18, PAL.isle2, 2.5, 2062); const pts = []; for (let q = 0; q <= 20; q++) { const a = q / 20 * Math.PI * 2; pts.push([x + Math.cos(a) * 22, y - 34 + Math.sin(a) * 18]); } Draw.curve(pts, 3, PAL.ink); const a = sp * 2; Draw.ellipse(x + Math.cos(a) * 22, y - 34 + Math.sin(a) * 18, 6, 6, PAL.c1, 2, 2063); }
    if (id === 8) { const beat = rep ? 1 + Math.sin(sp * 5) * .05 : 1; Draw.ctx.save(); Draw.ctx.translate(x, y - 8); Draw.ctx.scale(beat * 1.25, beat * 1.25); Draw.shape([[0, 36], [-44, -2], [-40, -30], [-18, -38], [0, -22], [18, -38], [40, -30], [44, -2]], '#c9412f', 3); Draw.rrect(-18, -14, 36, 22, 4, '#3a3150', 2, 2071); Draw.ctx.restore(); }
  }
  function drawStation(s, k) {
    const st = state(s.id), rep = st === 'reparada', w = wig[s.id].v, locked = st === 'averiada';
    Draw.rrect(s.x - 84, s.y + 38, 168, 22, 4, locked ? '#b9b1a4' : '#cfc3ae', 2.5, 2100 + k);
    Draw.line(s.x - 78, s.y + 47, s.x + 78, s.y + 47, 1.2, 2101 + k, 'rgba(33,28,51,.3)');
    Draw.ctx.save(); Draw.ctx.translate(s.x, s.y + 40); Draw.ctx.rotate(w * .02 + (locked ? -.05 : 0)); Draw.ctx.translate(-s.x, -s.y - 40);
    if (locked) Draw.ctx.globalAlpha = .55;
    drawStationArt(s.id, s.x, s.y, rep, k);
    Draw.ctx.globalAlpha = 1;
    if (st === 'en reparación') { [-56, 56].forEach((dx, i) => { Draw.line(s.x + dx, s.y + 44, s.x + dx, s.y - 64, 3, 2110 + i); }); Draw.line(s.x - 56, s.y - 30, s.x + 56, s.y - 30, 3, 2112); Draw.line(s.x - 56, s.y + 10, s.x + 56, s.y + 10, 3, 2113); }
    Draw.ctx.restore();
    // humo de avería
    if (!rep && Math.random() < .05 && !settings.reduced) parts.push({ x: s.x + U.rand(-30, 30), y: s.y - 60, vy: -40, r: U.rand(6, 12), t: 0, life: 1.6, col: locked ? 'rgba(80,70,90,.4)' : 'rgba(120,110,120,.3)' });
    if (locked) { Draw.line(s.x - 70, s.y - 50, s.x + 70, s.y + 30, 4, 2120, '#6f6a55'); Draw.line(s.x - 70, s.y + 30, s.x + 70, s.y - 50, 4, 2121, '#6f6a55'); Draw.rrect(s.x - 14, s.y - 18, 28, 24, 4, PAL.mustardDeep, 3, 2122); Draw.curve([[s.x - 9, s.y - 18], [s.x - 9, s.y - 32], [s.x + 9, s.y - 32], [s.x + 9, s.y - 18]], 3.5, PAL.ink); }
    if (rep) { Draw.line(s.x + 62, s.y + 44, s.x + 62, s.y - 70, 3, 2130); Draw.shape([[s.x + 62, s.y - 70], [s.x + 92, s.y - 60 + Math.sin(t * 4) * 3], [s.x + 62, s.y - 50]], PAL.good, 2.5); }
    if (st === 'disponible') { const b = Math.sin(t * 4) * 6; Draw.shape([[s.x - 10, s.y - 104 + b], [s.x + 10, s.y - 104 + b], [s.x, s.y - 88 + b]], PAL.bad, 2.5); }
    // poste con medallón numerado + símbolo de estado (forma, no sólo color)
    const mx = s.x - 100, my = s.y - 40;
    Draw.line(mx, my + 20, mx, s.y + 58, 4, 2140 + k, '#5e3a1c');
    Draw.ellipse(mx, my, 24, 24, rep ? '#dfe8c8' : locked ? '#c9c2b6' : st === 'disponible' ? '#ffe7a3' : PAL.bone, 3, 2141 + k);
    Draw.ellipse(mx, my, 18, 18, null, 1.2, 2142 + k, 'rgba(33,28,51,.4)');
    Draw.text(String(s.id), mx, my + 1, { size: 24, font: FONT.title, color: locked ? PAL.inkSoft : PAL.ink });
    drawStateIcon(mx + 20, my + 18, st, 2143 + k);
    // cartel de la estación, debajo de la vía
    const ly = s.y + 112; ctx.font = '19px ' + FONT.hand; const lw = ctx.measureText(LV[s.id].name).width + 26;
    Draw.rrect(s.x - lw / 2, ly - 15, lw, rep ? 50 : 30, 5, locked ? '#d8d2c8' : PAL.bone, 2, 2144 + k);
    Draw.text(LV[s.id].name, s.x, ly, { size: 19, color: locked ? PAL.inkSoft : PAL.ink });
    if (rep) Draw.text(LV[s.id].concept, s.x, ly + 22, { size: 15, color: PAL.olive });
    if ((focus === 'st' + s.id) || sel === s.id) { Draw.ctx.save(); Draw.ctx.setLineDash([8, 6]); Draw.ctx.lineDashOffset = -t * 30; Draw.rrect(s.x - 130, s.y - 100, 236, 236, 14, null, 3, 2150, PAL.ultra); Draw.ctx.restore(); }
  }
  function drawCard() {
    if (!sel || card < .02) return;
    const r = cardRect(), st = state(sel);
    Draw.ctx.save(); Draw.ctx.translate(r.x + r.w / 2, r.y + r.h / 2); Draw.ctx.scale(card, card); Draw.ctx.rotate((1 - card) * .3 - .01); Draw.ctx.translate(-r.x - r.w / 2, -r.y - r.h / 2);
    Draw.rrect(r.x, r.y, r.w, r.h, 4, PAL.bone, 2.5, 2200); Draw.ellipse(r.x + r.w / 2, r.y + 6, 8, 8, PAL.bad, 2, 2201);
    Draw.text('ORDEN DE TRABAJO Nº ' + sel, r.x + 18, r.y + 30, { size: 15, font: FONT.plate, align: 'left' });
    Draw.text(LV[sel].name, r.x + 18, r.y + 58, { size: 22, align: 'left' });
    const txt = st === 'averiada' ? 'Bloqueada: antes hay que reparar la máquina ' + (sel - 1) + '.' : (LV[sel].order || 'Que las dos rutas lleguen siempre al mismo sitio.');
    wrap(txt, r.w - 36, 18).forEach((l, i) => Draw.text(l, r.x + 18, r.y + 90 + i * 22, { size: 18, align: 'left', color: PAL.inkSoft }));
    cardButtons().forEach(b => { Draw.rrect(b.x, b.y, b.w, b.h, 5, b.id === 'enter' ? '#f6dfb8' : PAL.bone, 2.5, 2210 + b.x, focus === b.id || hover === b.id ? PAL.ultra : PAL.ink); Draw.text(b.label, b.x + b.w / 2, b.y + b.h / 2 + 1, { size: 13, font: FONT.plate, spacing: 1 }); });
    Draw.ctx.restore();
  }
  function startFinale() {
    finaleT = 0; save.finaleShown = true; persist(); Sound.signature();
    enc.tx = 800; say('Fábrica reparada. Formulario final… ¡APROBADO!', 5);
    for (let i = 0; i < 4; i++) later(i * .6, () => { for (let k = 0; k < 30; k++) parts.push({ x: U.rand(100, 1500), y: -10, vx: U.rand(-60, 60), vy: U.rand(60, 160), r: U.rand(4, 8), t: 0, life: 4, col: U.pick([PAL.mustard, PAL.ultra, PAL.c1, PAL.plum, PAL.bone]), paper: true }); });
    later(1.4, () => { enc.stamp = 1; Sound.clunk(); });
  }
  return {
    bg: PAL.paper,
    enter() { const nx = nextAvailable(); later(.5, () => { if (save.finale && !save.finaleShown) startFinale(); else if (nx) { say(nx === 1 && !save.started[1] ? 'Técnico nuevo, ¿eh? Empiece por la traductora.' : 'Siguiente avería: la nº ' + nx + '.'); enc.tx = U.clamp(ST.find(s => s.id === nx).x + 140, 70, W - 70); } }); },
    update(dt) {
      t += dt; tw.update(dt); updateEncargado(enc, dt); ST.forEach(s => stepSpring(wig[s.id], dt, 200, 8));
      for (let i = parts.length - 1; i >= 0; i--) { const q = parts[i]; q.t += dt; q.y += q.vy * dt; q.x += (q.vx || 0) * dt; if (q.t > q.life) parts.splice(i, 1); }
      for (let i = bubbles.length - 1; i >= 0; i--) { bubbles[i].t += dt; if (bubbles[i].t > bubbles[i].dur) bubbles.splice(i, 1); }
      if (finaleT >= 0) finaleT += dt;
      const tg = cartTarget(), d = tg - cart.u;
      if (settings.reduced) { cart.u = tg; cart.v = 0; }
      else { cart.v = U.clamp(d * 2.2, -140, 140); if (Math.abs(d) < .5) cart.v = 0; cart.u += cart.v * dt; }
    },
    render() {
      // plano de la planta (ocupa toda la ventana)
      const V = App.view, X0 = -V.ox, Y0 = -V.oy;
      ctx.save(); ctx.globalAlpha = .12;
      for (let x = Math.floor(X0 / 40) * 40; x < X0 + V.w; x += 40) Draw.line(x, Y0, x, Y0 + V.h, 1, 2300 + x, PAL.ultra);
      for (let y = Math.floor(Y0 / 40) * 40; y < Y0 + V.h; y += 40) Draw.line(X0, y, X0 + V.w, y, 1, 2400 + y, PAL.ultra);
      ctx.restore();
      Draw.text('THE ALGEBRA ENGINE', 34, 26, { size: 15, font: FONT.plate, align: 'left', color: PAL.inkSoft, spacing: 2 });
      Draw.text('La fábrica de estructuras', 32, 56, { size: 32, font: FONT.title, align: 'left', jitter: 1.2, seed: 41 });
      Draw.text('Turno de noche · técnico de mantenimiento algebraico', 34, 90, { size: 19, align: 'left', color: PAL.inkSoft });
      // leyenda
      Draw.rrect(1130, 16, 452, 84, 6, PAL.bone, 2, 2290);
      Draw.text('LEYENDA', 1146, 32, { size: 11, font: FONT.plate, align: 'left', color: PAL.inkSoft, spacing: 1.5 });
      [['disponible', 'por reparar'], ['en reparación', 'empezada'], ['reparada', 'reparada'], ['averiada', 'bloqueada']].forEach(([st, lb], k) => { const lx = 1160 + k * 108; drawStateIcon(lx, 66, st, 2291 + k); Draw.text(lb, lx + 16, 67, { size: 16, align: 'left' }); });
      // detalles del plano: manchas, nota, rosa de los vientos, arbustos, sombras de nubes
      Deco.coffee(1185, 600, 44); Deco.coffee(250, 650, 28);
      Deco.compass(1500, 838, 36);
      ctx.save(); ctx.translate(40, 520); ctx.rotate(-.05); Draw.rrect(0, 0, 150, 92, 2, '#f6e27a', 2, 2295); ctx.fillStyle = 'rgba(240,230,200,.75)'; ctx.fillRect(55, -6, 40, 13);
      Draw.text('Turno de noche:', 75, 24, { size: 16 }); Draw.text(Object.keys(save.repaired).length + ' de 8 reparadas', 75, 48, { size: 16, color: PAL.plum }); Draw.text('¡ánimo!', 75, 72, { size: 16 }); ctx.restore();
      [[410, 330], [745, 300], [1080, 330], [420, 872], [760, 872], [1105, 872], [1440, 880]].forEach((b, k) => Deco.bush(b[0], b[1], .7 + (k % 3) * .12, 2560 + k * 7));
      Deco.birds(-App.view.ox, 1600 + App.view.ox, t, 200);
      for (let k = 0; k < 3; k++) { const cx = ((t * 14 + k * 700) % 2400) - 400; for (let j = 0; j < 3; j++) Deco.puff(cx + (j - 1) * 110, 300 + k * 230 + (j % 2) * 20, 110, .05, '33,28,51'); }
      drawTrack();
      ST.forEach((s, k) => drawStation(s, k));
      drawCart();
      if (save.finale) { // banderines de la fábrica restaurada
        const pts = []; for (let x = 60; x <= 1540; x += 70) pts.push([x, 150 + Math.sin(x * .02) * 10]);
        Draw.curve(pts, 2, PAL.ink);
        pts.forEach((p, i) => { if (i < pts.length - 1) Draw.shape([[p[0] + 10, p[1]], [p[0] + 50, p[1] + 2], [p[0] + 30, p[1] + 28 + Math.sin(t * 3 + i) * 3]], [PAL.mustard, PAL.ultra, PAL.c1, PAL.plum][i % 4], 1.5); });
      }
      // cartel de continuar
      const nx = nextAvailable();
      if (nx) { const b = items().find(o => o.id === 'continue'); Draw.ctx.save(); Draw.ctx.translate(800, 66); Draw.ctx.rotate(Math.sin(t * 2) * .02); Draw.shape([[-110, -26], [92, -26], [118, 0], [92, 26], [-110, 26]], '#c99a5e', 3); Draw.text('CONTINUAR · Nº ' + nx, -6, 1, { size: 15, font: FONT.plate, spacing: 1 }); Draw.ctx.restore(); if (focus === 'continue' || hover === 'continue') { Draw.ctx.save(); Draw.ctx.setLineDash([6, 5]); Draw.rrect(b.x - 6, b.y - 4, b.w + 12, b.h + 8, 8, null, 3, 2600, PAL.ultra); Draw.ctx.restore(); } }
      else Draw.text('Todas las máquinas funcionan.', 800, 66, { size: 22, color: PAL.good });
      parts.forEach(q => { ctx.save(); ctx.globalAlpha = Math.max(0, 1 - q.t / q.life); if (q.paper) { ctx.fillStyle = q.col; ctx.fillRect(q.x, q.y, q.r * 2, q.r); } else Draw.ellipse(q.x, q.y, q.r * (1 + q.t), q.r * (1 + q.t), q.col, 0, 2700); ctx.restore(); });
      drawEncargado(enc);
      if (finaleT > 1.4) { ctx.save(); ctx.translate(800, 470); ctx.rotate(-.12); const s = Math.min(1, (finaleT - 1.4) * 3); ctx.scale(2 - s, 2 - s); ctx.globalAlpha = .85 * s; Draw.rrect(-260, -60, 520, 120, 8, null, 7, 2800, PAL.bad); Draw.text('APROBADO', 0, 4, { size: 74, font: FONT.plate, color: PAL.bad, spacing: 8 }); ctx.restore(); }
      drawCard();
      bubbles.forEach(b => drawBubble({ x: enc.x + 20, y: enc.y - 130 }, b.text, Math.min(1, b.t * 7), Math.min(1, (b.dur - b.t) * 3)));
    },
    pointerDown(p) { const it = hitAt(p); if (it) it.act(); else { sel = null; } },
    pointerMove(p) { const it = hitAt(p); hover = it ? it.id : null; App.setCursor(it ? 'pointer' : 'default'); },
    pointerUp() {},
    key(e) {
      const its = items();
      if (e.key === 'Tab' || e.key.startsWith('Arrow')) { const dir = e.shiftKey || e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1; let i = its.findIndex(o => o.id === focus); i = (i + dir + its.length) % its.length; focus = its[i].id; App.announce(its[i].label || its[i].id); return true; }
      if (e.key === 'Enter' || e.key === ' ') { const it = its.find(o => o.id === focus); if (it) it.act(); return true; }
      if (e.key === 'Escape' && sel) { sel = null; return true; }
      if (/^[1-8]$/.test(e.key)) { select(+e.key); focus = 'st' + e.key; return true; }
      return false;
    },
    debug: () => ({ sel, states: ST.map(s => state(s.id)), items: items().map(o => ({ id: o.id, x: o.x + o.w / 2, y: o.y + o.h / 2 })) }),
    select, enterSelected: () => { if (sel && unlocked(sel)) enterLevel(sel); },
  };
}
function drawStateIcon(x, y, st, seed) {
  if (st === 'reparada') { Draw.ellipse(x, y, 10, 10, PAL.good, 2, seed); Draw.curve([[x - 5, y], [x - 1, y + 4], [x + 5, y - 4]], 2.5, PAL.bone); }
  else if (st === 'averiada') { Draw.rrect(x - 8, y - 4, 16, 13, 2, PAL.mustardDeep, 2, seed); Draw.curve([[x - 5, y - 4], [x - 5, y - 11], [x + 5, y - 11], [x + 5, y - 4]], 2.2, PAL.ink); }
  else if (st === 'en reparación') { Draw.shape([[x - 10, y + 8], [x, y - 10], [x + 10, y + 8]], PAL.mustard, 2); Draw.line(x, y - 3, x, y + 2, 2.2, seed + 1); Draw.ellipse(x, y + 5, 1.3, 1.3, PAL.ink, 0, seed + 2); }
  else { Draw.shape([[x - 9, y - 8], [x + 9, y - 8], [x, y + 9]], PAL.bad, 2); }
}
function polyAtMap(pts, u) { u = isFinite(u) ? U.clamp(u, 0, .9999) : 0; const n = pts.length - 1, k = Math.max(0, Math.min(n - 1, Math.floor(u * n))), f = u * n - k; return { x: U.lerp(pts[k][0], pts[k + 1][0], f), y: U.lerp(pts[k][1], pts[k + 1][1], f) }; }
function inside(p, o) { return p.x >= o.x && p.x <= o.x + o.w && p.y >= o.y && p.y <= o.y + o.h; }
function wrap(text, maxW, size, font) {
  ctx.font = size + 'px ' + (font || FONT.hand);
  const words = text.split(' '), lines = []; let cur = '';
  for (const w of words) { const tt = cur ? cur + ' ' + w : w; if (ctx.measureText(tt).width > maxW && cur) { lines.push(cur); cur = w; } else cur = tt; }
  if (cur) lines.push(cur); return lines;
}
function drawBubble(o, text, s, alpha) {
  ctx.save(); ctx.globalAlpha = alpha;
  const lines = wrap(text, 260, 20);
  ctx.font = '20px ' + FONT.hand;
  const w = Math.max(...lines.map(l => ctx.measureText(l).width)) + 28, h = lines.length * 24 + 16;
  const x = U.clamp(o.x - w / 2, 12, W - w - 12), y = U.clamp(o.y - h - 18, 8, H - h - 8);
  ctx.translate(o.x, o.y); ctx.scale(Ease.back(s), Ease.back(s)); ctx.translate(-o.x, -o.y);
  const tx = U.clamp(o.x, x + 16, x + w - 16);
  Draw.shape([[tx - 10, y + h - 3], [o.x, Math.min(o.y - 2, y + h + 16)], [tx + 8, y + h - 3]], PAL.bone, 2.5);
  Draw.rrect(x, y, w, h, 14, PAL.bone, 2.5, 871); ctx.fillStyle = PAL.bone; ctx.fillRect(tx - 8, y + h - 5, 15, 5);
  lines.forEach((l, i) => Draw.text(l, x + 14, y + 20 + i * 24, { size: 20, align: 'left' }));
  ctx.restore();
}
App.drawBubble = drawBubble; App.wrap = wrap;

/* ================================================================
 * DIAGRAMAS (cuaderno e informes): se dibujan desde el estado lógico
 * ============================================================== */
const nbSel = { a: null, b: null, i: null, t: 0, group: 'Z4', el: null };
function mapDiagram(box, ex, mode) {
  const hits = [];
  if (!ex) { Draw.text('Aún sin ejemplo: se descubre reparando la máquina.', box.x + box.w / 2, box.y + box.h / 2, { size: 20, color: PAL.inkSoft }); return hits; }
  if (mode === 'order') return orderDiagram(box, ex);
  if (mode === 'copies') return copiesDiagram(box);
  const G = GS[ex.G], Hh = GS[ex.H], f = ex.f, cod = ex.codomain || Hh.labels.map((_, i) => i);
  const A = AG.analyze(G, Hh, f, ex.codomain);
  const sx = box.x + 70, tx = box.x + box.w - 70;
  const sy = i => box.y + 40 + (box.h - 80) * (G.n === 1 ? .5 : i / (G.n - 1));
  const ty = j => box.y + 30 + (box.h - 60) * (Hh.n === 1 ? .5 : j / (Hh.n - 1));
  Draw.text(G.name, sx, box.y + 6, { size: 17, color: PAL.inkSoft }); Draw.text(ex.codomain ? 'destino recortado' : Hh.name, tx, box.y - 14, { size: 17, color: PAL.inkSoft });
  // flechas
  for (let x = 0; x < G.n; x++) {
    const y = f[x]; if (y === null || y === undefined) continue;
    let hl = true;
    if (mode === 'hom' && nbSel.a !== null) hl = x === nbSel.a || x === nbSel.b || x === G.op(nbSel.a, nbSel.b === null ? nbSel.a : nbSel.b);
    if (mode === 'iso' && nbSel.i !== null) hl = x === nbSel.i;
    if (mode === 'kernel') hl = A.kernel.indexOf(x) !== -1;
    ctx.save(); ctx.globalAlpha = hl ? 1 : .25;
    const p1 = [sx + 20, sy(x)], p2 = [tx - 20, ty(y)], m = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2 - 10];
    Draw.curve([p1, m, p2], 3, speciesColor(speciesFor(G.key, x)));
    const ang = Math.atan2(p2[1] - m[1], p2[0] - m[0]);
    Draw.curve([[p2[0] - Math.cos(ang - .5) * 12, p2[1] - Math.sin(ang - .5) * 12], p2, [p2[0] - Math.cos(ang + .5) * 12, p2[1] - Math.sin(ang + .5) * 12]], 3, PAL.ink);
    if (mode === 'iso') Draw.curve([[p1[0] + Math.cos(ang - .5) * 12, p1[1] + Math.sin(ang - .5) * 12], p1, [p1[0] + Math.cos(ang + .5) * 12, p1[1] + Math.sin(ang + .5) * 12]], 3, PAL.ink);
    ctx.restore();
  }
  // elementos
  for (let x = 0; x < G.n; x++) {
    const sp = speciesFor(G.key, x);
    if (mode === 'kernel' && A.kernel.indexOf(x) !== -1) { ctx.save(); ctx.setLineDash([5, 4]); Draw.ellipse(sx, sy(x), 26, 26, null, 2.5, 3001 + x, PAL.plum); ctx.restore(); }
    drawBead(sp, sx, sy(x), 17); hits.push({ kind: 'src', i: x, x: sx, y: sy(x), r: 22 });
  }
  for (let y = 0; y < Hh.n; y++) {
    const sp = speciesFor(Hh.key, y), inCod = cod.indexOf(y) !== -1, reached = A.image.indexOf(y) !== -1;
    if (!inCod) { ctx.save(); ctx.globalAlpha = .3; drawBead(sp, tx, ty(y), 13); ctx.restore(); Draw.line(tx - 14, ty(y) - 14, tx + 14, ty(y) + 14, 3, 3100 + y, PAL.bad); continue; }
    if ((mode === 'image' || mode === 'epi') && reached) Draw.ellipse(tx, ty(y), 25, 25, null, 2.5, 3110 + y, PAL.good);
    if ((mode === 'surj' || mode === 'image') && !reached) { ctx.save(); ctx.setLineDash([4, 4]); Draw.ellipse(tx, ty(y), 25, 25, null, 2.5, 3120 + y, PAL.bad); ctx.restore(); Draw.text('nadie', tx + 44, ty(y), { size: 15, color: PAL.bad }); }
    if (mode === 'mono') { const c = A.collisions.find(q => q.y === y); if (c) { Draw.ellipse(tx, ty(y), 25, 25, null, 3, 3130 + y, PAL.bad); Draw.text('¡choque!', tx + 50, ty(y), { size: 15, color: PAL.bad }); } }
    if (mode === 'kernel' && y === Hh.identity) Draw.text('neutro', tx + 48, ty(y), { size: 15, color: PAL.plum });
    drawBead(sp, tx, ty(y), 15); hits.push({ kind: 'tgt', i: y, x: tx, y: ty(y), r: 20 });
  }
  if (mode === 'epi' && ex.codomain) { const ys = ex.codomain.map(ty); ctx.save(); ctx.setLineDash([7, 5]); Draw.rrect(tx - 34, Math.min(...ys) - 28, 68, Math.max(...ys) - Math.min(...ys) + 56, 12, null, 2.5, 3140, PAL.good); ctx.restore(); }
  // lectura del modo
  const lx = box.x + 150, ly = box.y + box.h + 22;
  if (mode === 'hom') {
    if (nbSel.a === null || nbSel.b === null) Draw.text('Pulsa dos elementos de la izquierda para comparar las rutas.', box.x + box.w / 2, ly, { size: 17, color: PAL.inkSoft });
    else { const p = A.pairs.find(q => q.a === nbSel.a && q.b === nbSel.b), L = i => Hh.labels[i], Lg = i => G.labels[i];
      Draw.text('▲ f(' + Lg(p.a) + ' ' + G.symbol + ' ' + Lg(p.b) + ') = f(' + Lg(p.sumG) + ') = ' + L(p.routeA) + '      ● f(' + Lg(p.a) + ') ' + Hh.symbol + ' f(' + Lg(p.b) + ') = ' + L(p.fa) + ' ' + Hh.symbol + ' ' + L(p.fb) + ' = ' + L(p.routeB) + (p.ok ? '   ✓' : '   ✗'), box.x + box.w / 2, ly, { size: 18, color: p.ok ? PAL.good : PAL.bad }); }
  } else if (mode === 'kernel') Draw.text('núcleo = { ' + A.kernel.map(i => G.labels[i]).join(', ') + ' }', box.x + box.w / 2, ly, { size: 19 });
  else if (mode === 'mono') Draw.text(A.collisions.length ? 'Choques: ' + A.collisions.map(c => c.xs.map(i => G.labels[i]).join(' y ') + ' → ' + Hh.labels[c.y]).join(';  ') : 'Nadie comparte destino: inyectiva.', box.x + box.w / 2, ly, { size: 18 });
  else if (mode === 'image' || mode === 'surj') Draw.text('imagen = { ' + A.image.map(i => Hh.labels[i]).join(', ') + ' }' + (A.unreached.length ? '   sin visitas: { ' + A.unreached.map(i => Hh.labels[i]).join(', ') + ' }' : '   (sobreyectiva)'), box.x + box.w / 2, ly, { size: 18 });
  else if (mode === 'epi') Draw.text(A.epi ? 'Homomorfismo sobreyectivo sobre un destino que es grupo: epimorfismo.' : 'Todavía no es epimorfismo.', box.x + box.w / 2, ly, { size: 18 });
  else if (mode === 'iso') Draw.text(nbSel.i === null ? 'Pulsa un elemento: ida y vuelta sin ambigüedad.' : G.labels[nbSel.i] + ' → ' + Hh.labels[f[nbSel.i]] + ' → ' + G.labels[nbSel.i] + '   (la vuelta es única)', box.x + box.w / 2, ly, { size: 18 });
  return hits;
}
function orderDiagram(box, ex) {
  const hits = [], groups = ex.groups || ['Z4', 'V4'];
  groups.forEach((gk, gi) => {
    const G = GS[gk], y = box.y + 50 + gi * 130;
    Draw.text(G.name, box.x + 30, y, { size: 19, align: 'left', color: PAL.inkSoft });
    for (let i = 0; i < G.n; i++) {
      const x = box.x + 120 + i * 64, sel = nbSel.group === gk && nbSel.el === i;
      if (sel) Draw.ellipse(x, y, 25, 25, null, 3, 3200 + i, PAL.ultra);
      drawBead(speciesFor(gk, i), x, y, 17); hits.push({ kind: 'el', g: gk, i, x, y, r: 22 });
      const o = AG.orderOf(G, i); Draw.text('ord ' + o, x, y + 32, { size: 15, color: o === 4 ? PAL.bad : PAL.inkSoft });
    }
    if (nbSel.group === gk && nbSel.el !== null) {
      const pw = AG.powers(G, nbSel.el);
      Draw.text(pw.map(k => G.labels[k]).join(' → ') + '   (' + pw.length + (pw.length === 1 ? ' paso' : ' pasos') + ')', box.x + 120, y + 60, { size: 19, align: 'left', color: PAL.plum });
    }
  });
  Draw.text('Pulsa un elemento para ver sus vueltas hasta el neutro.', box.x + box.w / 2, box.y + box.h + 22, { size: 17, color: PAL.inkSoft });
  return hits;
}
function copiesDiagram(box) {
  const ms = AG.createLine().machines.map(M => Object.assign({}, M, { truth: { hom: M.d.analysis.hom, injective: M.d.analysis.injective, surjective: M.d.analysis.surjective } }));
  ms.forEach((M, k) => {
    const y = box.y + 20 + k * 70;
    Draw.text(M.name, box.x + 10, y, { size: 16, align: 'left', font: FONT.plate });
    const t = M.truth;
    Draw.text((t.hom ? '✓' : '✗') + ' conserva   ' + (t.injective ? '✓' : '✗') + ' inyectiva   ' + (t.surjective ? '✓' : '✗') + ' sobreyectiva', box.x + 170, y, { size: 18, align: 'left', color: PAL.ink });
    const fx = box.x + 600;
    M.f.forEach((y2, x) => Draw.text(M.G.labels[x] + '→' + M.H.labels[y2], fx + x * 60, y, { size: 18 }));
  });
  return [];
}

/* ================================================================
 * SUPERPOSICIONES: PAUSA, CUADERNO, INFORME
 * ============================================================== */
let ovT = 0, ovFocus = 0, ovHits = [], nbKey = 'homomorfismo';
function openOverlay(kind, data) {
  overlay = Object.assign({ kind }, data || {}); ovT = 0; ovFocus = 0; nbSel.a = nbSel.b = nbSel.i = null; nbSel.el = null;
  if (kind === 'notebook') { nbKey = data && data.key ? data.key : nbKey; notebookPulse = 0; }
  Sound.whoosh();
  if (kind === 'brief') { const B = BRIEFS[overlay.id]; App.announce('Ficha de la máquina ' + overlay.id + '. Objetivo: ' + B.goal + ' ' + B.worlds.map(w => w.name + ': ' + w.rule).join(' ') + ' ' + B.controls.map(c => c[0] + ': ' + c[1]).join(' ')); }
  else App.announce(kind === 'pause' ? 'Pausa' : kind === 'notebook' ? 'Cuaderno de averías' : '¿Qué acaba de pasar?');
}
function closeOverlay() { if (overlay && overlay.kind === 'brief') { save.briefed[overlay.id] = true; persist(); } overlay = null; }
function pauseItems() {
  return [
    { label: 'Seguir', act: closeOverlay },
    { label: 'Reiniciar el nivel', act: () => { closeOverlay(); if (scene.exit) scene.exit(); scene = makeScene(sceneId); scene.enter && scene.enter(); } },
    { label: 'Cuaderno de averías', act: () => openOverlay('notebook') },
    { label: 'Ficha de la máquina', act: () => openOverlay('brief', { id: sceneId }) },
    { label: 'Ver el cómic de esta máquina', act: () => { closeOverlay(); App.playComic(sceneId); } },
    { label: 'Volver a la fábrica', act: () => { closeOverlay(); goto('map'); } },
    { label: 'Pantalla de inicio', act: () => { closeOverlay(); goto('title'); } },
    { label: 'Efectos: ' + ['apagados', 'bajos', 'medios', 'altos'][Sound.level], act: () => { Sound.init(); Sound.setLevel(Sound.level - 1); saveSettings(); } },
    { label: 'Música: ' + ['apagada', 'baja', 'media', 'alta'][Music.level], act: () => { Sound.init(); Music.start(); Music.setLevel(Music.level - 1); saveSettings(); } },
    { label: 'Movimiento: ' + (settings.reduced ? 'reducido' : 'completo'), act: () => { settings.reduced = !settings.reduced; saveSettings(); } },
  ];
}
function saveSettings() { save.settings = { reduced: settings.reduced, level: Sound.level, music: Music.level }; persist(); }
function drawOverlay() {
  if (!overlay) return;
  ovHits = [];
  const a = Math.min(1, ovT * (settings.reduced ? 10 : 4));
  ctx.save(); ctx.globalAlpha = .45 * a; ctx.fillStyle = PAL.ink; ctx.fillRect(-view.ox - 10, -view.oy - 10, view.vw + 20, view.vh + 20); ctx.restore();
  ctx.save(); ctx.translate(W / 2, H / 2); const s = .7 + .3 * Ease.back(a); ctx.scale(s, s); ctx.rotate((1 - a) * .15); ctx.translate(-W / 2, -H / 2);
  if (overlay.kind === 'pause') {
    const x = 560, y = 90, w = 480, h = 700;
    Draw.rrect(x - 10, y - 30, w + 20, 46, 8, '#8d5a2f', 3, 3300);
    Draw.rrect(x, y, w, h, 6, PAL.bone, 3, 3301);
    Draw.rrect(x + w / 2 - 50, y - 20, 100, 30, 6, '#c7c2a8', 3, 3302);
    Draw.text('PAUSA', x + w / 2, y + 50, { size: 34, font: FONT.title, jitter: 1, seed: 7 });
    Draw.text(typeof sceneId === 'number' ? 'Máquina ' + sceneId + ': ' + LV[sceneId].name : '', x + w / 2, y + 92, { size: 18, color: PAL.inkSoft });
    pauseItems().forEach((it, i) => {
      const iy = y + 128 + i * 56, hl = ovFocus === i;
      Draw.rrect(x + 50, iy - 21, w - 100, 42, 5, hl ? '#f6dfb8' : 'rgba(255,255,255,.3)', hl ? 3 : 1.5, 3310 + i, hl ? PAL.ultra : PAL.inkFaint);
      Draw.text(it.label, x + w / 2, iy, { size: 21 });
      ovHits.push({ x: x + 50, y: iy - 21, w: w - 100, h: 42, act: it.act, i });
    });
  } else if (overlay.kind === 'notebook') drawNotebook();
  else if (overlay.kind === 'report') drawReport(overlay.id);
  else if (overlay.kind === 'brief') drawBrief(overlay.id);
  ctx.restore();
}
function drawNotebook() {
  const x = 120, y = 60, w = 1360, h = 780;
  Draw.rrect(x + 8, y + 10, w, h, 10, 'rgba(33,28,51,.3)', 0, 3400);
  Draw.rrect(x, y, w, h, 10, '#7c3b2a', 3, 3401);
  Draw.rrect(x + 20, y + 16, w / 2 - 24, h - 32, 4, PAL.bone, 2.5, 3402);
  Draw.rrect(x + w / 2 + 4, y + 16, w / 2 - 24, h - 32, 4, PAL.bone, 2.5, 3403);
  for (let k = 0; k < 9; k++) Draw.ellipse(x + w / 2, y + 70 + k * 80, 7, 7, '#c7c2a8', 2.5, 3404 + k);
  Draw.text('El cuaderno de averías', x + 50, y + 56, { size: 30, font: FONT.title, align: 'left', jitter: 1, seed: 9 });
  Draw.text('(Esc o C para cerrar · flechas para pasar página)', x + 52, y + 92, { size: 16, align: 'left', color: PAL.inkSoft });
  // índice
  ENTRIES.forEach((en, i) => {
    const open = save.notes[en.key] || en.always, iy = y + 140 + i * 66, hl = nbKey === en.key;
    if (hl) Draw.rrect(x + 46, iy - 24, 560, 50, 6, '#f6dfb8', 2, 3420 + i, PAL.ultra);
    Draw.text((i + 1) + '.', x + 70, iy, { size: 22, align: 'left' });
    Draw.text(open ? en.title : '???', x + 104, iy, { size: 24, align: 'left', color: open ? PAL.ink : PAL.inkSoft });
    Draw.text(open ? (save.notes[en.key] ? 'máquina ' + en.from : 'consultable') : 'se descubre en la máquina ' + en.from, x + 590, iy, { size: 15, align: 'right', color: PAL.inkSoft });
    if (!open) { Draw.rrect(x + 104 + 60, iy - 9, 16, 14, 2, PAL.mustardDeep, 2, 3430 + i); Draw.curve([[x + 167, iy - 9], [x + 167, iy - 17], [x + 177, iy - 17], [x + 177, iy - 9]], 2.5, PAL.ink); }
    ovHits.push({ x: x + 46, y: iy - 24, w: 560, h: 50, act: () => { nbKey = en.key; nbSel.a = nbSel.b = nbSel.i = null; nbSel.el = null; Sound.click(); } });
  });
  // página
  const en = ENTRIES.find(e => e.key === nbKey), px = x + w / 2 + 40, open = save.notes[en.key] || en.always;
  Draw.text(open ? en.title : '???', px, y + 64, { size: 32, font: FONT.title, align: 'left', jitter: 1, seed: 3 });
  if (!open) { Draw.text('Todavía no lo has descubierto.', px, y + 130, { size: 22, align: 'left', color: PAL.inkSoft }); Draw.text('Repara la máquina ' + en.from + ': ' + LV[en.from].name + '.', px, y + 162, { size: 22, align: 'left', color: PAL.inkSoft }); return; }
  Draw.rrect(px - 6, y + 92, 600, 40, 5, '#f3e6c8', 1.5, 3440);
  Draw.text(en.formula, px + 8, y + 112, { size: 21, align: 'left', color: PAL.plum });
  en.lines.forEach((l, i) => Draw.text(l, px, y + 162 + i * 28, { size: 20, align: 'left' }));
  if (en.key === 'homomorfismo' && save.notes.identidad) Draw.text('Además: siempre lleva el neutro al neutro, f(e) = e (el espejo).', px, y + 162 + 3 * 28, { size: 20, align: 'left', color: PAL.plum });
  const exKey = en.key === 'homomorfismo' && !save.notes.homomorfismo ? null : en.key;
  const ex = exKey ? exampleFor(exKey) : null;
  const box = { x: px, y: y + 300, w: 580, h: 360 };
  Draw.text(ex ? (ex.from ? 'Tu ejemplo (' + ex.from + '):' : 'Ejemplo de la fábrica:') : '', px, y + 282, { size: 17, align: 'left', color: PAL.inkSoft });
  const hits = mapDiagram(box, ex, en.mode);
  hits.forEach(hh => ovHits.push({ x: hh.x - hh.r, y: hh.y - hh.r, w: hh.r * 2, h: hh.r * 2, act: () => diagramClick(hh, en.mode) }));
}
function diagramClick(hh, mode) {
  Sound.click();
  if (mode === 'order' && hh.kind === 'el') { nbSel.group = hh.g; nbSel.el = hh.i; return; }
  if (hh.kind !== 'src') return;
  if (mode === 'hom') { if (nbSel.a === null || nbSel.b !== null) { nbSel.a = hh.i; nbSel.b = null; } else nbSel.b = hh.i; }
  else nbSel.i = hh.i;
}
function drawReport(id) {
  const x = 210, y = 110, w = 1180, h = 680, R = REPORTS[id];
  Draw.rrect(x, y, w, h, 6, PAL.bone, 3, 3500);
  Draw.text('¿Qué acaba de pasar?', x + 40, y + 50, { size: 32, font: FONT.title, align: 'left', jitter: 1, seed: 12 });
  Draw.text('Máquina ' + id + ' · ' + LV[id].name + '   (Esc o clic para cerrar)', x + w - 40, y + 50, { size: 17, align: 'right', color: PAL.inkSoft });
  const ex = R.ex ? exampleFor(R.ex) : null;
  const box = { x: x + 40, y: y + 100, w: 520, h: 340 };
  const hits = mapDiagram(box, R.mode === 'copies' ? {} : ex, R.mode);
  hits.forEach(hh => ovHits.push({ x: hh.x - hh.r, y: hh.y - hh.r, w: hh.r * 2, h: hh.r * 2, act: () => diagramClick(hh, R.mode) }));
  const tx = R.mode === 'copies' ? x + 40 : x + 610;
  const ty0 = R.mode === 'copies' ? y + 420 : y + 120;
  let yy = ty0;
  R.lines.forEach(l => { wrap(l, R.mode === 'copies' ? 1100 : 520, 21).forEach(ln => { Draw.text(ln, tx, yy, { size: 21, align: 'left' }); yy += 30; }); yy += 12; });
  Draw.text('Queda guardado en el cuaderno de averías (C).', x + 40, y + h - 30, { size: 17, align: 'left', color: PAL.inkSoft });
}
function drawBrief(id) {
  const B = BRIEFS[id], x = 110, y = 60, w = 1380, h = 790;
  Draw.rrect(x + 8, y + 10, w, h, 8, 'rgba(33,28,51,.3)', 0, 3800);
  Draw.rrect(x, y, w, h, 8, '#c7a36b', 3.5, 3801);
  Draw.rrect(x + 16, y + 16, w - 32, h - 32, 4, PAL.bone, 2.5, 3802);
  Draw.rrect(x + w / 2 - 70, y - 14, 140, 30, 6, '#6f6a55', 3, 3803);
  Draw.text('FICHA DE LA MÁQUINA Nº ' + id, x + 46, y + 52, { size: 16, font: FONT.plate, align: 'left', spacing: 2, color: PAL.inkSoft });
  Draw.text(LV[id].name, x + 46, y + 86, { size: 32, font: FONT.title, align: 'left', jitter: 1, seed: 20 + id });
  Draw.text('(Enter o Esc para empezar · vuelve a abrirla con el botón FICHA)', x + w - 46, y + 52, { size: 15, align: 'right', color: PAL.inkSoft });
  // columna izquierda: los mundos y cómo se opera en cada uno
  const lx = x + 46; let ly = y + 136;
  Draw.text('LOS MUNDOS Y SU OPERACIÓN', lx, ly, { size: 15, font: FONT.plate, align: 'left', spacing: 1.5, color: PAL.plum }); ly += 30;
  B.worlds.forEach((wd, i) => {
    const G = GS[wd.key];
    Draw.text(wd.name, lx, ly, { size: 23, align: 'left' }); ly += 26;
    wrap(wd.rule, 300, 18).forEach(l => { Draw.text(l, lx, ly, { size: 18, align: 'left', color: PAL.inkSoft }); ly += 22; });
    const cell = Math.min(30, 230 / (G.n + 1)), tx = lx + 330, ty = ly - 22 - (wrap(wd.rule, 300, 18).length * 22) - 4;
    Kit.drawCayley(G, tx, ty + 18, cell, null, null);
    ly = Math.max(ly + 14, ty + 18 + cell * (G.n + 1) + 26);
  });
  // columna derecha: controles
  const rx = x + 720; let ry = y + 136;
  Draw.line(x + 690, y + 120, x + 690, y + 600, 1.5, 3810, PAL.inkFaint);
  Draw.text('CÓMO SE MANEJA', rx, ry, { size: 15, font: FONT.plate, align: 'left', spacing: 1.5, color: PAL.plum }); ry += 32;
  B.controls.forEach(c => {
    Draw.ellipse(rx + 6, ry - 2, 5, 5, PAL.mustard, 1.5, 3820 + ry);
    Draw.text(c[0], rx + 20, ry, { size: 20, align: 'left', font: FONT.hand, color: PAL.ink }); ry += 24;
    wrap(c[1], 590, 17).forEach(l => { Draw.text(l, rx + 20, ry, { size: 17, align: 'left', color: PAL.inkSoft }); ry += 21; });
    ry += 10;
  });
  // objetivo
  const gy = y + 612;
  Draw.rrect(x + 40, gy, w - 80, 92, 6, '#f6e27a', 2.5, 3830);
  Draw.text('OBJETIVO', x + 60, gy + 22, { size: 14, font: FONT.plate, align: 'left', spacing: 2 });
  wrap(B.goal, w - 360, 19).slice(0, 3).forEach((l, i) => Draw.text(l, x + 60, gy + 46 + i * 22, { size: 19, align: 'left' }));
  Draw.text('Pista: ' + B.tip, x + 46, y + h - 40, { size: 17, align: 'left', color: PAL.inkSoft });
  const bx = x + w - 290, by = y + h - 62;
  Kit.plate(bx, by, 250, 46, overlay.auto ? '¡A TRABAJAR!' : 'CERRAR', { size: 16, fill: '#dfe8c8', focus: true });
  ovHits.push({ x: bx, y: by, w: 250, h: 46, act: closeOverlay });
}
function overlayPointer(p) {
  const hit = ovHits.find(o => inside(p, o));
  if (hit) { hit.act(); return; }
  if (overlay.kind === 'notebook') { if (p.x < 120 || p.x > 1480 || p.y < 60 || p.y > 840) closeOverlay(); return; }
  if (overlay.kind === 'brief') return;
  if (overlay.kind !== 'pause') closeOverlay();
}
function overlayKey(e) {
  const k = e.key;
  if (k === 'Escape' || (k.toLowerCase() === 'c' && overlay.kind === 'notebook')) { closeOverlay(); return; }
  if (overlay.kind === 'pause') {
    const its = pauseItems();
    if (k === 'ArrowDown' || k === 'Tab' && !e.shiftKey) ovFocus = (ovFocus + 1) % its.length;
    else if (k === 'ArrowUp' || k === 'Tab') ovFocus = (ovFocus - 1 + its.length) % its.length;
    else if (k === 'Enter' || k === ' ') its[ovFocus].act();
    App.announce(pauseItems()[ovFocus] ? pauseItems()[ovFocus].label : '');
  } else if (overlay.kind === 'notebook') {
    const i = ENTRIES.findIndex(q => q.key === nbKey);
    if (k === 'ArrowDown' || k === 'ArrowRight' || k === 'Tab') nbKey = ENTRIES[(i + 1) % ENTRIES.length].key;
    if (k === 'ArrowUp' || k === 'ArrowLeft') nbKey = ENTRIES[(i - 1 + ENTRIES.length) % ENTRIES.length].key;
    nbSel.a = nbSel.b = nbSel.i = null;
    const en = ENTRIES.find(q => q.key === nbKey); App.announce((save.notes[en.key] || en.always) ? en.title + '. ' + en.formula + '. ' + en.lines.join(' ') : 'Entrada sin descubrir');
  } else if (k === 'Enter' || k === ' ') closeOverlay();
}

/* ================================================================
 * BOTONES GLOBALES (arriba a la derecha)
 * ============================================================== */
const isLevel = () => typeof sceneId === 'number';
function globalButtons() {
  const b = [], sc = scene || {};
  if (sceneId === 'comic') return [];
  const audio = [
    { id: 'sound', label: 'EFECTOS', tip: 'Volumen de efectos (M)', act: () => { Sound.init(); Sound.setLevel(Sound.level - 1); saveSettings(); Sound.click(); App.announce('Efectos: ' + ['apagados', 'bajos', 'medios', 'altos'][Sound.level]); } },
    { id: 'music', label: 'MÚSICA', tip: 'Volumen de la música (U)', act: () => { Sound.init(); Music.start(); Music.setLevel(Music.level - 1); saveSettings(); App.announce('Música: ' + ['apagada', 'baja', 'media', 'alta'][Music.level]); } },
    { id: 'motion', label: settings.reduced ? 'CALMA' : 'MOVIM.', tip: 'Reducir el movimiento (L)', act: () => { settings.reduced = !settings.reduced; saveSettings(); App.announce(settings.reduced ? 'Movimiento reducido' : 'Movimiento completo'); } },
  ];
  if (sceneId === 'title') return audio.map((o, k) => Object.assign(o, { x: view.vw - 40, y: 60 + k * 84, r: 24 }));
  if (isLevel()) b.push({ id: 'menu', big: true, label: 'MENÚ', tip: 'Pausa: reiniciar, volver a la fábrica… (Esc)', act: () => openOverlay('pause') });
  else b.push({ id: 'home', big: true, label: 'INICIO', tip: 'Pantalla de inicio', act: () => goto('title') });
  if (isLevel()) b.push({ id: 'brief', label: 'FICHA', tip: 'Ficha de la máquina: mundos, operaciones y controles (F1)', act: () => openOverlay('brief', { id: sceneId }) });
  if (sc.hint) b.push({ id: 'hint', label: 'PISTA', tip: 'Una pista (H). Cada vez dice un poco más.', act: () => sc.hint() });
  if (sc.tableContext) b.push({ id: 'table', label: 'TABLAS', tip: 'Tablas de operar de los dos mundos (K)', act: toggleTable });
  b.push({ id: 'notebook', label: 'CUADERNO', tip: 'Cuaderno de averías (C)', act: () => openOverlay('notebook') });
  if (sc.busy && sc.busy()) b.push({ id: 'skip', label: 'SALTAR', tip: 'Terminar la secuencia ya (X)', act: () => { sc.skip(); Sound.fam('slide'); } });
  let y = 64; const out = [];
  b.forEach(o => { out.push(Object.assign(o, { x: view.vw - 40, y: o.big ? y + 6 : y, r: o.big ? 30 : 24 })); y += o.big ? 104 : 86; });
  audio.forEach((o, k) => out.push(Object.assign(o, { x: view.vw - 40, y: view.vh - 230 + k * 74, r: 20, small: true })));
  return out;
}
let gHover = null;
const tableP = { open: 0, target: 0, hover: null, sel: null, rects: [] };
function toggleTable() { tableP.target = tableP.target ? 0 : 1; tableP.sel = null; Sound.fam('slide'); App.announce(tableP.target ? 'Tablas de operar abiertas' : 'Tablas cerradas'); }
function tableBox() { return { x: 1600 + view.ox - 96 - 600, y: 84, w: 600, h: 300 }; }
function drawTablePanel() {
  tableP.open += (tableP.target - tableP.open) * .25;
  if (tableP.open < .02 || !scene || !scene.tableContext) { tableP.rects = []; return; }
  const tc = scene.tableContext(); if (!tc) return;
  const b = tableBox(), y = b.y - (1 - tableP.open) * (b.h + 100);
  ctx.save();
  Draw.rrect(b.x + 6, y + 8, b.w, b.h, 8, 'rgba(33,28,51,.25)', 0, 3700);
  Draw.rrect(b.x, y, b.w, b.h, 8, '#7c3b2a', 3, 3701);
  Draw.rrect(b.x + 12, y + 12, b.w - 24, b.h - 24, 4, PAL.bone, 2, 3702);
  Draw.text('TABLAS DE OPERAR', b.x + 28, y + 34, { size: 14, font: FONT.plate, align: 'left', spacing: 1 });
  Draw.text('fila ∗ columna · (K) cerrar', b.x + b.w - 28, y + 34, { size: 14, align: 'right', color: PAL.inkSoft });
  tableP.rects = [];
  const gs = tc.groups.slice(0, 2), hl = Object.assign({}, tc.highlight || {});
  if (tableP.sel) hl[tableP.sel.key] = { r: tableP.sel.r, c: tableP.sel.c };
  gs.forEach((G, k) => {
    const cell = Math.min(40, 210 / (G.n + 1)), x0 = b.x + 34 + k * 290, y0 = y + 72;
    const r = Kit.drawCayley(G, x0, y0, cell, hl[G.key], tableP.hover && tableP.hover.key === G.key ? tableP.hover : null);
    tableP.rects.push({ key: G.key, G, x: r.x + cell, y: r.y + cell, cell, n: G.n });
  });
  const show = tableP.hover || tableP.sel;
  if (show) { const G = gs.find(g => g.key === show.key); if (G) Draw.text(G.labels[show.r] + ' ' + G.symbol + ' ' + G.labels[show.c] + ' = ' + G.labels[G.op(show.r, show.c)], b.x + b.w / 2, y + b.h - 30, { size: 20, color: PAL.plum }); }
  else if (tc.note) Draw.text(tc.note, b.x + b.w / 2, y + b.h - 30, { size: 17, color: PAL.inkSoft });
  ctx.restore();
}
function tableCellAt(p) {
  for (const r of tableP.rects) { const c = Math.floor((p.x - r.x) / r.cell), rr = Math.floor((p.y - r.y) / r.cell); if (c >= 0 && rr >= 0 && c < r.n && rr < r.n) return { key: r.key, r: rr, c, G: r.G }; }
  return null;
}
function inTable(p) { if (tableP.open < .5 || !scene || !scene.tableContext) return false; const b = tableBox(); return p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h; }
function drawRail() {
  const bs = globalButtons(); if (!bs.length) return;
  const x0 = view.vw - 80;
  if (sceneId !== 'title') {
    Draw.rrect(x0 + 4, -10, 90, view.vh + 20, 6, '#8d5a2f', 3, 3590);
    for (let y = 30; y < view.vh; y += 44) { Draw.ellipse(x0 + 18, y, 3, 3, '#5e3a1c', 0, 3591 + y); Draw.ellipse(x0 + 66, y + 22, 3, 3, '#5e3a1c', 0, 3592 + y); }
  }
  bs.forEach(o => {
    const hov = gHover === o.id, glow = o.id === 'notebook' && notebookPulse > 0;
    Draw.line(o.x, o.y - o.r - 14, o.x, o.y - o.r, 2, 3595 + o.y, '#3a2410');
    if (glow || (o.id === 'hint' && scene && scene.hintGlow && scene.hintGlow())) { ctx.save(); ctx.globalAlpha = .45 + Math.sin(Clock.t * 6) * .3; Draw.ellipse(o.x, o.y, o.r + 10, o.r + 10, '#fff3c4', 0, 3600); ctx.restore(); }
    if (o.big) { Draw.rrect(o.x - 34, o.y - 30, 68, 64, 8, hov ? '#f0705f' : PAL.bad, 3, 3605, hov ? PAL.bone : PAL.ink); }
    else Draw.ellipse(o.x, o.y, o.r, o.r, hov ? '#fff3c4' : PAL.bone, 2.5, 3610 + o.y, PAL.ink);
    const ix = o.x, iy = o.big ? o.y - 8 : o.y;
    if (o.id === 'menu') { Draw.rrect(ix - 10, iy - 11, 7, 22, 2, PAL.bone, 0, 3620); Draw.rrect(ix + 3, iy - 11, 7, 22, 2, PAL.bone, 0, 3621); }
    if (o.id === 'home') { Draw.shape([[ix - 13, iy + 2], [ix, iy - 12], [ix + 13, iy + 2]], PAL.bone, 0); Draw.rrect(ix - 9, iy, 18, 13, 1, PAL.bone, 0, 3622); }
    if (o.id === 'brief') { Draw.rrect(ix - 10, iy - 13, 20, 26, 2, '#c7a36b', 2, 3623); Draw.rrect(ix - 7, iy - 9, 14, 20, 1, PAL.bone, 1, 3624); Draw.text('?', ix, iy + 1, { size: 15, font: FONT.title }); }
    if (o.id === 'notebook') { Draw.rrect(ix - 10, iy - 12, 20, 24, 2, '#7c3b2a', 2, 3630); Draw.line(ix - 6, iy - 4, ix + 6, iy - 4, 1.5, 3631, PAL.bone); Draw.line(ix - 6, iy + 2, ix + 4, iy + 2, 1.5, 3632, PAL.bone); }
    if (o.id === 'sound') { Draw.shape([[ix - 9, iy - 4], [ix - 4, iy - 4], [ix + 2, iy - 9], [ix + 2, iy + 9], [ix - 4, iy + 4], [ix - 9, iy + 4]], PAL.ink, 0);
      if (Sound.muted) { Draw.line(ix + 5, iy - 5, ix + 11, iy + 5, 2.5, 3640); Draw.line(ix + 11, iy - 5, ix + 5, iy + 5, 2.5, 3641); }
      else for (let i = 1; i <= Sound.level; i++) { ctx.beginPath(); ctx.arc(ix + 2, iy, 3 + i * 3.5, -.7, .7); ctx.strokeStyle = PAL.ink; ctx.lineWidth = 2; ctx.stroke(); } }
    if (o.id === 'music') { Draw.line(ix - 4, iy + 8, ix - 4, iy - 9, 2.2, 3642); Draw.line(ix + 7, iy + 5, ix + 7, iy - 11, 2.2, 3643); Draw.line(ix - 4, iy - 9, ix + 7, iy - 11, 3, 3644); Draw.ellipse(ix - 7, iy + 8, 4, 3, PAL.ink, 0, 3645); Draw.ellipse(ix + 4, iy + 5, 4, 3, PAL.ink, 0, 3646);
      if (Music.level === 0) { Draw.line(ix - 12, iy - 12, ix + 12, iy + 12, 2.5, 3647, PAL.bad); } }
    if (o.id === 'hint') { Draw.ellipse(ix, iy - 3, 8, 8, '#ffe27a', 2.5, 3660); Draw.rrect(ix - 4, iy + 5, 8, 6, 1, PAL.bone, 2, 3661); }
    if (o.id === 'table') { for (let k = 0; k < 3; k++) { Draw.line(ix - 10, iy - 8 + k * 8, ix + 10, iy - 8 + k * 8, 1.6, 3670 + k); Draw.line(ix - 8 + k * 8, iy - 10, ix - 8 + k * 8, iy + 10, 1.6, 3673 + k); } }
    if (o.id === 'skip') { Draw.shape([[ix - 10, iy - 8], [ix, iy], [ix - 10, iy + 8]], PAL.ink, 0); Draw.shape([[ix, iy - 8], [ix + 10, iy], [ix, iy + 8]], PAL.ink, 0); }
    if (o.id === 'motion') { const pts = []; for (let i = 0; i <= 10; i++) pts.push([ix - 10 + i * 2, iy + Math.sin(i * 1.3 + (settings.reduced ? 0 : Clock.t * 4)) * (settings.reduced ? 1.5 : 5)]); Draw.curve(pts, 2.5, PAL.ink); }
    const ly = o.big ? o.y + 22 : o.y + o.r + 13;
    Draw.text(o.label, o.x, ly, { size: o.big ? 14 : o.small ? 10 : 11.5, font: FONT.plate, color: o.big ? PAL.bone : sceneId === 'title' ? '#e9dcc4' : PAL.bone, spacing: .5 });
  });
  if (gHover) { const o = bs.find(q => q.id === gHover); if (o) { ctx.font = '17px ' + FONT.hand; const w = ctx.measureText(o.tip).width + 22; Draw.rrect(o.x - o.r - 18 - w, o.y - 16, w, 32, 6, PAL.ink, 0, 3650); Draw.shape([[o.x - o.r - 18, o.y - 7], [o.x - o.r - 8, o.y], [o.x - o.r - 18, o.y + 7]], PAL.ink, 0); Draw.text(o.tip, o.x - o.r - 18 - w / 2, o.y + 1, { size: 17, color: PAL.bone }); } }
}
function globalHit(p) { return globalButtons().find(o => o.big ? Math.abs(p.x - o.x) < 38 && Math.abs(p.y - o.y) < 36 : Math.hypot(p.x - o.x, p.y - o.y) < o.r + 6) || null; }

/* ================================================================
 * ENTRADA
 * ============================================================== */
let view = { s: 1, ox: 80, oy: 45, vw: 1760, vh: 990, dpr: 1 };
function toScreen(e) { const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) / view.s, y: (e.clientY - r.top) / view.s }; }
function toWorld(e) { const q = toScreen(e); return { x: q.x - view.ox, y: q.y - view.oy }; }
canvas.addEventListener('pointerdown', e => {
  Sound.init(); canvas.focus && canvas.focus();
  if (trans) return;
  Music.start();
  const p = toWorld(e), q = toScreen(e);
  canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
  if (overlay) { overlayPointer(p); return; }
  const g = globalHit(q); if (g) { g.act(); return; }
  if (inTable(p)) { const c = tableCellAt(p); if (c) { tableP.sel = c; Sound.fam('clickin'); App.announce(c.G.labels[c.r] + ' ' + c.G.symbol + ' ' + c.G.labels[c.c] + ' = ' + c.G.labels[c.G.op(c.r, c.c)]); scene.tableClick && scene.tableClick(c); } return; }
  scene.pointerDown && scene.pointerDown(p, e);
});
canvas.addEventListener('pointermove', e => {
  const p = toWorld(e), q = toScreen(e);
  if (overlay) { const h = ovHits.find(o => inside(p, o)); App.setCursor(h ? 'pointer' : 'default'); return; }
  const g = globalHit(q); gHover = g ? g.id : null;
  if (g) { App.setCursor('pointer'); return; }
  if (inTable(p)) { tableP.hover = tableCellAt(p); App.setCursor(tableP.hover ? 'pointer' : 'default'); return; }
  tableP.hover = null;
  scene && scene.pointerMove && scene.pointerMove(p, e);
});
canvas.addEventListener('pointerup', e => { if (overlay || trans) return; scene && scene.pointerUp && scene.pointerUp(toWorld(e), e); });
canvas.addEventListener('pointercancel', e => { scene && scene.pointerCancel && scene.pointerCancel(); });
canvas.addEventListener('pointerleave', () => { gHover = null; scene && scene.pointerLeave && scene.pointerLeave(); });
window.addEventListener('keydown', e => {
  Sound.init(); Music.start();
  if (e.key === 'F1' || (e.key === '?' && isLevel())) { if (isLevel()) openOverlay('brief', { id: sceneId }); e.preventDefault(); return; }
  if (trans) { e.preventDefault(); return; }
  if (overlay) { overlayKey(e); e.preventDefault(); return; }
  if (scene && scene.key && scene.key(e)) { e.preventDefault(); return; }
  const k = e.key.toLowerCase();
  if (e.key === 'Escape') { if (isLevel()) openOverlay('pause'); else if (sceneId === 'map') goto('title'); }
  else if (k === 'u') { Music.setLevel(Music.level ? 0 : 2); saveSettings(); App.announce(Music.level ? 'Música encendida' : 'Música apagada'); }
  else if (k === 'c' && !e.ctrlKey && !e.metaKey) openOverlay('notebook');
  else if (k === 'k' && scene && scene.tableContext) toggleTable();
  else if (k === 'h' && scene && scene.hint) scene.hint();
  else if (k === 'x' && scene && scene.busy && scene.busy()) scene.skip();
  else if (k === 'm') { Sound.setLevel(Sound.muted ? 2 : 0); saveSettings(); App.announce(Sound.muted ? 'Sonido apagado' : 'Sonido encendido'); }
  else if (k === 'l') { settings.reduced = !settings.reduced; saveSettings(); App.announce(settings.reduced ? 'Movimiento reducido' : 'Movimiento completo'); }
  else if (e.key === '-') { Sound.setLevel(Math.max(1, Sound.level - 1)); saveSettings(); }
  else if (e.key === '+' || e.key === '=') { Sound.setLevel(Math.min(3, Sound.level + 1)); saveSettings(); }
  else return;
  e.preventDefault();
});
if (mq && mq.addEventListener) mq.addEventListener('change', e => { if (save.settings.reduced === null) settings.reduced = e.matches; });

/* ================================================================
 * BUCLE
 * ============================================================== */
let grain = null;
function makeGrain() {
  const g = document.createElement('canvas'); g.width = g.height = 220; const gc = g.getContext('2d');
  const id = gc.createImageData(220, 220);
  for (let i = 0; i < id.data.length; i += 4) { const v = Math.random() * 255; id.data[i] = 80; id.data[i + 1] = 40; id.data[i + 2] = 30; id.data[i + 3] = v < 30 ? 30 : v > 245 ? 22 : 0; }
  gc.putImageData(id, 0, 0);
  grain = ctx.createPattern(g, 'repeat'); App.grain = grain;
}
/* El contenido de cada escena mide 1600×900; alrededor siempre hay al menos 80 de margen lateral
   para el riel de herramientas y el portapapeles. El resto del espacio se rellena con el propio escenario. */
function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const cw = Math.max(1, canvas.clientWidth), ch = Math.max(1, canvas.clientHeight);
  canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
  const s = Math.min(cw / 1760, ch / 900), vw = cw / s, vh = ch / s;
  view = { s, dpr, vw, vh, ox: (vw - W) / 2, oy: (vh - H) / 2 };
  App.view.w = vw; App.view.h = vh; App.view.ox = view.ox; App.view.oy = view.oy;
}
window.addEventListener('resize', resize);
function step(dt) {
  Clock.t += dt; Clock.reduced = settings.reduced;
  Draw.boil = settings.reduced ? 0 : Math.floor(Clock.t * 8) % 3; Draw.wob = settings.reduced ? .4 : 1;
  for (let i = timers.length - 1; i >= 0; i--) { timers[i].t -= dt; if (timers[i].t <= 0) { const f = timers[i].fn; timers.splice(i, 1); f(); } }
  notebookPulse = Math.max(0, notebookPulse - dt * .25);
  updateTransition(dt);
  if (overlay) { ovT += dt; return; }
  scene && scene.update(dt);
}
function render() {
  const k = view.s * view.dpr;
  ctx.setTransform(k, 0, 0, k, 0, 0);
  ctx.fillStyle = (scene && scene.bg) || PAL.paper; ctx.fillRect(0, 0, view.vw, view.vh);
  if (grain) { ctx.fillStyle = grain; ctx.fillRect(0, 0, view.vw, view.vh); }
  ctx.setTransform(k, 0, 0, k, view.ox * k, view.oy * k);
  ctx.save();
  if (trans) {
    const p = Math.min(1, trans.t / trans.dur), o = trans.o;
    const r = trans.phase === 'out' ? (1 - Ease.in(p)) * 2400 : Ease.out(p) * 2400;
    ctx.save();
    if (trans.phase === 'out' && !settings.reduced) { const z = 1 + Ease.in(p) * .6; ctx.translate(o.x, o.y); ctx.scale(z, z); ctx.translate(-o.x, -o.y); }
    ctx.beginPath(); ctx.arc(o.x, o.y, Math.max(1, r), 0, Math.PI * 2); ctx.clip();
    scene.render();
    ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.rect(-view.ox - 10, -view.oy - 10, view.vw + 20, view.vh + 20); ctx.arc(o.x, o.y, Math.max(1, r), 0, Math.PI * 2, true); ctx.fillStyle = PAL.ink; ctx.fill('evenodd'); ctx.restore();
  } else scene.render();
  if (isLevel() || sceneId === 'map') { Deco.dust(-view.ox, -view.oy, view.vw, view.vh, Clock.t, settings.reduced ? 0 : 26, .3); Deco.vignette(-view.ox, -view.oy, view.vw, view.vh, isLevel() ? .2 : .14); }
  drawTablePanel();
  drawOverlay();
  ctx.restore();
  ctx.setTransform(k, 0, 0, k, 0, 0);
  if (!overlay || overlay.kind !== 'brief') drawRail();
}
let last = performance.now();
function frame(now) { const dt = U.clamp((now - last) / 1000, 0, .05); last = now; step(dt); render(); requestAnimationFrame(frame); }

window.__APP = {
  App, save, settings, tableP, toggleTable, get sceneId() { return sceneId; }, get scene() { return scene; }, get overlay() { return overlay; },
  goto: (id, full) => { trans = null; overlay = null; if (scene && scene.exit) scene.exit(); scene = makeScene(id); sceneId = id; scene.enter && scene.enter(); if (full) sceneEntered(id); },
  step(sec) { for (let i = 0; i < sec * 30; i++) step(1 / 30); },
  openOverlay, closeOverlay, persist, reset() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} },
  view: () => view, globalButtons, Music,
  /** Pruebas: coordenadas de escena → píxeles CSS de la página. */
  toPage(x, y) { const r = canvas.getBoundingClientRect(); return { x: r.left + (x + view.ox) * view.s, y: r.top + (y + view.oy) * view.s }; },
  railToPage(id) { const o = globalButtons().find(b => b.id === id); const r = canvas.getBoundingClientRect(); return o ? { x: r.left + o.x * view.s, y: r.top + o.y * view.s } : null; },
  testMode() { save.comicSeen = true; save.comics = save.comics || {}; for (let i = 1; i <= 8; i++) { save.briefed[i] = true; save.comics[i] = true; } persist(); },
};
const fontsReady = document.fonts && document.fonts.load ? Promise.race([
  Promise.all([document.fonts.load('30px "Chango"'), document.fonts.load('16px "Special Elite"'), document.fonts.load('20px "Patrick Hand"')]),
  new Promise(r => setTimeout(r, 1500))]) : Promise.resolve();
fontsReady.then(boot, boot);
function boot() { resize(); makeGrain(); goto('title'); requestAnimationFrame(frame); }
})();
