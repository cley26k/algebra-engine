/* THE ALGEBRA ENGINE — escenario, criaturas, máquina, interacción y ejecución.
 * La verdad matemática vive en AlgebraCore (L). Este archivo sólo la escenifica. */
'use strict';
window.Level1Scene = function (App) {
const W = 1600, H = 900;
const ctx = Draw.ctx;
const L = AlgebraCore.createLevel();
const G4 = L.G;

/* ---------------- ajustes ---------------- */
const SET = App.settings;
function motion(d) { return SET.reduced ? d * 0.45 : d; }

/* ---------------- relojes y animación ---------------- */
let realT = 0;            // tiempo de ambiente (siempre corre)
const tw = new Tweens();  // ambiente
const rtw = new Tweens(); // ejecución (se pausa y acelera)
const timers = [];        // temporizadores de ambiente
function later(t, fn, tag) { timers.push({ t, fn, tag }); }
function cancelTimers(tag) { for (const x of timers) if (x.tag === tag) x.dead = true; }

function announce(msg) { App.announce(msg); }

/* ================================================================
 * DISPOSICIÓN DEL ESCENARIO (coordenadas lógicas 1600×900)
 * ============================================================== */
const SRC_C = { x: 300, y: 470 }, SRC_R = 165;
const SRC_POS = [{ x: 300, y: 352 }, { x: 418, y: 470 }, { x: 300, y: 588 }, { x: 182, y: 470 }];
const SRC_OUT = [0, 1, 2, 3].map(i => { const y = 412 + i * 36; return { x: SRC_C.x + Math.sqrt(SRC_R * SRC_R - (y - SRC_C.y) ** 2) - 6, y }; });
const MACH = { x: 540, y: 120, w: 520, h: 640 };
const LJACK = [0, 1, 2, 3].map(i => ({ x: 618, y: 268 + i * 46 }));
const RJACK = [{ x: 962, y: 300 }, { x: 962, y: 390 }];
const DST_C = { x: 1330, y: 425 }, DST_R = 122;
const PADS = [{ x: 1330, y: 362 }, { x: 1330, y: 490 }];
const DST_IN = [{ x: 1216, y: 392 }, { x: 1216, y: 452 }];
const PHANTOM = { 2: { x: 1458, y: 362 }, 3: { x: 1458, y: 490 } };
const SLOT_NAMES = { motor: 'MOTOR', total: 'IMAGEN', puerta: 'PUERTA', ley: 'LEY' };
const SLOT_RECT = {}; AlgebraCore.SLOTS.forEach((s, i) => { SLOT_RECT[s] = { x: 582 + i * 112, y: 476, w: 100, h: 66 }; });
const BLOCK_W = 100, BLOCK_H = 66;
const TRAY = { x: 420, y: 790, w: 680, h: 96 };
function trayPos(i) { return { x: 490 + i * 122, y: 828 }; }
const SOCKET = { x: 1424, y: 612 };
const PORT = { x: 988, y: 176, r: 52 };
const MOUTH = { x: 760, y: 172 };
const LEVER = { x: 1092, y: 664 };
const SCALE = { x: 1330, y: 112 };
const LEDGER = { x: 1150, y: 676, w: 425, h: 210, gx: 1196, gy: 738, cell: 36 };
const KNOBS = [
  { id: 'pause', x: 612, label: 'PAUSA', key: 'P' },
  { id: 'undo', x: 690, label: 'DESHACER', key: 'Z' },
  { id: 'reset', x: 768, label: 'REINICIAR', key: 'N' },
  { id: 'hint', x: 846, label: 'PISTA', key: 'H' },
  { id: 'replay', x: 924, label: 'REPETIR', key: 'V' },
  { id: 'reverse', x: 1002, label: 'DESANDAR', key: 'B' },
];
const KNOB_Y = 618;
const TOGGLES = [{ id: 'sound', x: 1494, y: 38 }, { id: 'motion', x: 1552, y: 38 }];
const TICKET = { x: 740, y: 700, w: 120, h: 58 };

/* Curva de un cable de la centralita (cuelga con un poco de pandeo). */
function cordPts(x, y, wobble) {
  const a = LJACK[x], b = RJACK[y], sag = 26 + Math.abs(a.y - b.y) * .15 + (wobble || 0), pts = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16, px = U.lerp(a.x, b.x, t), py = U.lerp(a.y, b.y, t) + Math.sin(t * Math.PI) * sag;
    pts.push([px, py]);
  }
  return pts;
}
function polyLen(pts) { let s = 0; for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return s; }
function polyAt(pts, u) {
  const total = polyLen(pts); let d = U.clamp(u, 0, 1) * total;
  for (let i = 1; i < pts.length; i++) {
    const seg = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (d <= seg || i === pts.length - 1) { const t = seg ? d / seg : 0; return { x: U.lerp(pts[i - 1][0], pts[i][0], t), y: U.lerp(pts[i - 1][1], pts[i][1], t) }; }
    d -= seg;
  }
  return { x: pts[0][0], y: pts[0][1] };
}
function srcPipe(i) { const o = SRC_OUT[i], j = LJACK[i]; return [[o.x, o.y], [o.x + 30, o.y], [MACH.x - 20, j.y], [MACH.x + 8, j.y], [j.x - 14, j.y]]; }
function dstPipe(y) { const j = RJACK[y], o = DST_IN[y]; return [[j.x + 14, j.y], [MACH.x + MACH.w - 6, j.y], [MACH.x + MACH.w + 30, j.y], [o.x - 40, o.y], [o.x, o.y]]; }

/* ================================================================
 * ENTIDADES
 * ============================================================== */
function makeCritterL1(kind, v, x, y) {
  return { kind, v, x, y, hx: x, hy: y, sx: Spring(), sy: Spring(), lookX: 0, lookY: 0, blinkT: U.rand(1, 4), blink: 0,
    expr: 'idle', exprT: 0, hop: 0, flat: 0, puff: 0, shake: 0, actT: U.rand(2.5, 7), alpha: 1, s: 1, hat: null, flag: null,
    mode: 'walk', lean: 0, id: Math.random() };
}
const makeCritterG = makeCritter;
const srcs = SRC_POS.map((p, v) => makeCritterG('src', v, p.x, p.y));
const natives = PADS.map((p, v) => makeCritter('dst', v, p.x, p.y + 6));
natives.forEach(n => { n.s = 1.05; });
let tokens = [];        // viajeros temporales de la ejecución
let residents = [];     // imágenes que se quedan en los nidos tras traducir
const bubbles = [];
const particles = [];

const blocks = {};
Object.keys(AlgebraCore.BLOCKS).forEach((id, i) => { const p = trayPos(i); blocks[id] = { id, x: p.x, y: p.y + 200, vx: 0, vy: 0, rot: 0, vr: 0, drag: false, shake: 0, sq: Spring() }; });
const chips = { 2: { n: 2, x: PORT.x, y: PORT.y, s: 1, inBelly: true, fly: false, drag: false }, 4: { n: 4, x: SOCKET.x, y: SOCKET.y, s: 1, inBelly: false, fly: false, drag: false } };

const machine = { awake: false, gear: 0, gearSpeed: 0, gearTarget: 0, shake: 0, mouth: 0, glow: 0, mood: 'sleep', steam: 0,
  lever: Spring(-1.15), slotShake: {}, padGate: 0, cloth: 1, phantom: 1, bellyShake: 0, cordWob: [0, 0, 0, 0], cordPulse: [0, 0, 0, 0],
  stamp: Spring(0), knobPress: {}, reverseOut: 0, ticketOut: 0, rjackPress: [0, 0], holeOpen: [0, 0, 0, 0], parity: 0 };
function syncVisualFromConfig() {
  const c = L.config;
  machine.cloth = c.slots.ley === 'CONSERVA' ? 0 : 1;
  machine.padGate = c.slots.puerta === 'EXCLUSIVO' ? 1 : c.slots.puerta === 'COMPARTIDO' ? 0 : .5;
  machine.phantom = c.chip === 2 ? 0 : 1;
  machine.awake = c.slots.motor === 'ARRANCA';
}
syncVisualFromConfig();
machine.lever.target = -1.15;
const boss = { x: 800, y: 104, expr: 'sleep', exprT: 0, bounce: Spring(0), blinkT: 2, blink: 0, lookX: 0, armUp: 0, tap: 0 };
const scaleS = { beam: Spring(0), panA: null, panB: null, valA: null, valB: null, show: 0, pair: null, flash: 0 };
const ledger = { cells: Array(16).fill(null), prev: Array(16).fill(null), pop: Array(16).fill(0), selected: -1, stale: false, blink: -1 };
const marks = { funciona: false, comprende: false, investiga: false, pop: { funciona: 0, comprende: 0, investiga: 0 } };
const order = { sums: false, visits: false, done: false, stampTxt: null, stampT: 0, reveal: 1, approved: 0 };
const progress = { runs: 0, solved: false, rejections: 0, failedSigs: {}, lastRun: null, lastProgress: 0, hintIdx: {}, hintGlow: 0,
  autoHinted: false, formula: 0, firstDragDone: false, firstCordDone: false, reportOpen: false, report: 0, solvedSig: null, eatenOnce: false };

let hold = null;   // cable en la mano: { x, viaDrag }
let pointer = { x: -999, y: -999, down: false, inside: false };
let focusId = null, hoverId = null, kbdMode = false;
let drag = null;

/* ================================================================
 * BURBUJAS, PARTÍCULAS Y REACCIONES
 * ============================================================== */
function say(owner, text, o) {
  o = o || {};
  for (let i = bubbles.length - 1; i >= 0; i--) if (bubbles[i].owner === owner) bubbles.splice(i, 1);
  if (bubbles.length > 3) bubbles.shift();
  bubbles.push({ owner, text, t: 0, dur: o.dur || Math.max(2.2, text.length * .065), s: 0, side: o.side || 0 });
  if (o.announce !== false) announce(text);
}
function ownerPos(o) {
  if (o === 'boss') return { x: boss.x + 66, y: boss.y - 30 };
  if (o === 'machine') return { x: MACH.x + MACH.w / 2, y: MACH.y + 40 };
  if (o === 'belly') return { x: PORT.x + 40, y: PORT.y - 40 };
  if (o === 'enc') return { x: enc.x + 30, y: enc.y - 130 };
  if (o && o.x !== undefined) return { x: o.x, y: o.y - 60 * (o.s || 1) };
  return { x: W / 2, y: 80 };
}
function confetti(x, y, n, cols) {
  if (SET.reduced) n = Math.min(n, 10);
  for (let i = 0; i < n; i++) particles.push({ x, y, vx: U.rand(-260, 260), vy: U.rand(-420, -120), r: U.rand(4, 9), rot: U.rand(0, 6), vr: U.rand(-8, 8),
    col: U.pick(cols || [PAL.mustard, PAL.bone, PAL.ultra, PAL.c1, PAL.plum]), life: U.rand(1.4, 2.4), t: 0, kind: 'paper' });
}
function puff(x, y, n, col) {
  for (let i = 0; i < n; i++) particles.push({ x, y, vx: U.rand(-90, 90), vy: U.rand(-110, -20), r: U.rand(5, 12), rot: 0, vr: 0, col: col || PAL.bone, life: U.rand(.5, .9), t: 0, kind: 'puff' });
}
function steamAt(x, y, n) { for (let i = 0; i < n; i++) particles.push({ x: x + U.rand(-10, 10), y, vx: U.rand(-30, 30), vy: U.rand(-160, -80), r: U.rand(8, 16), rot: 0, vr: 0, col: 'rgba(251,239,220,.85)', life: U.rand(.7, 1.3), t: 0, kind: 'puff' }); }

function hopC(c, h) { tw.add(c, { hop: h || 26 }, motion(.16), { ease: Ease.out, done: () => tw.add(c, { hop: 0 }, motion(.22), { ease: Ease.in, done: () => poke(c, 3, -3) }) }); }
function bossDo(e, dur) { boss.expr = e; boss.exprT = dur || 2; boss.bounce.vel += e === 'cheer' ? -260 : -60; }

const counters = {};
function nth(key) { counters[key] = (counters[key] || 0) + 1; return counters[key]; }

/* ================================================================
 * CAMBIOS DEL ESTADO LÓGICO → MUNDO
 * ============================================================== */
let lastCfg = JSON.parse(JSON.stringify(L.config));
L.on((type, d) => {
  const cfg = L.config, prev = lastCfg;
  lastCfg = JSON.parse(JSON.stringify(cfg));
  progress.lastProgress = realT;
  if (Run.active) jamRun();
  // resultados anteriores quedan obsoletos (se conservan como referencia en la cinta)
  if (residents.length) { for (const r of residents) { tw.add(r, { alpha: 0, s: .2 }, motion(.35), { done: () => { residents = residents.filter(q => q !== r); } }); } }
  if (ledger.cells.some(c => c)) ledger.stale = true;
  scaleS.show = 0;

  // --- reglas que entran o salen ---
  for (const s of AlgebraCore.SLOTS) {
    if (prev.slots[s] === cfg.slots[s]) continue;
    const added = cfg.slots[s], removed = prev.slots[s];
    if (added) { const b = blocks[added]; b.sq.vel += 9; Sound.snap(); machine.slotShake[s] = .25; }
    if (s === 'motor') { if (added) wake(); else sleep(); }
    if (s === 'ley') tw.add(machine, { cloth: added ? 0 : 1 }, motion(.6), { ease: Ease.back });
    if (s === 'total') {
      if (!added) { const lost = [0, 1, 2, 3].filter(x => cfg.map[x] === null); lost.forEach(x => { setExpr(srcs[x], 'worried', 2.5); srcs[x].shake = .5; }); if (lost.length && nth('hole') <= 2) say(srcs[lost[0]], '¿Y ese agujero?'); }
      else [0, 1, 2, 3].forEach(x => { if (cfg.map[x] === null) setExpr(srcs[x], 'happy', 1); });
    }
    if (s === 'puerta') {
      tw.add(machine, { padGate: added === 'EXCLUSIVO' ? 1 : added === 'COMPARTIDO' ? 0 : .5 }, motion(.5), { ease: Ease.back });
      if (added === 'COMPARTIDO') { natives.forEach(n => { setExpr(n, 'happy', 1.2); hopC(n, 14); }); if (nth('share') === 1) say(natives[0], '¡Ahora caben más!'); }
    }
    if (s === 'ley' && !added && nth('noley') === 1) { say('boss', 'Sin comprobar se trabaja más rápido.'); bossDo('proud', 2); }
  }
  const evicted = d.result && d.result.evicted;
  if (evicted && evicted.length) {
    evicted.forEach((e, i) => { const c = srcs[e.x]; setExpr(c, 'angry', 2.4); c.shake = .6; Sound.unplug(); puff(RJACK[e.y].x, RJACK[e.y].y, 6, PAL.mustard); });
    const e0 = evicted[0];
    later(.3, () => { say(srcs[e0.keeper], U.pick(['¡Yo llegué antes!', 'Aquí sólo cabe uno. Yo.', 'Las normas son las normas.'])); setExpr(srcs[e0.keeper], 'proud', 2); });
    later(1.4, () => say(srcs[e0.x], U.pick(['¡Por un segundo!', 'Esto es injusto.', '¿Y ahora a dónde voy?'])));
  }
  // --- cables ---
  for (let x = 0; x < 4; x++) {
    if (prev.map[x] === cfg.map[x]) continue;
    if (cfg.map[x] !== null) {
      machine.cordWob[x] = 28; Sound.plug(); poke(srcs[x], -4, 5); setExpr(srcs[x], 'happy', 1.2); Sound.voice(x);
      if (!progress.firstCordDone) progress.firstCordDone = true;
      const y = cfg.map[x], sharers = [0, 1, 2, 3].filter(k => cfg.map[k] === y);
      if (sharers.length > 1 && d.label === 'plug') {
        const other = sharers.find(k => k !== x);
        srcs[x].lookX = other < x ? -1 : 1; srcs[other].lookX = other < x ? 1 : -1;
        const n = nth('double');
        if (n <= 3) {
          later(.25, () => { say(srcs[other], U.pick(['¿Tú también vas al ' + y + '?', 'Ese nido es mío.', 'Yo llegué primero.'])); setExpr(srcs[other], 'angry', 2); });
          later(1.5, () => { say(srcs[x], U.pick(['Hay sitio para los dos.', '¡Nadie dijo exclusivo!', 'Mi cable es más bonito.'])); setExpr(srcs[x], 'proud', 2); });
        } else { setExpr(srcs[other], 'angry', 1.5); srcs[other].shake = .3; }
      }
    } else if (prev.map[x] !== null && !(evicted && evicted.some(e => e.x === x))) { Sound.unplug(); setExpr(srcs[x], 'worried', 1.2); }
  }
  // --- fichas del cartel ---
  if (prev.chip !== cfg.chip) {
    if (prev.chip !== null) eatChip(prev.chip);
    if (cfg.chip !== null) spitChip(cfg.chip);
    tw.add(machine, { phantom: cfg.chip === 2 ? 0 : 1 }, motion(.6));
  }
  if (d.label === 'reset') { say('boss', 'Todo como al principio. DESHACER lo devuelve.'); hold = null; }
  if (d.label === 'undo') { Sound.whoosh(); }
});

function wake() {
  machine.awake = true; machine.gearTarget = .25; machine.shake = .5;
  bossDo('shock', 1.2); Sound.clunk(); Sound.voice('boss');
  later(.8, () => { say('boss', U.pick(['¡¿Eh?! ¡Turno de noche!', '¡Despierto! ¡Despierto!', '¿Quién encendió esto?'])); bossDo('idle', 1); });
}
function sleep() { machine.awake = false; machine.gearTarget = 0; bossDo('sleep', 99); say('boss', 'Fin de turno.'); Sound.snore(); }
function eatChip(n) {
  const c = chips[n]; c.fly = true; c.inBelly = false; progress.eatenOnce = true;
  tw.add(c, { x: MOUTH.x, y: MOUTH.y + 6, s: .7 }, motion(.45), { ease: Ease.antic, done: () => {
    tw.add(machine, { mouth: 1 }, .08, { done: () => tw.add(machine, { mouth: 0 }, .2, { delay: .1 }) });
    Sound.chomp(); Sound.burp(); machine.bellyShake = .6; c.fly = false; c.inBelly = true; c.s = 1;
    if (n === 4 && nth('eat4') === 1) later(.6, () => say('belly', '*eructo* ...me comí el cuatro.'));
  } });
}
function spitChip(n) {
  const c = chips[n], from = bellySlotWorld(n);
  c.inBelly = false; c.fly = true; c.x = from.x; c.y = from.y; c.s = .55;
  Sound.pop(); machine.bellyShake = .4;
  tw.add(c, { x: SOCKET.x, y: SOCKET.y, s: 1 }, motion(.6), { ease: Ease.back, done: () => { c.fly = false; Sound.snap(); } });
}
function bellyIndex(n) { return L.config.belly.indexOf(n); }
function bellySlotWorld(n) { const i = Math.max(0, bellyIndex(n)); return { x: PORT.x - 18 + i * 36, y: PORT.y + 22 }; }

/* ================================================================
 * EJECUCIÓN DE LA MÁQUINA
 * ============================================================== */
const Run = { active: false, gen: null, wait: 0, scale: 1, paused: false, kind: null, report: null };
function runSpeed() { return (SET.reduced ? 1.6 : 1) * Run.scale; }

function pullLever() {
  if (Run.active) { Run.scale = 7; Run.paused = false; return; }  // tirar otra vez: avanzar rápido
  machine.lever.target = .35; Sound.lever();
  later(.25, () => { machine.lever.target = -1.15; });
  const pre = L.preflight();
  if (!pre.ok) {
    machine.lever.vel -= 30; Sound.clunk(); machine.shake = .25;
    const p = pre.problems[0];
    if (p === 'motor') { Sound.snore(); bossDo('sleep', 99); say('boss', U.pick(['zzz…', 'zzz… cinco minutos más…', 'zzz… (la palanca no hace nada)'])); }
    else if (p === 'chip') { bossDo('shrug', 2); say('boss', '¿Sumar módulo… qué? El cartel no tiene número.'); }
    else if (p === 'puerta') { bossDo('shrug', 2); say('boss', '¿Quién entra en los nidos? Falta la regla de PUERTA.'); }
    return;
  }
  const rep = L.run();
  startRun('full', runGen(rep), rep);
}

function startRun(kind, gen, rep) {
  hold = null;
  Run.active = true; Run.gen = gen; Run.wait = 0; Run.scale = 1; Run.paused = false; Run.kind = kind; Run.report = rep;
  machine.gearTarget = 1.6; machine.mood = 'run';
  progress.lastProgress = realT;
}
function endRun() { Run.active = false; Run.gen = null; machine.gearTarget = machine.awake ? .25 : 0; machine.mood = 'idle'; Run.scale = 1; }
function jamRun() {
  Run.gen = null; Run.active = false;
  rtw.list = [];
  for (const t of tokens) { t.mode = 'walk'; tw.add(t, { y: t.y + 160, alpha: 0 }, .7, { ease: Ease.in }); setExpr(t, 'shock', 2); }
  later(.75, () => { tokens = []; });
  machine.shake = 1; machine.steam = 1.2; machine.gearTarget = 0; Sound.jam(); Sound.steam(); steamAt(MACH.x + 80, MACH.y + 20, 8);
  bossDo('panic', 2.2);
  say('boss', U.pick(['¡¿Cuál de las dos reglas obedezco?!', '¡No cambies las normas a mitad de turno!', '¡Atasco! ¡Dos versiones a la vez!']));
  later(1.6, () => { machine.gearTarget = machine.awake ? .25 : 0; });
  machine.mood = 'idle'; Run.scale = 1;
}

function updateRun(dt) {
  if (!Run.active || Run.paused) return;
  const d = dt * runSpeed();
  rtw.update(d);
  Run.wait -= d;
  let guard = 0;
  while (Run.gen && Run.wait <= 0 && guard++ < 50) {
    const r = Run.gen.next();
    if (r.done) { Run.gen = null; break; }
    Run.wait += r.value || 0;
  }
  if (!Run.gen && !rtw.list.length) endRun();
}

/* --- viajes de fichas --- */
function newToken(kind, v, x, y, o) {
  const t = makeCritter(kind, v, x, y); t.s = (o && o.s) || .78; t.hat = o && o.hat !== undefined ? o.hat : null; t.flag = (o && o.flag) || null;
  t.mode = 'walk'; tokens.push(t); return t;
}
function removeToken(t) { tokens = tokens.filter(q => q !== t); }
/* Encadena tramos: [{pts, dur, mode, hops, start(), end()}] sobre el reloj de ejecución. */
function journey(t, legs, done) {
  let i = 0;
  const next = () => {
    if (i >= legs.length) { if (done) done(); return; }
    const leg = legs[i++];
    if (leg.start) leg.start();
    if (leg.mode) t.mode = leg.mode;
    if (!leg.pts) { rtw.add(t, { _w: 1 }, leg.dur, { done: () => { if (leg.end) leg.end(); next(); } }); return; }
    const pts = leg.pts.slice(); t._u = 0;
    rtw.add(t, { _u: 1 }, leg.dur, { ease: leg.ease || Ease.inOut, update: () => {
      const p = polyAt(pts, t._u); t.x = p.x; t.y = p.y;
      t.hop = leg.hops ? Math.abs(Math.sin(t._u * Math.PI * leg.hops)) * 14 : 0;
    }, done: () => { t.hop = 0; if (leg.end) leg.end(); next(); } });
  };
  next();
  return legs.reduce((s, l) => s + l.dur, 0);
}
/* De la criatura x (o desde un punto) hasta salir por el destino y=f(x). */
function legsThroughMachine(t, x, y, from) {
  const startP = from || { x: srcs[x].hx, y: srcs[x].hy };
  const out = SRC_OUT[x];
  return [
    { pts: [[startP.x, startP.y], [out.x - 8, out.y]], dur: .42, mode: 'walk', hops: 2 },
    { dur: .1, start: () => { poke(t, -6, 8); Sound.slurp(); } },
    { pts: srcPipe(x), dur: .34, mode: 'pipe' },
    { pts: cordPts(x, y, 0), dur: .5, mode: 'bead', start: () => { machine.cordPulse[x] = 1; } },
    { dur: .12, start: () => { machine.rjackPress[y] = 1; Sound.tick(y); t.kind = 'dst'; t.v = y; t.hat = x; puff(RJACK[y].x, RJACK[y].y, 4, PAL.ultraPale); } },
    { pts: dstPipe(y), dur: .34, mode: 'pipe' },
    { dur: .05, mode: 'walk', start: () => { t.x = DST_IN[y].x; t.y = DST_IN[y].y; t.sx.v = .5; t.sy.v = 1.6; Sound.pop(); } },
  ];
}
function residentSpot(y, k) { const offs = [[-46, 6], [46, 6], [-84, 14], [84, 14]]; const o = offs[k % 4]; return { x: PADS[y].x + o[0], y: PADS[y].y + o[1] }; }

/* Fase de traducción: cada criatura manda una copia a su imagen. */
function sendResident(x, y) {
  const t = newToken('src', x, srcs[x].hx, srcs[x].hy, { s: .78 });
  poke(srcs[x], 5, -5); Sound.voice(x);
  const legs = legsThroughMachine(t, x, y);
  const k = residents.filter(r => r.v === y).length + tokens.filter(q => q._dest === y).length;
  t._dest = y;
  const spot = residentSpot(y, k);
  legs.push({ pts: [[DST_IN[y].x, DST_IN[y].y], [spot.x, spot.y]], dur: .38, hops: 2 });
  return journey(t, legs, () => {
    removeToken(t); const r = makeCritter('dst', y, spot.x, spot.y); r.s = .72; r.hat = x; residents.push(r);
    poke(r, 6, -6); Sound.voice(y === 0 ? 'z0' : 'z1');
    const mates = residents.filter(q => q.v === y && q !== r);
    if (mates.length) { r.lookX = -1; mates[0].lookX = 1; setExpr(r, 'shock', 1); }
    hopC(natives[y], 10);
  });
}

function* runGen(rep) {
  progress.runs++;
  const sig = rep.signature, repeat = (progress.failedSigs[sig] || 0) >= 1;
  ledger.prev = ledger.cells.slice(); ledger.cells = Array(16).fill(null); ledger.stale = false; ledger.selected = -1; ledger.blink = -1;
  residents = [];
  bossDo('focus', 99);
  if (repeat) {
    Run.scale = 1.7; bossDo('impatient', 1.6);
    say('boss', U.pick(['Otra vez esta configuración…', 'Ya sé cómo acaba esto.', 'Lo mismo. Vale. Rápido.']));
    yield .5;
  }
  Sound.whoosh(); yield .35;
  // ---------- 1. traducir ----------
  let halted = null;
  for (let x = 0; x < 4; x++) {
    const y = rep.f[x];
    Sound.rhythm(x);
    if (y === null) {
      if (rep.rules.total) { halted = x; break; }
      fallInHole(x); yield .4; continue;
    }
    sendResident(x, y);
    yield .38;
  }
  if (halted !== null) {
    yield .3;
    const c = srcs[halted];
    const t = newToken('src', halted, c.hx, c.hy, { s: .78 });
    journey(t, [{ pts: [[c.hx, c.hy], [SRC_OUT[halted].x - 10, SRC_OUT[halted].y]], dur: .4, hops: 2 },
      { dur: .3, start: () => { machine.shake = .4; Sound.buzz(); setExpr(t, 'shock', 2); } },
      { pts: [[SRC_OUT[halted].x - 10, SRC_OUT[halted].y], [c.hx + 30, c.hy - 90], [c.hx, c.hy]], dur: .55, ease: Ease.out, start: () => Sound.boing() }],
      () => { removeToken(t); poke(c, 8, -8); setExpr(c, 'sad', 2.5); });
    yield .6;
    say('boss', U.pick(['¿Y éste a dónde va? TODO TIENE IMAGEN, dice la norma.', 'Falta un cable. La regla dice TODO.', '¡Uno sin destino! Así no arranco.']));
    bossDo('shrug', 2);
    yield 1.2;
    finish(rep, 'incomplete'); return;
  }
  yield 1.9;
  if (!rep.rules.conserve) { finish(rep, rep.verdict); return; }
  // ---------- 2. conservar la suma: los 16 pares ----------
  tw.add(scaleS, { show: 1 }, .3);
  yield .4;
  const cx = rep.check.counterexample;
  const showcase = [0, 1, 5];
  for (let i = 0; i < 16; i++) {
    const p = rep.check.pairs[i];
    const full = showcase.indexOf(i) !== -1 || p === cx;
    if (full) {
      const dur = playPair(p, rep);
      yield dur;
      judgePair(i, p, true);
      yield p.ok ? .45 : 1.3;
    } else {
      flickPair(i, p);
      yield Math.max(.07, .2 - i * .008);
    }
  }
  yield .3;
  finish(rep, rep.verdict);
}

function fallInHole(x) {
  const c = srcs[x], t = newToken('src', x, c.hx, c.hy + 20, { s: .78 });
  setExpr(t, 'shock', 3); Sound.fall();
  rtw.add(t, { y: c.hy + 70, s: .1, alpha: 0 }, .6, { ease: Ease.in, done: () => removeToken(t) });
}

/* Un par (a,b) por las dos rutas en paralelo. Devuelve la duración. */
function playPair(p, rep) {
  const a = p.a, b = p.b;
  scaleS.pair = p; scaleS.valA = null; scaleS.valB = null; scaleS.beam.target = 0;
  if (scaleS.panA) removeToken(scaleS.panA); if (scaleS.panB) removeToken(scaleS.panB);
  scaleS.panA = scaleS.panB = null;
  const panA = { x: SCALE.x - 100, y: SCALE.y + 70 }, panB = { x: SCALE.x + 100, y: SCALE.y + 70 };
  // ---- Ruta A: sumar en el reloj grande, luego traducir ----
  const A1 = newToken('src', a, srcs[a].hx, srcs[a].hy, { flag: 'A' }), A2 = newToken('src', b, srcs[b].hx, srcs[b].hy, { flag: 'A' });
  poke(srcs[a], 5, -5); poke(srcs[b], 5, -5);
  const mA = { x: SRC_C.x - 12, y: SRC_C.y - 8 };
  journey(A1, [{ pts: [[A1.x, A1.y], [mA.x - 14, mA.y]], dur: .45, hops: 2 }]);
  journey(A2, [{ pts: [[A2.x, A2.y], [mA.x + 14, mA.y]], dur: .45, hops: 2 }], () => {
    removeToken(A1); removeToken(A2); Sound.pop(); puff(mA.x, mA.y, 6, PAL.mustard);
    const s = p.sumG, R = newToken('src', s, mA.x, mA.y, { flag: 'A' }); R.sx.v = 1.6; R.sy.v = .4;
    reactSum(R, a, b, s);
    const y = rep.f[s];
    const legs = legsThroughMachine(R, s, y, mA);
    legs.push({ pts: [[DST_IN[y].x, DST_IN[y].y], [DST_IN[y].x + 10, 250], [panA.x, panA.y - 4]], dur: .55, ease: Ease.inOut });
    journey(R, legs, () => { scaleS.panA = R; scaleS.valA = y; Sound.clunk(); scaleS.beam.vel += 3; });
  });
  // ---- Ruta B: traducir por separado, luego sumar en el reloj pequeño ----
  const fa = rep.f[a], fb = rep.f[b], mB = { x: DST_C.x - 46, y: DST_C.y + 2 };
  const B1 = newToken('src', a, srcs[a].hx, srcs[a].hy, { flag: 'B' }), B2 = newToken('src', b, srcs[b].hx, srcs[b].hy, { flag: 'B' });
  let arrived = 0;
  const meet = () => {
    if (++arrived < 2) return;
    removeToken(B1); removeToken(B2); Sound.pop(); puff(mB.x, mB.y, 6, PAL.plum);
    const sum = p.routeB;
    if (p.status === 'escape') {
      const ghost = newToken('ghost', sum, mB.x, mB.y, { flag: 'B' }); ghost.sx.v = 1.6; ghost.sy.v = .4; setExpr(ghost, 'shock', 3);
      const ph = PHANTOM[sum] || { x: mB.x + 120, y: mB.y };
      journey(ghost, [{ pts: [[mB.x, mB.y], [ph.x, ph.y]], dur: .5, hops: 2 },
        { dur: .2, start: () => say(ghost, '¡No hay suelo para el ' + sum + '!', { dur: 1.6, announce: false }) },
        { pts: [[ph.x, ph.y], [ph.x, ph.y + 260]], dur: .5, ease: Ease.in, start: () => Sound.fall() }],
        () => { removeToken(ghost); scaleS.valB = 'escape'; });
      return;
    }
    const R = newToken('dst', sum, mB.x, mB.y, { flag: 'B' }); R.sx.v = 1.6; R.sy.v = .4;
    journey(R, [{ pts: [[mB.x, mB.y], [mB.x + 60, 250], [panB.x, panB.y - 4]], dur: .6 }], () => { scaleS.panB = R; scaleS.valB = sum; Sound.clunk(); scaleS.beam.vel -= 3; });
  };
  rtw.add({ d: 0 }, { d: 1 }, .12, { done: () => {
    const l1 = legsThroughMachine(B1, a, fa); l1.push({ pts: [[DST_IN[fa].x, DST_IN[fa].y], [mB.x - 16, mB.y]], dur: .4, hops: 2 });
    const l2 = legsThroughMachine(B2, b, fb); l2.push({ pts: [[DST_IN[fb].x, DST_IN[fb].y], [mB.x + 16, mB.y]], dur: .4, hops: 2 });
    l2.unshift({ dur: .22 });
    journey(B1, l1, meet); journey(B2, l2, meet);
  } });
  return 3.6;
}
/* Personalidad en las sumas del reloj grande. */
function reactSum(R, a, b, s) {
  if (s === 0 && (a || b)) { setExpr(R, 'sleepy', 1.5); R.flat = .9; rtw.add(R, { flat: 0 }, .5, { delay: .3 }); }
  if (a === 2 && b === 2 && nth('2+2') <= 2) say(R, '¿2 y 2… CERO?', { dur: 1.4, announce: false });
  if (s === 3) setExpr(R, 'proud', 1.5);
}
function judgePair(i, p, loud) {
  const st = p.status;
  ledger.cells[i] = st; ledger.pop[i] = 1;
  if (st === 'ok') { scaleS.beam.target = 0; if (loud) { Sound.ding(); [scaleS.panA, scaleS.panB].forEach(t => { if (t) { setExpr(t, 'happy', 1.5); poke(t, 6, -6); } }); } }
  else {
    const vA = p.routeA, vB = st === 'escape' ? -1 : p.routeB;
    scaleS.beam.target = vA > vB ? -.2 : .2;
    if (loud) {
      Sound.buzz(); machine.shake = .35;
      [scaleS.panA, scaleS.panB].forEach(t => { if (t) { setExpr(t, 'angry', 2.4); t.shake = .8; } });
      if (scaleS.panA && scaleS.panB) { later(.2, () => say(scaleS.panA, U.pick(['¡Yo salí primero!', '¡A mí me sumaron antes!', '¡Mentira!']), { dur: 1.5, announce: false })); }
      ledger.blink = i;
    }
  }
  if (loud) announce('Par ' + p.a + ' + ' + p.b + ': ruta A da ' + p.routeA + ', ruta B da ' + (st === 'escape' ? p.routeB + ' (sin casa)' : p.routeB) + '. ' + (st === 'ok' ? 'Coinciden.' : 'No coinciden.'));
}
function flickPair(i, p) {
  scaleS.pair = p; scaleS.valA = p.routeA; scaleS.valB = p.status === 'escape' ? 'escape' : p.routeB;
  if (scaleS.panA) { removeToken(scaleS.panA); scaleS.panA = null; } if (scaleS.panB) { removeToken(scaleS.panB); scaleS.panB = null; }
  judgePair(i, p, false); Sound.tick(i); scaleS.flash = 1;
  machine.cordPulse[p.a] = .6; machine.cordPulse[p.b] = .6;
}

function finish(rep, verdict) {
  progress.lastRun = rep;
  if (progress.formula < 1) progress.formula = 1;
  // la orden de trabajo refleja exactamente la última ejecución (verdad lógica, no acumulada)
  order.sums = rep.order.sums; order.visits = rep.order.visits; order.done = rep.order.done; order.stampTxt = null;
  const exploring = progress.solved && rep.signature !== progress.solvedSig;
  if (exploring && !marks.investiga) { marks.investiga = true; marks.pop.investiga = 1; }
  if (verdict === 'homomorphism' && rep.order.done) {
    bossDo('cheer', 3); machine.shake = .3; confetti(boss.x, boss.y - 10, 60); Sound.signature();
    say('boss', U.pick(['¡Ni una sola suma rota! Rutina, rutina.', '¡Funciona! Como siempre. Bueno… como nunca.', '¡Dieciséis de dieciséis! ¡Me merezco un café!']));
    if (!progress.solved) {
      progress.solved = true; progress.solvedSig = rep.signature; progress.solvedRun = rep; progress.formula = 2;
      marks.funciona = true; marks.pop.funciona = 1;
      later(2.6, revealCollision, 'reveal');
      later(10.5, () => {
        App.levelComplete(1, { homomorfismo: { G: 'Z4', H: 'Z2', f: rep.f.slice(), from: 'máquina 1' } });
        enc.stamp = 1; later(.5, () => { tw.add(order, { approved: 1 }, .25); Sound.clunk(); });
        later(1.2, () => encSay('APROBADO. Siguiente avería: la garra del núcleo. Vuelva a la fábrica (Esc) cuando quiera.', { dur: 5 }));
      }, 'reveal');
    } else later(1.6, () => say(residents.find(r => r.v === 0) || natives[0], 'Seguimos siendo dos aquí.'), 'reveal');
  } else if (verdict === 'homomorphism') {
    bossDo('proud', 2.4); Sound.ding();
    say('boss', 'Técnicamente perfecto: todo al mismo agujero.');
    later(1.7, () => { say(natives[1], '¿Y a mí nadie me visita?'); setExpr(natives[1], 'sad', 3); natives[1].shake = .3; });
    stampOrder('CASI');
  } else if (verdict === 'broken') {
    progress.failedSigs[rep.signature] = (progress.failedSigs[rep.signature] || 0) + 1;
    bossDo('facepalm', 2.4); Sound.kazoo(); machine.steam = .9; steamAt(MACH.x + MACH.w - 60, MACH.y + 30, 6);
    const cx = rep.check.counterexample;
    ledger.selected = rep.check.pairs.indexOf(cx);
    scaleS.pair = cx; scaleS.valA = cx.routeA; scaleS.valB = cx.status === 'escape' ? 'escape' : cx.routeB; scaleS.beam.target = cx.status === 'escape' || cx.routeA > cx.routeB ? -.2 : .2;
    if (scaleS.panA) { removeToken(scaleS.panA); scaleS.panA = null; } if (scaleS.panB) { removeToken(scaleS.panB); scaleS.panB = null; }
    if (cx.status === 'escape') say('boss', '¡' + cx.a + ' + ' + cx.b + ' da ' + cx.routeB + ' allá, y allá no hay ' + cx.routeB + '!');
    else say('boss', U.pick(['Las rutas no se ponen de acuerdo en ' + cx.a + ' + ' + cx.b + '.', 'Ruta A y Ruta B discuten por ' + cx.a + ' + ' + cx.b + '.', '¡En ' + cx.a + ' + ' + cx.b + ' la balanza se tuerce!']));
    if (progress.solved && rep.rules.exclusive) investigateNote();
  } else if (verdict === 'unchecked' || verdict === 'partial-unchecked') {
    bossDo('proud', 2.5); Sound.ding();
    say('boss', U.pick(['¡Traducido! ¿Comprobar? ¿Para qué?', '¡Hecho! No he mirado nada, pero ¡hecho!']));
    stampOrder('SIN COMPROBAR');
  } else if (verdict === 'uncertifiable') {
    bossDo('shrug', 2.4); Sound.kazoo();
    say('boss', 'Algunos se cayeron al agujero. No puedo firmar esto.');
    rep.check.pairs.forEach((p, i) => { ledger.cells[i] = p.status; ledger.pop[i] = 1; });
  } else if (verdict === 'incomplete') {
    stampOrder('INCOMPLETO');
    if (progress.solved && rep.rules.exclusive) investigateNote();
  }
}
function investigateNote() {
  later(1.8, () => { say('boss', 'Cuatro en dos nidos, de uno en uno… imposible. Esta máquina no sabe volver atrás.', { dur: 5 }); bossDo('thinking', 4); });
  if (!marks.investiga) { marks.investiga = true; marks.pop.investiga = 1; }
}
function stampOrder(txt) { order.stampTxt = txt; order.stampT = 1; Sound.clunk(); }

/* La sorpresa: la máquina funciona, pero dos llegaron al mismo sitio. */
function revealCollision() {
  const zeros = residents.filter(r => r.v === 0);
  if (zeros.length >= 2) {
    zeros[0].lookX = 1; zeros[1].lookX = -1;
    say(zeros[0], 'Oye… tú también eres un 0.'); setExpr(zeros[0], 'shock', 2.5);
    later(1.8, () => { say(zeros[1], '¡Pero yo era un 2!'); setExpr(zeros[1], 'angry', 2.5); zeros[1].shake = .4; });
  }
  later(4.0, () => { say('boss', 'El cuatro no se perdió: aquí se agrupan por paridad. Pares al 0, impares al 1.', { dur: 4.4 }); bossDo('thinking', 4); tw.add(machine, { parity: 1 }, motion(.8)); }, 'reveal');
  later(8.6, () => { say('boss', 'Pero dos llegan a cada nido. ¿Sabría desandar el camino?', { dur: 3.6 }); }, 'reveal');
  later(8.8, () => { tw.add(machine, { reverseOut: 1, ticketOut: 1 }, motion(.7), { ease: Ease.back }); Sound.clunk(); }, 'reveal');
}

/* Desandar: pedir a la máquina que reconstruya el origen. */
let reverseY = 0;
function startReverse() {
  if (!progress.solved || Run.active) return;
  const y = reverseY; reverseY = 1 - reverseY;
  const r = L.reverse(y);
  const gen = (function* () {
    const t = newToken('dst', y, PADS[y].x - 46, PADS[y].y + 6, { s: .78 });
    const back = dstPipe(y).slice().reverse();
    journey(t, [{ pts: [[t.x, t.y], [DST_IN[y].x, DST_IN[y].y]], dur: .45, hops: 2 }, { pts: back, dur: .35, mode: 'pipe' }, { dur: .1, mode: 'bead', start: () => { t.x = RJACK[y].x; t.y = RJACK[y].y; } }]);
    yield 1.0;
    if (r.sources.length === 0) { say('boss', 'Nadie llegó al ' + y + '. No hay nada que desandar.'); removeToken(t); return; }
    if (r.unique) {
      const x = r.sources[0], pts = cordPts(x, y, 0).slice().reverse();
      journey(t, [{ pts, dur: .5 }, { pts: srcPipe(x).slice().reverse(), dur: .35, mode: 'pipe' }, { dur: .1, mode: 'walk', start: () => { t.kind = 'src'; t.v = x; t.x = SRC_OUT[x].x; t.y = SRC_OUT[x].y; } }, { pts: [[SRC_OUT[x].x, SRC_OUT[x].y], [srcs[x].hx, srcs[x].hy]], dur: .4, hops: 2 }], () => removeToken(t));
      yield 1.5; say('boss', 'Vuelve al ' + x + '. Sólo había un camino.'); return;
    }
    // varios caminos: la ficha se parte entre los cables y se queda dudando
    t.mode = 'split'; t.splitTo = r.sources; t._u = 0; Sound.buzz(); machine.shake = .3;
    rtw.add(t, { _u: 1 }, .6, { ease: Ease.out });
    yield .9;
    bossDo('shrug', 3);
    say('boss', '¿Venía del ' + r.sources.join(' o del ') + '? No hay forma de saberlo.', { dur: 3.4 });
    yield 2.2;
    rtw.add(t, { alpha: 0 }, .4, { done: () => removeToken(t) });
    yield .5;
    if (!marks.investiga) { marks.investiga = true; marks.pop.investiga = 1; }
  })();
  startRun('reverse', gen, null);
}

/* Repetir un par concreto, a cámara lenta, con la configuración actual. */
function replayPair(i) {
  if (Run.active) return;
  const pre = L.preflight();
  if (!pre.ok) { pullLever(); return; }
  const rep = L.run();
  if (!rep.rules.conserve) { say('boss', 'Sin CONSERVA LA SUMA no comparo nada.'); return; }
  if (!rep.check.total) { say('boss', 'Faltan cables: con huecos no hay rutas que comparar.'); return; }
  ledger.selected = i;
  if (progress.solved && !marks.comprende) { marks.comprende = true; marks.pop.comprende = 1; }
  const p = rep.check.pairs[i];
  startRun('pair', (function* () {
    tw.add(scaleS, { show: 1 }, .3);
    Run.scale = .75;
    yield .2;
    const d = playPair(p, rep); yield d;
    judgePair(i, p, true);
    yield 1;
  })(), rep);
}

/* ================================================================
 * PISTAS (contextuales y escalonadas; nunca la solución completa)
 * ============================================================== */
function hintTopic() {
  const c = L.config, rep = progress.lastRun;
  if (progress.solved) return 'solved';
  if (c.slots.motor !== 'ARRANCA') return 'motor';
  if (!c.slots.puerta) return 'puerta-vacia';
  const mapped = c.map.filter(v => v !== null).length;
  if (c.slots.puerta === 'EXCLUSIVO' && (progress.rejections > 0 || mapped >= 2)) return 'puerta';
  if (mapped < 4) return 'cables';
  if (c.chip === null) return 'ficha-vacia';
  if (c.chip !== 2 && rep) return 'ficha';
  if (c.slots.ley !== 'CONSERVA') return 'ley';
  if (c.slots.total !== 'TODO') return 'todo';
  if (rep && rep.verdict === 'broken' && JSON.stringify(rep.f) === JSON.stringify(c.map) && rep.chip === c.chip) {
    if (rep.check.counterexample.status === 'escape') return 'ficha';
    return c.map[0] !== 0 ? 'fallo-cero' : 'fallo';
  }
  if (rep && rep.verdict === 'homomorphism' && !rep.order.visits && JSON.stringify(rep.f) === JSON.stringify(c.map)) return 'visitas';
  if (c.chip !== 2) return 'ficha';
  return 'palanca';
}
const HINTS = {
  motor: [['La máquina ronca. A su riel le falta una pieza.', 'slot:motor'], ['En la bandeja hay un bloque con muesca redonda: LA MÁQUINA ARRANCA.', 'block:ARRANCA']],
  'puerta-vacia': [['La ranura PUERTA está vacía: nadie decide quién entra en los nidos.', 'slot:puerta']],
  puerta: [['Cada nido sólo deja pasar a uno. Cuatro criaturas, dos nidos…', 'pads'], ['¿Quién puso esa norma? El bloque DESTINO EXCLUSIVO se puede cambiar.', 'block:EXCLUSIVO'], ['En la bandeja hay otro bloque con la misma muesca triangular.', 'block:COMPARTIDO']],
  cables: [['Cada criatura del reloj grande necesita un cable hasta un nido.', 'src'], ['Arrastra una criatura hasta un nido. Con teclado: pulsa su número y luego 0 o 1.', 'src']],
  'ficha-vacia': [['El cartel del mundo pequeño se quedó sin número.', 'socket'], ['Las fichas están en la barriga de la máquina. Mira por la ventanilla.', 'port']],
  ficha: [['Mira el cartel del mundo pequeño: ¿con qué número suma allí?', 'socket'], ['En un mundo con sólo 0 y 1, sumar módulo 4 deja resultados sin casa.', 'socket'], ['La ficha que buscas está dentro de la máquina. Asómate a la ventanilla.', 'port']],
  ley: [['Sin CONSERVA LA SUMA la máquina traduce pero no comprueba nada.', 'slot:ley']],
  todo: [['La orden quiere que viajen todos. Sin TODO TIENE IMAGEN alguno se cae al agujero.', 'slot:total']],
  'fallo-cero': [['Mira el par marcado en la cinta. Púlsalo para verlo otra vez.', 'ledger'], ['0 + 0 = 0. Si el 0 viaja al 1, allá 1 + 1 no da 1.', 'src:0'], ['¿Qué nido no cambia nada al sumarlo?', 'pads']],
  fallo: [['Mira el par marcado en la cinta. Púlsalo para verlo otra vez.', 'ledger'], ['2 = 1 + 1. Si sabes a dónde va el 1, ¿a dónde debe ir el 2?', 'src:2'], ['Y 3 = 2 + 1. Sigue la cadena alrededor del reloj.', 'src:3']],
  visitas: [['Las sumas sobreviven, pero el 1 de allá se queda solo. La orden pide visitas para todos.', 'pads'], ['¿Hay otra forma de repartir que también conserve las sumas?', 'src']],
  palanca: [['Todo parece listo. Tira de la palanca.', 'lever']],
  solved: [['¿Sabe la máquina desandar el camino? Prueba DESANDAR.', 'knob:reverse'], ['Abre «¿Qué pasó?», el papel que asoma por la ranura.', 'ticket'], ['¿Y si cada nido admitiera un solo visitante? Vuelve a poner DESTINO EXCLUSIVO y ejecuta.', 'block:EXCLUSIVO']],
};
let pointerHint = null;
function giveHint(auto) {
  const topic = hintTopic(), list = HINTS[topic];
  const idx = progress.hintIdx[topic] || 0;
  const h = list[Math.min(idx, list.length - 1)];
  if (!auto) progress.hintIdx[topic] = idx + 1;
  say('boss', h[0], { dur: Math.max(3.5, h[0].length * .07) });
  bossDo('thinking', 3);
  pointerHint = { target: h[1], t: 0, dur: 4.5 };
  progress.hintGlow = 0; progress.lastProgress = realT;
  machine.knobPress.hint = 1; Sound.voice('boss');
}
function hintTargetPos(tg) {
  const [k, v] = tg.split(':');
  if (k === 'slot') { const r = SLOT_RECT[v]; return { x: r.x + r.w / 2, y: r.y + r.h / 2 }; }
  if (k === 'block') return { x: blocks[v].x, y: blocks[v].y };
  if (k === 'pads') return { x: PADS[0].x, y: (PADS[0].y + PADS[1].y) / 2 };
  if (k === 'src') return v !== undefined ? { x: srcs[+v].hx, y: srcs[+v].hy - 20 } : { x: SRC_C.x, y: SRC_C.y };
  if (k === 'socket') return SOCKET;
  if (k === 'port') return PORT;
  if (k === 'lever') return { x: LEVER.x + 40, y: LEVER.y - 90 };
  if (k === 'ledger') return { x: LEDGER.gx + 70, y: LEDGER.gy + 70 };
  if (k === 'knob') return { x: KNOBS.find(o => o.id === v).x, y: KNOB_Y };
  if (k === 'ticket') return { x: TICKET.x + 60, y: TICKET.y + 20 };
  return { x: W / 2, y: H / 2 };
}

/* ================================================================
 * ACCIONES DEL JUGADOR
 * ============================================================== */
function tryPlug(x, y) {
  const r = L.plug(x, y);
  hold = null;
  if (r.rejected && r.reason === 'exclusive') {
    progress.rejections++;
    const occ = srcs[r.occupant], me = srcs[x];
    Sound.clunk(); me.shake = .6; setExpr(me, 'sad', 2); setExpr(occ, 'proud', 1.6); poke(natives[y], 6, -6);
    machine.padGate = 1.25; tw.add(machine, { padGate: 1 }, .4, { ease: Ease.elastic });
    const n = nth('reject');
    if (n <= 2) say(natives[y], U.pick(['¡Ocupado! Aquí ya vive la visita del ' + r.occupant + '.', '¡Uno por nido! Lo dice el cartel.']));
    else if (n === 3) say('boss', 'La regla EXCLUSIVO no deja compartir nido.');
    announce('Rechazado: el nido ' + y + ' ya está ocupado por el ' + r.occupant + ' y la regla es EXCLUSIVO.');
    return false;
  }
  announce('Cable del ' + x + ' al nido ' + y + '.');
  return true;
}
function clickBlock(id) {
  if (!progress.firstDragDone) progress.firstDragDone = true;
  const inSlot = AlgebraCore.SLOTS.find(s => L.config.slots[s] === id);
  if (inSlot) { L.removeBlock(id); Sound.click(); announce('Regla ' + AlgebraCore.BLOCKS[id].text.join(' ') + ' retirada.'); }
  else { L.insertBlock(id); announce('Regla ' + AlgebraCore.BLOCKS[id].text.join(' ') + ' encajada en ' + SLOT_NAMES[AlgebraCore.BLOCKS[id].slot] + '.'); }
}
function dropBlock(id, p) {
  const b = blocks[id]; b.drag = false;
  const slot = AlgebraCore.SLOTS.find(s => { const r = SLOT_RECT[s]; return p.x > r.x - 20 && p.x < r.x + r.w + 20 && p.y > r.y - 26 && p.y < r.y + r.h + 26; });
  if (slot) {
    const r = L.insertBlock(id, slot);
    if (r.rejected) {
      machine.slotShake[slot] = .5; b.shake = .6; b.vy -= 600; Sound.clunk();
      if (nth('shape') <= 2) say('boss', U.pick(['Esa muesca no encaja ahí.', 'Forma equivocada. La ranura protesta.']));
      announce('Ese bloque no encaja en la ranura ' + SLOT_NAMES[slot] + '.');
    } else announce('Regla ' + AlgebraCore.BLOCKS[id].text.join(' ') + ' encajada.');
  } else {
    if (AlgebraCore.SLOTS.some(s => L.config.slots[s] === id)) { L.removeBlock(id); announce('Regla retirada.'); }
    b.vy -= 200; Sound.click();
  }
}
function knobAct(id) {
  machine.knobPress[id] = 1; Sound.click();
  if (id === 'pause') { if (Run.active) { Run.paused = !Run.paused; say('boss', Run.paused ? 'Pausa. Nadie se mueve.' : '¡Seguimos!', { dur: 1.2 }); } else say('boss', 'No hay nada que pausar.', { dur: 1.4 }); }
  else if (id === 'undo') { const r = L.undo(); if (!r.ok) say('boss', 'No hay nada que deshacer.', { dur: 1.4 }); else announce('Deshecho.'); }
  else if (id === 'reset') { L.reset(); }
  else if (id === 'hint') giveHint(false);
  else if (id === 'replay') { const i = ledger.selected >= 0 ? ledger.selected : (progress.lastRun && progress.lastRun.check && progress.lastRun.check.counterexample ? progress.lastRun.check.pairs.indexOf(progress.lastRun.check.counterexample) : 5); replayPair(i); }
  else if (id === 'reverse') startReverse();
}
function openReport() { App.showReport(1); if (progress.solved && !marks.comprende) { marks.comprende = true; marks.pop.comprende = 1; } }
function closeReport() { tw.add(progress, { report: 0 }, motion(.25), { done: () => { progress.reportOpen = false; } }); }

/* ================================================================
 * OBJETOS INTERACTIVOS (ratón, táctil y teclado comparten la lista)
 * ============================================================== */
function interactives() {
  const list = [], cfg = L.config;
  if (progress.reportOpen) { list.push({ id: 'report-close', kind: 'report', x: 0, y: 0, w: W, h: H, label: 'Cerrar informe', act: closeReport }); return list; }
  KNOBS.forEach(k => { if (k.id === 'reverse' && machine.reverseOut < .5) return; list.push({ id: 'knob:' + k.id, kind: 'knob', x: k.x - 26, y: KNOB_Y - 26, w: 52, h: 52, label: k.label + ' (' + k.key + ')', act: () => knobAct(k.id) }); });
  if (order.reveal > .5) list.push({ id: 'formula', kind: 'knob', x: 344, y: 80, w: 52, h: 46, label: 'Fórmula (F)', act: toggleFormula });
  list.push({ id: 'lever', kind: 'lever', x: LEVER.x - 30, y: LEVER.y - 150, w: 90, h: 170, label: 'Palanca: ejecutar la máquina (R)', act: pullLever });
  if (machine.ticketOut > .5) list.push({ id: 'ticket', kind: 'ticket', x: TICKET.x, y: TICKET.y - 30 * machine.ticketOut, w: TICKET.w, h: TICKET.h, label: 'Informe de la máquina', act: openReport });
  Object.values(blocks).forEach(b => list.push({ id: 'block:' + b.id, kind: 'block', ref: b.id, x: b.x - BLOCK_W / 2, y: b.y - BLOCK_H / 2, w: BLOCK_W, h: BLOCK_H,
    label: 'Bloque ' + AlgebraCore.BLOCKS[b.id].text.join(' ') + (AlgebraCore.SLOTS.some(s => cfg.slots[s] === b.id) ? ', activo' : ', en la bandeja'), act: () => clickBlock(b.id) }));
  if (cfg.chip !== null) list.push({ id: 'chip:socket', kind: 'chip', ref: cfg.chip, x: SOCKET.x - 22, y: SOCKET.y - 22, w: 44, h: 44, label: 'Ficha ' + cfg.chip + ' del cartel (retirar)', act: () => { L.removeChip(); } });
  cfg.belly.forEach(n => { const p = bellySlotWorld(n); list.push({ id: 'chip:belly' + n, kind: 'belly', ref: n, x: p.x - 18, y: p.y - 18, w: 36, h: 36, label: 'Ficha ' + n + ' en la barriga de la máquina', act: () => { L.setChip(n); announce('Ficha ' + n + ' al cartel.'); } }); });
  srcs.forEach(c => list.push({ id: 'src:' + c.v, kind: 'src', ref: c.v, x: c.hx - 38, y: c.hy - 70, w: 76, h: 86, label: 'Criatura ' + c.v + ' del reloj grande' + (cfg.map[c.v] !== null ? ', cable al ' + cfg.map[c.v] : ', sin cable'),
    act: () => { if (hold && hold.x === c.v) { hold = null; return; } hold = { x: c.v }; Sound.voice(c.v); poke(c, 5, -5); announce('Cable del ' + c.v + ' en la mano. Elige un nido: 0 o 1.'); } }));
  LJACK.forEach((j, v) => list.push({ id: 'ljack:' + v, kind: 'src', ref: v, x: j.x - 18, y: j.y - 16, w: 36, h: 32, nofocus: true, act: () => { hold = hold && hold.x === v ? null : { x: v }; } }));
  PADS.forEach((p, y) => list.push({ id: 'pad:' + y, kind: 'pad', ref: y, x: p.x - 62, y: p.y - 50, w: 124, h: 84, label: 'Nido ' + y + ' del reloj pequeño', act: () => { if (hold) tryPlug(hold.x, y); else { hopC(natives[y], 14); Sound.voice(y ? 'z1' : 'z0'); } } }));
  RJACK.forEach((j, y) => list.push({ id: 'rjack:' + y, kind: 'pad', ref: y, x: j.x - 18, y: j.y - 16, w: 36, h: 32, nofocus: true, act: () => { if (hold) tryPlug(hold.x, y); } }));
  for (let i = 0; i < 16; i++) { const a = (i / 4) | 0, b = i % 4, r = ledgerCell(i); list.push({ id: 'cell:' + i, kind: 'cell', ref: i, x: r.x, y: r.y, w: r.w, h: r.h, label: 'Par ' + a + ' + ' + b + (ledger.cells[i] ? ': ' + statusWord(ledger.cells[i]) : '') + '. Enter para verlo.', act: () => replayPair(i) }); }
  list.push({ id: 'port', kind: 'port', x: PORT.x - PORT.r, y: PORT.y - PORT.r, w: PORT.r * 2, h: PORT.r * 2, nofocus: true, act: () => { machine.bellyShake = .5; if (nth('port') <= 2) say('belly', U.pick(['¡Eh! Eso es mi barriga.', 'Ahí dentro hay… otra máquina. No preguntes.'])); } });
  return list;
}
function statusWord(s) { return { ok: 'coinciden', fail: 'no coinciden', escape: 'resultado sin casa', undefined: 'sin definir' }[s] || ''; }
function ledgerCell(i) { const a = (i / 4) | 0, b = i % 4; return { x: LEDGER.gx + b * LEDGER.cell, y: LEDGER.gy + a * LEDGER.cell, w: LEDGER.cell - 4, h: LEDGER.cell - 4 }; }
function hit(p, list) {
  // orden de prioridad: lo más pequeño y delante primero
  const pri = { report: 0, toggle: 1, knob: 1, belly: 1, chip: 2, block: 2, ticket: 2, lever: 3, cell: 3, src: 4, pad: 5, port: 6 };
  const hits = list.filter(o => p.x >= o.x && p.x <= o.x + o.w && p.y >= o.y && p.y <= o.y + o.h);
  hits.sort((a, b) => (pri[a.kind] - pri[b.kind]));
  return hits[0] || null;
}
function cordAt(p) {
  const cfg = L.config;
  for (let x = 0; x < 4; x++) { if (cfg.map[x] === null) continue; const pts = cordPts(x, cfg.map[x], 0); for (const q of pts) if (Math.hypot(q[0] - p.x, q[1] - p.y) < 9) return x; }
  return null;
}

/* ---------------- puntero ---------------- */
/* ---------------- puntero (la aplicación entrega coordenadas del mundo) ---------------- */
function pointerDown(p) {
  if (intro.active) { skipIntro(); return; }
  kbdMode = false; App.levelStarted(1);
  pointer.x = p.x; pointer.y = p.y; pointer.down = true; pointer.inside = true;
  const it = hit(p, interactives());
  drag = { item: it, sx: p.x, sy: p.y, moved: false, cord: it ? null : cordAt(p) };
  if (it && it.kind === 'block') { const b = blocks[it.ref]; drag.offX = b.x - p.x; drag.offY = b.y - p.y; }
}
function pointerMove(p) {
  pointer.x = p.x; pointer.y = p.y; pointer.inside = true;
  if (!drag) { const it = hit(p, interactives()); hoverId = it ? it.id : null; App.setCursor(it ? (it.kind === 'block' || it.kind === 'src' ? 'grab' : 'pointer') : (cordAt(p) !== null ? 'pointer' : 'default')); return; }
  if (!drag.moved && Math.hypot(p.x - drag.sx, p.y - drag.sy) > 7) {
    drag.moved = true;
    const it = drag.item;
    if (it && it.kind === 'block') { blocks[it.ref].drag = true; Sound.click(); progress.firstDragDone = true; }
    else if (it && it.kind === 'src') { hold = { x: it.ref, viaDrag: true }; Sound.voice(it.ref); }
    else if (it && it.kind === 'pad' && it.id.startsWith('rjack')) {
      const y = it.ref, xs = [0, 1, 2, 3].filter(x => L.config.map[x] === y).sort((a, b) => L.config.plugOrder[b] - L.config.plugOrder[a]);
      if (xs.length) { hold = { x: xs[0], viaDrag: true, pulled: true }; L.unplug(xs[0]); }
    } else if (it && it.kind === 'chip') { L.removeChip(); drag.item = null; }
    else if (it && it.kind === 'belly') { chips[it.ref].drag = true; chips[it.ref].inBelly = false; }
  }
  if (drag.moved && drag.item && drag.item.kind === 'block') { const b = blocks[drag.item.ref]; b.tx = p.x + drag.offX; b.ty = p.y + drag.offY; }
  if (drag.moved && drag.item && drag.item.kind === 'belly') { const c = chips[drag.item.ref]; c.x = p.x; c.y = p.y; c.s = 1; }
  App.setCursor('grabbing');
}
function pointerUp(p) {
  if (!drag) return;
  pointer.down = false;
  const it = drag.item;
  if (!drag.moved) {
    if (it) { if (hold && it.kind !== 'pad' && it.kind !== 'src') hold = null; it.act(); }
    else if (drag.cord !== null) { L.unplug(drag.cord); announce('Cable del ' + drag.cord + ' desenchufado.'); }
    else if (hold) { hold = null; }
  } else if (it && it.kind === 'block') dropBlock(it.ref, p);
  else if (it && it.kind === 'belly') {
    const c = chips[it.ref]; c.drag = false;
    if (Math.hypot(p.x - SOCKET.x, p.y - SOCKET.y) < 70) L.setChip(it.ref);
    else { const q = bellySlotWorld(it.ref); tw.add(c, { x: q.x, y: q.y }, .3, { done: () => { c.inBelly = true; } }); }
  } else if (hold && hold.viaDrag) {
    const target = hit(p, interactives());
    if (target && target.kind === 'pad') tryPlug(hold.x, target.ref);
    else { const c = srcs[hold.x]; poke(c, 9, -7); Sound.boing(); hold = null; }
  }
  drag = null;
}
function pointerCancel() { if (drag && drag.item && drag.item.kind === 'block') blocks[drag.item.ref].drag = false; drag = null; hold = null; }
function pointerLeave() { pointer.inside = false; }

/* ---------------- teclado ---------------- */
function focusables() { return interactives().filter(o => !o.nofocus && o.kind !== 'report'); }
function moveFocus(dir) {
  const f = focusables(); if (!f.length) return;
  let i = f.findIndex(o => o.id === focusId);
  if (hold) { const pads = f.filter(o => o.kind === 'pad'); const j = pads.findIndex(o => o.id === focusId); focusId = pads[(j + dir + pads.length) % pads.length].id; }
  else { i = (i + dir + f.length) % f.length; focusId = f[i].id; }
  const o = f.find(q => q.id === focusId); if (o && o.label) announce(o.label);
}
function onKey(e) {
  const k = e.key;
  if (intro.active) { if (k === 'Escape') return false; skipIntro(); return true; }
  if (k === 'Tab') { kbdMode = true; moveFocus(e.shiftKey ? -1 : 1); return true; }
  if (k === 'ArrowRight' || k === 'ArrowDown') { kbdMode = true; moveFocus(1); return true; }
  if (k === 'ArrowLeft' || k === 'ArrowUp') { kbdMode = true; moveFocus(-1); return true; }
  if (k === 'Enter' || k === ' ') { const o = focusables().find(q => q.id === focusId); if (o) { App.levelStarted(1); o.act(); if (hold && o.kind === 'src') { focusId = 'pad:0'; } } return true; }
  if (k === 'Escape') { if (hold) { hold = null; return true; } return false; }
  if ((e.ctrlKey || e.metaKey) && (k === 'z' || k === 'Z')) { knobAct('undo'); return true; }
  if (e.ctrlKey || e.metaKey || e.altKey) return false;
  if (/^[0-3]$/.test(k)) {
    App.levelStarted(1);
    const n = +k;
    if (hold && n <= 1) { tryPlug(hold.x, n); }
    else { hold = { x: n }; Sound.voice(n); poke(srcs[n], 5, -5); announce('Cable del ' + n + ' en la mano. Pulsa 0 o 1 para elegir nido.'); }
    return true;
  }
  if (k === 'Delete' || k === 'Backspace') { const o = focusables().find(q => q.id === focusId); if (o && o.kind === 'src') L.unplug(o.ref); else if (hold) { L.unplug(hold.x); hold = null; } return true; }
  const lk = k.toLowerCase();
  if (lk === 'r') { App.levelStarted(1); pullLever(); }
  else if (lk === 'p') knobAct('pause');
  else if (lk === 'z' || lk === 'u') knobAct('undo');
  else if (lk === 'n') knobAct('reset');
  else if (lk === 'h') knobAct('hint');
  else if (lk === 'v') knobAct('replay');
  else if (lk === 'b' && machine.reverseOut > .5) knobAct('reverse');
  else if (lk === 'i' && machine.ticketOut > .5) openReport();
  else if (lk === 'f') toggleFormula();
  else return false;
  return true;
}

/* ================================================================
 * ACTUALIZACIÓN
 * ============================================================== */
function updateCritter(c, dt, isSrc) {
  stepSpring(c.sx, dt, 300, 14); stepSpring(c.sy, dt, 300, 14);
  c.blinkT -= dt; if (c.blinkT < 0) { c.blink = .14; c.blinkT = U.rand(2, 5); } c.blink = Math.max(0, c.blink - dt);
  c.exprT -= dt; if (c.exprT < 0 && c.expr !== 'idle') c.expr = 'idle';
  c.shake = Math.max(0, c.shake - dt);
  if (!isSrc) return;
  // mirada: al cursor, al foco o al cable que se tiende
  let tx = pointer.inside ? pointer.x : c.hx, ty = pointer.inside ? pointer.y : c.hy + 40;
  if (hold) { tx = hold.x === c.v ? PADS[0].x : srcs[hold.x].hx; ty = hold.x === c.v ? 420 : srcs[hold.x].hy; }
  const ang = Math.atan2(ty - c.hy, tx - c.hx), dd = U.clamp(Math.hypot(tx - c.hx, ty - c.hy) / 200, 0, 1);
  c.lookX = U.lerp(c.lookX, Math.cos(ang) * dd, Math.min(1, dt * 6)); c.lookY = U.lerp(c.lookY, Math.sin(ang) * dd, Math.min(1, dt * 6));
  // gestos espontáneos con personalidad
  c.actT -= dt;
  if (c.actT < 0 && !Run.active && !SET.reduced) {
    c.actT = U.rand(4, 9);
    if (c.v === 0) { tw.add(c, { flat: 1 }, .5, { ease: Ease.inOut, done: () => tw.add(c, { flat: 0 }, .4, { delay: U.rand(.6, 1.6), ease: Ease.back }) }); }
    else if (c.v === 1) { hopC(c, 34); if (Math.random() < .5) later(.45, () => hopC(c, 22)); }
    else if (c.v === 2) { setExpr(c, 'angry', 1.2); c.shake = .4; if (Math.random() < .3) Sound.voice(2, 'angry'); }
    else if (c.v === 3) { tw.add(c, { puff: 1 }, .4, { ease: Ease.back, done: () => tw.add(c, { puff: 0 }, .5, { delay: .8 }) }); setExpr(c, 'proud', 1.6); }
  }
  if (c.v === 1 && !SET.reduced) c.idleBob = Math.abs(Math.sin(realT * 5.2)) * 3; else c.idleBob = 0;
}
function update(dt) {
  realT += dt;
  Draw.boil = SET.reduced ? 0 : Math.floor(realT * 8) % 3;
  Draw.wob = SET.reduced ? .4 : 1;
  for (const t of timers) { if (t.dead) continue; t.t -= dt; if (t.t <= 0) { t.dead = true; t.fn(); } }
  for (let i = timers.length - 1; i >= 0; i--) if (timers[i].dead) timers.splice(i, 1);
  tw.update(dt);
  updateRun(dt);
  srcs.forEach(c => updateCritter(c, dt, true));
  natives.forEach(c => updateCritter(c, dt, false));
  residents.forEach(c => updateCritter(c, dt, false));
  tokens.forEach(c => updateCritter(c, dt, false));
  // bloques: siguen su sitio lógico con un muelle (peso y rebote)
  const cfg = L.config;
  Object.values(blocks).forEach(b => {
    let tx, ty;
    if (b.drag) { tx = b.tx; ty = b.ty; }
    else { const s = AlgebraCore.SLOTS.find(q => cfg.slots[q] === b.id); if (s) { const r = SLOT_RECT[s]; tx = r.x + r.w / 2; ty = r.y + r.h / 2; } else { const p = trayPos(cfg.tray.indexOf(b.id)); tx = p.x; ty = p.y; } }
    const k = b.drag ? 900 : 260, d = b.drag ? 50 : 20;
    // subpasos: el muelle es rígido y con fotogramas lentos el integrador explícito se desbocaba
    const n = Math.max(1, Math.ceil(dt / (1 / 240))), h = dt / n;
    for (let i = 0; i < n; i++) { const ax = k * (tx - b.x) - d * b.vx, ay = k * (ty - b.y) - d * b.vy; b.vx += ax * h; b.vy += ay * h; b.x += b.vx * h; b.y += b.vy * h; }
    b.rot = U.lerp(b.rot, U.clamp(b.vx / 2400, -.35, .35) + (b.drag ? 0 : 0), Math.min(1, dt * 10));
    b.shake = Math.max(0, b.shake - dt); stepSpring(b.sq, dt, 400, 18);
  });
  // máquina
  machine.gearSpeed = U.lerp(machine.gearSpeed, machine.gearTarget, Math.min(1, dt * 2));
  machine.gear += machine.gearSpeed * dt * (Run.paused ? 0 : 1);
  machine.shake = Math.max(0, machine.shake - dt); machine.steam = Math.max(0, machine.steam - dt); machine.bellyShake = Math.max(0, machine.bellyShake - dt);
  if (machine.steam > 0 && Math.random() < dt * 14) steamAt(MACH.x + MACH.w - 40, MACH.y + 10, 1);
  stepSpring(machine.lever, dt, 220, 12);
  for (const s in machine.slotShake) machine.slotShake[s] = Math.max(0, machine.slotShake[s] - dt);
  for (const s in machine.knobPress) machine.knobPress[s] = Math.max(0, machine.knobPress[s] - dt * 4);
  for (let i = 0; i < 4; i++) { machine.cordWob[i] *= Math.pow(.02, dt); machine.cordPulse[i] = Math.max(0, machine.cordPulse[i] - dt * 1.4); }
  machine.rjackPress = machine.rjackPress.map(v => Math.max(0, v - dt * 5));
  stepSpring(boss.bounce, dt, 300, 12);
  boss.exprT -= dt; if (boss.exprT < 0 && boss.expr !== 'sleep' && boss.expr !== 'focus') boss.expr = machine.awake ? 'idle' : 'sleep';
  if (!Run.active && boss.expr === 'focus') boss.expr = machine.awake ? 'idle' : 'sleep';
  if (!machine.awake && !Run.active && boss.expr !== 'sleep' && boss.exprT < 0) boss.expr = 'sleep';
  boss.blinkT -= dt; if (boss.blinkT < 0) { boss.blink = .15; boss.blinkT = U.rand(2, 5); } boss.blink = Math.max(0, boss.blink - dt);
  if (!machine.awake && Math.random() < dt * .25 && !SET.reduced) Sound.ok() && nth('snore') % 3 === 0 && Sound.snore();
  stepSpring(scaleS.beam, dt, 120, 8); scaleS.flash = Math.max(0, scaleS.flash - dt * 4);
  ledger.pop = ledger.pop.map(v => Math.max(0, v - dt * 3));
  order.stampT = Math.max(0, order.stampT - dt * 2);
  for (const m in marks.pop) marks.pop[m] = Math.max(0, marks.pop[m] - dt * .8);
  // partículas
  for (let i = particles.length - 1; i >= 0; i--) {
    const q = particles[i]; q.t += dt;
    if (q.kind === 'paper') { q.vy += 520 * dt; q.vx *= Math.pow(.4, dt); q.vy = Math.min(q.vy, 160); q.x += (q.vx + Math.sin(q.t * 6 + q.r) * 40) * dt; }
    else { q.vx *= Math.pow(.2, dt); q.x += q.vx * dt; }
    q.y += q.vy * dt; q.rot += q.vr * dt;
    if (q.t > q.life) particles.splice(i, 1);
  }
  // burbujas
  for (let i = bubbles.length - 1; i >= 0; i--) { const b = bubbles[i]; b.t += dt; b.s = Math.min(1, b.s + dt * 7); if (b.t > b.dur) bubbles.splice(i, 1); }
  if (pointerHint) { pointerHint.t += dt; if (pointerHint.t > pointerHint.dur) pointerHint = null; }
  // ayuda pasiva: si lleva tiempo sin avanzar, la pista se ilumina (y luego se ofrece sola una vez)
  const idle = realT - progress.lastProgress;
  progress.hintGlow = idle > 55 && !progress.solved ? 1 : 0;
  if (idle > 120 && !progress.autoHinted && !progress.solved && !Run.active) { progress.autoHinted = true; giveHint(true); }
}

/* ================================================================
 * DIBUJO
 * ============================================================== */
let grain = App.grain || null;
function makeGrainL1() {
  const g = document.createElement('canvas'); g.width = g.height = 220; const gc = g.getContext('2d');
  const id = gc.createImageData(220, 220);
  for (let i = 0; i < id.data.length; i += 4) { const v = Math.random() * 255; id.data[i] = 80; id.data[i + 1] = 40; id.data[i + 2] = 30; id.data[i + 3] = v < 30 ? 30 : v > 245 ? 22 : 0; }
  gc.putImageData(id, 0, 0);
  for (let i = 0; i < 18; i++) { gc.strokeStyle = 'rgba(120,60,40,.06)'; gc.lineWidth = 1; gc.beginPath(); const x = Math.random() * 220, y = Math.random() * 220; gc.moveTo(x, y); gc.lineTo(x + U.rand(-30, 30), y + U.rand(-8, 8)); gc.stroke(); }
  grain = ctx.createPattern(g, 'repeat');
}

function drawBackground() {
  ctx.fillStyle = PAL.paper; ctx.fillRect(-1200, -800, W + 2400, H + 1600);
  // manchas de secante
  ctx.globalAlpha = .35;
  [[180, 160, 260], [1450, 820, 300], [820, 860, 220], [1500, 120, 180]].forEach((m, i) => Draw.ellipse(m[0], m[1], m[2], m[2] * .7, PAL.paperDeep, 0, 400 + i));
  ctx.globalAlpha = 1;
  if (grain) { ctx.fillStyle = grain; ctx.fillRect(-1200, -800, W + 2400, H + 1600); }
  Deco.room(realT, { wall: [-1200, -800, W + 1200, H + 800] });
  // móvil de planetas colgantes (ambiente)
  const sw = SET.reduced ? 0 : Math.sin(realT * .7) * .06;
  [[470, 0, 120, PAL.ultraPale, 18], [1120, 0, 80, PAL.c3, 13], [1170, 0, 150, PAL.plum, 9]].forEach((m, i) => {
    ctx.save(); ctx.translate(m[0], m[1]); ctx.rotate(sw * (i % 2 ? -1 : 1));
    Draw.line(0, 0, 0, m[2], 1.6, 700 + i, PAL.inkSoft); Draw.ellipse(0, m[2] + m[4], m[4], m[4], m[3], 2.5, 710 + i);
    if (i === 0) { ctx.strokeStyle = PAL.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, m[2] + m[4], m[4] * 1.7, m[4] * .45, -.2, 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore();
  });
}

function drawTitle() {
  Draw.text('THE ALGEBRA ENGINE', 34, 26, { size: 15, font: FONT.plate, align: 'left', color: PAL.inkSoft, spacing: 2 });
  Draw.text('La máquina que se comió el cuatro', 32, 54, { size: 30, font: FONT.title, align: 'left', jitter: 1.2, seed: 33, color: PAL.ink });
}

function drawOrder() {
  if (order.reveal < .01) return;
  ctx.save(); ctx.translate(30, 84); ctx.rotate(-.015);
  const rv = order.reveal; ctx.translate(184, 0); ctx.scale(rv, rv); ctx.rotate((1 - rv) * .4); ctx.translate(-184, 0);
  Draw.rrect(0, 0, 368, 200, 4, PAL.bone, 2.5, 801);
  // chincheta
  Draw.ellipse(170, 6, 9, 9, PAL.bad, 2, 802);
  Draw.text('ORDEN DE TRABAJO Nº 4', 18, 28, { size: 16, font: FONT.plate, align: 'left' });
  Draw.text('Que las dos rutas, ▲ y ●, lleguen', 18, 54, { size: 20, align: 'left' });
  Draw.text('siempre al mismo sitio:', 18, 76, { size: 20, align: 'left' });
  // esquina doblada: la fórmula, para quien quiera mirarla
  Draw.shape([[318, 0], [368, 0], [368, 44]], '#e7d3ad', 2);
  Draw.text('f(x)', 352, 14, { size: 13, font: FONT.plate, color: PAL.plum });
  const box = (y, ok, txt) => {
    Draw.rrect(18, y - 11, 22, 22, 3, PAL.bone, 2, 810 + y);
    if (ok) { Draw.curve([[22, y], [28, y + 7], [44, y - 14]], 4, PAL.good); }
    Draw.text(txt, 50, y, { size: 20, align: 'left', color: ok ? PAL.good : PAL.ink });
  };
  box(108, order.sums, 'que las sumas sobrevivan al viaje');
  box(138, order.visits, 'que nadie de allá se quede sin visitas');
  // sellos de dominio
  if (marks.funciona) {
    [['FUNCIONA', marks.funciona, 'funciona'], ['COMPRENDE', marks.comprende, 'comprende'], ['INVESTIGA', marks.investiga, 'investiga']].forEach((m, i) => {
      const x = 62 + i * 106, y = 176, pop = marks.pop[m[2]];
      ctx.save(); ctx.translate(x, y); ctx.rotate(-.08 + i * .05); ctx.scale(1 + pop * .6, 1 + pop * .6);
      ctx.globalAlpha = m[1] ? .9 : .25;
      Draw.rrect(-48, -13, 96, 26, 4, null, 2.5, 830 + i, m[1] ? PAL.plum : PAL.inkSoft);
      Draw.text(m[0], 0, 1, { size: 14, font: FONT.plate, color: m[1] ? PAL.plum : PAL.inkSoft, spacing: 1 });
      ctx.restore();
    });
  }
  if (order.stampTxt && !order.done) {
    const s = 1 + order.stampT * .8;
    ctx.save(); ctx.translate(250, 170); ctx.rotate(-.18); ctx.scale(s, s); ctx.globalAlpha = .8 - order.stampT * .3;
    Draw.text(order.stampTxt, 0, 0, { size: 18, font: FONT.plate, color: PAL.bad, spacing: 1 });
    ctx.restore();
  }
  if (order.approved > 0) {
    const s = 1 + Math.max(0, 1 - order.approved) * 0;
    ctx.save(); ctx.translate(250, 120); ctx.rotate(-.2); ctx.globalAlpha = Math.min(.85, order.approved);
    Draw.rrect(-82, -20, 164, 40, 4, null, 3.5, 840, PAL.bad);
    Draw.text('APROBADO', 0, 1, { size: 22, font: FONT.plate, color: PAL.bad, spacing: 3 });
    ctx.restore();
  }
  ctx.restore();
  if (progress.formulaOpen) {
    ctx.save(); ctx.translate(404, 92); ctx.rotate(.03);
    Draw.rrect(0, 0, 150, 150, 3, '#f6e27a', 2, 845);
    Draw.text('la fórmula', 75, 18, { size: 15, color: PAL.inkSoft });
    Draw.text('▲ f(a + b)', 12, 48, { size: 19, align: 'left' });
    Draw.text('= ', 12, 74, { size: 19, align: 'left' });
    Draw.text('● f(a) + f(b)', 30, 74, { size: 19, align: 'left' });
    Draw.text('para todos los', 12, 106, { size: 16, align: 'left', color: PAL.inkSoft });
    Draw.text('pares a, b', 12, 126, { size: 16, align: 'left', color: PAL.inkSoft });
    ctx.restore();
  }
}

function drawIsland(c, r, fill, deep, seed) {
  Draw.ellipse(c.x, c.y + 26, r * 1.02, r * .3, deep, 0, seed + 1);
  ctx.fillStyle = deep; ctx.fillRect(c.x - r, c.y, r * 2, 26);
  Draw.ellipse(c.x, c.y + 26, r, r * .3, deep, 2.5, seed + 2);
  Draw.ellipse(c.x, c.y, r, r, fill, 3, seed);
}
function drawSourceWorld() {
  drawIsland(SRC_C, SRC_R, PAL.island, PAL.islandDeep, 10);
  // el ciclo +1 dibujado con tiza: 0 → 1 → 2 → 3 → 0
  ctx.save(); ctx.globalAlpha = .5;
  for (let i = 0; i < 4; i++) { const a0 = -Math.PI / 2 + i * Math.PI / 2 + .42; arcArrow(SRC_C.x, SRC_C.y, 92, a0, a0 + Math.PI / 2 - .84, 70); }
  ctx.restore();
  // salidas de tubería del borde de la isla
  SRC_OUT.forEach((o, i) => Draw.ellipse(o.x, o.y, 9, 7, PAL.ink, 0, 40 + i));
  // agujeros cuando falta TODO TIENE IMAGEN
  const noTotal = L.config.slots.total !== 'TODO';
  srcs.forEach(c => {
    if (noTotal && L.config.map[c.v] === null) Draw.ellipse(c.hx, c.hy + 4, 40, 12, PAL.ink, 0, 60 + c.v);
    else Draw.ellipse(c.hx, c.hy + 4, 34, 9, 'rgba(33,28,51,.18)', 0, 60 + c.v);
  });
  // cartel atornillado
  drawPlacard(SRC_C.x, 690, 'AQUÍ SE SUMA MÓD', 4, true);
  Draw.text('el reloj de 4', SRC_C.x, 290, { size: 19, color: PAL.inkSoft });
}
/* Arco de tiza con punta de flecha y la etiqueta +1 (radio de etiqueta con signo: negativo = al otro lado). */
function arcArrow(cx, cy, R, a0, a1, labelR) {
  const pts = [];
  for (let k = 0; k <= 12; k++) { const a = U.lerp(a0, a1, k / 12); pts.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R]); }
  Draw.curve(pts, 2.5, PAL.ink, [6, 6]);
  const e = pts[12], p = pts[10], dir = Math.atan2(e[1] - p[1], e[0] - p[0]);
  Draw.curve([[e[0] + Math.cos(dir + 2.6) * 11, e[1] + Math.sin(dir + 2.6) * 11], e, [e[0] + Math.cos(dir - 2.6) * 11, e[1] + Math.sin(dir - 2.6) * 11]], 2.5, PAL.ink);
  const am = (a0 + a1) / 2, lr = Math.abs(labelR);
  Draw.text('+1', cx + Math.cos(am) * lr, cy + Math.sin(am) * lr, { size: 16, color: PAL.ink });
}
function drawPlacard(x, y, txt, n, bolted) {
  Draw.line(x, y + 22, x, y + 60, 4, 900 + x);
  Draw.rrect(x - 112, y - 22, 224, 44, 5, PAL.bone, 2.5, 910 + x);
  Draw.text(txt, x - 26, y + 1, { size: 15, font: FONT.plate, spacing: .5 });
  if (bolted) {
    Draw.ellipse(x + 76, y, 18, 18, PAL.mustard, 2.5, 920);
    Draw.text(String(n), x + 76, y + 1, { size: 22, font: FONT.title });
    [[x - 104, y - 14], [x + 104, y - 14]].forEach(p => Draw.ellipse(p[0], p[1], 3, 3, PAL.ink, 0, 930));
  } else {
    Draw.ellipse(x + 76 + 18, y, 21, 21, 'rgba(33,28,51,.25)', 2.5, 925, PAL.ink);
  }
}

function drawDestWorld() {
  drawIsland(DST_C, DST_R, PAL.isle2, PAL.isle2Deep, 20);
  // ciclo +1 del reloj de 2: 0 → 1 por la derecha, 1 → 0 por la izquierda
  ctx.save(); ctx.globalAlpha = .5;
  arcArrow(DST_C.x, DST_C.y, 92, -Math.PI / 2 + .7, Math.PI / 2 - .7, 112);
  arcArrow(DST_C.x, DST_C.y, 92, Math.PI / 2 + .7, Math.PI * 1.5 - .7, -112);
  ctx.restore();
  // entradas de tubería
  DST_IN.forEach((o, i) => Draw.ellipse(o.x, o.y, 8, 7, PAL.ink, 0, 70 + i));
  // nidos y su puerta
  PADS.forEach((p, y) => {
    const g = machine.padGate;
    Draw.ellipse(p.x, p.y + 10, 52 + (1 - Math.min(1, g)) * 40, 16, 'rgba(33,28,51,.22)', 2, 80 + y);
    if (g > .7) { // barrera de "uno por nido": barrotes laterales
      ctx.save(); ctx.globalAlpha = Math.min(1, (g - .7) * 3.3);
      [-28, 28].forEach(dx => { Draw.line(p.x + dx, p.y + 10, p.x + dx * (g > 1 ? 1.15 : 1), p.y - 46, 3.5, 85 + y + dx); Draw.ellipse(p.x + dx, p.y - 48, 4, 4, PAL.ink, 0, 86); });
      Draw.line(p.x - 30, p.y - 44, p.x + 30, p.y - 44, 3.5, 87 + y);
      ctx.restore();
    }
  });
  // letrero de la política de puerta
  const pol = L.config.slots.puerta;
  ctx.save(); ctx.translate(1232, 300); ctx.rotate(-.06);
  Draw.line(0, 12, 0, 58, 3.5, 95);
  Draw.rrect(-50, -14, 100, 28, 4, PAL.bone, 2.5, 96);
  Draw.text(pol === 'EXCLUSIVO' ? 'UNO POR NIDO' : pol === 'COMPARTIDO' ? 'PASEN TODOS' : '¿¿¿???', 0, 1, { size: 12, font: FONT.plate });
  ctx.restore();
  // huecos fantasma: con la ficha 4, el mundo "debería" tener 2 y 3… pero no hay suelo
  if (machine.phantom > .02) {
    ctx.save(); ctx.globalAlpha = machine.phantom * (.55 + Math.sin(realT * 3) * .15);
    [2, 3].forEach(v => { const p = PHANTOM[v]; Draw.shape(Draw.ellipsePts(p.x, p.y, 30, 30, 90 + v), null, 2.5); ctx.setLineDash([]);
      ctx.save(); ctx.setLineDash([5, 6]); Draw.ellipse(p.x, p.y + 30, 34, 9, null, 2, 92 + v); ctx.restore();
      Draw.text(v + '?', p.x, p.y, { size: 24, font: FONT.title, color: PAL.inkSoft }); });
    ctx.restore();
  }
  drawPlacard(DST_C.x, 612, 'AQUÍ SE SUMA MÓD', null, false);
  Draw.text('el reloj de 2', DST_C.x, 572, { size: 19, color: PAL.inkSoft });
  if (machine.parity > .01) {
    ctx.save(); ctx.globalAlpha = machine.parity;
    Draw.text('PARES', PADS[0].x + 92, PADS[0].y - 36, { size: 18, font: FONT.plate, color: PAL.plum, spacing: 2 });
    Draw.text('IMPARES', PADS[1].x + 92, PADS[1].y + 40, { size: 18, font: FONT.plate, color: PAL.plum, spacing: 2 });
    ctx.restore();
  }
}

/* ---------------- criaturas ---------------- */
function drawToken(t) {
  if (t.mode === 'walk') { drawCritter(t); return; }
  if (t.mode === 'pipe') return;   // dentro del tubo: se dibuja como bulto en el tubo
  if (t.mode === 'bead' || t.mode === 'split') {
    const col = t.kind === 'src' ? SRC_COL[t.v] : (t.v ? PAL.ultra : PAL.ultraPale);
    if (t.mode === 'split') {
      const cfg = L.config;
      t.splitTo.forEach((x, i) => {
        const pts = cordPts(x, cfg.map[x], 0).slice().reverse(), p = polyAt(pts, t._u * .6);
        ctx.save(); ctx.globalAlpha = .55 * t.alpha; Draw.ellipse(p.x, p.y, 14, 14, col, 2.5, 160 + i); Draw.text('?', p.x, p.y, { size: 16, font: FONT.title, color: PAL.bone, stroke: 4, strokeColor: PAL.ink }); ctx.restore();
        Draw.text('¿' + x + '?', p.x, p.y - 26, { size: 16, font: FONT.title, color: PAL.bone, stroke: 4, strokeColor: PAL.ink });
      });
      return;
    }
    ctx.save(); ctx.globalAlpha = t.alpha;
    Draw.ellipse(t.x, t.y, 14, 14, col, 2.5, 161);
    Draw.text(String(t.v), t.x, t.y + 1, { size: 15, font: FONT.title, color: PAL.bone, stroke: 4, strokeColor: PAL.ink });
    if (t.flag) Draw.text(t.flag === 'A' ? '▲' : '●', t.x + 16, t.y - 14, { size: 13, color: t.flag === 'A' ? PAL.ochre : PAL.plum });
    ctx.restore();
  }
}

/* ---------------- máquina ---------------- */
function gear(x, y, r, teeth, rot, fill, seed) {
  const pts = [];
  for (let i = 0; i < teeth * 2; i++) { const a = rot + i / (teeth * 2) * Math.PI * 2, R = i % 2 ? r : r * 1.22; pts.push([x + Math.cos(a) * R, y + Math.sin(a) * R], [x + Math.cos(a + Math.PI / teeth * .9) * R, y + Math.sin(a + Math.PI / teeth * .9) * R]); }
  Draw.shape(pts, fill, 2.5); Draw.ellipse(x, y, r * .35, r * .35, PAL.bone, 2.5, seed);
}
function drawMachineShell(depth) {
  const M = MACH, cfg = L.config;
  // engranajes traseros
  gear(M.x + 40, M.y + 58, 30, 9, machine.gear * 2, PAL.olive, 201);
  gear(M.x + 86, M.y + 30, 18, 7, -machine.gear * 3.2, PAL.oliveDeep, 202);
  gear(M.x + M.w - 30, M.y + 300, 22, 8, machine.gear * 2.6, PAL.olive, 203);
  // cuerpo
  Draw.rrect(M.x, M.y + 30, M.w, M.h - 30, 26, PAL.mustard, 3.5, 210);
  Draw.rrect(M.x + 12, M.y + 44, M.w - 24, M.h - 56, 18, null, 1.5, 211, PAL.mustardDeep);
  // patas
  [[M.x + 40, M.y + M.h], [M.x + M.w - 40, M.y + M.h]].forEach((p, i) => Draw.rrect(p[0] - 22, p[1] - 6, 44, 30, 6, PAL.oliveDeep, 3, 212 + i));
  // cabina del capataz
  Draw.rrect(730, M.y - 64, 140, 98, 18, PAL.mustard, 3.5, 220);
  Draw.rrect(744, M.y - 52, 112, 64, 10, depth ? PAL.inkSoft : '#f6dfb8', 3, 221);
  // boca: come fichas
  const mo = machine.mouth;
  Draw.rrect(MOUTH.x - 110, MOUTH.y - 14 - mo * 8, 220, 28 + mo * 16, 10, PAL.ink, 3, 230);
  for (let i = 0; i < 9; i++) { const x = MOUTH.x - 96 + i * 24; Draw.shape([[x, MOUTH.y - 14 - mo * 8], [x + 12, MOUTH.y - 14 - mo * 8], [x + 6, MOUTH.y - 4 - mo * 8]], PAL.bone, 1.5); Draw.shape([[x, MOUTH.y + 14 + mo * 8], [x + 12, MOUTH.y + 14 + mo * 8], [x + 6, MOUTH.y + 4 + mo * 8]], PAL.bone, 1.5); }
  // ventanilla: la barriga, con otra máquina dentro
  const pb = machine.bellyShake > 0 ? Math.sin(realT * 50) * 3 * machine.bellyShake : 0;
  ctx.save(); ctx.translate(pb, 0);
  Draw.ellipse(PORT.x, PORT.y, PORT.r + 9, PORT.r + 9, PAL.oliveDeep, 3.5, 240);
  ctx.save(); ctx.beginPath(); ctx.arc(PORT.x, PORT.y, PORT.r, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = '#8f5f1c'; ctx.fillRect(PORT.x - PORT.r, PORT.y - PORT.r, PORT.r * 2, PORT.r * 2);
  if (depth < 2) {
    ctx.save(); ctx.translate(PORT.x, PORT.y - 6); ctx.scale(.12, .12); ctx.translate(-800, -440);
    const wob = Draw.wob; Draw.wob = 0; drawMachineShell(depth + 1); drawMiniDetails(); Draw.wob = wob;
    ctx.restore();
  }
  ctx.fillStyle = 'rgba(80,45,10,.55)'; ctx.fillRect(PORT.x - PORT.r, PORT.y + 34, PORT.r * 2, 30);
  ctx.restore();
  ctx.strokeStyle = 'rgba(251,239,220,.6)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(PORT.x, PORT.y, PORT.r - 8, -2.6, -1.9); ctx.stroke();
  ctx.restore();
  // centralita
  Draw.rrect(580, 232, 420, 196, 12, '#3a3150', 3, 250);
  // riel de reglas
  Draw.rrect(570, 450, 460, 120, 12, PAL.mustardDeep, 3, 260);
  if (depth) {
    // versión en miniatura: cables y bloques reales, sin texto
    AlgebraCore.SLOTS.forEach(s => { const r = SLOT_RECT[s]; Draw.rrect(r.x, r.y, r.w, r.h, 6, cfg.slots[s] ? PAL.bone : PAL.ink, 3, 270); });
  }
}
function drawMiniDetails() {
  const cfg = L.config;
  for (let x = 0; x < 4; x++) if (cfg.map[x] !== null) Draw.curve(cordPts(x, cfg.map[x], 0), 16, SRC_COL[x]);
  Draw.rrect(MACH.x + 60, MACH.y + MACH.h + 20, MACH.w - 120, 40, 8, '#6b4513', 0, 280);
}
function drawSwitchboard() {
  const cfg = L.config;
  Draw.text('CENTRALITA', 790, 248, { size: 13, font: FONT.plate, color: PAL.bone, spacing: 2 });
  // tubería del reloj grande a la máquina (con bultos donde viaja una ficha)
  for (let i = 0; i < 4; i++) {
    const pts = srcPipe(i);
    Draw.curve(pts.slice(0, 4), 13, PAL.ink); Draw.curve(pts.slice(0, 4), 7, PAL.olive);
  }
  for (let y = 0; y < 2; y++) { const pts = dstPipe(y); Draw.curve(pts.slice(1), 13, PAL.ink); Draw.curve(pts.slice(1), 7, PAL.olive); }
  tokens.forEach(t => { if (t.mode === 'pipe') { ctx.save(); ctx.globalAlpha = t.alpha; Draw.ellipse(t.x, t.y, 13, 11, t.kind === 'src' ? SRC_COL[t.v] : (t.v ? PAL.ultra : PAL.ultraPale), 3, 290); ctx.restore(); } });
  // enchufes
  LJACK.forEach((j, v) => {
    Draw.ellipse(j.x, j.y, 12, 12, '#1a1528', 2.5, 300 + v, PAL.bone);
    Draw.ellipse(j.x - 32, j.y, 13, 13, SRC_COL[v], 2, 305 + v);
    Draw.text(String(v), j.x - 32, j.y + 1, { size: 15, font: FONT.title, color: PAL.ink });
  });
  RJACK.forEach((j, y) => {
    const pr = machine.rjackPress[y];
    Draw.ellipse(j.x, j.y, 12, 12, '#1a1528', 2.5, 310 + y, PAL.bone);
    Draw.ellipse(j.x + 30, j.y, 13, 13, y ? PAL.ultra : PAL.ultraPale, 2, 315 + y);
    Draw.text(String(y), j.x + 30, j.y + 1, { size: 15, font: FONT.title, color: y ? PAL.bone : PAL.ink });
    // pistón que estampa la traducción
    Draw.rrect(j.x - 10, j.y - 44 + pr * 18, 20, 20, 4, PAL.bone, 2, 318 + y);
    Draw.line(j.x, j.y - 60, j.x, j.y - 44 + pr * 18, 3, 319 + y, PAL.bone);
  });
  // cables
  for (let x = 0; x < 4; x++) {
    const y = cfg.map[x]; if (y === null) continue;
    const wob = Math.sin(realT * 14) * machine.cordWob[x], pts = cordPts(x, y, wob), glow = machine.cordPulse[x];
    if (glow > 0) Draw.curve(pts, 12 + glow * 8, 'rgba(251,239,220,' + (glow * .7) + ')');
    Draw.curve(pts, 8, PAL.ink); Draw.curve(pts, 4.5, SRC_COL[x]);
    Draw.rrect(LJACK[x].x - 6, LJACK[x].y - 7, 16, 14, 3, PAL.bone, 2, 330 + x);
    Draw.rrect(RJACK[y].x - 10, RJACK[y].y - 7, 16, 14, 3, PAL.bone, 2, 335 + x);
  }
  // cable en la mano
  if (hold) {
    const a = LJACK[hold.x], c = srcs[hold.x];
    const tgt = pointer.inside && (hold.viaDrag || !kbdMode) ? pointer : (focusId && focusId.startsWith('pad:') ? PADS[+focusId.split(':')[1]] : { x: a.x + 120, y: a.y + 40 });
    const pts = []; for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push([U.lerp(a.x, tgt.x, t), U.lerp(a.y, tgt.y, t) + Math.sin(t * Math.PI) * 40 + Math.sin(realT * 8 + t * 6) * 3]); }
    Draw.curve(pts, 8, PAL.ink); Draw.curve(pts, 4.5, SRC_COL[hold.x], [10, 6]);
    Draw.ellipse(tgt.x, tgt.y, 9, 9, PAL.bone, 2.5, 340);
    // goma desde la criatura hasta su enchufe para que se lea el origen
    Draw.curve([[c.hx, c.hy - 30], [c.hx + 60, c.hy - 90], [a.x - 40, a.y]], 2.5, SRC_COL[hold.x], [4, 6]);
  }
}
function drawRail() {
  const cfg = L.config;
  AlgebraCore.SLOTS.forEach((s, i) => {
    const r = SLOT_RECT[s], sh = machine.slotShake[s] ? Math.sin(realT * 70) * 4 * machine.slotShake[s] * 2 : 0;
    const on = !!cfg.slots[s];
    ctx.save(); ctx.translate(sh, 0);
    Draw.rrect(r.x - 4, r.y - 4, r.w + 8, r.h + 8, 8, '#7a5410', 2.5, 400 + i);
    notch(s, r.x + r.w / 2, r.y + r.h + 4, '#7a5410');
    Draw.text(SLOT_NAMES[s], r.x + r.w / 2, r.y + r.h + 24, { size: 12, font: FONT.plate, color: PAL.ink, spacing: 1.5 });
    // lámpara: filamento dibujado y halo cuando está activa (forma, no sólo color)
    const lx = r.x + r.w - 2, ly = r.y - 14;
    if (on) { ctx.save(); ctx.globalAlpha = .35 + Math.sin(realT * 4 + i) * .08; Draw.ellipse(lx, ly, 16, 16, '#fff3c4', 0, 410); ctx.restore(); }
    Draw.ellipse(lx, ly, 8, 8, on ? '#ffe27a' : 'rgba(251,239,220,.35)', 2.2, 411 + i);
    if (on) Draw.curve([[lx - 4, ly + 2], [lx - 2, ly - 3], [lx, ly + 2], [lx + 2, ly - 3], [lx + 4, ly + 2]], 1.6, PAL.ink);
    else Draw.line(lx - 4, ly + 4, lx + 4, ly - 4, 1.6, 412);
    ctx.restore();
  });
}
/* La muesca de cada ranura y la pestaña de cada bloque comparten forma. */
function notch(slot, x, y, fill) {
  if (slot === 'motor') Draw.ellipse(x, y, 9, 9, fill, 2.2, 420);
  else if (slot === 'total') Draw.rrect(x - 9, y - 8, 18, 16, 1, fill, 2.2, 421);
  else if (slot === 'puerta') Draw.shape([[x - 11, y - 7], [x + 11, y - 7], [x, y + 10]], fill, 2.2);
  else Draw.shape([[x - 12, y - 6], [x - 4, y + 6], [x + 4, y - 6], [x + 12, y + 6]].concat([[x + 12, y - 8], [x - 12, y - 8]]), fill, 2.2);
}
function drawBlock(b) {
  const info = AlgebraCore.BLOCKS[b.id], cfg = L.config;
  const active = AlgebraCore.SLOTS.some(s => cfg.slots[s] === b.id);
  const sh = b.shake ? Math.sin(realT * 60) * 5 * b.shake : 0;
  ctx.save(); ctx.translate(b.x + sh, b.y); ctx.rotate(b.rot + (active || b.drag ? 0 : (U.hash(b.id.length * 7) * .06)));
  const sq = b.sq.v; ctx.scale(1 + (sq - 1) * .3, 1 - (sq - 1) * .3);
  if (b.drag) { ctx.save(); ctx.translate(6, 12); Draw.rrect(-BLOCK_W / 2, -BLOCK_H / 2, BLOCK_W, BLOCK_H, 7, 'rgba(33,28,51,.25)', 0, 500); ctx.restore(); ctx.scale(1.06, 1.06); }
  notch(info.slot, 0, BLOCK_H / 2 + 2, active ? PAL.bone : '#e9d9bd');
  Draw.rrect(-BLOCK_W / 2, -BLOCK_H / 2, BLOCK_W, BLOCK_H, 7, active ? PAL.bone : '#e9d9bd', 3, 510 + b.id.length);
  // icono de la regla (forma propia de cada bloque)
  const ic = b.id;
  ctx.save(); ctx.translate(-BLOCK_W / 2 + 14, -BLOCK_H / 2 + 14);
  if (ic === 'ARRANCA') gear(0, 0, 6, 6, active ? machine.gear * 3 : 0, PAL.olive, 520);
  else if (ic === 'TODO') { Draw.ellipse(-3, 0, 3, 3, PAL.ink, 0, 521); Draw.line(0, 0, 8, 0, 2, 522); }
  else if (ic === 'COMPARTIDO') { Draw.line(-5, -4, 5, 0, 2, 523); Draw.line(-5, 4, 5, 0, 2, 524); }
  else if (ic === 'EXCLUSIVO') { Draw.line(-5, 0, 5, 0, 2, 525); Draw.line(5, -5, 5, 5, 2, 526); }
  else { Draw.text('=', 0, 0, { size: 16, font: FONT.title }); }
  ctx.restore();
  Draw.text(info.text[0], 6, -10, { size: 12.5, font: FONT.plate, color: PAL.ink });
  Draw.text(info.text[1], 0, 12, { size: 13.5, font: FONT.plate, color: PAL.ink, weight: 'bold' });
  if (!active && !b.drag) { ctx.globalAlpha = .9; }
  ctx.restore();
}
function drawKnobs() {
  KNOBS.forEach(k => {
    if (k.id === 'reverse' && machine.reverseOut < .02) return;
    const pr = machine.knobPress[k.id] || 0, out = k.id === 'reverse' ? machine.reverseOut : 1;
    ctx.save(); ctx.translate(k.x, KNOB_Y + (1 - out) * 40); ctx.globalAlpha = Math.min(1, out * 1.5);
    const glowHint = k.id === 'hint' && progress.hintGlow;
    if (glowHint) { ctx.save(); ctx.globalAlpha = .35 + Math.sin(realT * 5) * .25; Draw.ellipse(0, 0, 36, 36, '#fff3c4', 0, 600); ctx.restore(); }
    Draw.ellipse(0, 4, 24, 24, PAL.oliveDeep, 0, 601);
    Draw.ellipse(0, pr * 4, 24, 24, k.id === 'reverse' ? PAL.plum : PAL.olive, 3, 602 + k.x);
    ctx.translate(0, pr * 4);
    const ic = k.id, c = PAL.bone;
    if (ic === 'pause') { if (Run.paused) Draw.shape([[-6, -9], [9, 0], [-6, 9]], c, 2); else { Draw.rrect(-8, -9, 5, 18, 1, c, 2, 610); Draw.rrect(3, -9, 5, 18, 1, c, 2, 611); } }
    else if (ic === 'undo') { const pts = []; for (let i = 0; i <= 8; i++) { const a = -Math.PI * .9 + i / 8 * Math.PI * 1.5; pts.push([Math.cos(a) * 9, Math.sin(a) * 9]); } Draw.curve(pts, 3.5, c); Draw.shape([[-13, -4], [-5, -4], [-9, 4]].map(p => [p[0], p[1] - 2]), c, 0); }
    else if (ic === 'reset') { Draw.ellipse(0, 0, 9, 9, null, 3.5, 612, c); Draw.shape([[4, -14], [12, -8], [3, -4]], c, 0); }
    else if (ic === 'hint') { Draw.ellipse(0, -3, 8, 8, '#ffe27a', 2.5, 613); Draw.rrect(-4, 5, 8, 6, 1, c, 2, 614); }
    else if (ic === 'replay') { Draw.ellipse(-4, 0, 7, 7, null, 3, 615, c); Draw.ellipse(5, 0, 7, 7, null, 3, 616, c); }
    else if (ic === 'reverse') { Draw.shape([[8, -8], [-6, 0], [8, 8]], c, 2); Draw.line(-8, -8, -8, 8, 3, 617, c); }
    ctx.restore();
    ctx.save(); ctx.globalAlpha = Math.min(1, out * 1.5);
    Draw.text(k.label, k.x, KNOB_Y + 38 + (1 - out) * 40, { size: 10.5, font: FONT.plate, color: PAL.ink, spacing: .5 });
    ctx.restore();
  });
}
function drawLever() {
  const a = machine.lever.v, P = LEVER;
  Draw.rrect(P.x - 22, P.y - 18, 44, 40, 8, PAL.oliveDeep, 3, 650);
  const ex = P.x + Math.cos(a) * 120, ey = P.y + Math.sin(a) * 120;
  Draw.line(P.x, P.y, ex, ey, 9, 651); Draw.line(P.x, P.y, ex, ey, 4, 652, PAL.bone);
  Draw.ellipse(ex, ey, 18, 18, PAL.bad, 3, 653);
  Draw.ellipse(P.x, P.y, 9, 9, PAL.bone, 2.5, 654);
  // etiqueta colgante
  ctx.save(); ctx.translate(ex + 10, ey + 14); ctx.rotate(.25 + Math.sin(realT * 2) * .08);
  Draw.line(0, 0, 6, 16, 1.5, 655);
  const tagW = Run.active ? 86 : 52;
  Draw.rrect(-6, 16, tagW, 22, 3, PAL.bone, 2, 656);
  Draw.text(Run.active ? 'MÁS RÁPIDO' : 'TIRAR', tagW / 2 - 6, 27, { size: 11, font: FONT.plate });
  ctx.restore();
}
function drawBoss() {
  const b = boss, y = b.y + b.bounce.v * .1, e = b.expr;
  ctx.save(); ctx.beginPath(); ctx.rect(744, MACH.y - 52, 112, 64); ctx.clip();
  const lean = e === 'panic' ? Math.sin(realT * 30) * 4 : 0;
  ctx.translate(b.x + lean, y);
  // cuerpo
  Draw.ellipse(0, 24, 30, 26, PAL.plum, 3, 700);
  // ojo en tallo
  const stalkX = e === 'impatient' ? Math.sin(realT * 3) * 6 : (pointer.inside ? U.clamp((pointer.x - 800) / 60, -10, 10) : 0);
  const eyY = e === 'cheer' ? -32 : e === 'sleep' ? -2 : -18;
  Draw.curve([[0, 4], [stalkX * .5, -6], [stalkX, eyY + 10]], 3, PAL.ink);
  const open = !(e === 'sleep' || boss.blink > 0);
  Draw.ellipse(stalkX, eyY, 14, e === 'shock' || e === 'panic' ? 16 : 13, PAL.bone, 3, 701);
  if (open) {
    const px = stalkX + U.clamp(((pointer.inside ? pointer.x : 800) - 800) / 140, -5, 5), py = eyY + (e === 'thinking' ? -5 : 1);
    Draw.ellipse(px, py, e === 'shock' || e === 'panic' ? 4 : 6, e === 'shock' || e === 'panic' ? 4 : 6, PAL.ink, 0, 702);
    if (e === 'impatient' || e === 'facepalm' || e === 'focus') Draw.line(stalkX - 14, eyY - 4, stalkX + 14, eyY - 4, 3, 703);
  } else Draw.curve([[stalkX - 10, eyY], [stalkX, eyY + 5], [stalkX + 10, eyY]], 3, PAL.ink);
  // sombrero
  Draw.rrect(stalkX - 12, eyY - 26, 24, 12, 3, PAL.ink, 0, 704); Draw.line(stalkX - 18, eyY - 14, stalkX + 18, eyY - 14, 4, 705);
  // brazos según el humor
  const armL = e === 'cheer' ? [[-24, 18], [-40, -10]] : e === 'facepalm' ? [[-24, 18], [stalkX - 6, eyY + 6]] : e === 'shrug' ? [[-24, 18], [-44, 4]] : [[-24, 18], [-36, 36]];
  const armR = e === 'cheer' ? [[24, 18], [40, -10 + Math.sin(realT * 18) * 6]] : e === 'shrug' ? [[24, 18], [44, 4]] : e === 'impatient' ? [[24, 18], [38, 30 + Math.abs(Math.sin(realT * 10)) * 6]] : [[24, 18], [36, 36]];
  Draw.curve(armL, 3.5, PAL.ink); Draw.curve(armR, 3.5, PAL.ink);
  ctx.restore();
  if (e === 'sleep') { ctx.save(); ctx.globalAlpha = .7; const t = (realT * .6) % 1; Draw.text('z', 870 + t * 30, MACH.y - 60 - t * 30, { size: 18 + t * 10, font: FONT.title }); Draw.text('z', 860 + ((t + .5) % 1) * 30, MACH.y - 60 - ((t + .5) % 1) * 30, { size: 14, font: FONT.title }); ctx.restore(); }
}

/* ---------------- balanza y cinta ---------------- */
function drawScale() {
  const S = SCALE, ang = scaleS.beam.v, open = L.config.slots.ley === 'CONSERVA';
  Draw.line(S.x, S.y - 30, S.x, S.y + 110, 5, 750);
  Draw.rrect(S.x - 40, S.y + 106, 80, 14, 4, PAL.oliveDeep, 2.5, 751);
  const dx = Math.cos(ang) * 100, dy = Math.sin(ang) * 100;
  Draw.line(S.x - dx, S.y - dy, S.x + dx, S.y + dy, 5, 752);
  Draw.shape([[S.x - 10, S.y - 6], [S.x + 10, S.y - 6], [S.x, S.y + 12]], PAL.mustard, 2.5);
  [[-1, 'A'], [1, 'B']].forEach(([s, lab]) => {
    const px = S.x + s * dx, py = S.y + s * dy;
    Draw.line(px - 24, py + 62, px, py, 2, 753 + s); Draw.line(px + 24, py + 62, px, py, 2, 754 + s);
    Draw.shape([[px - 34, py + 62], [px + 34, py + 62], [px + 24, py + 72], [px - 24, py + 72]], lab === 'A' ? '#f1c27a' : '#c99ac0', 2.5);
    if (lab === 'A') Draw.shape([[px - 46, py + 58], [px - 30, py + 64], [px - 46, py + 70]], PAL.ochre, 2); else Draw.ellipse(px + 40, py + 64, 7, 7, PAL.plum, 2, 755);
    Draw.text(lab, px + s * 54, py + 64, { size: 16, font: FONT.title });
    const tok = lab === 'A' ? scaleS.panA : scaleS.panB, val = lab === 'A' ? scaleS.valA : scaleS.valB;
    if (tok) { tok.x = px; tok.y = py + 62; }
    else if (val !== null && val !== undefined && scaleS.show > .5) {
      const big = 1 + scaleS.flash * .3;
      if (val === 'escape') Draw.text('⌀', px, py + 44, { size: 22 * big, font: FONT.title, color: PAL.bad });
      else { Draw.ellipse(px, py + 46, 13 * big, 13 * big, val ? PAL.ultra : PAL.ultraPale, 2.5, 756 + s); Draw.text(String(val), px, py + 47, { size: 15 * big, font: FONT.title, color: PAL.bone, stroke: 4, strokeColor: PAL.ink }); }
    }
  });
  // la tela que tapa la balanza cuando falta CONSERVA LA SUMA
  if (machine.cloth > .02) {
    const h = 170 * machine.cloth;
    Draw.shape([[S.x - 150, S.y - 40], [S.x + 150, S.y - 40], [S.x + 160, S.y - 40 + h], [S.x + 60, S.y - 40 + h - 12], [S.x - 40, S.y - 40 + h + 6], [S.x - 160, S.y - 40 + h]], '#b8a3c4', 3);
    if (machine.cloth > .8) Draw.text('(sin comprobar)', S.x, S.y + 50, { size: 18, color: PAL.inkSoft });
  }
  // la igualdad, cada vez más formal
  const p = scaleS.pair, rep = progress.lastRun || Run.report;
  if (open && p && scaleS.show > .3) {
    const fa = p.fa, fb = p.fb, A = p.routeA, B = p.status === 'escape' ? p.routeB + '?' : p.routeB;
    let l1, l2;
    if (progress.formula >= 2) { l1 = '▲ f(' + p.a + ' + ' + p.b + ') = f(' + p.sumG + ') = ' + A; l2 = '● f(' + p.a + ') + f(' + p.b + ') = ' + fa + ' + ' + fb + ' = ' + B; }
    else if (progress.formula >= 1) { l1 = '▲ ' + p.a + ' + ' + p.b + ' = ' + p.sumG + '  →  ' + A; l2 = '● ' + p.a + '→' + fa + ', ' + p.b + '→' + fb + '  →  ' + fa + ' + ' + fb + ' = ' + B; }
    else { l1 = '▲ ' + A; l2 = '● ' + B; }
    Draw.text(l1, S.x, S.y + 140, { size: 18, color: PAL.ink });
    Draw.text(l2, S.x, S.y + 162, { size: 18, color: PAL.ink });
  }
}
function drawLedger() {
  const Lg = LEDGER;
  ctx.save(); ctx.translate(Lg.x, Lg.y); ctx.rotate(.008);
  Draw.rrect(0, 0, Lg.w, Lg.h, 4, PAL.bone, 2.5, 760);
  // perforaciones de cinta de teletipo
  for (let i = 0; i < 12; i++) Draw.ellipse(14 + i * 36, 10, 3, 3, PAL.paperDeep, 0, 761 + i);
  ctx.restore();
  Draw.text('CINTA DE PARES', Lg.x + 22, Lg.y + 28, { size: 14, font: FONT.plate, align: 'left', spacing: 1 });
  Draw.text('a \\ b', Lg.gx - 24, Lg.gy - 14, { size: 13, color: PAL.inkSoft });
  for (let b = 0; b < 4; b++) Draw.text(String(b), Lg.gx + b * Lg.cell + 16, Lg.gy - 14, { size: 16, font: FONT.title });
  for (let a = 0; a < 4; a++) Draw.text(String(a), Lg.gx - 16, Lg.gy + a * Lg.cell + 16, { size: 16, font: FONT.title });
  for (let i = 0; i < 16; i++) {
    const r = ledgerCell(i), st = ledger.cells[i], pv = ledger.prev[i], focus = focusId === 'cell:' + i && kbdMode, sel = ledger.selected === i;
    Draw.rrect(r.x, r.y, r.w, r.h, 3, sel ? '#f6dfb8' : 'rgba(255,255,255,.35)', sel ? 3 : 1.5, 770 + i, sel ? PAL.plum : PAL.inkFaint);
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    if (pv && !st) { ctx.save(); ctx.globalAlpha = .3; stampMark(pv, cx, cy, .7); ctx.restore(); }
    if (st) {
      const blink = ledger.blink === i ? (Math.sin(realT * 8) > 0 ? 1 : .55) : 1;
      ctx.save(); ctx.globalAlpha = (ledger.stale ? .35 : 1) * blink; stampMark(st, cx, cy, 1 + ledger.pop[i] * .6); ctx.restore();
      if (pv && pv !== st) { ctx.save(); ctx.globalAlpha = .45; stampMark(pv, r.x + r.w - 6, r.y + 6, .35); ctx.restore(); }
    }
  }
  // detalle del par seleccionado: las dos rutas lado a lado
  const rep = progress.lastRun, i = ledger.selected;
  const x0 = Lg.gx + 4 * Lg.cell + 22;
  if (rep && rep.check && i >= 0 && ledger.cells[i]) {
    const p = rep.check.pairs[i];
    Draw.text('par ' + p.a + ' + ' + p.b, x0, Lg.gy + 6, { size: 20, align: 'left' });
    Draw.text('▲ sumar, traducir: ' + (p.routeA === null ? '?' : p.routeA), x0, Lg.gy + 38, { size: 16, align: 'left', color: PAL.ink });
    Draw.text('● traducir, sumar: ' + (p.routeB === null ? '?' : p.routeB), x0, Lg.gy + 62, { size: 16, align: 'left', color: PAL.ink });
    if (p.status === 'escape') Draw.text('   (el ' + p.routeB + ' no vive allá)', x0, Lg.gy + 82, { size: 14, align: 'left', color: PAL.bad });
    Draw.text(p.ok ? 'coinciden' : p.status === 'undefined' ? 'sin cable' : 'NO coinciden', x0, Lg.gy + 106, { size: 19, align: 'left', color: p.ok ? PAL.good : PAL.bad });
    Draw.text('(pulsa una casilla)', x0, Lg.gy + 132, { size: 14, align: 'left', color: PAL.inkSoft });
  } else {
    Draw.text('▲ ruta A: sumar aquí,', x0, Lg.gy + 10, { size: 16, align: 'left', color: PAL.inkSoft });
    Draw.text('   luego traducir', x0, Lg.gy + 30, { size: 16, align: 'left', color: PAL.inkSoft });
    Draw.text('● ruta B: traducir,', x0, Lg.gy + 58, { size: 16, align: 'left', color: PAL.inkSoft });
    Draw.text('   luego sumar allá', x0, Lg.gy + 78, { size: 16, align: 'left', color: PAL.inkSoft });
    if (ledger.stale) Draw.text('(cinta anterior)', x0, Lg.gy + 112, { size: 14, align: 'left', color: PAL.inkSoft });
  }
}
function stampMark(st, x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  if (st === 'ok') Draw.curve([[-9, 0], [-2, 8], [11, -9]], 4, PAL.good);
  else if (st === 'fail') { Draw.line(-8, -8, 8, 8, 4, 780, PAL.bad); Draw.line(8, -8, -8, 8, 4, 781, PAL.bad); }
  else if (st === 'escape') { Draw.ellipse(0, 0, 9, 9, null, 3.5, 782, PAL.bad); Draw.line(-10, 10, 10, -10, 3.5, 783, PAL.bad); }
  else Draw.text('?', 0, 1, { size: 20, font: FONT.title, color: PAL.inkSoft });
  ctx.restore();
}

function drawTray() {
  Draw.rrect(TRAY.x, TRAY.y + 60, TRAY.w, 18, 4, '#8d5a2f', 3, 790);
  Draw.line(TRAY.x + 20, TRAY.y + 78, TRAY.x + 20, TRAY.y + 100, 4, 791); Draw.line(TRAY.x + TRAY.w - 20, TRAY.y + 78, TRAY.x + TRAY.w - 20, TRAY.y + 100, 4, 792);
  Draw.text('bandeja', TRAY.x + TRAY.w - 46, TRAY.y + 69, { size: 15, color: PAL.bone });
  // indicación discreta de tiza hasta el primer arrastre
  if (!progress.firstDragDone) {
    ctx.save(); ctx.globalAlpha = .7 + Math.sin(realT * 3) * .2;
    const b = blocks.ARRANCA;
    Draw.text('arrástrame', b.x - 120, b.y - 52, { size: 21, color: PAL.ink, jitter: 1, seed: 5 });
    Draw.curve([[b.x - 80, b.y - 40], [b.x - 60, b.y - 30], [b.x - 54, b.y - 22]], 2.5, PAL.ink);
    ctx.restore();
  } else if (machine.awake && !progress.firstCordDone) {
    ctx.save(); ctx.globalAlpha = .65 + Math.sin(realT * 3) * .2;
    Draw.text('tira de mí hasta un nido →', SRC_POS[1].x + 20, SRC_POS[1].y - 92, { size: 19, jitter: 1, seed: 6 });
    ctx.restore();
  }
}
function drawTicket() {
  if (machine.ticketOut < .02) return;
  const o = machine.ticketOut, t = TICKET;
  ctx.save(); ctx.translate(t.x + t.w / 2, t.y + 30 - 30 * o); ctx.rotate(-.05 + Math.sin(realT * 2) * .02);
  Draw.rrect(-t.w / 2, -t.h / 2, t.w, t.h, 3, PAL.bone, 2.5, 795);
  Draw.text('¿QUÉ PASÓ?', 0, -6, { size: 14, font: FONT.plate, spacing: 1 });
  Draw.text('(I) ábreme', 0, 14, { size: 15, color: PAL.inkSoft });
  ctx.restore();
  Draw.rrect(t.x - 6, t.y + 26, t.w + 12, 10, 3, PAL.ink, 0, 796);
}
function drawBubbles() {
  for (const b of bubbles) {
    const o = ownerPos(b.owner);
    const fade = Math.min(1, (b.dur - b.t) * 3);
    ctx.save(); ctx.globalAlpha = fade;
    ctx.font = '20px ' + FONT.hand;
    const words = b.text.split(' '), lines = []; let cur = '';
    for (const w of words) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > 250 && cur) { lines.push(cur); cur = w; } else cur = t; }
    lines.push(cur);
    const w = Math.max(...lines.map(l => ctx.measureText(l).width)) + 28, h = lines.length * 24 + 16;
    let x = U.clamp(o.x - w / 2, 12, W - w - 12), y = U.clamp(o.y - h - 18, 8, H - h - 8);
    const s = Ease.back(b.s);
    ctx.translate(o.x, o.y); ctx.scale(s, s); ctx.translate(-o.x, -o.y);
    const tailX = U.clamp(o.x, x + 16, x + w - 16);
    Draw.shape([[tailX - 10, y + h - 3], [o.x, Math.min(o.y - 2, y + h + 16)], [tailX + 8, y + h - 3]], PAL.bone, 2.5);
    Draw.rrect(x, y, w, h, 14, PAL.bone, 2.5, 870 + (b.text.length % 7));
    ctx.fillStyle = PAL.bone; ctx.fillRect(tailX - 8, y + h - 5, 15, 5);
    lines.forEach((l, i) => Draw.text(l, x + 14, y + 20 + i * 24, { size: 20, align: 'left' }));
    ctx.restore();
  }
}
function drawParticles() {
  for (const q of particles) {
    const a = 1 - q.t / q.life;
    ctx.save(); ctx.globalAlpha = Math.max(0, a); ctx.translate(q.x, q.y); ctx.rotate(q.rot);
    if (q.kind === 'paper') { ctx.fillStyle = q.col; ctx.fillRect(-q.r, -q.r * .5, q.r * 2, q.r); ctx.strokeStyle = PAL.ink; ctx.lineWidth = 1; ctx.strokeRect(-q.r, -q.r * .5, q.r * 2, q.r); }
    else { Draw.ellipse(0, 0, q.r * (1 + q.t), q.r * (1 + q.t), q.col, 0, 880); }
    ctx.restore();
  }
}
function drawFocus() {
  if (!kbdMode || !focusId) return;
  const o = interactives().find(q => q.id === focusId); if (!o) return;
  ctx.save(); ctx.setLineDash([8, 6]); ctx.lineDashOffset = -realT * 30;
  Draw.rrect(o.x - 6, o.y - 6, o.w + 12, o.h + 12, 10, null, 3.5, 890, PAL.ultra);
  ctx.restore();
  if (o.label) {
    ctx.font = '16px ' + FONT.hand; const w = ctx.measureText(o.label).width + 20;
    const x = U.clamp(o.x + o.w / 2 - w / 2, 8, W - w - 8), y = o.y + o.h + 14 > H - 30 ? o.y - 40 : o.y + o.h + 12;
    Draw.rrect(x, y, w, 26, 6, PAL.ink, 0, 891); Draw.text(o.label, x + w / 2, y + 13, { size: 16, color: PAL.bone });
  }
}
function drawHover() {
  if (kbdMode || !hoverId || drag) return;
  const o = interactives().find(q => q.id === hoverId); if (!o) return;
  if (o.kind === 'pad' && hold) { Draw.ellipse(PADS[o.ref].x, PADS[o.ref].y - 10, 66, 52, null, 3, 892, PAL.ultra); }
  if (o.kind === 'knob' || o.kind === 'lever' || o.kind === 'cell' || o.kind === 'belly' || o.kind === 'ticket') {
    ctx.save(); ctx.globalAlpha = .6; Draw.rrect(o.x - 3, o.y - 3, o.w + 6, o.h + 6, 8, null, 2, 893, PAL.ink); ctx.restore();
  }
}
function drawPointerHint() {
  if (!pointerHint) return;
  const p = hintTargetPos(pointerHint.target), a = Math.min(1, pointerHint.t * 3, (pointerHint.dur - pointerHint.t) * 2);
  const bob = SET.reduced ? 0 : Math.sin(realT * 6) * 8;
  ctx.save(); ctx.globalAlpha = a;
  const sx = p.x - 70, sy = p.y - 90 + bob;
  Draw.curve([[sx, sy], [sx + 30, sy + 10], [p.x - 18, p.y - 26 + bob * .5]], 4, PAL.ultra);
  const ang = Math.atan2((p.y - 26) - (sy + 10), (p.x - 18) - (sx + 30));
  const e = [p.x - 18, p.y - 26 + bob * .5];
  Draw.curve([[e[0] + Math.cos(ang + 2.5) * 16, e[1] + Math.sin(ang + 2.5) * 16], e, [e[0] + Math.cos(ang - 2.5) * 16, e[1] + Math.sin(ang - 2.5) * 16]], 4, PAL.ultra);
  ctx.restore();
}
function render() {
  drawBackground();
  drawTitle();
  drawOrder();
  drawSourceWorld();
  drawDestWorld();
  const msh = machine.shake > 0 ? Math.sin(realT * 55) * 6 * machine.shake : 0;
  ctx.save(); ctx.translate(msh, 0);
  drawMachineShell(0);
  // fichas en la barriga (en tamaño legible, delante de la mini-máquina)
  ctx.save(); ctx.beginPath(); ctx.arc(PORT.x, PORT.y, PORT.r, 0, Math.PI * 2); ctx.clip();
  L.config.belly.forEach(n => { const c = chips[n]; if (c.inBelly && !c.drag) { const p = bellySlotWorld(n); drawChip(n, p.x, p.y + Math.sin(realT * 2 + n) * 2, .75); } });
  ctx.restore();
  drawBoss();
  drawSwitchboard();
  drawRail();
  drawKnobs();
  drawTicket();
  ctx.restore();
  drawLever();
  drawScale();
  drawLedger();
  drawTray();
  Object.values(blocks).filter(b => !b.drag).forEach(drawBlock);
  [2, 4].forEach(n => { const c = chips[n]; if (!c.inBelly || c.drag) drawChip(n, c.fly || c.drag ? c.x : (L.config.chip === n ? SOCKET.x : c.x), c.fly || c.drag ? c.y : (L.config.chip === n ? SOCKET.y : c.y), c.s); });
  natives.forEach(drawCritter);
  residents.forEach(drawCritter);
  srcs.forEach(c => { c.x = c.hx; c.y = c.hy; drawCritter(c); });
  tokens.forEach(drawToken);
  drawParticles();
  Object.values(blocks).filter(b => b.drag).forEach(drawBlock);
  drawHover();
  drawPointerHint();
  drawBubbles();
  drawFocus();
  if (Run.paused) { Draw.text('— PAUSA —', W / 2, 30, { size: 22, font: FONT.plate, color: PAL.bad, spacing: 3 }); }
  drawEncargado(enc);
  drawIntroSkip();
}
function drawChip(n, x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  Draw.ellipse(0, 0, 21, 21, PAL.mustard, 3, 1000 + n);
  Draw.ellipse(0, 0, 15, 15, null, 1.5, 1002 + n, PAL.mustardDeep);
  Draw.text(String(n), 0, 1, { size: 24, font: FONT.title });
  ctx.restore();
}

/* ================================================================
 * INTRODUCCIÓN: el problema antes que las reglas
 * ============================================================== */
const enc = makeEncargado(-90, 862);
const ORDER_LINE = 'Que las dos rutas lleguen siempre al mismo sitio.';
const INTRO_CFG = { slots: { motor: 'ARRANCA', total: 'TODO', puerta: 'COMPARTIDO', ley: 'CONSERVA' }, tray: ['EXCLUSIVO'], chip: 2, belly: [4],
  map: [1, 1, 0, 0], plugOrder: [1, 2, 3, 4], plugCounter: 4 };
const intro = { active: false };
const clone = o => JSON.parse(JSON.stringify(o));
function setInstant(c) { lastCfg = clone(c); L.setRaw(c, 'raw-instant'); syncVisualFromConfig(); placeChips(); }
function placeChips() {
  [2, 4].forEach(n => { const c = chips[n]; c.fly = false; c.drag = false; c.s = 1; c.inBelly = L.config.chip !== n; if (!c.inBelly) { c.x = SOCKET.x; c.y = SOCKET.y; } });
}
function stage(patch, label) { const c = clone(L.config); patch(c); L.setRaw(c, label || 'intro'); }
function startIntro() {
  intro.active = true; order.reveal = 0;
  setInstant(INTRO_CFG);
  machine.awake = true; machine.gearTarget = .25; boss.expr = 'idle'; boss.exprT = 99;
  const T = (t, fn) => later(t, fn, 'intro');
  T(.7, () => { say('boss', 'Prueba de fábrica: cero más cero…'); bossDo('focus', 3); });
  T(1.5, () => {
    machine.lever.target = .35; Sound.lever(); later(.25, () => { machine.lever.target = -1.15; }, 'intro');
    const rep = L.run(), p = rep.check.pairs[0];
    startRun('intro', (function* () { tw.add(scaleS, { show: 1 }, .3); yield .3; const d = playPair(p, rep); yield d; judgePair(0, p, true); yield 1.2; })(), rep);
  });
  T(6.6, () => { bossDo('panic', 2); say('boss', '¡▲ dice 1 y ● dice 0! ¿Por qué no salen iguales?'); });
  T(8.4, () => { enc.tx = 90; });
  T(9.4, () => { encSay('Orden nº 4: ' + ORDER_LINE); tw.add(order, { reveal: 1 }, motion(.6), { ease: Ease.back }); Sound.whoosh(); });
  T(13.2, () => { say('boss', '¡Yo lo arreglo!'); bossDo('cheer', 1); });
  T(14.0, () => { stage(c => { c.slots.puerta = 'EXCLUSIVO'; c.tray = ['COMPARTIDO']; }); say('boss', 'Cinta: así no se pelean.', { announce: false }); });
  T(15.6, () => { stage(c => { c.chip = 4; c.belly = [2]; }); say('boss', '¡Más número, más potencia!', { announce: false }); });
  T(17.2, () => { stage(c => { c.map = [null, null, null, null]; }); machine.shake = .6; Sound.clunk(); });
  T(18.0, () => { stage(c => { const f = AlgebraCore.initialConfig(); for (const k in f) c[k] = f[k]; }); machine.shake = 1; Sound.jam(); });
  T(19.4, () => { encSay('Técnico: es toda suya. Las piezas que sobran están en la bandeja.'); endIntro(); });
}
function cleanupRunVisuals() {
  Run.gen = null; Run.active = false; rtw.list = []; tokens = []; residents = [];
  scaleS.show = 0; scaleS.pair = null; scaleS.panA = scaleS.panB = null; scaleS.beam.target = 0;
  ledger.cells.fill(null); ledger.prev.fill(null); ledger.blink = -1; ledger.selected = -1; ledger.stale = false;
  progress.lastRun = null;
}
function skipIntro() {
  cancelTimers('intro'); cleanupRunVisuals();
  setInstant(AlgebraCore.initialConfig());
  machine.awake = false; machine.gearTarget = 0; boss.expr = 'sleep'; boss.exprT = 99;
  enc.x = enc.tx = 90; order.reveal = 1; bubbles.length = 0;
  encSay('Orden nº 4: ' + ORDER_LINE);
  endIntro();
}
function endIntro() {
  intro.active = false; cleanupRunVisuals(); L.clearHistory();
  App.markIntro && App.markIntro();
  progress.lastProgress = realT;
}
function encSay(text, o) { enc.talk = Math.min(3, text.length * .05); say('enc', text, o); }
function drawIntroSkip() {
  if (!intro.active) return;
  ctx.save(); ctx.globalAlpha = .7 + Math.sin(realT * 3) * .2;
  Draw.text('clic o cualquier tecla para saltar la introducción', W / 2, H - 16, { size: 17, color: PAL.inkSoft });
  ctx.restore();
}
function toggleFormula() { progress.formulaOpen = !progress.formulaOpen; Sound.click(); announce(progress.formulaOpen ? 'Fórmula: f de a más b igual a f de a más f de b, para todos los pares.' : 'Fórmula plegada.'); }

/* Gancho de pruebas: lee el estado lógico y el visual derivado. */
const debugApi = {
  L, Run, progress, marks, order, ledger, machine, blocks, srcs, enc, intro, residents: () => residents, tokens: () => tokens,
  pull: pullLever, knob: knobAct, plug: tryPlug, clickBlock, replayPair, startReverse, openReport, skipIntro,
  fastForward() { for (let i = 0; i < 3000 && (Run.active || timers.length); i++) { update(1 / 30); updateEncargado(enc, 1 / 30); } },
  step(sec) { for (let i = 0; i < sec * 30; i++) { update(1 / 30); updateEncargado(enc, 1 / 30); } },
  visual() {
    const cfg = L.config;
    return {
      awake: machine.awake, gate: machine.padGate, cloth: machine.cloth, phantom: machine.phantom,
      lamps: Object.fromEntries(AlgebraCore.SLOTS.map(s => [s, !!cfg.slots[s]])),
      blocksAt: Object.fromEntries(Object.values(blocks).map(b => [b.id, [Math.round(b.x), Math.round(b.y)]])),
      chipInBelly: { 2: chips[2].inBelly, 4: chips[4].inBelly },
      cords: cfg.map.map((y, x) => y === null ? null : [x, y]).filter(Boolean),
      residents: residents.map(r => ({ v: r.v, hat: r.hat })),
      ledger: ledger.cells.slice(), bubbles: bubbles.map(b => b.text), boss: boss.expr,
    };
  },
};
return {
  enter() {
    window.__AE = debugApi;
    progress.lastProgress = 0;
    if (!App.save.intro1) startIntro();
    else {
      order.reveal = 1;
      later(.4, () => { enc.tx = 90; });
      later(1.3, () => encSay('Orden nº 4: ' + ORDER_LINE));
      later(3.6, () => { if (!machine.awake) say('boss', 'zzz…', { dur: 1.6, announce: false }); });
    }
  },
  exit() { if (window.__AE === debugApi) window.__AE = null; },
  update(dt) { update(dt); updateEncargado(enc, dt); },
  render, pointerDown, pointerMove, pointerUp, pointerCancel, pointerLeave, key: onKey,
  hint: () => { if (!intro.active) giveHint(false); },
  busy: () => intro.active || Run.active,
  skip: () => { if (intro.active) skipIntro(); else if (Run.active) { for (let i = 0; i < 4000 && Run.active; i++) update(1 / 10); } },
  tableContext: () => { const p = scaleS.pair, hl = {}; if (p) { hl.Z4 = { r: p.a, c: p.b }; if (p.fa !== null && p.fb !== null && p.fa !== undefined) hl.Z2 = { r: p.fa, c: p.fb }; } return { groups: [AlgebraGroups.GROUPS.Z4, AlgebraGroups.GROUPS.Z2], highlight: hl, note: 'Arriba el reloj de 4; abajo, el de 2. La balanza compara ambas.' }; },
  debug: () => debugApi,
};
};
