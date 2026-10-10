/* THE ALGEBRA ENGINE — criaturas de los grupos (compartidas por todas las escenas). */
'use strict';
const Clock = { t: 0, reduced: false };

function makeCritter(kind, v, x, y, species) {
  return { kind, v, x, y, hx: x, hy: y, sx: Spring(), sy: Spring(), lookX: 0, lookY: 0, blinkT: U.rand(1, 4), blink: 0,
    expr: 'idle', exprT: 0, hop: 0, flat: 0, puff: 0, shake: 0, actT: U.rand(2.5, 7), alpha: 1, s: 1, hat: null, flag: null,
    mode: 'walk', lean: 0, id: Math.random(), species: species || null, spin: 0 };
}
function setExpr(c, e, dur) { c.expr = e; c.exprT = dur || 1.4; }
function poke(c, sx, sy) { c.sx.vel += sx; c.sy.vel += sy; }
function stepCritter(c, dt) {
  stepSpring(c.sx, dt, 300, 14); stepSpring(c.sy, dt, 300, 14);
  c.blinkT -= dt; if (c.blinkT < 0) { c.blink = .14; c.blinkT = U.rand(2, 5); } c.blink = Math.max(0, c.blink - dt);
  c.exprT -= dt; if (c.exprT < 0 && c.expr !== 'idle') c.expr = 'idle';
  c.shake = Math.max(0, c.shake - dt);
}

/* ---------------- rasgos faciales ---------------- */
function eyes(x, y, r, c, o) {
  const e = o.expr, blink = o.blink > 0 || e === 'sleepy' || e === 'sleep';
  const lx = (o.lookX || 0) * r * .45, ly = (o.lookY || 0) * r * .35;
  if (e === 'dizzy') { const a = Clock.t * 9; Draw.curve(Array.from({ length: 9 }, (_, k) => [x + Math.cos(a + k * .8) * k * r * .14, y + Math.sin(a + k * .8) * k * r * .14]), 2, PAL.ink); return; }
  if (blink) { Draw.curve([[x - r, y], [x, y + r * .5], [x + r, y]], 2.5, PAL.ink); return; }
  if (e === 'happy') { Draw.curve([[x - r, y + 2], [x, y - r * .7], [x + r, y + 2]], 3, PAL.ink); return; }
  const rr = e === 'shock' ? r * 1.25 : r;
  Draw.ellipse(x, y, rr, rr * (e === 'proud' ? .7 : 1), PAL.bone, 2, (c.id || 1) * 9 + x);
  Draw.ellipse(x + lx, y + ly, rr * .45, rr * .45, PAL.ink, 0, 5);
  if (e === 'proud') Draw.line(x - rr, y - rr * .5, x + rr, y - rr * .5, 2.5, 7);
  if (e === 'angry') Draw.line(x - rr, y - rr * 1.1 + (x < 0 ? -3 : 3), x + rr, y - rr * 1.1 + (x < 0 ? 3 : -3), 3, 8);
}
function mouth(x, y, w, e) {
  if (e === 'happy' || e === 'proud') Draw.curve([[x - w, y - 2], [x, y + w * .7], [x + w, y - 2]], 3, PAL.ink);
  else if (e === 'sad' || e === 'worried') Draw.curve([[x - w, y + 4], [x, y - w * .4], [x + w, y + 4]], 3, PAL.ink);
  else if (e === 'shock') Draw.ellipse(x, y + 2, w * .45, w * .6, PAL.ink, 0, 13);
  else if (e === 'angry') Draw.curve([[x - w, y + 2], [x - w * .3, y - 2], [x + w * .3, y + 2], [x + w, y - 2]], 3, PAL.ink);
  else if (e === 'sleepy') Draw.line(x - w * .5, y, x + w * .5, y, 2.5, 14);
  else if (e === 'dizzy') Draw.curve([[x - w, y], [x - w * .5, y - 3], [x, y + 3], [x + w * .5, y - 3], [x + w, y]], 2.5, PAL.ink);
  else Draw.curve([[x - w * .6, y], [x, y + w * .25], [x + w * .6, y]], 2.5, PAL.ink);
}
function digit(n, x, y, size) { Draw.text(String(n), x, y, { size, font: FONT.title, color: PAL.bone, stroke: 5, strokeColor: PAL.ink }); }

/* ---------------- Z4 (los habitantes originales) ---------------- */
function drawSrcBody(c, v) {
  const e = c.expr, col = SRC_COL[v];
  if (v === 0) {
    const f = c.flat;
    Draw.ellipse(0, -22 + f * 14, 38 + f * 18, 26 - f * 18, col, 3, 101);
    if (f > .55) { Draw.ellipse(0, -10, 34 + f * 14, 9, PAL.ink, 0, 102); eyes(-10, -14, 4, c, Object.assign({}, c, { expr: 'idle' })); eyes(10, -14, 4, c, Object.assign({}, c, { expr: 'idle' })); return; }
    eyes(-13, -32 + f * 10, 6, c, { expr: e === 'idle' ? 'sleepy' : e, blink: c.blink, lookX: c.lookX, lookY: c.lookY });
    eyes(13, -32 + f * 10, 6, c, { expr: e === 'idle' ? 'sleepy' : e, blink: c.blink, lookX: c.lookX, lookY: c.lookY });
    digit(0, 0, -13 + f * 8, 22);
  } else if (v === 1) {
    const bob = Math.sin(Clock.t * 9) * 4;
    Draw.curve([[4, -40], [10, -58 + bob], [16, -66 + bob]], 3, PAL.ink); Draw.ellipse(16, -68 + bob, 6, 6, PAL.c3, 2.5, 111);
    Draw.ellipse(0, -24, 24, 24, col, 3, 112);
    eyes(-8, -32, 5, c, c); eyes(9, -32, 5, c, c);
    digit(1, 0, -16, 22);
  } else if (v === 2) {
    Draw.rrect(-28, -54, 56, 52, 12, col, 3, 121);
    eyes(-11, -38, 6, c, c); eyes(11, -38, 6, c, c);
    const angry = e === 'angry' || e === 'idle';
    Draw.line(-20, -50 + (angry ? 0 : -3), -4, -44 + (angry ? 0 : -6), 4, 122); Draw.line(20, -50 + (angry ? 0 : -3), 4, -44 + (angry ? 0 : -6), 4, 123);
    digit(2, 0, -18, 22);
  } else {
    const p = c.puff;
    Draw.ellipse(0, -40, 25 + p * 6, 40 + p * 2, col, 3, 131);
    Draw.shape([[-18, -72], [-14, -92], [-6, -78], [0, -98], [6, -78], [14, -92], [18, -72]], PAL.mustard, 2.5);
    eyes(-9, -52, 5, c, Object.assign({}, c, { expr: e === 'idle' ? 'proud' : e }));
    eyes(9, -52, 5, c, Object.assign({}, c, { expr: e === 'idle' ? 'proud' : e }));
    digit(3, 0, -24, 22);
  }
  if (v !== 0 || c.flat < .55) mouth(0, v === 3 ? -38 : v === 2 ? -27 : v === 1 ? -6 : -6, 7, e === 'idle' && v === 3 ? 'proud' : e);
}
/* ---------------- Z2 (el mundo pequeño) ---------------- */
function drawDstBody(c, v, ghost) {
  if (ghost) {
    ctxSave(); Draw.ctx.setLineDash([5, 5]); Draw.ellipse(0, -24, 24, 24, 'rgba(251,239,220,.5)', 2.5, 141); ctxRestore();
    eyes(-7, -30, 5, c, c); eyes(8, -30, 5, c, c); mouth(0, -14, 6, 'shock'); Draw.text(String(v), 0, -6, { size: 18, font: FONT.title, color: PAL.inkSoft }); return;
  }
  if (v === 0) {
    Draw.shape([[-30, 0], [-28, -20], [-12, -36], [12, -36], [28, -20], [30, 0]], PAL.ultraPale, 3);
    eyes(0, -24, 7, c, c); digit(0, 0, -8, 18);
  } else {
    Draw.curve([[0, -48], [-4, -60]], 3, PAL.ink); Draw.curve([[0, -48], [6, -61]], 3, PAL.ink);
    Draw.shape([[0, -50], [20, -26], [16, -4], [0, 2], [-16, -4], [-20, -26]], PAL.ultra, 3);
    eyes(0, -30, 7, c, c); digit(1, 0, -10, 18);
  }
  drawHat(c, v === 0 ? -36 : -50);
}
function drawHat(c, hy) {
  if (c.hat === null || c.hat === undefined) return;
  const col = typeof c.hat === 'object' ? c.hat.col : SRC_COL[c.hat], lab = typeof c.hat === 'object' ? c.hat.label : String(c.hat);
  Draw.shape([[-13, hy + 2], [0, hy - 24], [13, hy + 2]], col, 2.5);
  Draw.text(lab, 0, hy - 6, { size: 12, font: FONT.title, color: PAL.ink });
}
function ctxSave() { Draw.ctx.save(); }
function ctxRestore() { Draw.ctx.restore(); }

/* ---------------- especies genéricas (mismo trazo, siluetas nuevas) ---------------- */
const SHAPES = {
  // cada forma: puntos del cuerpo (pies en y=0) y posición de ojos/etiqueta
  dome: { pts: () => [[-34, 0], [-32, -22], [-14, -40], [14, -40], [32, -22], [34, 0]], eyes: [[-11, -26], [11, -26]], er: 5, lab: -10 },
  ball: { ell: [0, -24, 24, 24], eyes: [[-8, -30], [9, -30]], er: 5, lab: -14 },
  box: { rect: [-26, -50, 52, 48, 8], eyes: [[-10, -36], [10, -36]], er: 5.5, lab: -16 },
  egg: { ell: [0, -36, 22, 36], eyes: [[-8, -46], [8, -46]], er: 5, lab: -20 },
  hex: { pts: () => Array.from({ length: 6 }, (_, k) => [Math.cos(k * Math.PI / 3) * 28, -26 + Math.sin(k * Math.PI / 3) * 26]), eyes: [[-9, -32], [9, -32]], er: 5, lab: -14 },
  star: { pts: () => Array.from({ length: 10 }, (_, k) => { const r = k % 2 ? 14 : 30, a = -Math.PI / 2 + k * Math.PI / 5; return [Math.cos(a) * r, -28 + Math.sin(a) * r]; }), eyes: [[-7, -30], [7, -30]], er: 4.5, lab: -18 },
  bean: { pts: () => [[-30, -6], [-30, -34], [-10, -46], [6, -38], [24, -46], [32, -26], [26, -2], [0, 2]], eyes: [[-12, -30], [10, -30]], er: 5, lab: -12 },
  tall: { rect: [-17, -76, 34, 74, 14], eyes: [[-7, -58], [7, -58]], er: 4.5, lab: -24 },
  tri: { pts: () => [[-32, 0], [0, -56], [32, 0]], eyes: [[-7, -24], [7, -24]], er: 4.5, lab: -9 },
  diamond: { pts: () => [[0, 2], [-28, -26], [0, -56], [28, -26]], eyes: [[-8, -32], [8, -32]], er: 4.5, lab: -16 },
  coin: { ell: [0, -28, 28, 26], eyes: [[-9, -34], [9, -34]], er: 5, lab: -18, ring: true },
  drop: { pts: () => [[0, -54], [22, -26], [18, -4], [0, 2], [-18, -4], [-22, -26]], eyes: [[0, -32]], er: 7, lab: -12 },
  pebble: { pts: () => [[-30, 0], [-28, -20], [-12, -36], [12, -36], [28, -20], [30, 0]], eyes: [[0, -24]], er: 7, lab: -8 },
};
const SPECIES = {
  Z4: i => ({ body: 'z4', v: i }),
  Z2: i => ({ body: 'z2', v: i }),
  SUB2: i => ({ body: 'z4', v: [0, 2][i] }),
  MIRROR: i => ({ body: 'gen', shape: i ? 'drop' : 'pebble', col: i ? '#e4e6f3' : '#7a7f9f', label: String(i), mirror: true, extra: i ? 'monocle' : null }),
  U5: i => ({ body: 'gen', shape: ['coin', 'diamond', 'tri', 'hex'][i], col: ['#e8b23c', '#86a04a', '#cf6a43', '#9b5a8f'][i], label: String(i + 1), extra: i === 0 ? 'crown' : null }),
  V4: i => ({ body: 'gen', shape: ['box', 'tri', 'diamond', 'hex'][i], col: ['#f1e4c7', '#d36b4a', '#5f8f8a', '#9b6fae'][i], label: 'eabc'[i], extra: 'twin' }),
  Z8: i => ({ body: 'gen', shape: ['dome', 'ball', 'box', 'egg', 'hex', 'star', 'bean', 'tall'][i], col: ['#a9b8ef', '#2b47d1', '#6f8fd8', '#3d5ca8', '#8fb1c9', '#4b74b8', '#c1cbef', '#2a3d8f'][i], label: String(i), dark: [1, 3, 5, 7].indexOf(i) !== -1 }),
};
function speciesFor(groupKey, i) { return (SPECIES[groupKey] || SPECIES.Z8)(i); }
function speciesColor(sp) { return sp.body === 'z4' ? SRC_COL[sp.v] : sp.body === 'z2' ? (sp.v ? PAL.ultra : PAL.ultraPale) : sp.col; }
function speciesLabel(sp) { return sp.body === 'z4' || sp.body === 'z2' ? String(sp.v) : sp.label; }

function drawGenBody(c, sp) {
  const S = SHAPES[sp.shape], e = c.expr;
  const bob = sp.shape === 'star' ? Math.sin(Clock.t * 3 + c.v) * .08 : 0;
  Draw.ctx.save(); if (bob) Draw.ctx.rotate(bob);
  const seed = 600 + (sp.label.charCodeAt(0) || 0);
  if (S.ell) Draw.ellipse(S.ell[0], S.ell[1], S.ell[2] * (1 + c.puff * .2), S.ell[3], sp.col, 3, seed);
  else if (S.rect) Draw.rrect(S.rect[0], S.rect[1], S.rect[2], S.rect[3], S.rect[4], sp.col, 3, seed);
  else Draw.shape(S.pts().map(p => [p[0] * (1 + c.puff * .15), p[1]]), sp.col, 3);
  if (S.ring) Draw.ellipse(S.ell[0], S.ell[1], S.ell[2] - 7, S.ell[3] - 7, null, 1.6, seed + 1, PAL.mustardDeep);
  if (sp.mirror) { Draw.ctx.save(); Draw.ctx.globalAlpha = .5; Draw.line(-14, -40, -4, -14, 2.5, seed + 3, '#ffffff'); Draw.ctx.restore(); }
  S.eyes.forEach(p => eyes(p[0], p[1], S.er, c, c));
  const my = S.eyes[0][1] + 13;
  mouth(0, my, 6, e);
  if (sp.extra === 'monocle') { Draw.ellipse(S.eyes[0][0], S.eyes[0][1], S.er + 4, S.er + 4, null, 2, seed + 4); Draw.line(S.eyes[0][0] + S.er + 3, S.eyes[0][1] + 3, 14, -6, 1.5, seed + 5); }
  if (sp.extra === 'crown') Draw.shape([[-12, -52], [-9, -64], [-3, -56], [0, -67], [3, -56], [9, -64], [12, -52]], PAL.mustard, 2);
  if (sp.extra === 'twin') { Draw.ctx.save(); Draw.ctx.globalAlpha = .35; Draw.line(-20, S.lab + 8, 20, S.lab + 8, 1.5, seed + 6); Draw.ctx.restore(); }
  Draw.ctx.restore();
  Draw.text(sp.label, 0, S.lab + 4, { size: sp.label.length > 1 ? 15 : 20, font: FONT.title, color: PAL.bone, stroke: 5, strokeColor: PAL.ink });
  drawHat(c, Math.min(S.eyes[0][1] - 18, -44));
}
function drawCritter(c) {
  if (c.alpha <= 0.01) return;
  const ctx = Draw.ctx, sh = c.shake > 0 ? Math.sin(Clock.t * 60) * 4 * c.shake : 0;
  ctx.save(); ctx.globalAlpha *= c.alpha;
  ctx.translate(c.x + sh, c.y - c.hop - (c.idleBob || 0));
  const s = c.s || 1;
  ctx.scale(s * c.sx.v * (1 + (c.lean || 0)), s * c.sy.v);
  if (c.spin) ctx.rotate(c.spin);
  const sp = c.species;
  if (!sp) { if (c.kind === 'src') drawSrcBody(c, c.v); else drawDstBody(c, c.v, c.kind === 'ghost'); }
  else if (sp.body === 'z4') { drawSrcBody(c, sp.v); drawHat(c, [-50, -52, -58, -100][sp.v]); }
  else if (sp.body === 'z2') drawDstBody(c, sp.v, false);
  else drawGenBody(c, sp);
  if (c.flag) {
    const fx = 22, fy = -56;
    Draw.line(fx, fy + 22, fx, fy - 6, 2.5, 150);
    if (c.flag === 'A') Draw.shape([[fx, fy - 6], [fx + 20, fy + 2], [fx, fy + 10]], PAL.ochre, 2);
    else Draw.ellipse(fx + 9, fy + 2, 9, 9, PAL.plum, 2, 151);
  }
  ctx.restore();
}
/* Ficha pequeña (para dentro de cables y diagramas). */
function drawBead(sp, x, y, r, alpha) {
  const ctx = Draw.ctx; ctx.save(); ctx.globalAlpha *= (alpha === undefined ? 1 : alpha);
  Draw.ellipse(x, y, r, r, speciesColor(sp), 2.5, 161 + x);
  Draw.text(speciesLabel(sp), x, y + 1, { size: r * 1.1, font: FONT.title, color: PAL.bone, stroke: 4, strokeColor: PAL.ink });
  ctx.restore();
}
