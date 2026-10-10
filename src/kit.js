/* THE ALGEBRA ENGINE — kit de escena (iteración 3).
 * Sistemas reutilizables: eventos, secuencias interrumpibles, diálogos sin repetición, pistas graduadas,
 * reacciones de personajes, cámara, comprobador de rutas, veredicto, tabla de Cayley, sonido con variación.
 * Nada de aquí decide si una respuesta es correcta: eso lo hace AlgebraGroups. */
'use strict';
const Kit = (function () {
const W = 1600, H = 900;
const K = {};

/* ================================================================
 * EVENTOS: una acción puede encadenar reacciones (con retraso)
 * ============================================================== */
K.Bus = function () {
  const h = {}, q = [];
  return {
    on(t, fn) { (h[t] = h[t] || []).push(fn); return this; },
    emit(t, d, delay) {
      if (delay) { q.push({ t, d, at: delay }); return; }
      (h[t] || []).slice().forEach(fn => fn(d || {}));
      (h['*'] || []).slice().forEach(fn => fn(t, d || {}));
    },
    update(dt) { for (let i = q.length - 1; i >= 0; i--) { q[i].at -= dt; if (q[i].at <= 0) { const e = q.splice(i, 1)[0]; this.emit(e.t, e.d); } } },
    clear() { q.length = 0; },
  };
};

/* ================================================================
 * SECUENCIADOR: generadores + interpolaciones, con pausa, prisa y salto
 * ============================================================== */
K.Runner = function () {
  return {
    gen: null, wait: 0, scale: 1, paused: false, tw: new Tweens(), active: false, tag: null, onEnd: null,
    start(gen, tag, onEnd) { this.kill(); this.gen = gen; this.wait = 0; this.active = true; this.tag = tag || null; this.scale = 1; this.onEnd = onEnd || null; },
    kill() { this.gen = null; this.active = false; this.tw.list = []; this.paused = false; this.onEnd = null; },
    /** Termina la secuencia al instante con el mismo resultado lógico. */
    skip() { this.paused = false; let g = 0; while (this.active && g++ < 40000) this.update(1 / 10, true); },
    update(dt, raw) {
      if (!this.active || this.paused) return;
      const d = dt * this.scale * (raw ? 1 : (Clock.reduced ? 1.6 : 1));
      this.tw.update(d); this.wait -= d;
      let g = 0;
      while (this.gen && this.wait <= 0 && g++ < 80) { const r = this.gen.next(); if (r.done) { this.gen = null; break; } this.wait += r.value || 0; }
      if (!this.gen && !this.tw.list.length) { this.active = false; const f = this.onEnd; this.onEnd = null; f && f(); }
    },
  };
};
K.polyAt = function (pts, u) {
  let total = 0; for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  let d = U.clamp(u, 0, 1) * total;
  for (let i = 1; i < pts.length; i++) {
    const seg = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (d <= seg || i === pts.length - 1) { const t = seg ? d / seg : 0; return { x: U.lerp(pts[i - 1][0], pts[i][0], t), y: U.lerp(pts[i - 1][1], pts[i][1], t) }; }
    d -= seg;
  }
  return { x: pts[0][0], y: pts[0][1] };
};
/** Hace recorrer un camino a un objeto dentro de un secuenciador; anticipación opcional. */
K.travel = function (tw, obj, pts, dur, o) {
  o = o || {};
  obj._u = 0;
  if (o.antic && obj.sx) { obj.sx.vel -= 6; obj.sy.vel += 6; }
  return tw.add(obj, { _u: 1 }, dur, { ease: o.ease || Ease.inOut, delay: o.delay || 0,
    update: () => { const p = K.polyAt(pts, obj._u); obj.x = p.x; obj.y = p.y; if (o.hops) obj.hop = Math.abs(Math.sin(obj._u * Math.PI * o.hops)) * (o.hopH || 12); },
    done: () => { obj.hop = 0; if (o.land && obj.sx) { obj.sx.v = 1.25; obj.sy.v = .75; } o.done && o.done(); } });
};

/* ================================================================
 * DIRECTOR DE DIÁLOGOS: repertorios por evento, sin repetir, con intercambios
 * ============================================================== */
K.Director = function (cast) {
  const bubbles = [], used = {}, cool = {}, queue = [], log = [];
  const fill = (s, ctx) => s.replace(/\{(\w+)\}/g, (_, k) => (ctx && ctx[k] !== undefined ? ctx[k] : '?'));
  const D = {
    cast, bubbles,
    line(who, text, o) {
      o = o || {};
      for (let i = bubbles.length - 1; i >= 0; i--) if (bubbles[i].who === who) bubbles.splice(i, 1);
      if (bubbles.length > 2) bubbles.shift();
      bubbles.push({ who, text, t: 0, dur: o.dur || Math.max(2.4, text.length * .062) }); log.push(text); if (log.length > 60) log.shift();
      const c = cast[who]; if (c && c.onSay) c.onSay(text);
      Sound.fam('voice', { who: c && c.voice || who });
      if (o.announce !== false && window.App) window.App.announce(text);
    },
    /** Elige una variante no usada del repertorio y la reproduce como intercambio. */
    play(pool, key, ctx, o) {
      o = o || {};
      if (cool[key] > 0 && !o.force) return false;
      const vs = pool[key]; if (!vs || !vs.length) return false;
      used[key] = used[key] || [];
      let cand = vs.map((_, i) => i).filter(i => used[key].indexOf(i) === -1);
      if (!cand.length) { const last = used[key][used[key].length - 1]; used[key] = []; cand = vs.map((_, i) => i).filter(i => i !== last || vs.length === 1); }
      const i = cand[(Math.random() * cand.length) | 0]; used[key].push(i);
      const v = typeof vs[i] === 'function' ? vs[i](ctx) : vs[i];
      if (o.interrupt) queue.length = 0;
      let t = o.delay || 0;
      v.forEach(l => { const text = fill(l[1], ctx); queue.push({ at: t, who: fill(l[0], ctx), text }); t += l[2] || Math.max(1.5, text.length * .052); });
      cool[key] = o.cooldown !== undefined ? o.cooldown : 5;
      return true;
    },
    busy() { return bubbles.length > 0 || queue.length > 0; },
    hush() { queue.length = 0; bubbles.length = 0; },
    update(dt) {
      for (const k in cool) cool[k] -= dt;
      for (let i = queue.length - 1; i >= 0; i--) { queue[i].at -= dt; }
      while (queue.length && queue[0].at <= 0) { const q = queue.shift(); D.line(q.who, q.text); }
      queue.sort((a, b) => a.at - b.at);
      for (let i = bubbles.length - 1; i >= 0; i--) { bubbles[i].t += dt; if (bubbles[i].t > bubbles[i].dur) bubbles.splice(i, 1); }
    },
    draw(toScreen) {
      bubbles.forEach(b => {
        const c = cast[b.who]; if (!c) return;
        let p = c.pos(); if (!c.screen && toScreen) p = toScreen(p);
        window.App.drawBubble(p, b.text, Math.min(1, b.t * 7), Math.min(1, (b.dur - b.t) * 3));
      });
    },
    texts() { return bubbles.map(b => b.text).concat(queue.map(q => q.text)); },
    log,
  };
  return D;
};

/* ================================================================
 * PISTAS GRADUADAS: observación → propiedad → ejemplo parcial
 * ============================================================== */
K.Hints = function (rules) {
  const idx = {};
  const pick = state => rules.find(r => r.when(state));
  const tierOf = (r, i, state) => { const t = r.tiers[Math.min(i, r.tiers.length - 1)]; return { topic: r.topic, tier: Math.min(i, r.tiers.length - 1) + 1, who: t.who || r.who || 'enc', text: typeof t.text === 'function' ? t.text(state) : t.text, point: t.point ? t.point(state) : (r.point ? r.point(state) : null) }; };
  return {
    rules,
    next(state) { const r = pick(state); if (!r) return null; const i = idx[r.topic] || 0; idx[r.topic] = i + 1; return tierOf(r, i, state); },
    peek(state) { const r = pick(state); return r ? tierOf(r, 0, state) : null; },
    tierCount(topic) { return idx[topic] || 0; },
  };
};

/* ================================================================
 * REACCIONES Y VIDA: respiración, mirada, marcas de emoción
 * ============================================================== */
const MARK_FOR = { surprise: '!', shame: 'sweat', pride: 'spark', frustration: 'steam', relief: 'sigh', understand: 'bulb', confused: '?', err: 'sweat', anger: 'vein', love: 'spark' };
const EXPR_FOR = { surprise: 'shock', shame: 'sad', pride: 'proud', frustration: 'angry', relief: 'happy', understand: 'happy', confused: 'worried', err: 'worried', anger: 'angry', love: 'happy' };
K.react = function (c, kind, dur) {
  if (!c) return;
  dur = dur || 1.8;
  c.mark = MARK_FOR[kind] || null; c.markT = dur;
  if (!c.sy) return;                       // aparatos: sólo la marca
  setExpr(c, EXPR_FOR[kind] || 'shock', dur);
  if (kind === 'surprise') { c.sy.vel -= 8; c.sx.vel += 4; }
  else if (kind === 'shame') { c.lean = -.06; c.sy.vel += 4; }
  else if (kind === 'pride') { c.sy.vel -= 5; c.puff = Math.min(1, (c.puff || 0) + .5); }
  else if (kind === 'frustration' || kind === 'anger') { c.shake = .6; }
  else if (kind === 'relief') { c.sy.vel += 5; c.sx.vel -= 3; }
  else if (kind === 'understand') { c.sy.vel -= 7; }
  else if (kind === 'confused') { c.sx.vel += 3; }
};
/** Respiración, parpadeo y mirada hacia un punto de interés. */
K.live = function (c, dt, look) {
  stepCritter(c, dt);
  if (!Clock.reduced) { const ph = c.id * 10; c.sy.target = 1 + Math.sin(Clock.t * 2.1 + ph) * .022; c.sx.target = 1 - Math.sin(Clock.t * 2.1 + ph) * .012; }
  else { c.sy.target = 1; c.sx.target = 1; }
  if (look) {
    const a = Math.atan2(look.y - c.y, look.x - c.x), d = U.clamp(Math.hypot(look.x - c.x, look.y - c.y) / 220, 0, 1);
    c.lookX = U.lerp(c.lookX, Math.cos(a) * d, Math.min(1, dt * 6)); c.lookY = U.lerp(c.lookY, Math.sin(a) * d, Math.min(1, dt * 6));
  }
  if (c.markT !== undefined) { c.markT -= dt; if (c.markT <= 0) c.mark = null; }
  if (c.lean) c.lean *= Math.pow(.2, dt);
  if (c.puff) c.puff = Math.max(0, c.puff - dt * .6);
};
K.drawMark = function (c, scaleY) {
  if (!c.mark) return;
  const x = c.x + 18 * (c.s || 1), y = c.y - (c.hop || 0) - 74 * (c.s || 1) * (scaleY || 1), a = Math.min(1, c.markT * 2);
  const ctx = Draw.ctx; ctx.save(); ctx.globalAlpha *= a; const b = Math.sin(Clock.t * 8) * 2;
  if (c.mark === '!' || c.mark === '?') Draw.text(c.mark, x, y + b, { size: 30, font: FONT.title, color: PAL.bad, stroke: 4, strokeColor: PAL.bone });
  else if (c.mark === 'sweat') Draw.shape([[x, y - 10], [x + 7, y + 4], [x, y + 8], [x - 7, y + 4]], '#9fd0f0', 2);
  else if (c.mark === 'spark') for (let k = 0; k < 3; k++) { const r = 6 + k * 3, ang = Clock.t * 3 + k * 2; Draw.line(x + Math.cos(ang) * r - 4, y + Math.sin(ang) * r, x + Math.cos(ang) * r + 4, y + Math.sin(ang) * r, 2.5, 4000 + k, PAL.mustard); }
  else if (c.mark === 'steam') for (let k = 0; k < 2; k++) Draw.ellipse(x - 6 + k * 12, y - ((Clock.t * 30 + k * 10) % 20), 6, 6, 'rgba(251,239,220,.85)', 1.5, 4010 + k);
  else if (c.mark === 'sigh') Draw.ellipse(x + 10, y + 8 - ((Clock.t * 20) % 14), 8, 5, 'rgba(251,239,220,.85)', 1.5, 4020);
  else if (c.mark === 'bulb') { Draw.ellipse(x, y, 10, 10, '#ffe27a', 2.5, 4030); Draw.rrect(x - 5, y + 8, 10, 7, 2, PAL.bone, 2, 4031); for (let k = 0; k < 5; k++) { const ang = -Math.PI / 2 + (k - 2) * .5; Draw.line(x + Math.cos(ang) * 14, y + Math.sin(ang) * 14, x + Math.cos(ang) * 20, y + Math.sin(ang) * 20, 2, 4032 + k, PAL.mustard); } }
  else if (c.mark === 'vein') { Draw.curve([[x - 8, y - 4], [x - 2, y], [x - 8, y + 4]], 2.5, PAL.bad); Draw.curve([[x + 8, y - 4], [x + 2, y], [x + 8, y + 4]], 2.5, PAL.bad); }
  ctx.restore();
};

/* ================================================================
 * CÁMARA: los niveles pueden ser más grandes que la pantalla
 * ============================================================== */
K.Camera = function (world) {
  world = world || { w: W, h: H };
  const c = { x: W / 2, y: H / 2, z: 1, tx: W / 2, ty: H / 2, tz: 1, world, follow: null,
    clamp() { const hw = W / 2 / c.tz, hh = H / 2 / c.tz; c.tx = U.clamp(c.tx, hw, Math.max(hw, world.w - hw)); c.ty = U.clamp(c.ty, hh, Math.max(hh, world.h - hh)); },
    goto(x, y, z) { c.tx = x; c.ty = y; if (z) c.tz = z; c.clamp(); },
    snap() { c.x = c.tx; c.y = c.ty; c.z = c.tz; },
    update(dt) { if (c.follow) { const p = c.follow(); if (p) { c.tx = p.x; c.ty = p.y; c.clamp(); } } const k = Math.min(1, dt * (Clock.reduced ? 12 : 4)); c.x += (c.tx - c.x) * k; c.y += (c.ty - c.y) * k; c.z += (c.tz - c.z) * k; },
    apply(ctx) { ctx.translate(W / 2, H / 2); ctx.scale(c.z, c.z); ctx.translate(-c.x, -c.y); },
    toWorld(p) { return { x: (p.x - W / 2) / c.z + c.x, y: (p.y - H / 2) / c.z + c.y }; },
    toScreen(p) { return { x: (p.x - c.x) * c.z + W / 2, y: (p.y - c.y) * c.z + H / 2 }; },
  };
  return c;
};

/* ================================================================
 * COMPROBADOR PORTÁTIL DE RUTAS: se detiene donde divergen
 * ============================================================== */
K.RouteSlip = function (G, Hh, f, a, b, o) {
  o = o || {};
  const s = G.op(a, b), fa = f[a], fb = f[b], A = f[s], B = (fa === null || fb === null) ? null : Hh.op(fa, fb);
  const slip = { G, H: Hh, a, b, s, fa, fb, A, B, ok: A === B, t: 0, stage: 0, open: 0, closing: false, x: o.x || 460, y: o.y || 640, w: 720, h: 196, title: o.title || 'COMPROBADOR DE RUTAS',
    reverse: !!o.reverse,
    update(dt) { slip.open = Math.min(1, slip.open + dt * 4); if (slip.closing) slip.open = Math.max(0, slip.open - dt * 8); slip.t += dt * (Clock.reduced ? 2 : 1);
      const st = Math.min(3, Math.floor(slip.t / .9)); if (st !== slip.stage) { slip.stage = st; Sound.fam(st === 3 ? (slip.ok ? 'clickin' : 'fail') : 'gear'); } },
    replay() { slip.t = 0; slip.stage = 0; },
    hit(p) { return p.x >= slip.x && p.x <= slip.x + slip.w && p.y >= slip.y && p.y <= slip.y + slip.h; },
    highlights() { const h = {}; h[G.key] = { r: a, c: b }; if (fa !== null && fb !== null) h[Hh.key] = { r: fa, c: fb }; return h; },
  };
  return slip;
};
K.drawSlip = function (sl) {
  if (!sl || sl.open <= 0) return;
  const ctx = Draw.ctx, { G, H: Hh } = sl, LG = i => G.labels[i], LH = i => (i === null || i === undefined ? '?' : Hh.labels[i]);
  ctx.save(); ctx.translate(sl.x + sl.w / 2, sl.y + sl.h / 2); const sc = Ease.back(sl.open); ctx.scale(sc, sc); ctx.rotate(-.01); ctx.translate(-sl.x - sl.w / 2, -sl.y - sl.h / 2);
  const x = sl.x, y = sl.y;
  Draw.rrect(x, y, sl.w, sl.h, 4, PAL.bone, 2.5, 4100);
  for (let k = 0; k < 14; k++) Draw.ellipse(x + 14 + k * 38, y + 9, 3, 3, PAL.paperDeep, 0, 4101 + k);
  Draw.text(sl.title, x + 18, y + 28, { size: 13, font: FONT.plate, align: 'left', spacing: 1 });
  Draw.text('(clic: repetir)', x + sl.w - 16, y + 28, { size: 14, align: 'right', color: PAL.inkSoft });
  const st = sl.stage, rowA = y + 70, rowB = y + 130, sp = G.key, hp = Hh.key;
  const bead = (spec, xx, yy, r, alpha) => drawBead(spec, xx, yy, r || 15, alpha);
  const arrow = (x1, yy, x2, lab, col) => { Draw.line(x1, yy, x2 - 8, yy, 2.5, 4120 + x1, col); Draw.curve([[x2 - 16, yy - 6], [x2 - 6, yy], [x2 - 16, yy + 6]], 2.5, col); if (lab) Draw.text(lab, (x1 + x2) / 2, yy - 14, { size: 14, color: col }); };
  // ▲ ruta A
  Draw.shape([[x + 16, rowA - 8], [x + 32, rowA], [x + 16, rowA + 8]], PAL.ochre, 2);
  bead(speciesFor(sp, sl.a), x + 64, rowA); Draw.text(G.symbol, x + 92, rowA, { size: 18 }); bead(speciesFor(sp, sl.b), x + 120, rowA);
  if (st >= 1) { arrow(x + 142, rowA, x + 206, 'opera', PAL.ochre); bead(speciesFor(sp, sl.s), x + 226, rowA); }
  if (st >= 2) { arrow(x + 248, rowA, x + 320, 'traduce', PAL.ochre); bead(speciesFor(hp, sl.A), x + 342, rowA, 16); }
  // ● ruta B
  Draw.ellipse(x + 24, rowB, 8, 8, PAL.plum, 2, 4130);
  bead(speciesFor(sp, sl.a), x + 64, rowB - 14, 12); bead(speciesFor(sp, sl.b), x + 64, rowB + 14, 12);
  if (st >= 1) { arrow(x + 80, rowB - 14, x + 150, '', PAL.plum); arrow(x + 80, rowB + 14, x + 150, 'traduce', PAL.plum); bead(speciesFor(hp, sl.fa), x + 166, rowB - 14, 12); bead(speciesFor(hp, sl.fb), x + 166, rowB + 14, 12); }
  if (st >= 2) { arrow(x + 186, rowB, x + 300, 'opera allí (' + Hh.symbol + ')', PAL.plum); if (sl.B !== null) bead(speciesFor(hp, sl.B), x + 342, rowB, 16); }
  if (st >= 3) {
    const col = sl.ok ? PAL.good : PAL.bad;
    Draw.line(x + 342, rowA + 20, x + 342, rowB - 20, 3, 4140, col);
    Draw.text(sl.ok ? '=' : '≠', x + 362, (rowA + rowB) / 2, { size: 26, font: FONT.title, color: col });
    const tx = x + 392;
    Draw.text('▲ f(' + LG(sl.a) + ' ' + G.symbol + ' ' + LG(sl.b) + ') = f(' + LG(sl.s) + ') = ' + LH(sl.A), tx, rowA, { size: 17, align: 'left' });
    Draw.text('● f(' + LG(sl.a) + ') ' + Hh.symbol + ' f(' + LG(sl.b) + ') = ' + LH(sl.fa) + ' ' + Hh.symbol + ' ' + LH(sl.fb) + ' = ' + LH(sl.B), tx, rowB, { size: 17, align: 'left' });
    Draw.text(sl.ok ? 'las dos rutas llegan al mismo sitio' : 'aquí se separan las rutas', tx, (rowA + rowB) / 2, { size: 16, align: 'left', color: col });
  }
  ctx.restore();
};

/* ================================================================
 * VEREDICTO: distingue los cinco casos (y dice qué falta)
 * ============================================================== */
const VERDICT = {
  incomplete: { title: 'FUNCIÓN INCOMPLETA', col: PAL.inkSoft, icon: 'hole' },
  broken: { title: 'NO CONSERVA LA OPERACIÓN', col: PAL.bad, icon: 'crack' },
  'hom-noninj': { title: 'HOMOMORFISMO', col: PAL.good, sub: 'conserva la operación · falta: que nadie comparta destino', icon: 'merge' },
  'hom-nonsurj': { title: 'HOMOMORFISMO', col: PAL.good, sub: 'conserva la operación · falta: que no haya destinos vacíos', icon: 'empty' },
  'hom-neither': { title: 'HOMOMORFISMO', col: PAL.good, sub: 'conserva la operación · faltan las dos cosas', icon: 'merge' },
  'hom-badcodomain': { title: 'HOMOMORFISMO', col: PAL.good, sub: 'pero el destino ya no es un grupo', icon: 'crack' },
  iso: { title: 'ISOMORFISMO', col: PAL.plum, sub: 'conserva, nadie comparte, nadie vacío', icon: 'both' },
};
K.verdictText = function (d, G, Hh) {
  const v = VERDICT[d.kind] || { title: d.kind };
  let sub = v.sub || '';
  if (d.kind === 'incomplete') sub = 'sin destino: ' + d.missing.concat(d.outside || []).map(x => G.labels[x]).join(', ');
  if (d.kind === 'broken') { const c = d.counterexample; sub = 'falla en ' + G.labels[c.a] + ' ' + G.symbol + ' ' + G.labels[c.b] + ': ▲ ' + Hh.labels[c.routeA] + ' · ● ' + Hh.labels[c.routeB]; }
  return { title: v.title, sub, col: v.col, icon: v.icon };
};
K.drawVerdict = function (x, y, d, G, Hh, o) {
  if (!d) return;
  o = o || {}; const v = K.verdictText(d, G, Hh), ctx = Draw.ctx;
  const w = Math.max(300, Draw.textWidth(v.sub, 16, FONT.hand) + 80), h = 64, sw = Math.sin(Clock.t * 1.5) * .02 * (Clock.reduced ? 0 : 1);
  ctx.save(); ctx.translate(x, y); ctx.rotate(sw + (o.tilt || -.02));
  Draw.line(-w / 2 + 30, -40, -w / 2 + 30, 0, 2, 4200); Draw.line(w / 2 - 30, -40, w / 2 - 30, 0, 2, 4201);
  Draw.rrect(-w / 2, 0, w, h, 6, PAL.bone, 3, 4202, v.col);
  Draw.ellipse(-w / 2 + 30, 8, 4, 4, PAL.ink, 0, 4203); Draw.ellipse(w / 2 - 30, 8, 4, 4, PAL.ink, 0, 4204);
  const ix = -w / 2 + 34, iy = 34;
  if (v.icon === 'hole') { ctx.save(); ctx.setLineDash([4, 4]); Draw.ellipse(ix, iy, 12, 12, null, 2.5, 4210); ctx.restore(); }
  if (v.icon === 'crack') { Draw.line(ix - 12, iy - 6, ix + 12, iy - 6, 3, 4211); Draw.curve([[ix, iy - 14], [ix - 4, iy - 2], [ix + 3, iy + 4], [ix - 2, iy + 14]], 2.5, PAL.bad); }
  if (v.icon === 'merge') { Draw.curve([[ix - 12, iy - 10], [ix, iy], [ix + 12, iy]], 2.5, PAL.ink); Draw.curve([[ix - 12, iy + 10], [ix, iy], [ix + 12, iy]], 2.5, PAL.ink); }
  if (v.icon === 'empty') { Draw.rrect(ix - 12, iy - 8, 24, 18, 3, null, 2.5, 4212); Draw.text('?', ix, iy + 1, { size: 14, color: PAL.bad }); }
  if (v.icon === 'both') { Draw.line(ix - 12, iy - 5, ix + 12, iy - 5, 2.5, 4213); Draw.line(ix - 12, iy + 5, ix + 12, iy + 5, 2.5, 4214); Draw.curve([[ix + 6, iy - 10], [ix + 12, iy - 5], [ix + 6, iy]], 2.5, PAL.ink); Draw.curve([[ix - 6, iy], [ix - 12, iy + 5], [ix - 6, iy + 10]], 2.5, PAL.ink); }
  Draw.text(v.title, -w / 2 + 62, 22, { size: 16, font: FONT.plate, align: 'left', color: v.col, spacing: 1 });
  Draw.text(v.sub, -w / 2 + 62, 46, { size: 16, align: 'left' });
  ctx.restore();
};

/* ================================================================
 * TABLA DE CAYLEY PORTÁTIL (la abre la aplicación; la escena dice qué resaltar)
 * ============================================================== */
K.drawCayley = function (Gk, x, y, cell, hl, hover) {
  const n = Gk.n, ctx = Draw.ctx, w = cell * (n + 1);
  Draw.text(Gk.name + '  (' + Gk.symbol + ')', x, y - 14, { size: 15, font: FONT.plate, align: 'left' });
  for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) {
    const cx = x + j * cell, cy = y + i * cell;
    const inRow = hl && i - 1 === hl.r, inCol = hl && j - 1 === hl.c, isCell = inRow && inCol;
    let fill = i === 0 || j === 0 ? '#ead7b4' : 'rgba(255,255,255,.4)';
    if ((inRow && j > 0) || (inCol && i > 0)) fill = '#f6e27a';
    if (hover && hover.r === i - 1 && hover.c === j - 1) fill = '#e9d6f0';
    ctx.fillStyle = fill; ctx.fillRect(cx, cy, cell, cell); ctx.strokeStyle = PAL.inkFaint; ctx.lineWidth = 1; ctx.strokeRect(cx, cy, cell, cell);
    let lab = '';
    if (i === 0 && j === 0) lab = Gk.symbol; else if (i === 0) lab = Gk.labels[j - 1]; else if (j === 0) lab = Gk.labels[i - 1]; else lab = Gk.labels[Gk.op(i - 1, j - 1)];
    const isE = i > 0 && j > 0 && Gk.op(i - 1, j - 1) === Gk.identity;
    Draw.text(lab, cx + cell / 2, cy + cell / 2 + 1, { size: cell * .5, font: i === 0 || j === 0 ? FONT.title : FONT.hand, color: isE ? PAL.plum : PAL.ink });
    if (isCell) Draw.ellipse(cx + cell / 2, cy + cell / 2, cell * .42, cell * .42, null, 3, 4300, PAL.bad);
  }
  ctx.strokeStyle = PAL.ink; ctx.lineWidth = 2.5; ctx.strokeRect(x, y, w, w);
  return { x, y, cell, n, w };
};

/* ================================================================
 * PORTAPAPELES DE LA ORDEN: plegable, sólo lo justo
 * ============================================================== */
K.Clipboard = function (o) {
  const cb = Object.assign({ open: 1, target: 1, hover: false }, o);
  cb.toggle = () => { cb.target = cb.target ? 0 : 1; Sound.fam('slide'); };
  cb.update = dt => { cb.open += (cb.target - cb.open) * Math.min(1, dt * 8); };
  // plegada, la orden se cuelga en el margen izquierdo (fuera del área de juego)
  cb.gx = () => Math.min(cb.x, 8 - ((App.view && App.view.ox) || 0));
  cb.rect = () => cb.open > .5 ? { x: cb.x, y: cb.y, w: 360, h: cb.height || 200 } : { x: cb.gx(), y: cb.y, w: 64, h: 64 };
  cb.draw = function (goals) {
    const ctx = Draw.ctx, y = cb.y; let x = cb.x;
    if (cb.open < .5) {
      x = cb.gx();
      ctx.save(); ctx.translate(x + 30, y + 30); ctx.rotate(-.08);
      Draw.rrect(-24, -28, 48, 58, 4, '#c7a36b', 2.5, 4400); Draw.rrect(-18, -20, 36, 44, 2, PAL.bone, 1.5, 4401); Draw.rrect(-10, -32, 20, 10, 3, '#6f6a55', 2, 4402);
      Draw.line(-12, -8, 12, -8, 1.5, 4403); Draw.line(-12, 0, 8, 0, 1.5, 4404); Draw.line(-12, 8, 10, 8, 1.5, 4405);
      const okN = (goals || []).filter(g => g.ok).length; Draw.text(okN + '/' + (goals || []).length, 0, 40, { size: 13, font: FONT.plate });
      ctx.restore(); return;
    }
    const lines = App.wrap(cb.text, 320, 19), gs = goals || [];
    const h = 56 + lines.length * 22 + gs.length * 28 + 14; cb.height = h;
    const s = (cb.open - .5) * 2;
    ctx.save(); ctx.translate(x, y); ctx.scale(.6 + .4 * s, .6 + .4 * s); ctx.rotate(-.015);
    Draw.rrect(0, 0, 360, h, 4, '#c7a36b', 2.5, 4410); Draw.rrect(8, 14, 344, h - 22, 3, PAL.bone, 2, 4411); Draw.rrect(150, -6, 60, 18, 4, '#6f6a55', 2.5, 4412);
    Draw.text(cb.title, 22, 36, { size: 15, font: FONT.plate, align: 'left' });
    Draw.text('(O)', 340, 36, { size: 13, align: 'right', color: PAL.inkSoft });
    lines.forEach((l, i) => Draw.text(l, 22, 62 + i * 22, { size: 19, align: 'left' }));
    let yy = 62 + lines.length * 22 + 14;
    gs.forEach(g => {
      Draw.rrect(22, yy - 11, 22, 22, 3, PAL.bone, 2, 4420 + yy);
      if (g.ok) Draw.curve([[26, yy], [32, yy + 7], [48, yy - 14]], 4, PAL.good);
      else if (g.seen) { Draw.line(27, yy - 6, 39, yy + 6, 3, 4421 + yy, PAL.bad); Draw.line(39, yy - 6, 27, yy + 6, 3, 4422 + yy, PAL.bad); }
      Draw.text(g.text, 54, yy, { size: 18, align: 'left', color: g.ok ? PAL.good : PAL.ink }); yy += 28;
    });
    ctx.restore();
  };
  return cb;
};

/* ================================================================
 * BOTÓN FÍSICO (placa con remaches) y flecha de pista
 * ============================================================== */
K.plate = function (x, y, w, h, label, o) {
  o = o || {}; const pr = o.press || 0;
  Draw.rrect(x + 3, y + 5, w, h, 6, 'rgba(33,28,51,.3)', 0, 4500 + x);
  Draw.rrect(x, y + pr * 3, w, h, 6, o.fill || PAL.bone, 2.5, 4501 + x, o.focus ? PAL.ultra : PAL.ink);
  [[x + 8, y + 8], [x + w - 8, y + 8], [x + 8, y + h - 8], [x + w - 8, y + h - 8]].forEach((p, i) => Draw.ellipse(p[0], p[1] + pr * 3, 2.2, 2.2, PAL.inkSoft, 0, 4502 + i));
  Draw.text(label, x + w / 2, y + h / 2 + 1 + pr * 3, { size: o.size || 14, font: FONT.plate, spacing: 1, color: o.color || PAL.ink });
};
K.drawPointer = function (p, t) {
  if (!p) return;
  const a = Math.min(1, t * 3), b = Clock.reduced ? 0 : Math.sin(Clock.t * 6) * 8, ctx = Draw.ctx;
  ctx.save(); ctx.globalAlpha *= a;
  const sx = p.x - 70, sy = p.y - 90 + b, e = [p.x - 16, p.y - 24 + b * .5];
  Draw.curve([[sx, sy], [sx + 30, sy + 10], e], 4, PAL.ultra);
  const ang = Math.atan2(e[1] - (sy + 10), e[0] - (sx + 30));
  Draw.curve([[e[0] + Math.cos(ang + 2.5) * 16, e[1] + Math.sin(ang + 2.5) * 16], e, [e[0] + Math.cos(ang - 2.5) * 16, e[1] + Math.sin(ang - 2.5) * 16]], 4, PAL.ultra);
  ctx.restore();
};

/* ================================================================
 * SONIDO: familias con pequeñas variaciones
 * ============================================================== */
Sound.fam = function (name, o) {
  if (!this.ok()) return;
  o = o || {};
  const j = 1 + (Math.random() - .5) * (o.var === undefined ? .14 : o.var), v = o.vol || 1;
  const T = (f, d, p) => this.tone(f * j, d, Object.assign({}, p, { vol: (p.vol || .2) * v, to: p.to ? p.to * j : undefined }));
  const N = (d, p) => this.noise(d, Object.assign({}, p, { vol: (p.vol || .2) * v, freq: (p.freq || 1000) * j, to: p.to ? p.to * j : undefined }));
  switch (name) {
    case 'gear': N(.04, { freq: 1900, q: 8, vol: .3 }); N(.04, { freq: 1500, q: 8, vol: .25, delay: .06 }); break;
    case 'servo': T(380, .32, { type: 'sawtooth', vol: .05, to: 620, lp: 1500 }); break;
    case 'slide': N(.16, { freq: 700, to: 1200, q: 1.5, vol: .16 }); break;
    case 'drag': N(.08, { freq: 500, to: 700, q: 1, vol: .1 }); break;
    case 'clickin': N(.02, { freq: 4300, q: 10, vol: .45 }); T(1650, .05, { type: 'triangle', vol: .1 }); T(2480, .05, { type: 'sine', vol: .05, delay: .03 }); break;
    case 'thud': N(.14, { freq: 240, to: 80, filter: 'lowpass', vol: .7 }); T(85, .16, { type: 'sine', vol: .25, to: 50 }); break;
    case 'press': N(.1, { freq: 300, q: 1, vol: .5 }); T(70, .26, { type: 'square', vol: .12, lp: 300 }); N(.05, { freq: 3000, q: 4, vol: .2, delay: .12 }); break;
    case 'transform': T(520, .22, { type: 'triangle', vol: .12, to: 1150 }); N(.15, { freq: 5000, filter: 'highpass', vol: .07, delay: .08 }); break;
    case 'collide': N(.08, { freq: 600, q: 2, vol: .6 }); T(170, .18, { type: 'square', vol: .08, to: 110, lp: 900 }); T(880, .12, { type: 'sine', vol: .07, to: 1400, delay: .08 }); break;
    case 'fail': T(220, .42, { type: 'sawtooth', vol: .11, to: 105, lp: 800, vib: 6, vibAmt: 14 }); break;
    case 'grab': N(.05, { freq: 2200, q: 6, vol: .4 }); T(300, .08, { type: 'square', vol: .07, lp: 900 }); break;
    case 'release': T(520, .12, { type: 'triangle', vol: .1, to: 720 }); break;
    case 'bell': T(1318, .7, { type: 'sine', vol: .12 }); T(1976, .5, { type: 'sine', vol: .05 }); break;
    case 'hum': T(110, .8, { type: 'sawtooth', vol: .04, lp: 400, vib: 3, vibAmt: 4 }); break;
    case 'shred': N(.7, { freq: 260, to: 900, q: 2, vol: .45 }); T(55, .7, { type: 'square', vol: .1, lp: 250, vib: 18, vibAmt: 10 }); break;
    case 'glass': T(2093, .5, { type: 'sine', vol: .08 }); T(2637, .35, { type: 'sine', vol: .05, delay: .05 }); break;
    case 'crack': N(.12, { freq: 4000, q: 3, vol: .4 }); N(.08, { freq: 2500, q: 3, vol: .3, delay: .06 }); break;
    case 'boing': T(240, .3, { type: 'sine', vol: .22, to: 680, vib: 14, vibAmt: 40 }); break;
    case 'pop': T(600, .06, { type: 'sine', vol: .22, to: 1200 }); N(.03, { freq: 3000, vol: .18 }); break;
    case 'discover': // firma de descubrimiento: cuatro notas en cuarta ascendente y un brillo
      [659, 880, 1175, 1568].forEach((f, i) => this.tone(f, .55 - i * .06, { type: i % 2 ? 'triangle' : 'sine', vol: .11 * v, delay: i * .1 }));
      this.noise(.4, { freq: 7000, filter: 'highpass', vol: .04 * v, delay: .32 }); break;
    case 'repair': for (let k = 0; k < 5; k++) N(.03, { freq: 2400 + k * 200, q: 8, vol: .3, delay: k * .06 }); [392, 494, 587].forEach((f, i) => this.tone(f, .6, { type: 'triangle', vol: .08 * v, delay: .34 + i * .04 })); break;
    case 'voice': {
      const who = o.who;
      if (who === 'enc') { N(.12, { freq: 3500, q: 1, vol: .12 }); T(160, .18, { type: 'triangle', vol: .08, to: 140, delay: .05 }); }
      else if (who === 'op') this.voice('boss');
      else if (who === 'claw') { T(900, .08, { type: 'square', vol: .04, lp: 2500 }); T(1200, .08, { type: 'square', vol: .04, lp: 2500, delay: .09 }); }
      else if (who === 'shred') { T(90, .25, { type: 'sawtooth', vol: .1, lp: 500, vib: 20, vibAmt: 12 }); T(880, .15, { type: 'sine', vol: .06, to: 1300, delay: .2 }); }
      else if (who === 'asm') { T(523, .12, { type: 'triangle', vol: .07 }); T(392, .12, { type: 'triangle', vol: .07, delay: .12 }); }
      else if (who === 'mirror') this.fam('glass', { vol: .6 });
      else if (typeof who === 'number') this.voice(who % 4);
      break;
    }
    default: break;
  }
};

/* ================================================================
 * BASE DE ESCENA: lo común (temporizadores, partículas, diálogos, pistas, foco, cierre)
 * ============================================================== */
K.base = function (App, id, spec) {
  const S = { App, id, T: 0, tw: new Tweens(), run: K.Runner(), bus: K.Bus(), timers: [], parts: [], focusId: null, hoverId: null, kbd: false,
    pointer: { x: -999, y: -999, inside: false }, lastProgress: 0, done: false, ticket: 0, approved: 0, nudges: 0, hintPt: null, slip: null, verdict: null };
  S.cam = K.Camera(spec.world);
  S.enc = makeEncargado(-120, 866);
  S.cast = Object.assign({ enc: { pos: () => ({ x: S.enc.x + 30, y: S.enc.y - 130 }), voice: 'enc', screen: true, onSay: t => { S.enc.talk = Math.min(3, t.length * .05); } } }, spec.cast || {});
  S.dir = K.Director(S.cast);
  S.hints = K.Hints(spec.hints || []);
  S.clip = K.Clipboard({ x: spec.clipAt ? spec.clipAt.x : 26, y: spec.clipAt ? spec.clipAt.y : 84, title: 'ORDEN DE TRABAJO Nº ' + id, text: spec.order });
  S.later = (t, fn, tag) => S.timers.push({ t, fn, tag });
  S.cancel = tag => S.timers.forEach(x => { if (x.tag === tag) x.dead = true; });
  S.progress = () => { S.lastProgress = S.T; };
  S.say = (who, text, o) => S.dir.line(who, text, o);
  S.toScreen = p => S.cam.toScreen(p);
  S.puff = (x, y, n, col) => { for (let i = 0; i < n; i++) S.parts.push({ x, y, vx: U.rand(-90, 90), vy: U.rand(-110, -20), r: U.rand(5, 12), col: col || PAL.bone, life: U.rand(.5, .9), t: 0, kind: 'puff' }); };
  S.confetti = (x, y, n) => { if (Clock.reduced) n = Math.min(n, 12); for (let i = 0; i < n; i++) S.parts.push({ x, y, vx: U.rand(-280, 280), vy: U.rand(-440, -120), r: U.rand(4, 9), rot: U.rand(0, 6), vr: U.rand(-8, 8), col: U.pick([PAL.mustard, PAL.bone, PAL.ultra, PAL.c1, PAL.plum]), life: U.rand(1.4, 2.4), t: 0, kind: 'paper' }); };
  S.sparks = (x, y, n, col) => { for (let i = 0; i < n; i++) { const a = U.rand(0, Math.PI * 2), sp = U.rand(80, 220); S.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 3, col: col || PAL.mustard, life: .5, t: 0, kind: 'spark' }); } };
  S.encIn = (text, o) => { S.enc.tx = 90; S.later((o && o.delay) || .9, () => S.say('enc', text, { dur: (o && o.dur) || Math.max(3.5, text.length * .06) })); if (o && o.leaveAfter) S.later(o.leaveAfter, () => { S.enc.tx = -120; }); };
  S.giveHint = () => {
    S.cancel('nudge');
    const h = S.hints.next(spec.state());
    if (!h) { S.say('enc', 'No veo nada roto. Abra «¿Qué pasó?» o vuelva a la fábrica.'); return; }
    if (h.who === 'enc' && S.enc.tx < 0) S.enc.tx = 90;
    S.dir.hush(); S.say(h.who, h.text, { dur: Math.max(4, h.text.length * .065) });
    S.hintPt = h.point ? { p: h.point, t: 0 } : null; S.progress();
    return h;
  };
  S.complete = (examples, line) => {
    if (S.done) return false;
    S.done = true; S.dir.hush(); S.enc.tx = 90;
    Sound.fam('repair'); S.later(.7, () => Sound.signature());
    S.later(1.4, () => { S.enc.stamp = 1; S.later(.5, () => { S.tw.add(S, { approved: 1 }, .25); Sound.fam('press'); }); });
    S.later(2.4, () => { S.say('enc', line || 'APROBADO. Vuelva a la fábrica (Esc) cuando quiera.', { dur: 4.5 }); S.tw.add(S, { ticket: 1 }, .6, { ease: Ease.back }); });
    return App.levelComplete(id, examples || {});
  };
  S.update = dt => {
    S.T += dt;
    for (const t of S.timers) { if (t.dead) continue; t.t -= dt; if (t.t <= 0) { t.dead = true; t.fn(); } }
    for (let i = S.timers.length - 1; i >= 0; i--) if (S.timers[i].dead) S.timers.splice(i, 1);
    S.tw.update(dt); S.run.update(dt); S.bus.update(dt); S.dir.update(dt); S.cam.update(dt); S.clip.update(dt);
    if (!S.clipAuto && S.T > 14) { S.clipAuto = true; if (S.clip.target) S.clip.toggle(); }
    updateEncargado(S.enc, dt);
    if (S.slip) { S.slip.update(dt); if (S.slip.closing && S.slip.open <= 0) S.slip = null; }
    if (S.hintPt) { S.hintPt.t += dt; if (S.hintPt.t > 4.5) S.hintPt = null; }
    for (let i = S.parts.length - 1; i >= 0; i--) { const q = S.parts[i]; q.t += dt; if (q.kind === 'paper') { q.vy += 520 * dt; q.vy = Math.min(q.vy, 160); q.rot += q.vr * dt; } else if (q.kind === 'spark') { q.vy += 300 * dt; } else q.vx *= Math.pow(.2, dt); q.x += q.vx * dt; q.y += q.vy * dt; if (q.t > q.life) S.parts.splice(i, 1); }
    // si lleva un rato sin avanzar, alguien señala una observación (sin resolver nada)
    if (!S.done && S.T - S.lastProgress > 45 && !S.dir.busy() && !S.run.active && S.nudges < 3) {
      const h = S.hints.peek(spec.state());
      if (h) { S.nudges++; S.say(h.who === 'enc' ? (spec.nudger || 'enc') : h.who, h.text, { dur: 4 }); S.hintPt = h.point ? { p: h.point, t: 0 } : null; }
      S.lastProgress = S.T;
    }
  };
  S.drawParts = () => {
    const ctx = Draw.ctx;
    S.parts.forEach(q => { ctx.save(); ctx.globalAlpha = Math.max(0, 1 - q.t / q.life); ctx.translate(q.x, q.y); if (q.kind === 'paper') { ctx.rotate(q.rot); ctx.fillStyle = q.col; ctx.fillRect(-q.r, -q.r * .5, q.r * 2, q.r); } else if (q.kind === 'spark') Draw.ellipse(0, 0, q.r, q.r, q.col, 0, 4600); else Draw.ellipse(0, 0, q.r * (1 + q.t), q.r * (1 + q.t), q.col, 0, 880); ctx.restore(); });
  };
  /** Capa de interfaz común (coordenadas de pantalla). */
  S.drawHud = (goals, extra) => {
    S.clip.draw(goals);
    if (S.verdict && spec.groups) K.drawVerdict(spec.verdictAt ? spec.verdictAt.x : 800, spec.verdictAt ? spec.verdictAt.y : 70, S.verdict, spec.groups()[0], spec.groups()[1]);
    K.drawSlip(S.slip);
    if (S.ticket > .02) { const t = spec.ticketAt || { x: 1440, y: 820 }; Draw.ctx.save(); Draw.ctx.translate(t.x + 56, t.y + 26 + (1 - S.ticket) * 30); Draw.ctx.rotate(-.05 + Math.sin(S.T * 2) * .02); Draw.rrect(-56, -26, 112, 52, 3, PAL.bone, 2.5, 795); Draw.text('¿QUÉ PASÓ?', 0, -5, { size: 13, font: FONT.plate, spacing: 1 }); Draw.text('(I) ábreme', 0, 13, { size: 14, color: PAL.inkSoft }); Draw.ctx.restore(); }
    if (S.approved > 0) { const ctx = Draw.ctx; ctx.save(); ctx.translate(spec.stampAt ? spec.stampAt.x : 260, spec.stampAt ? spec.stampAt.y : 150); ctx.rotate(-.2); ctx.globalAlpha = Math.min(.85, S.approved); Draw.rrect(-96, -24, 192, 48, 4, null, 4, 840, PAL.bad); Draw.text(S.stampText || 'REPARADA', 0, 1, { size: 24, font: FONT.plate, color: PAL.bad, spacing: 3 }); ctx.restore(); }
    drawEncargado(S.enc);
    if (extra) extra();
    S.dir.draw(S.toScreen);
    if (S.hintPt) { const p = S.hintPt.p.screen ? S.hintPt.p : S.cam.toScreen(S.hintPt.p); K.drawPointer(p, S.hintPt.t); }
  };
  /** Objetos comunes de interfaz: portapapeles y ticket. */
  S.hudItems = () => {
    const out = [];
    const r = S.clip.rect(); out.push({ id: 'clip', screen: true, x: r.x, y: r.y, w: r.w, h: r.h, label: 'Orden de trabajo (O)', act: S.clip.toggle });
    if (S.slip) out.push({ id: 'slip', screen: true, x: S.slip.x, y: S.slip.y, w: S.slip.w, h: S.slip.h, label: 'Comprobador de rutas: repetir', act: () => S.slip.replay() });
    if (S.ticket > .5) { const t = spec.ticketAt || { x: 1440, y: 820 }; out.push({ id: 'ticket', screen: true, x: t.x, y: t.y, w: 112, h: 52, label: '¿Qué pasó? (I)', act: () => App.showReport(id) }); }
    return out;
  };
  S.hit = (items, p) => {
    const w = S.cam.toWorld(p);
    const hits = items.filter(o => { const q = o.screen ? p : w; return o.r ? Math.hypot(q.x - o.x, q.y - o.y) < o.r : q.x >= o.x && q.x <= o.x + o.w && q.y >= o.y && q.y <= o.y + o.h; });
    hits.sort((a, b) => (a.pri || 5) - (b.pri || 5));
    return hits[0] || null;
  };
  S.drawFocus = items => {
    const fid = S.kbd ? S.focusId : S.hoverId; if (!fid) return;
    const o = items.find(q => q.id === fid); if (!o) return;
    if (fid !== S.hvId) { S.hvId = fid; S.hvT = S.T; }
    let r = o.r ? { x: o.x - o.r, y: o.y - o.r, w: o.r * 2, h: o.r * 2 } : o;
    if (!o.screen) { const a = S.cam.toScreen({ x: r.x, y: r.y }), z = S.cam.z; r = { x: a.x, y: a.y, w: r.w * z, h: r.h * z }; }
    const ctx = Draw.ctx;
    if (!o.noOutline && (S.kbd || o.hoverOutline)) { ctx.save(); ctx.setLineDash([8, 6]); ctx.lineDashOffset = -S.T * 30; Draw.rrect(r.x - 5, r.y - 5, r.w + 10, r.h + 10, 10, null, S.kbd ? 3.5 : 2, 890, S.kbd ? PAL.ultra : PAL.ink); ctx.restore(); }
    // etiqueta: con teclado siempre; con ratón, tras un instante quieto encima (dice qué hace cada cosa)
    if (o.label && o.id !== 'clip' && (S.kbd || S.T - S.hvT > .35)) { ctx.font = '16px ' + FONT.hand; const w = ctx.measureText(o.label).width + 20, x = U.clamp(r.x + r.w / 2 - w / 2, 8, W - w - 8), y = r.y + r.h + 40 > H ? r.y - 40 : r.y + r.h + 12; Draw.rrect(x, y, w, 26, 6, PAL.ink, 0, 891); Draw.text(o.label, x + w / 2, y + 13, { size: 16, color: PAL.bone }); }
  };
  /** Tab/flechas/Enter comunes. Devuelve true si consumió la tecla. */
  S.navKey = (e, items) => {
    const k = e.key, f = items.filter(o => !o.nofocus);
    if (k === 'Tab' || (k.startsWith('Arrow') && !spec.ownArrows)) {
      S.kbd = true; if (!f.length) return true;
      const dir = e.shiftKey || k === 'ArrowLeft' || k === 'ArrowUp' ? -1 : 1;
      let i = f.findIndex(o => o.id === S.focusId); i = (i + dir + f.length) % f.length; S.focusId = f[i].id;
      const o = f[i]; App.announce(o.label || o.id);
      if (!o.screen && spec.world && (spec.world.w > W || spec.world.h > H)) S.cam.goto(o.x + (o.w || 0) / 2, o.y + (o.h || 0) / 2);
      return true;
    }
    if (k === 'Enter' || k === ' ') { const o = f.find(q => q.id === S.focusId); if (o) { S.progress(); o.act(); } return true; }
    if (k.toLowerCase() === 'o') { S.clip.toggle(); return true; }
    if (k.toLowerCase() === 'i' && S.ticket > .5) { App.showReport(id); return true; }
    if (k.toLowerCase() === 'h') { S.giveHint(); return true; }
    return false;
  };
  return S;
};

return K;
})();
