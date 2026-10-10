/* THE ALGEBRA ENGINE — personajes y aparatos recurrentes de la fábrica. Sólo dibujo y pequeños estados. */
'use strict';

/* ---------------- El encargado: un archivador con gafas que lo arregla todo con formularios ---------------- */
function makeEncargado(x, y) { return { x, y, tx: x, walk: 0, talk: 0, stamp: 0, expr: 'idle', exprT: 0, bounce: Spring(0), face: 1, visible: true }; }
function updateEncargado(e, dt) {
  const dx = e.tx - e.x;
  if (Math.abs(dx) > 2) { e.x += Math.sign(dx) * Math.min(Math.abs(dx), 260 * dt); e.walk += dt * 9; e.face = Math.sign(dx); } else e.walk = 0;
  e.talk = Math.max(0, e.talk - dt); e.stamp = Math.max(0, e.stamp - dt * 1.6);
  e.exprT -= dt; if (e.exprT < 0) e.expr = 'idle';
  stepSpring(e.bounce, dt, 260, 12);
}
function drawEncargado(e) {
  if (!e.visible) return;
  const ctx = Draw.ctx, step = Math.sin(e.walk), bob = Math.abs(step) * 4 + e.bounce.v * .1;
  ctx.save(); ctx.translate(e.x, e.y - bob);
  // piernas
  Draw.line(-14, -4, -14 - step * 8, 22, 4, 1101); Draw.line(14, -4, 14 + step * 8, 22, 4, 1102);
  Draw.rrect(-22 - step * 8, 18, 18, 7, 3, PAL.ink, 0, 1103); Draw.rrect(6 + step * 8, 18, 18, 7, 3, PAL.ink, 0, 1104);
  // cuerpo de archivador
  Draw.rrect(-34, -120, 68, 118, 6, '#8e8aa3', 3, 1110);
  [-110, -74, -38].forEach((y, i) => {
    Draw.rrect(-27, y, 54, 30, 3, '#a6a2bb', 2, 1111 + i);
    Draw.rrect(-8, y + 11, 16, 6, 2, PAL.bone, 1.5, 1115 + i);
  });
  // boca: el cajón superior se abre al hablar
  const open = e.talk > 0 ? (Math.sin(Clock.t * 22) * .5 + .5) * 10 : 0;
  Draw.rrect(-24, -84 + 0, 48, 6 + open, 2, PAL.ink, 0, 1120);
  if (open > 3) Draw.rrect(-20, -82, 40, 4, 1, '#f3ead8', 0, 1121);
  // gafas y ojos
  const lx = e.face * 2;
  [[-12, -100], [12, -100]].forEach((p, i) => {
    Draw.ellipse(p[0], p[1], 10, 10, PAL.bone, 2.5, 1122 + i);
    if (e.expr === 'happy') Draw.curve([[p[0] - 5, p[1] + 2], [p[0], p[1] - 4], [p[0] + 5, p[1] + 2]], 2.5, PAL.ink);
    else Draw.ellipse(p[0] + lx, p[1] + (e.expr === 'stern' ? 1 : 0), 3.5, 3.5, PAL.ink, 0, 1124);
    if (e.expr === 'stern') Draw.line(p[0] - 9, p[1] - 11 + (i ? 3 : -3) * 0, p[0] + 9, p[1] - 11 + (i ? -3 : 3), 2.5, 1126 + i);
  });
  Draw.line(-2, -100, 2, -100, 2, 1128);
  // corbata
  Draw.shape([[-5, -68], [5, -68], [3, -56], [0, -40], [-3, -56]], PAL.bad, 1.5);
  // brazo con portapapeles
  Draw.line(-34, -60, -50, -36, 3.5, 1130);
  Draw.rrect(-66, -48, 26, 34, 3, PAL.bone, 2, 1131); Draw.line(-62, -38, -46, -38, 1.5, 1132); Draw.line(-62, -30, -48, -30, 1.5, 1133);
  // brazo con sello de goma
  const s = e.stamp, armA = s > 0 ? (s > .5 ? -1.6 : -1.6 + (1 - s * 2) * 2.2) : .5;
  const hx = 34 + Math.cos(armA) * 28, hy = -60 + Math.sin(armA) * 28;
  Draw.line(34, -60, hx, hy, 3.5, 1134);
  Draw.rrect(hx - 4, hy - 16, 8, 14, 2, '#8d5a2f', 2, 1135); Draw.rrect(hx - 10, hy - 2, 20, 7, 2, PAL.bad, 2, 1136);
  ctx.restore();
}

/* ---------------- El operario: martillo y cinta para todo ---------------- */
function makeOperario(x, y) { return { x, y, expr: 'idle', exprT: 0, bounce: Spring(0), blink: 0, blinkT: 2, tool: null, toolT: 0 }; }
function updateOperario(o, dt) {
  stepSpring(o.bounce, dt, 300, 12);
  o.exprT -= dt; if (o.exprT < 0 && o.expr !== 'sleep') o.expr = 'idle';
  o.blinkT -= dt; if (o.blinkT < 0) { o.blink = .15; o.blinkT = U.rand(2, 5); } o.blink = Math.max(0, o.blink - dt);
  o.toolT = Math.max(0, o.toolT - dt); if (o.toolT === 0) o.tool = null;
}
function operarioDo(o, e, dur) { o.expr = e; o.exprT = dur || 2; o.bounce.vel += e === 'cheer' ? -260 : -60; }
function drawOperario(o, lookX) {
  const y = o.y + o.bounce.v * .1, e = o.expr;
  const lean = e === 'panic' ? Math.sin(Clock.t * 30) * 4 : 0;
  Draw.ctx.save(); Draw.ctx.translate(o.x + lean, y);
  Draw.ellipse(0, 24, 30, 26, PAL.plum, 3, 700);
  const stalkX = e === 'impatient' ? Math.sin(Clock.t * 3) * 6 : U.clamp(lookX || 0, -10, 10);
  const eyY = e === 'cheer' ? -32 : e === 'sleep' ? -2 : -18;
  Draw.curve([[0, 4], [stalkX * .5, -6], [stalkX, eyY + 10]], 3, PAL.ink);
  Draw.ellipse(stalkX, eyY, 14, e === 'shock' || e === 'panic' ? 16 : 13, PAL.bone, 3, 701);
  if (!(e === 'sleep' || o.blink > 0)) {
    Draw.ellipse(stalkX + (lookX || 0) * .3, eyY + (e === 'thinking' ? -5 : 1), e === 'shock' || e === 'panic' ? 4 : 6, e === 'shock' || e === 'panic' ? 4 : 6, PAL.ink, 0, 702);
    if (e === 'impatient' || e === 'facepalm' || e === 'focus' || e === 'grumpy') Draw.line(stalkX - 14, eyY - 4, stalkX + 14, eyY - 4, 3, 703);
  } else Draw.curve([[stalkX - 10, eyY], [stalkX, eyY + 5], [stalkX + 10, eyY]], 3, PAL.ink);
  Draw.rrect(stalkX - 12, eyY - 26, 24, 12, 3, PAL.ink, 0, 704); Draw.line(stalkX - 18, eyY - 14, stalkX + 18, eyY - 14, 4, 705);
  const armL = e === 'cheer' ? [[-24, 18], [-40, -10]] : e === 'facepalm' ? [[-24, 18], [stalkX - 6, eyY + 6]] : e === 'shrug' ? [[-24, 18], [-44, 4]] : [[-24, 18], [-36, 36]];
  let armR = e === 'cheer' ? [[24, 18], [40, -10 + Math.sin(Clock.t * 18) * 6]] : e === 'shrug' ? [[24, 18], [44, 4]] : [[24, 18], [36, 36]];
  if (o.tool === 'hammer') { const a = Math.sin(o.toolT * 18) > 0 ? -1.2 : .2; armR = [[24, 18], [24 + Math.cos(a) * 26, 18 + Math.sin(a) * 26]]; }
  Draw.curve(armL, 3.5, PAL.ink); Draw.curve(armR, 3.5, PAL.ink);
  const hand = armR[armR.length - 1];
  if (o.tool === 'hammer') { Draw.line(hand[0], hand[1], hand[0] + 16, hand[1] - 14, 4, 706, '#8d5a2f'); Draw.rrect(hand[0] + 8, hand[1] - 26, 20, 12, 2, '#6f6f7c', 2, 707); }
  if (o.tool === 'tape') { Draw.ellipse(hand[0] + 6, hand[1], 9, 9, '#e9d9a6', 2, 708); Draw.ellipse(hand[0] + 6, hand[1], 4, 4, PAL.ink, 0, 709); }
  Draw.ctx.restore();
  if (e === 'sleep') { Draw.ctx.save(); Draw.ctx.globalAlpha = .7; const t = (Clock.t * .6) % 1; Draw.text('z', o.x + 40 + t * 30, o.y - 30 - t * 30, { size: 18 + t * 10, font: FONT.title }); Draw.ctx.restore(); }
}

/* ---------------- La garra inspectora ---------------- */
function makeClaw(railY, x) { return { x, y: railY + 40, railY, tx: x, ty: railY + 40, open: 1, carry: null, lens: 0, mood: 'idle', moodT: 0, sweep: 0 }; }
function updateClaw(c, dt) {
  c.x += (c.tx - c.x) * Math.min(1, dt * 7); c.y += (c.ty - c.y) * Math.min(1, dt * 7);
  c.moodT -= dt; if (c.moodT < 0) c.mood = 'idle';
  c.lens = Math.sin(Clock.t * 2) * .5;
  if (c.carry) { c.carry.x = c.x; c.carry.y = c.y + 64; }
}
function drawClaw(c, x0, x1) {
  const ctx = Draw.ctx, ry = c.railY;
  // raíl
  Draw.rrect(x0, ry - 10, x1 - x0, 14, 4, '#6f6a55', 3, 1201);
  for (let x = x0 + 14; x < x1; x += 28) Draw.ellipse(x, ry - 3, 2.5, 2.5, PAL.ink, 0, 1202);
  // carro
  Draw.rrect(c.x - 26, ry - 20, 52, 26, 6, PAL.mustard, 3, 1203);
  Draw.ellipse(c.x - 14, ry + 6, 6, 6, PAL.ink, 0, 1204); Draw.ellipse(c.x + 14, ry + 6, 6, 6, PAL.ink, 0, 1205);
  // cable
  Draw.line(c.x, ry + 4, c.x, c.y - 16, 2.5, 1206);
  // cabeza con lente
  const fr = c.mood === 'frustrated';
  ctx.save(); ctx.translate(c.x + (fr ? Math.sin(Clock.t * 40) * 2 : 0), c.y);
  Draw.rrect(-22, -18, 44, 30, 8, '#c7c2a8', 3, 1210);
  Draw.ellipse(0, -3, 11, 11, '#1a1528', 2.5, 1211);
  const look = c.mood === 'search' ? Math.sin(Clock.t * 8) * 5 : c.lens * 3;
  Draw.ellipse(look, -3, 5, 5, c.mood === 'happy' ? PAL.c3 : '#ff6b4a', 0, 1212);
  Draw.ellipse(look - 2, -5, 1.6, 1.6, '#fff', 0, 1213);
  if (fr) Draw.line(-12, -16, 10, -12, 3, 1214);
  // dedos
  const o = c.open;
  [-1, 0, 1].forEach((k, i) => {
    const a = Math.PI / 2 + k * (.25 + o * .55);
    const mx = Math.cos(a) * 26, my = 12 + Math.sin(a) * 26;
    Draw.curve([[k * 10, 12], [mx, my], [mx * .6 - k * 4 * (1 - o), my + 14]], 4, PAL.ink);
  });
  ctx.restore();
}

/* ---------------- La trituradora: demasiado feliz con su trabajo ---------------- */
function makeShredder(x, y) { return { x, y, teeth: 0, speed: .2, chew: 0, mood: 'hungry', moodT: 0, belt: 0, beltOn: 0, alto: 0, shake: 0 }; }
function updateShredder(s, dt) {
  s.teeth += s.speed * dt * 6; s.speed = U.lerp(s.speed, s.chew > 0 ? 3 : .25, Math.min(1, dt * 3));
  s.chew = Math.max(0, s.chew - dt); s.alto = Math.max(0, s.alto - dt * .7); s.shake = Math.max(0, s.shake - dt);
  s.belt += s.beltOn * dt * 80; s.beltOn = Math.max(0, s.beltOn - dt * .4);
  s.moodT -= dt; if (s.moodT < 0) s.mood = 'hungry';
}
function drawShredder(s, beltA, beltB) {
  const ctx = Draw.ctx, x = s.x + (s.shake ? Math.sin(Clock.t * 50) * 4 * s.shake : 0), y = s.y;
  // cinta (de beltA a beltB, en cualquier orden)
  const bx0 = Math.min(beltA, beltB), bx1 = Math.max(beltA, beltB), by = y + 70;
  Draw.rrect(bx0, by - 10, bx1 - bx0, 22, 10, '#4b4536', 3, 1301);
  ctx.save(); ctx.beginPath(); ctx.rect(bx0 + 6, by - 8, bx1 - bx0 - 12, 18); ctx.clip();
  for (let k = -1; k < (bx1 - bx0) / 24 + 1; k++) Draw.line(bx0 + k * 24 + (s.belt % 24), by - 8, bx0 + k * 24 + (s.belt % 24) + 8, by + 10, 2, 1302 + k, '#8a7f63');
  ctx.restore();
  [bx0 + 10, bx1 - 10].forEach((cx, i) => Draw.ellipse(cx, by + 1, 9, 9, '#6f6a55', 2, 1310 + i));
  Draw.line(bx0 + 20, by + 14, bx0 + 20, by + 50, 4, 1312); Draw.line(bx1 - 20, by + 14, bx1 - 20, by + 50, 4, 1313);
  // tolva
  Draw.shape([[x - 86, y - 60], [x + 86, y - 60], [x + 56, y - 14], [x - 56, y - 14]], '#7c8a4a', 3);
  // rodillos con dientes
  [-26, 26].forEach((dx, i) => {
    const pts = [], rot = s.teeth * (i ? -1 : 1);
    for (let k = 0; k < 16; k++) { const a = rot + k / 16 * Math.PI * 2, r = k % 2 ? 16 : 22; pts.push([x + dx + Math.cos(a) * r, y - 12 + Math.sin(a) * r]); }
    Draw.shape(pts, '#c7c2a8', 2.5);
  });
  // cuerpo con cara
  Draw.rrect(x - 74, y, 148, 120, 14, '#596a33', 3.5, 1320);
  const happy = s.mood === 'happy' || s.mood === 'chew', sad = s.mood === 'sad';
  [-30, 30].forEach((dx, i) => {
    Draw.ellipse(x + dx, y + 36, 13, happy ? 7 : 13, PAL.bone, 2.5, 1321 + i);
    if (!happy) Draw.ellipse(x + dx + (s.mood === 'eager' ? 0 : Math.sin(Clock.t * 2) * 3), y + 38, 5, 5, PAL.ink, 0, 1323);
    const tilt = sad ? (i ? 5 : -5) : (i ? -6 : 6);
    Draw.line(x + dx - 14, y + 18 + tilt, x + dx + 14, y + 18 - tilt, 4, 1324 + i);
  });
  // boca de dientes
  const mo = s.chew > 0 ? (Math.sin(Clock.t * 26) * .5 + .5) * 10 : sad ? 2 : 6;
  Draw.rrect(x - 44, y + 62, 88, 18 + mo, 6, PAL.ink, 2, 1330);
  for (let k = 0; k < 7; k++) { const tx = x - 40 + k * 12; Draw.shape([[tx, y + 62], [tx + 10, y + 62], [tx + 5, y + 70]], PAL.bone, 1.2); }
  // regulador matemático: la pieza que la frena
  Draw.rrect(x + 82, y + 4, 44, 34, 5, PAL.bone, 2.5, 1340);
  Draw.text(s.alto > 0 ? 'ALTO' : 'OK', x + 104, y + 21, { size: 12, font: FONT.plate, color: s.alto > 0 ? PAL.bad : PAL.good });
  Draw.line(x + 82, y + 30, x + 72, y + 40, 2.5, 1341);
  if (s.alto > 0) { ctx.save(); ctx.translate(x, y - 20); ctx.rotate(-.12); ctx.globalAlpha = Math.min(1, s.alto * 2); Draw.rrect(-70, -22, 140, 40, 4, null, 4, 1342, PAL.bad); Draw.text('¡ALTO!', 0, -1, { size: 26, font: FONT.plate, color: PAL.bad, spacing: 3 }); ctx.restore(); }
  Draw.text('TRITURADORA DE DESTINOS', x, y + 112, { size: 11, font: FONT.plate, color: PAL.bone, spacing: 1 });
}

/* ---------------- El ensamblador reversible: dos tambores que van y vuelven ---------------- */
function makeAssembler() { return { rot: 0, speed: 0, dizzy: 0, sing: 0, dir: 1 }; }
function updateAssembler(a, dt) { a.rot += a.speed * a.dir * dt; a.speed = U.lerp(a.speed, a.sing > 0 ? 5 : .4, Math.min(1, dt * 2)); a.dizzy = Math.max(0, a.dizzy - dt * .5); a.sing = Math.max(0, a.sing - dt); }
function drawAssembler(a, x0, x1, y) {
  const r = 34;
  Draw.curve([[x0, y - r], [x1, y - r]], 5, PAL.ink); Draw.curve([[x0, y + r], [x1, y + r]], 5, PAL.ink);
  for (let k = 0; k < 6; k++) { const u = ((a.rot * 12 + k * (x1 - x0) / 6) % (x1 - x0) + (x1 - x0)) % (x1 - x0); Draw.text(a.dir > 0 ? '›' : '‹', x0 + u, y - r, { size: 16, color: PAL.bone, stroke: 3, strokeColor: PAL.ink }); Draw.text(a.dir > 0 ? '‹' : '›', x1 - u, y + r, { size: 16, color: PAL.bone, stroke: 3, strokeColor: PAL.ink }); }
  [x0, x1].forEach((cx, i) => {
    Draw.ellipse(cx, y, r, r, i ? PAL.ultraPale : '#f1c27a', 3, 1401 + i);
    for (let k = 0; k < 4; k++) { const ang = a.rot * (i ? -1 : 1) + k * Math.PI / 2; Draw.line(cx + Math.cos(ang) * 8, y + Math.sin(ang) * 8, cx + Math.cos(ang) * (r - 6), y + Math.sin(ang) * (r - 6), 2, 1403 + k); }
    const c = { id: 1400 + i, blink: 0, lookX: i ? -1 : 1, lookY: 0 };
    const ex = a.dizzy > 0 ? 'dizzy' : a.sing > 0 ? 'happy' : 'idle';
    eyes(cx - 9, y - 6, 5, c, { expr: ex, blink: 0, lookX: c.lookX }); eyes(cx + 9, y - 6, 5, c, { expr: ex, blink: 0, lookX: c.lookX });
    mouth(cx, y + 12, 7, a.dizzy > 0 ? 'dizzy' : a.sing > 0 ? 'happy' : 'idle');
  });
  if (a.sing > 0) { Draw.ctx.save(); Draw.ctx.globalAlpha = Math.min(1, a.sing); Draw.text('♪', (x0 + x1) / 2 + Math.sin(Clock.t * 4) * 20, y - r - 24 - (Clock.t * 30) % 20, { size: 22, color: PAL.plum }); Draw.ctx.restore(); }
}

/* ---------------- Botón físico (perilla) y rótulos comunes ---------------- */
function drawKnob(x, y, label, opts) {
  opts = opts || {};
  const pr = opts.press || 0, col = opts.col || PAL.olive;
  if (opts.glow) { Draw.ctx.save(); Draw.ctx.globalAlpha = .35 + Math.sin(Clock.t * 5) * .25; Draw.ellipse(x, y, 36, 36, '#fff3c4', 0, 600); Draw.ctx.restore(); }
  Draw.ellipse(x, y + 4, 24, 24, PAL.oliveDeep, 0, 601);
  Draw.ellipse(x, y + pr * 4, 24, 24, col, 3, 602 + x);
  if (opts.icon) opts.icon(x, y + pr * 4);
  Draw.text(label, x, y + 38, { size: 10.5, font: FONT.plate, color: PAL.ink, spacing: .5 });
}
const ICONS = {
  undo(x, y) { const pts = []; for (let i = 0; i <= 8; i++) { const a = -Math.PI * .9 + i / 8 * Math.PI * 1.5; pts.push([x + Math.cos(a) * 9, y + Math.sin(a) * 9]); } Draw.curve(pts, 3.5, PAL.bone); Draw.shape([[x - 13, y - 6], [x - 5, y - 6], [x - 9, y + 2]], PAL.bone, 0); },
  reset(x, y) { Draw.ellipse(x, y, 9, 9, null, 3.5, 612, PAL.bone); Draw.shape([[x + 4, y - 14], [x + 12, y - 8], [x + 3, y - 4]], PAL.bone, 0); },
  hint(x, y) { Draw.ellipse(x, y - 3, 8, 8, '#ffe27a', 2.5, 613); Draw.rrect(x - 4, y + 5, 8, 6, 1, PAL.bone, 2, 614); },
  claw(x, y) { Draw.line(x, y - 12, x, y - 2, 2.5, 615, PAL.bone); Draw.curve([[x - 8, y + 10], [x - 8, y], [x + 8, y], [x + 8, y + 10]], 3, PAL.bone); },
  reverse(x, y) { Draw.shape([[x + 9, y - 8], [x - 5, y], [x + 9, y + 8]], PAL.bone, 2); Draw.shape([[x - 9, y - 8], [x + 5, y], [x - 9, y + 8]], null, 2, PAL.bone); },
  mirror(x, y) { Draw.ellipse(x, y, 7, 11, '#e4e6f3', 2.5, 616); Draw.line(x - 3, y - 5, x + 1, y + 3, 1.5, 617, '#fff'); },
  table(x, y) { for (let k = 0; k < 3; k++) { Draw.line(x - 10, y - 8 + k * 8, x + 10, y - 8 + k * 8, 2, 618 + k, PAL.bone); Draw.line(x - 8 + k * 8, y - 10, x - 8 + k * 8, y + 10, 2, 621 + k, PAL.bone); } },
  shred(x, y) { for (let k = 0; k < 4; k++) Draw.line(x - 9 + k * 6, y - 8, x - 9 + k * 6, y + 9, 2.5, 624 + k, PAL.bone); },
};
