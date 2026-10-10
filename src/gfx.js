/* THE ALGEBRA ENGINE — utilidades, dibujo a mano alzada, animación y sonido.
 * Nada de lógica matemática aquí. */
'use strict';

/* ================= utilidades ================= */
const U = {
  clamp: (v, a, b) => v < a ? a : v > b ? b : v,
  lerp: (a, b, t) => a + (b - a) * t,
  dist: (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay),
  rand: (a, b) => a + Math.random() * (b - a),
  pick: (arr) => arr[(Math.random() * arr.length) | 0],
  hash(n) { let x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return (x - Math.floor(x)) * 2 - 1; },
};
const Ease = {
  linear: t => t,
  inOut: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  out: t => 1 - Math.pow(1 - t, 3),
  in: t => t * t * t,
  back: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  elastic: t => t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - .75) * (2 * Math.PI) / 3) + 1,
  // anticipación: retrocede un poco y luego sale disparado
  antic: t => { const s = 2.2; return t * t * ((s + 1) * t - s); },
};

/* ================= paleta (mundo de papel secante) ================= */
const PAL = {
  paper: '#efc9a2', paperDeep: '#dea679', margin: '#b9805a',
  ink: '#211c33', inkSoft: 'rgba(33,28,51,.55)', inkFaint: 'rgba(33,28,51,.18)',
  bone: '#fbefdc', mustard: '#e3a52e', mustardDeep: '#b97e17', olive: '#6f8436', oliveDeep: '#4f6125',
  ultra: '#2b47d1', ultraPale: '#a9b8ef', plum: '#7c3b73', ochre: '#d98d1c',
  c0: '#9a86b5', c1: '#f08624', c2: '#c9412f', c3: '#ebc642',
  good: '#4f7a2c', bad: '#b8322a', island: '#e7b788', islandDeep: '#c99064', isle2: '#c7c9df', isle2Deep: '#9ea3c6',
};
const SRC_COL = [PAL.c0, PAL.c1, PAL.c2, PAL.c3];
const FONT = {
  title: '"Chango", "Arial Black", Impact, sans-serif',
  plate: '"Special Elite", "Courier New", monospace',
  hand: '"Patrick Hand", "Comic Sans MS", "Segoe Print", cursive',
};

/* ================= dibujo a mano alzada ================= */
const Draw = {
  ctx: null, boil: 0, wob: 1,
  // ruido determinista por forma, que "hierve" a 8 fps como animación dibujada
  n(seed, i) { return U.hash(seed * 7.13 + i * 1.731 + this.boil * 19.37); },
  ellipsePts(cx, cy, rx, ry, seed, amt) {
    const N = Math.max(14, Math.min(40, ((rx + ry) / 3) | 0)), pts = [];
    const a = amt === undefined ? 1.3 : amt;
    for (let i = 0; i < N; i++) {
      const t = i / N * Math.PI * 2, j = this.n(seed, i) * a * this.wob;
      pts.push([cx + Math.cos(t) * (rx + j), cy + Math.sin(t) * (ry + j)]);
    }
    return pts;
  },
  rrectPts(x, y, w, h, r, seed, amt) {
    const pts = [], a = (amt === undefined ? 1.1 : amt) * this.wob;
    r = Math.min(r, w / 2, h / 2);
    const corner = (cx, cy, a0) => { for (let k = 0; k <= 4; k++) { const t = a0 + k / 4 * Math.PI / 2; pts.push([cx + Math.cos(t) * r, cy + Math.sin(t) * r]); } };
    const edge = (x1, y1, x2, y2) => { const L = Math.hypot(x2 - x1, y2 - y1), n = Math.max(1, (L / 28) | 0); for (let k = 1; k < n; k++) pts.push([U.lerp(x1, x2, k / n), U.lerp(y1, y2, k / n)]); };
    corner(x + w - r, y + r, -Math.PI / 2); edge(x + w, y + r, x + w, y + h - r);
    corner(x + w - r, y + h - r, 0); edge(x + w - r, y + h, x + r, y + h);
    corner(x + r, y + h - r, Math.PI / 2); edge(x, y + h - r, x, y + r);
    corner(x + r, y + r, Math.PI); edge(x + r, y, x + w - r, y);
    return pts.map((p, i) => [p[0] + this.n(seed, i) * a, p[1] + this.n(seed + 50, i) * a]);
  },
  path(pts, close) {
    const c = this.ctx; c.beginPath();
    if (pts.length < 3) { c.moveTo(pts[0][0], pts[0][1]); for (const p of pts) c.lineTo(p[0], p[1]); return; }
    // curva suave por puntos medios
    const m = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
    const n = pts.length;
    if (close) {
      let s = m(pts[n - 1], pts[0]); c.moveTo(s[0], s[1]);
      for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n], e = m(p, q); c.quadraticCurveTo(p[0], p[1], e[0], e[1]); }
      c.closePath();
    } else {
      c.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < n - 1; i++) { const e = m(pts[i], pts[i + 1]); c.quadraticCurveTo(pts[i][0], pts[i][1], e[0], e[1]); }
      c.lineTo(pts[n - 1][0], pts[n - 1][1]);
    }
  },
  shape(pts, fill, lw, stroke) {
    const c = this.ctx; this.path(pts, true);
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (lw) { c.lineWidth = lw; c.strokeStyle = stroke || PAL.ink; c.lineJoin = 'round'; c.stroke(); }
  },
  ellipse(cx, cy, rx, ry, fill, lw, seed, stroke) { this.shape(this.ellipsePts(cx, cy, rx, ry, seed || 1), fill, lw, stroke); },
  rrect(x, y, w, h, r, fill, lw, seed, stroke) { this.shape(this.rrectPts(x, y, w, h, r, seed || 1), fill, lw, stroke); },
  line(x1, y1, x2, y2, lw, seed, stroke) {
    const n = Math.max(2, (Math.hypot(x2 - x1, y2 - y1) / 30) | 0), pts = [];
    for (let i = 0; i <= n; i++) { const t = i / n, j = (i === 0 || i === n) ? 0 : this.n(seed || 3, i) * 1.4 * this.wob; pts.push([U.lerp(x1, x2, t) + j, U.lerp(y1, y2, t) - j]); }
    this.path(pts, false); const c = this.ctx; c.lineWidth = lw || 3; c.strokeStyle = stroke || PAL.ink; c.lineCap = 'round'; c.stroke();
  },
  curve(pts, lw, stroke, dash) {
    const c = this.ctx; this.path(pts, false); c.lineWidth = lw; c.strokeStyle = stroke; c.lineCap = 'round'; c.lineJoin = 'round';
    if (dash) c.setLineDash(dash); c.stroke(); if (dash) c.setLineDash([]);
  },
  // texto con letras ligeramente torcidas (rótulo pintado a mano)
  text(str, x, y, o) {
    o = o || {}; const c = this.ctx;
    const size = o.size || 18, font = o.font || FONT.hand;
    c.font = (o.weight || '') + ' ' + size + 'px ' + font;
    c.fillStyle = o.color || PAL.ink; c.textBaseline = o.base || 'middle';
    if (!o.jitter) { c.textAlign = o.align || 'center'; if (o.stroke) { c.lineWidth = o.stroke; c.strokeStyle = o.strokeColor || PAL.bone; c.lineJoin = 'round'; c.strokeText(str, x, y); } c.fillText(str, x, y); return; }
    const chars = Array.from(str), sp = o.spacing || 0;
    const widths = chars.map(ch => c.measureText(ch).width + sp);
    const total = widths.reduce((a, b) => a + b, 0) - sp;
    let cx = o.align === 'left' ? x : o.align === 'right' ? x - total : x - total / 2;
    c.textAlign = 'left';
    chars.forEach((ch, i) => {
      const s = (o.seed || 9) + i;
      c.save(); c.translate(cx, y + U.hash(s * 3.1) * o.jitter * .6); c.rotate(U.hash(s * 1.7) * o.jitter * .035);
      if (o.stroke) { c.lineWidth = o.stroke; c.strokeStyle = o.strokeColor || PAL.bone; c.lineJoin = 'round'; c.strokeText(ch, 0, 0); }
      c.fillText(ch, 0, 0); c.restore(); cx += widths[i];
    });
  },
  textWidth(str, size, font) { const c = this.ctx; c.font = size + 'px ' + font; return c.measureText(str).width; },
};

/* ================= interpolaciones (basadas en tiempo) ================= */
class Tweens {
  constructor() { this.list = []; }
  add(obj, to, dur, opt) {
    opt = opt || {};
    const from = {}; for (const k in to) from[k] = obj[k];
    const tw = { obj, from, to, dur: Math.max(.0001, dur), t: -(opt.delay || 0), ease: opt.ease || Ease.inOut, done: opt.done, upd: opt.update, tag: opt.tag };
    if (opt.replace !== false) {
      const keys = Object.keys(to);
      for (const o of this.list.concat(this._cur || [])) if (o.obj === obj && keys.some(k => k in o.to)) o.dead = true;
    }
    this.list.push(tw); return tw;
  }
  update(dt) {
    const keep = [], cur = this.list;
    this._cur = cur;
    this.list = [];                       // las callbacks pueden añadir tweens nuevos aquí
    for (const tw of cur) {
      if (tw.dead) continue;
      const wasWaiting = tw.t <= 0;
      tw.t += dt;
      if (tw.t < 0) { keep.push(tw); continue; }
      if (wasWaiting) for (const k in tw.to) tw.from[k] = tw.obj[k];   // los retrasados parten del valor actual
      const p = U.clamp(tw.t / tw.dur, 0, 1), e = tw.ease(p);
      for (const k in tw.to) tw.obj[k] = U.lerp(tw.from[k], tw.to[k], e);
      if (tw.upd) tw.upd(p);
      if (p >= 1) { if (tw.done) tw.done(); } else keep.push(tw);
    }
    this._cur = null;
    this.list = keep.filter(t => !t.dead).concat(this.list.filter(t => !t.dead));
  }
  clearTag(tag) { for (const t of this.list.concat(this._cur || [])) if (t.tag === tag) t.dead = true; }
  killObj(obj) { for (const t of this.list.concat(this._cur || [])) if (t.obj === obj) t.dead = true; }
}

/* Muelle amortiguado para aplastar y estirar. */
function Spring(v) { return { v: v === undefined ? 1 : v, vel: 0, target: v === undefined ? 1 : v }; }
function stepSpring(s, dt, k, d) {
  k = k || 260; d = d || 13;
  const steps = Math.ceil(dt / (1 / 120));
  const h = dt / steps;
  for (let i = 0; i < steps; i++) { const a = k * (s.target - s.v) - d * s.vel; s.vel += a * h; s.v += s.vel * h; }
}

/* ================= sonido sintetizado (Web Audio) ================= */
const Sound = {
  ac: null, master: null, levels: [0, .22, .45, .8], level: 2, noiseBuf: null,
  init() {
    if (this.ac) { if (this.ac.state === 'suspended') this.ac.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      this.ac = new AC(); this.master = this.ac.createGain(); this.master.gain.value = this.levels[this.level];
      const comp = this.ac.createDynamicsCompressor(); this.master.connect(comp); comp.connect(this.ac.destination);
      const len = this.ac.sampleRate * .5; this.noiseBuf = this.ac.createBuffer(1, len, this.ac.sampleRate);
      const d = this.noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { this.ac = null; }
  },
  setLevel(i) { this.level = (i + this.levels.length) % this.levels.length; if (this.master) this.master.gain.setTargetAtTime(this.levels[this.level], this.ac.currentTime, .02); },
  get muted() { return this.level === 0; },
  ok() { return this.ac && this.level > 0; },
  tone(freq, dur, o) {
    if (!this.ok()) return; o = o || {};
    const t0 = this.ac.currentTime + (o.delay || 0), osc = this.ac.createOscillator(), g = this.ac.createGain();
    osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(freq, t0);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t0 + dur);
    if (o.vib) { const l = this.ac.createOscillator(), lg = this.ac.createGain(); l.frequency.value = o.vib; lg.gain.value = o.vibAmt || 8; l.connect(lg); lg.connect(osc.frequency); l.start(t0); l.stop(t0 + dur + .05); }
    const vol = o.vol === undefined ? .3 : o.vol, at = o.attack || .005;
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + at); g.gain.exponentialRampToValueAtTime(.0008, t0 + dur);
    let node = osc;
    if (o.lp) { const f = this.ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(o.lp, t0); if (o.lpTo) f.frequency.exponentialRampToValueAtTime(o.lpTo, t0 + dur); f.Q.value = o.q || 4; osc.connect(f); node = f; }
    node.connect(g); g.connect(this.master); osc.start(t0); osc.stop(t0 + dur + .05);
  },
  noise(dur, o) {
    if (!this.ok()) return; o = o || {};
    const t0 = this.ac.currentTime + (o.delay || 0), src = this.ac.createBufferSource(), f = this.ac.createBiquadFilter(), g = this.ac.createGain();
    src.buffer = this.noiseBuf; src.loop = true; f.type = o.filter || 'bandpass'; f.frequency.setValueAtTime(o.freq || 2000, t0);
    if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t0 + dur); f.Q.value = o.q || 1.5;
    g.gain.setValueAtTime(o.vol || .3, t0); g.gain.exponentialRampToValueAtTime(.0008, t0 + dur);
    src.connect(f); f.connect(g); g.connect(this.master); src.start(t0); src.stop(t0 + dur + .02);
  },
  // ---- vocabulario sonoro del juego ----
  click() { this.noise(.035, { freq: 3800, q: 6, vol: .5 }); this.tone(1400, .04, { type: 'square', vol: .06 }); },
  clunk() { this.noise(.08, { freq: 500, q: 3, vol: .6 }); this.tone(110, .12, { type: 'triangle', vol: .3, to: 70 }); },
  snap() { this.click(); this.tone(880, .07, { type: 'triangle', vol: .15, delay: .03 }); },
  plug() { this.noise(.05, { freq: 2600, q: 8, vol: .4 }); this.tone(320, .09, { type: 'square', vol: .08, to: 520, lp: 1800 }); },
  unplug() { this.tone(700, .16, { type: 'sawtooth', vol: .07, to: 160, lp: 2200 }); this.noise(.12, { freq: 1500, to: 400, vol: .2 }); },
  voice(v, mood) {
    const t = this.ac ? 0 : 0;
    if (v === 0) this.tone(150, .32, { type: 'sine', vol: .25, to: 130, vib: 5, vibAmt: 4, attack: .05 });
    else if (v === 1) this.tone(520, .18, { type: 'square', vol: .07, to: 1150, lp: 2600 });
    else if (v === 2) this.tone(mood === 'angry' ? 95 : 120, .28, { type: 'sawtooth', vol: .12, to: 85, lp: 700, vib: 18, vibAmt: 12 });
    else if (v === 3) { [392, 523, 659].forEach((f, i) => this.tone(f, .12, { type: 'triangle', vol: .12, delay: i * .07 })); }
    else if (v === 'z0') this.tone(240, .16, { type: 'sine', vol: .2, to: 200 });
    else if (v === 'z1') this.tone(760, .12, { type: 'triangle', vol: .14, to: 990 });
    else if (v === 'boss') this.tone(300, .22, { type: 'square', vol: .06, to: 420, lp: 1400, vib: 9, vibAmt: 25 });
  },
  boing() { this.tone(240, .3, { type: 'sine', vol: .25, to: 700, vib: 14, vibAmt: 40 }); },
  pop() { this.tone(600, .06, { type: 'sine', vol: .25, to: 1200 }); this.noise(.03, { freq: 3000, vol: .2 }); },
  whoosh() { this.noise(.32, { freq: 400, to: 2400, q: 1, vol: .22 }); },
  slurp() { this.tone(500, .22, { type: 'sine', vol: .18, to: 140, vib: 30, vibAmt: 60 }); },
  tick(i) { this.noise(.025, { freq: 2600 + (i % 4) * 300, q: 9, vol: .35 }); this.tone(i % 2 ? 1046 : 784, .05, { type: 'triangle', vol: .07 }); },
  rhythm(i) { this.tone([196, 247, 294, 247][i % 4], .09, { type: 'square', vol: .05, lp: 900 }); this.noise(.04, { freq: 900, q: 2, vol: .25 }); },
  ding() { [1318, 1976, 2637].forEach((f, i) => this.tone(f, .9 - i * .2, { type: 'sine', vol: .14 / (i + 1) })); },
  buzz() { this.tone(180, .45, { type: 'sawtooth', vol: .14, to: 70, lp: 900, lpTo: 200, vib: 7, vibAmt: 20 }); },
  kazoo() { this.tone(330, .5, { type: 'sawtooth', vol: .1, to: 165, lp: 1200, vib: 6, vibAmt: 30 }); },
  jam() { this.noise(.5, { freq: 300, to: 80, filter: 'lowpass', vol: .7 }); this.tone(60, .5, { type: 'square', vol: .12, lp: 300 }); [0, .12, .24].forEach(d => this.noise(.05, { freq: 1600, q: 4, vol: .4, delay: d })); },
  steam() { this.noise(.7, { freq: 5000, to: 2500, filter: 'highpass', vol: .18 }); },
  chomp() { this.noise(.06, { freq: 700, vol: .6 }); this.noise(.06, { freq: 600, vol: .6, delay: .14 }); this.tone(90, .1, { type: 'square', vol: .1, lp: 400, delay: .14 }); },
  burp() { this.tone(110, .38, { type: 'sawtooth', vol: .16, to: 70, lp: 500, vib: 22, vibAmt: 18, delay: .35 }); },
  snore() { this.noise(.9, { freq: 260, to: 520, q: 3, vol: .12 }); },
  lever() { this.noise(.12, { freq: 1200, to: 300, vol: .3 }); this.clunk(); },
  fall() { this.tone(900, .7, { type: 'sine', vol: .14, to: 90 }); },
  signature() {
    // firma del puzle: arpegio torcido en escala lidia, con bocina final
    const notes = [523, 659, 740, 988, 1175, 988, 1480];
    notes.forEach((f, i) => this.tone(f, .22, { type: i % 2 ? 'triangle' : 'square', vol: i % 2 ? .12 : .05, lp: 3000, delay: i * .09 }));
    this.tone(196, .9, { type: 'sawtooth', vol: .07, lp: 800, delay: .65, vib: 5, vibAmt: 6 });
    this.ding && setTimeout(() => this.ding(), 700);
  },
};
