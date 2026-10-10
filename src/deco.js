/* THE ALGEBRA ENGINE — detalles de ambiente compartidos: humo suave, luces, carteles, tuberías,
 * relojes, polvo y viñeteado. Todo es decorado: nunca intercepta clics ni tapa piezas de juego. */
'use strict';
const Deco = (function () {
  const D = {};
  const C = () => Draw.ctx;
  /** Ejecuta fn con el trazo "hirviendo" más quieto (para planos lejanos). */
  D.calm = function (amt, fn) { const w = Draw.wob; Draw.wob = w * amt; try { fn(); } finally { Draw.wob = w; } };
  /** Polígono de esquinas vivas (Draw.shape redondea los vértices). */
  D.poly = function (pts, fill, lw, stroke) { const ctx = C(); ctx.beginPath(); pts.forEach((p, i) => { const j = Draw.n(17 + i, i) * .8 * Draw.wob; i ? ctx.lineTo(p[0] + j, p[1] - j) : ctx.moveTo(p[0] + j, p[1] - j); }); ctx.closePath(); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = stroke || PAL.ink; ctx.lineJoin = 'round'; ctx.stroke(); } };
  D.glow = function (x, y, r, col, a) {
    const ctx = C(), g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, col.replace('A', a)); g.addColorStop(1, col.replace('A', 0));
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  };
  /** Bocanada de humo sin contorno (degradado radial): no "hierve" ni parpadea. */
  D.puff = function (x, y, r, a, rgb) {
    const ctx = C(), g = ctx.createRadialGradient(x - r * .25, y - r * .3, r * .1, x, y, r);
    g.addColorStop(0, 'rgba(' + rgb + ',' + a + ')'); g.addColorStop(.65, 'rgba(' + rgb + ',' + a * .55 + ')'); g.addColorStop(1, 'rgba(' + rgb + ',0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  };
  /** Columna de humo continua y determinista: cada bocanada nace pequeña, crece, se aleja con el viento y se desvanece. */
  D.smoke = function (x, y, t, o) {
    o = o || {}; const n = o.n || 9, H = o.h || 220, wind = o.wind === undefined ? .55 : o.wind, r0 = o.r || 10, rate = o.rate || .12, rgb = o.rgb || '205,196,220', A = o.a || .5;
    for (let k = 0; k < n; k++) {
      const u = (((t * rate + k / n + (o.phase || 0)) % 1) + 1) % 1, e = Math.sqrt(u);
      const px = x + wind * H * u * u + Math.sin(u * 5 + k * 2.1 + t * .4) * 6 * e, py = y - H * e;
      const a = A * Math.min(1, u * 9) * Math.pow(1 - u, 1.4);
      D.puff(px, py, r0 * (1 + u * 3.2), a, rgb);
    }
  };
  /** Estrellas deterministas con parpadeo suave y alguna con destello en cruz. */
  D.stars = function (x, y, w, h, t, n, seed) {
    const ctx = C();
    for (let k = 0; k < n; k++) {
      const sx = x + (Math.abs(U.hash(k * 3.7 + seed)) * w), sy = y + Math.pow(Math.abs(U.hash(k * 9.1 + seed)), 1.4) * h;
      const big = k % 11 === 0, tw = .55 + .45 * Math.sin(t * (1 + (k % 5) * .4) + k);
      ctx.globalAlpha = (big ? .9 : .6) * tw;
      ctx.fillStyle = '#fff6dc'; ctx.beginPath(); ctx.arc(sx, sy, big ? 2.2 : 1.2 + (k % 3) * .3, 0, Math.PI * 2); ctx.fill();
      if (big) { ctx.strokeStyle = '#fff6dc'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(sx - 7 * tw, sy); ctx.lineTo(sx + 7 * tw, sy); ctx.moveTo(sx, sy - 7 * tw); ctx.lineTo(sx, sy + 7 * tw); ctx.stroke(); }
    }
    ctx.globalAlpha = 1;
  };
  /** Nube alargada hecha de bocanadas suaves. */
  D.cloud = function (x, y, w, a, rgb) { for (let k = 0; k < 6; k++) { const f = k / 5; D.puff(x + (f - .5) * w, y + Math.sin(k * 2.3) * 8, w * (.18 + .12 * Math.sin(k * 1.7 + 1)), a, rgb || '120,100,150'); } };
  /** Lámpara colgante con cono de luz. */
  D.lamp = function (x, top, len, t, o) {
    o = o || {}; const ctx = C(), sw = (o.still ? 0 : Math.sin(t * .9 + x * .01) * .025), y = top + len;
    ctx.save(); ctx.translate(x, top); ctx.rotate(sw); ctx.translate(-x, -top);
    if (o.cone !== false) { const g = ctx.createLinearGradient(0, y, 0, y + (o.reach || 380)); g.addColorStop(0, 'rgba(255,226,150,' + (o.a || .2) + ')'); g.addColorStop(1, 'rgba(255,226,150,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - 22, y + 8); ctx.lineTo(x + 22, y + 8); ctx.lineTo(x + (o.spread || 150), y + (o.reach || 380)); ctx.lineTo(x - (o.spread || 150), y + (o.reach || 380)); ctx.closePath(); ctx.fill(); }
    Draw.line(x, top, x, y - 6, 2, 9900 + x, PAL.ink);
    Draw.shape([[x - 26, y + 10], [x - 10, y - 8], [x + 10, y - 8], [x + 26, y + 10]], o.col || '#3d5a4a', 2.5);
    Draw.ellipse(x, y + 12, 8, 5, '#fff3c4', 1.5, 9901 + x);
    ctx.restore();
  };
  /** Cartel clavado con cinta. lines: líneas de texto pequeñas. */
  D.poster = function (x, y, w, h, title, lines, o) {
    o = o || {}; const ctx = C();
    ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.rotate(o.rot || 0); ctx.translate(-w / 2, -h / 2);
    Draw.rrect(4, 5, w, h, 2, 'rgba(33,28,51,.18)', 0, 9910 + x);
    Draw.rrect(0, 0, w, h, 2, o.fill || '#f4e6c8', 2, 9911 + x);
    if (o.stripe) { ctx.fillStyle = o.stripe; ctx.fillRect(4, 4, w - 8, 22); }
    Draw.text(title, w / 2, 16, { size: o.tsize || 12, font: FONT.plate, color: o.stripe ? PAL.bone : PAL.ink, spacing: .5 });
    (lines || []).forEach((l, i) => Draw.text(l, w / 2, 40 + i * (o.lh || 17), { size: o.size || 15, color: o.ink || PAL.ink }));
    if (o.big) Draw.text(o.big, w / 2, h - 30, { size: o.bigSize || 34, font: FONT.title, color: o.bigCol || PAL.bad });
    ctx.fillStyle = 'rgba(240,230,200,.75)'; ctx.save(); ctx.translate(w / 2, -2); ctx.rotate(-.06); ctx.fillRect(-18, -6, 36, 13); ctx.restore();
    ctx.restore();
  };
  /** Tubería gruesa con brillo y bridas. */
  D.pipe = function (pts, r, col, seed) {
    Draw.curve(pts, r * 2 + 5, PAL.ink); Draw.curve(pts, r * 2, col || '#7a7f9f');
    Draw.curve(pts.map(p => [p[0] - r * .35, p[1] - r * .35]), Math.max(1.5, r * .35), 'rgba(255,255,255,.35)');
    for (let i = 1; i < pts.length - 1; i++) Draw.rrect(pts[i][0] - r - 4, pts[i][1] - r - 4, r * 2 + 8, r * 2 + 8, 3, col || '#7a7f9f', 2.5, (seed || 9920) + i);
  };
  D.valve = function (x, y, t, spin) { const ctx = C(); ctx.save(); ctx.translate(x, y); ctx.rotate(spin ? t * spin : 0); Draw.ellipse(0, 0, 13, 13, PAL.bad, 2.5, 9930 + x); for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; Draw.line(0, 0, Math.cos(a) * 11, Math.sin(a) * 11, 2.5, 9931 + k); } Draw.ellipse(0, 0, 3.5, 3.5, PAL.ink, 0, 9935); ctx.restore(); };
  D.gauge = function (x, y, r, v, label) {
    Draw.ellipse(x, y, r, r, PAL.bone, 3, 9940 + x);
    for (let k = 0; k <= 6; k++) { const a = Math.PI * (.8 + k / 6 * 1.4); Draw.line(x + Math.cos(a) * r * .7, y + Math.sin(a) * r * .7, x + Math.cos(a) * r * .88, y + Math.sin(a) * r * .88, 1.6, 9941 + k, k > 4 ? PAL.bad : PAL.ink); }
    const a = Math.PI * (.8 + U.clamp(v, 0, 1) * 1.4); Draw.line(x, y, x + Math.cos(a) * r * .75, y + Math.sin(a) * r * .75, 2.5, 9948, PAL.bad); Draw.ellipse(x, y, 3, 3, PAL.ink, 0, 9949);
    if (label) Draw.text(label, x, y + r * .45, { size: Math.max(8, r * .28), font: FONT.plate });
  };
  /** Reloj de pared con la hora del turno (avanza con el tiempo de juego). */
  D.clock = function (x, y, r, t) {
    Draw.ellipse(x, y, r + 5, r + 5, '#6b4a2e', 3, 9950); Draw.ellipse(x, y, r, r, PAL.bone, 2, 9951);
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; Draw.line(x + Math.cos(a) * r * .78, y + Math.sin(a) * r * .78, x + Math.cos(a) * r * .9, y + Math.sin(a) * r * .9, k % 3 ? 1.2 : 2.2, 9952 + k); }
    const m = (t / 60 * 6) % 60, h = (2 + t / 600) % 12;
    const ah = h / 12 * Math.PI * 2 - Math.PI / 2, am = m / 60 * Math.PI * 2 - Math.PI / 2;
    Draw.line(x, y, x + Math.cos(ah) * r * .5, y + Math.sin(ah) * r * .5, 3, 9965); Draw.line(x, y, x + Math.cos(am) * r * .75, y + Math.sin(am) * r * .75, 2, 9966, PAL.bad);
    Draw.ellipse(x, y, 2.5, 2.5, PAL.ink, 0, 9967);
  };
  /** Rayas de peligro. */
  D.hazard = function (x, y, w, h) { const ctx = C(); ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); ctx.fillStyle = '#e3a52e'; ctx.fillRect(x, y, w, h); ctx.fillStyle = '#2a2433'; for (let k = -h; k < w; k += 22) { ctx.beginPath(); ctx.moveTo(x + k, y + h); ctx.lineTo(x + k + 11, y + h); ctx.lineTo(x + k + 11 + h, y); ctx.lineTo(x + k + h, y); ctx.fill(); } ctx.restore(); Draw.rrect(x, y, w, h, 2, null, 2, 9970 + x); };
  D.rivets = function (x, y, w, h, inset, col) { const i = inset || 8; [[x + i, y + i], [x + w - i, y + i], [x + i, y + h - i], [x + w - i, y + h - i]].forEach((p, k) => { Draw.ellipse(p[0], p[1], 3.2, 3.2, col || '#c9b48a', 1.2, 9980 + k); }); };
  /** Motas de polvo que flotan (coordenadas de la vista). */
  D.dust = function (x, y, w, h, t, n, a) {
    const ctx = C(); ctx.fillStyle = '#fff3d6';
    for (let k = 0; k < n; k++) {
      const px = x + ((Math.abs(U.hash(k * 5.3)) * w + t * (6 + (k % 4) * 3)) % w), py = y + ((Math.abs(U.hash(k * 8.9)) * h - t * (3 + k % 3) * 2 % h + h) % h) + Math.sin(t + k) * 6;
      ctx.globalAlpha = (a || .35) * (.5 + .5 * Math.sin(t * 1.3 + k * 2));
      ctx.beginPath(); ctx.arc(px, py, 1 + (k % 3) * .6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  };
  D.vignette = function (x, y, w, h, a) {
    const ctx = C(), cx = x + w / 2, cy = y + h / 2, g = ctx.createRadialGradient(cx, cy, Math.min(w, h) * .45, cx, cy, Math.max(w, h) * .72);
    g.addColorStop(0, 'rgba(33,28,51,0)'); g.addColorStop(1, 'rgba(33,28,51,' + (a || .22) + ')'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  };
  /** Tablones de suelo con clavos y manchas. */
  D.floor = function (x0, x1, y, h, col, seed) {
    const ctx = C();
    for (let yy = y + 26, r = 0; yy < y + h; yy += 30, r++) {
      ctx.globalAlpha = .18; Draw.line(x0, yy, x1, yy, 1.5, (seed || 9990) + r, PAL.ink); ctx.globalAlpha = 1;
      for (let x = x0 + ((r * 97) % 140); x < x1; x += 160 + (r * 31) % 90) { ctx.globalAlpha = .2; Draw.line(x, yy - 30, x, yy, 1.5, 9995 + x, PAL.ink); ctx.globalAlpha = .35; Draw.ellipse(x + 8, yy - 15, 1.6, 1.6, PAL.ink, 0, 9996); ctx.globalAlpha = 1; }
    }
    [[.2, .5], [.55, .3], [.83, .7]].forEach(([fx, fy], k) => { ctx.globalAlpha = .08; Draw.ellipse(x0 + (x1 - x0) * fx, y + h * fy * .6 + 20, 70 + k * 20, 14, PAL.ink, 0, 9997 + k); ctx.globalAlpha = 1; });
    ctx.fillStyle = 'rgba(33,28,51,.18)'; ctx.fillRect(x0, y, x1 - x0, 6);
  };
  /** Papel pintado de rombos muy tenue. */
  D.wallpaper = function (x0, y0, x1, y1, col) {
    const ctx = C(); ctx.save(); ctx.globalAlpha = .07; ctx.strokeStyle = col || PAL.ink; ctx.lineWidth = 1.5;
    for (let x = x0 - (y1 - y0); x < x1; x += 70) { ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x + (y1 - y0), y1); ctx.moveTo(x + (y1 - y0), y0); ctx.lineTo(x, y1); ctx.stroke(); }
    ctx.restore();
  };
  /** Viga del techo con tubería y lámparas: decora la franja superior sin bajar más de ~60 px. */
  D.ceiling = function (x0, x1, t, lamps, o) {
    o = o || {}; const top = o.top === undefined ? -200 : o.top, y = o.y || 6;
    const ctx = C(); ctx.fillStyle = o.beam || 'rgba(60,40,30,.35)'; ctx.fillRect(x0, top, x1 - x0, y - top);
    Draw.line(x0, y, x1, y, 3, 9998, 'rgba(33,28,51,.5)');
    for (let x = x0 + 40; x < x1; x += 200) { Draw.line(x, y, x + 26, y + 22, 3, 9999 + x, 'rgba(33,28,51,.35)'); }
    (lamps || []).forEach(lx => D.lamp(lx, y, o.len || 30, t, { reach: o.reach || 420, spread: o.spread || 170, a: o.a || .13 }));
  };
  D.bush = function (x, y, s, seed) { [[-14, 0, 16], [10, -2, 18], [0, -14, 17], [22, 6, 12], [-24, 6, 11]].forEach((b, k) => Draw.ellipse(x + b[0] * s, y + b[1] * s, b[2] * s, b[2] * s * .85, k % 2 ? '#7d9a48' : '#6f8436', 2.2, (seed || 9800) + k)); Draw.ellipse(x - 4 * s, y - 8 * s, 5 * s, 3 * s, 'rgba(255,255,255,.25)', 0, 9810); };
  D.birds = function (x0, x1, t, y) { const ctx = C(); const span = x1 - x0 + 400, u = (t * 40) % span; for (let k = 0; k < 3; k++) { const bx = x0 - 200 + u + k * 34, by = y + Math.sin(t + k) * 8 + k * 10, f = Math.sin(t * 8 + k) * 5; ctx.strokeStyle = 'rgba(33,28,51,.55)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx - 9, by - f); ctx.quadraticCurveTo(bx - 4, by - 4, bx, by); ctx.quadraticCurveTo(bx + 4, by - 4, bx + 9, by - f); ctx.stroke(); } };
  D.compass = function (x, y, r) { Draw.ellipse(x, y, r, r, 'rgba(251,239,220,.7)', 2, 9820); Draw.ellipse(x, y, r * .8, r * .8, null, 1, 9821, 'rgba(33,28,51,.4)'); [[0, -1, 'N'], [1, 0, 'E'], [0, 1, 'S'], [-1, 0, 'O']].forEach(([dx, dy, l], k) => { D.poly([[x, y], [x + dx * r * .9 - dy * r * .15, y + dy * r * .9 + dx * r * .15], [x + dx * r * .9 + dy * r * .15, y + dy * r * .9 - dx * r * .15]], k ? PAL.inkSoft : PAL.bad, 1.2); Draw.text(l, x + dx * (r + 13), y + dy * (r + 13), { size: 14, font: FONT.plate }); }); };
  D.coffee = function (x, y, r) { const ctx = C(); ctx.save(); ctx.globalAlpha = .18; ctx.strokeStyle = '#6b3a1c'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(x, y, r, .3, Math.PI * 1.85); ctx.stroke(); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x + 3, y + 2, r - 6, 0, Math.PI * 1.3); ctx.stroke(); ctx.restore(); };
  /** Ambiente de una nave: lámparas del techo, carteles, reloj, suelo y papel pintado. */
  D.room = function (t, o) {
    if (o.wall) D.wallpaper(o.wall[0], o.wall[1], o.wall[2], o.wall[3], o.wallCol);
    if (o.floor) D.floor(o.floor[1], o.floor[2], o.floor[0], o.floor[3] || 400);
    if (o.lamps) o.lamps.forEach(lx => D.lamp(lx, o.ceil || -60, (o.len === undefined ? 50 : o.len) + 60, t, { reach: o.reach || 460, spread: o.spread || 180, a: o.a || .12 }));
    if (o.clock) D.clock(o.clock[0], o.clock[1], o.clock[2] || 26, t * 40);
    (o.posters || []).forEach(p => D.poster(p[0], p[1], p[2], p[3], p[4], p[5], p[6]));
  };
  return D;
})();
