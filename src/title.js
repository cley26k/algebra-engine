/* THE ALGEBRA ENGINE — pantalla de inicio y cómic de introducción. */
'use strict';

/* ================================================================
 * Escenografía compartida por la portada y el cómic
 * ============================================================== */
const Scenery = {
  night(x, y, w, h, t, o) {
    o = o || {}; const ctx = Draw.ctx;
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, o.top || '#1b1834'); g.addColorStop(.55, o.mid || '#3a2d5a'); g.addColorStop(1, o.low || '#86536f');
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    Deco.stars(x, y, w, h * .62, t, o.stars || Math.round(w * h / 9000), o.seed || 3);
  },
  moon(x, y, r) {
    Deco.glow(x, y, r * 3.2, 'rgba(255,240,200,A)', .22);
    Draw.ellipse(x, y, r, r, '#f6e8c1', 2.5, 7100);
    const ctx = Draw.ctx; ctx.globalAlpha = .18;
    [[-.35, -.2, .22], [.25, .3, .16], [.3, -.35, .1], [-.15, .45, .12]].forEach(([dx, dy, rr], k) => Draw.ellipse(x + dx * r, y + dy * r, rr * r, rr * r * .85, '#b59f7a', 0, 7102 + k));
    ctx.globalAlpha = 1;
  },
  gear(x, y, r, teeth, rot, fill, lw) {
    const pts = []; for (let k = 0; k < teeth * 2; k++) { const a = rot + k / (teeth * 2) * Math.PI * 2, R = k % 2 ? r * .82 : r; pts.push([x + Math.cos(a - .08) * R, y + Math.sin(a - .08) * R]); pts.push([x + Math.cos(a + .08) * R, y + Math.sin(a + .08) * R]); }
    Draw.shape(pts, fill || '#6f8436', lw === undefined ? 2.5 : lw);
    Draw.ellipse(x, y, r * .3, r * .3, 'rgba(33,28,51,.55)', 0, 7120);
  },
  /** Silueta lejana de naves y chimeneas (sin contorno, sin hervir). */
  skyline(L, R, base, t, col, seed) {
    const ctx = Draw.ctx; ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(L, base + 300);
    const chim = [];
    for (let x = L, k = 0; x < R; k++) {
      const w = 60 + Math.abs(U.hash(k * 3.1 + seed)) * 120, h = 40 + Math.abs(U.hash(k * 5.7 + seed)) * 90, kind = Math.abs(U.hash(k * 7.3 + seed));
      ctx.lineTo(x, base - h);
      if (kind > .55) { for (let s = 0; s < w; s += 24) { ctx.lineTo(x + s + 12, base - h - 16); ctx.lineTo(x + s + 12, base - h); ctx.lineTo(Math.min(x + w, x + s + 24), base - h); } }
      else ctx.lineTo(x + w, base - h);
      if (kind > .3 && kind < .75) chim.push([x + w * .6, base - h, 10 + kind * 6, 40 + kind * 70]);
      x += w;
    }
    ctx.lineTo(R, base + 300); ctx.closePath(); ctx.fill();
    chim.forEach(c => { ctx.fillRect(c[0], c[1] - c[3], c[2], c[3] + 2); });
    chim.forEach((c, i) => { if (i % 2 === 0) Deco.smoke(c[0] + c[2] / 2, c[1] - c[3], t, { n: 6, h: 120, r: 6, a: .22, rgb: '180,168,200', phase: i * .21, rate: .07 }); });
    // ventanitas encendidas, fijas (sólo alguna cambia muy despacio)
    for (let k = 0; k < (R - L) / 26; k++) { const wx = L + k * 26 + 8, wy = base - 20 - Math.abs(U.hash(k * 2.2 + seed)) * 40; const on = U.hash(k * 9.4 + seed) > .25; if (!on) continue; ctx.globalAlpha = .55 + .35 * Math.max(0, Math.sin(t * .2 + k * 1.7)); ctx.fillStyle = '#ffcf6a'; ctx.fillRect(wx, wy, 5, 6); }
    ctx.globalAlpha = 1;
  },
  /** Fábrica con detalle: nave de ladrillo, techo de sierra iluminado, rosetón de engranaje, chimeneas con humo suave y depósito de agua. */
  factory(x, y, s, t, lit, o) {
    o = o || {}; const ctx = Draw.ctx; ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    Deco.calm(.45, () => {
      const chims = o.chims || [[-170, -300, 34, 190], [-80, -330, 28, 200], [120, -290, 38, 160]];
      chims.forEach((c, i) => {
        Draw.rrect(c[0], c[1], c[2], c[3], 3, '#6b4a5c', 3, 7200 + i);
        for (let b = 0; b < 2; b++) { ctx.fillStyle = b ? '#e9dcc4' : '#b8322a'; ctx.fillRect(c[0] + 2, c[1] + 16 + b * 14, c[2] - 4, 10); }
        Draw.rrect(c[0] - 5, c[1] - 6, c[2] + 10, 12, 2, '#4a3446', 2.5, 7205 + i);
      });
      // depósito de agua
      if (o.tank !== false) { Draw.line(190, -40, 200, -170, 3, 7260); Draw.line(250, -40, 240, -170, 3, 7261); Draw.line(195, -110, 245, -150, 2, 7262); Draw.line(245, -110, 195, -150, 2, 7263); Draw.rrect(176, -230, 88, 64, 10, '#7a7f9f', 3, 7264); Draw.shape([[172, -228], [220, -262], [268, -228]], '#5d6080', 3); Draw.text('Z', 220, -198, { size: 22, font: FONT.title, color: PAL.bone }); }
      // nave
      Draw.rrect(-250, -150, 450, 150, 3, '#8a6070', 3.5, 7220);
      ctx.save(); ctx.globalAlpha = .16; for (let r = 0; r < 6; r++) for (let k = 0; k < 15; k++) ctx.fillRect(-246 + k * 30 + (r % 2) * 15, -144 + r * 24, 26, 2); ctx.restore();
      // techo de sierra con lucernarios
      for (let k = 0; k < 9; k++) {
        const x0 = -250 + k * 50;
        Deco.poly([[x0, -150], [x0, -200], [x0 + 50, -150]], '#5c4458', 2.5);
        if (lit) { ctx.globalAlpha = .7 + .2 * Math.sin(t * .5 + k); Deco.poly([[x0 + 5, -156], [x0 + 5, -188], [x0 + 37, -156]], '#ffd98a', 0); ctx.globalAlpha = 1; }
      }
      // ventanas: luz estable y siluetas que pasan
      for (let r = 0; r < 2; r++) for (let k = 0; k < 7; k++) {
        const wx = -232 + k * 62, wy = -128 + r * 52, on = lit && U.hash(k * 3 + r * 17 + (o.seed || 0)) > -.55;
        Draw.rrect(wx, wy, 36, 34, 3, on ? '#ffd56a' : '#3e3350', 2, 7230 + k + r * 7);
        if (on) { ctx.save(); ctx.beginPath(); ctx.rect(wx + 2, wy + 2, 32, 30); ctx.clip(); const px = wx - 40 + ((t * 18 + k * 37 + r * 60) % 120); Draw.ellipse(px, wy + 28, 9, 11, 'rgba(60,40,70,.55)', 0, 7240); Draw.ellipse(px, wy + 14, 5, 5, 'rgba(60,40,70,.55)', 0, 7241); ctx.restore(); Draw.line(wx + 18, wy + 2, wx + 18, wy + 32, 1.5, 7242 + k, 'rgba(33,28,51,.5)'); }
      }
      // rosetón de engranaje
      Draw.ellipse(-25, -232, 46, 46, '#5c4458', 3, 7250);
      Scenery.gear(-25, -232, 36, 10, t * .4, lit ? '#e3a52e' : '#8a7f63', 2);
      Draw.rrect(-70, -60, 70, 60, 4, '#3a3150', 3, 7252);
      if (lit) { Deco.glow(-35, -20, 70, 'rgba(255,214,106,A)', .35); Draw.ellipse(-35, -30, 6, 6, '#ffd56a', 0, 7254); }
      Draw.rrect(-110, -176, 180, 26, 3, PAL.bone, 2.5, 7253);
      Draw.text(o.sign || 'FÁBRICA DE ESTRUCTURAS', -20, -163, { size: 11.5, font: FONT.plate, spacing: 1 });
      // tubería que sale de la nave
      Draw.curve([[200, -90], [240, -90], [260, -60], [320, -60]], 12, PAL.ink); Draw.curve([[200, -90], [240, -90], [260, -60], [320, -60]], 7, '#7a7f9f');
    });
    (o.chims || [[-170, -300, 34, 190], [-80, -330, 28, 200], [120, -290, 38, 160]]).forEach((c, i) => Deco.smoke(c[0] + c[2] / 2, c[1] - 8, t, { n: 10, h: 260, r: 12, a: .42, phase: i * .27, wind: .7 }));
    ctx.restore();
  },
  /** Mundo flotante: isla con raíces colgantes y habitantes diminutos. */
  island(x, y, r, fill, deep, seed, o) {
    o = o || {}; const ctx = Draw.ctx;
    Draw.shape([[x - r, y], [x - r * .7, y + r * .35], [x - r * .3, y + r * .62], [x, y + r * .75], [x + r * .35, y + r * .6], [x + r * .75, y + r * .3], [x + r, y]], deep, 2.5);
    if (o.roots) for (let k = 0; k < 5; k++) { const rx = x - r * .6 + k * r * .3; Draw.curve([[rx, y + r * .3], [rx + Math.sin(k + (o.t || 0)) * 6, y + r * .55 + k % 2 * 14], [rx + 4, y + r * .8 + (k % 3) * 10]], 2, 'rgba(33,28,51,.6)'); }
    Draw.ellipse(x, y, r, r * .32, fill, 3, seed);
    ctx.globalAlpha = .25; Draw.ellipse(x - r * .25, y - r * .08, r * .45, r * .1, '#ffffff', 0, seed + 3); ctx.globalAlpha = 1;
  },
  machine(x, y, s, mood, t) {
    const ctx = Draw.ctx; ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const sh = mood === 'broken' ? Math.sin(t * 40) * 3 : 0; ctx.translate(sh, 0);
    Draw.rrect(-120, -110, 240, 200, 24, PAL.mustard, 3.5, 7300);
    Deco.rivets(-120, -110, 240, 200, 12, PAL.mustardDeep);
    Draw.rrect(-90, -80, 180, 90, 10, '#3a3150', 3, 7301);
    [0, 1, 2, 3].forEach(i => Draw.curve([[-80, -66 + i * 22], [0, -50 + (mood === 'broken' ? (i * 37) % 60 : i * 10)], [80, -66 + (mood === 'broken' ? (3 - i) * 22 : (i >> 1) * 44)]], 3, SRC_COL[i]));
    const g = mood === 'broken' ? 0 : t * 2;
    [[-90, 50], [90, 50]].forEach((p, i) => Scenery.gear(p[0], p[1], 22, 8, g * (i ? -1 : 1), PAL.olive));
    [0, 1, 2].forEach(k => { const on = mood === 'broken' ? (Math.sin(t * 13 + k) > 0) : ((Math.floor(t * 3) % 3) === k); Draw.ellipse(-30 + k * 30, 40, 7, 7, on ? (mood === 'broken' ? '#ff5a3a' : '#9be27a') : '#5a4f63', 2, 7305 + k); });
    Draw.rrect(-30, -150, 60, 44, 10, PAL.mustard, 3, 7302);
    if (mood === 'broken') { ctx.restore(); ctx.save(); ctx.translate(x, y); ctx.scale(s, s); Deco.smoke(60, -120, t, { n: 7, h: 140, r: 14, a: .5, rgb: '140,132,148', rate: .5, wind: .3 }); Draw.curve([[-40, -6], [-10, 20], [20, 0], [40, 30]], 3, PAL.ink); }
    ctx.restore();
  },
  balance(x, y, tilt, a, b) {
    const ctx = Draw.ctx; ctx.save(); ctx.translate(x, y);
    Draw.line(0, -10, 0, 90, 4, 7400); Draw.rrect(-30, 86, 60, 12, 3, PAL.oliveDeep, 2, 7401);
    const dx = Math.cos(tilt) * 80, dy = Math.sin(tilt) * 80;
    Draw.line(-dx, -dy, dx, dy, 4, 7402); Draw.shape([[-8, -4], [8, -4], [0, 10]], PAL.mustard, 2);
    [[-1, '▲', a, PAL.ochre], [1, '●', b, PAL.plum]].forEach(([sg, sym, sp, col]) => {
      const px = sg * dx, py = sg * dy;
      Draw.line(px - 20, py + 46, px, py, 1.5, 7403 + sg); Draw.line(px + 20, py + 46, px, py, 1.5, 7404 + sg);
      Draw.shape([[px - 28, py + 46], [px + 28, py + 46], [px + 20, py + 54], [px - 20, py + 54]], sg < 0 ? '#f1c27a' : '#c99ac0', 2.5);
      if (sp) drawBead(sp, px, py + 32, 13);
      Draw.text(sym, px + sg * 42, py + 46, { size: 18, color: col });
    });
    ctx.restore();
  },
};

/* ================================================================
 * PANTALLA DE INICIO
 * ============================================================== */
window.TitleScene = function (App) {
  const ctx = Draw.ctx;
  let T = 0, hover = null, focus = null, confirm = false, kbd = false, line = 0, lineT = 0;
  const marchers = [];
  for (let i = 0; i < 6; i++) { const c = makeCritter('src', i % 4, -140 - i * 190, 806, speciesFor('Z4', i % 4)); c.s = .72; c.speed = 64; marchers.push(c); }
  const enc = makeEncargado(1440, 860); enc.face = -1;
  const op = makeOperario(250, 822); op.expr = 'focus';
  const sparks = [];
  const LINES = ['Turno de noche. ¿Es usted el técnico nuevo?', 'Ocho máquinas averiadas y ni un formulario relleno.', 'Pulse EMPEZAR. O rellene el 12-C por triplicado.'];
  const hasProgress = () => Object.keys(App.save.repaired).length > 0 || Object.keys(App.save.started).length > 0 || App.save.intro1;
  const PX = 800, PY = 430, PW = 470;
  function buttons() {
    const out = [], x = PX, y0 = PY + 64;
    if (confirm) {
      out.push({ id: 'yes', label: 'SÍ, EMPEZAR DE CERO', x: x - 215, y: y0 + 74, w: 210, h: 54, act: () => { App.newGame(); confirm = false; } });
      out.push({ id: 'no', label: 'NO, VOLVER', x: x + 5, y: y0 + 74, w: 210, h: 54, act: () => { confirm = false; Sound.fam('slide'); } });
      return out;
    }
    const hp = hasProgress();
    if (hp) out.push({ id: 'continue', label: 'CONTINUAR', x: x - 165, y: y0, w: 330, h: 60, big: true, act: () => App.goto('map') });
    out.push({ id: 'new', label: hp ? 'NUEVA PARTIDA' : 'EMPEZAR', x: x - 165, y: y0 + (hp ? 74 : 0), w: 330, h: hp ? 50 : 60, big: !hp, act: () => { if (hp) { confirm = true; Sound.fam('slide'); } else App.newGame(); } });
    out.push({ id: 'comic', label: 'VER EL CÓMIC', x: x - 165, y: y0 + (hp ? 136 : 74), w: 330, h: 50, act: () => App.playComic('intro') });
    return out;
  }
  const inside = (p, o) => p.x >= o.x && p.x <= o.x + o.w && p.y >= o.y && p.y <= o.y + o.h;
  const drop = () => Clock.reduced ? 1 : Ease.back(U.clamp((T - .15) / 1.1, 0, 1));

  function drawSign(t) {
    const d = drop(), sy = -260 + (196 + 260) * d, sw = Clock.reduced ? 0 : Math.sin(t * .9) * .012 * (1 + 3 * Math.max(0, 1 - (T - 1.2)));
    const top = -App.view.oy - 10;
    ctx.save(); ctx.translate(PX, top); ctx.rotate(sw); ctx.translate(-PX, -top);
    // cadenas
    [-330, 330].forEach(dx => { for (let y = top; y < sy - 112; y += 16) Draw.ellipse(PX + dx, y + 8, 4, 8, null, 2.5, 7520 + y, '#8a8396'); });
    // engranajes detrás del cartel
    Scenery.gear(PX - 452, sy - 30, 70, 12, t * .5, '#6f8436'); Scenery.gear(PX - 392, sy + 60, 40, 9, -t * .9, '#b97e17');
    Scenery.gear(PX + 452, sy - 30, 70, 12, -t * .5, '#6f8436'); Scenery.gear(PX + 395, sy + 64, 38, 9, t * .95, '#b97e17');
    // placa
    const x = PX - 410, y = sy - 118, w = 820, h = 236;
    Draw.rrect(x + 10, y + 14, w, h, 18, 'rgba(10,8,20,.45)', 0, 7530);
    Draw.rrect(x, y, w, h, 18, '#3a2f52', 5, 7531, '#1a1529');
    Draw.rrect(x + 14, y + 14, w - 28, h - 28, 12, null, 2, 7532, '#b97e17');
    // bombillas de marquesina que persiguen
    const bulbs = []; for (let k = 0; k < 20; k++) bulbs.push([x + 30 + k * (w - 60) / 19, y + 6]); for (let k = 0; k < 20; k++) bulbs.push([x + w - 30 - k * (w - 60) / 19, y + h - 6]);
    for (let k = 0; k < 4; k++) { bulbs.push([x + 6, y + 40 + k * (h - 80) / 3]); bulbs.push([x + w - 6, y + 40 + k * (h - 80) / 3]); }
    bulbs.forEach((b, k) => { const on = Clock.reduced ? k % 2 === 0 : ((k + Math.floor(t * 6)) % 4 !== 0); if (on) Deco.glow(b[0], b[1], 16, 'rgba(255,214,120,A)', .55); Draw.ellipse(b[0], b[1], 5.5, 5.5, on ? '#fff0b8' : '#6a5a50', 1.8, 7540 + k); });
    Deco.rivets(x, y, w, h, 26, '#b97e17');
    Draw.text('THE ALGEBRA', PX, y + 78, { size: 84, font: FONT.title, color: PAL.mustard, stroke: 10, strokeColor: '#1a1529', jitter: 1.6, seed: 70, spacing: 2 });
    Draw.text('ENGINE', PX, y + 168, { size: 112, font: FONT.title, color: PAL.bone, stroke: 11, strokeColor: '#1a1529', jitter: 1.6, seed: 71, spacing: 6 });
    // destello que cruza las letras
    if (!Clock.reduced) { const u = ((t - 1.6) % 6) / 1.2; if (u > 0 && u < 1) { ctx.save(); ctx.beginPath(); ctx.rect(x + 14, y + 14, w - 28, h - 28); ctx.clip(); const gx = x + u * (w + 200) - 100, g = ctx.createLinearGradient(gx - 60, 0, gx + 60, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, 'rgba(255,255,255,.22)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.translate(gx, y); ctx.rotate(.3); ctx.fillRect(-60, -60, 120, h + 120); ctx.restore(); } }
    ctx.restore();
    // cinta del subtítulo
    const ry = sy + 150, rw = 600;
    ctx.globalAlpha = U.clamp((T - 1) * 2, 0, 1);
    Draw.shape([[PX - rw / 2 - 50, ry - 6], [PX - rw / 2, ry - 6], [PX - rw / 2, ry + 36], [PX - rw / 2 - 50, ry + 36], [PX - rw / 2 - 32, ry + 15]], '#a52c2c', 2.5);
    Draw.shape([[PX + rw / 2 + 50, ry - 6], [PX + rw / 2, ry - 6], [PX + rw / 2, ry + 36], [PX + rw / 2 + 50, ry + 36], [PX + rw / 2 + 32, ry + 15]], '#a52c2c', 2.5);
    Draw.rrect(PX - rw / 2, ry - 16, rw, 44, 3, '#d9473a', 3, 7560);
    Draw.text('la fábrica de estructuras · turno de noche', PX, ry + 6, { size: 25, color: PAL.bone });
    ctx.globalAlpha = 1;
  }
  function drawPanel() {
    const bs = buttons(), h = confirm ? 220 : (hasProgress() ? 280 : 236), x = PX - PW / 2, y = PY;
    Draw.rrect(x + 8, y + 12, PW, h, 10, 'rgba(10,8,20,.4)', 0, 7570);
    Draw.rrect(x, y, PW, h, 10, '#7a4e2a', 3.5, 7571);
    ctx.save(); ctx.globalAlpha = .18; for (let k = 0; k < 9; k++) Draw.line(x + 6, y + 20 + k * 30, x + PW - 6, y + 24 + k * 30, 1.5, 7572 + k, '#2a1a0c'); ctx.restore();
    Draw.rrect(x + 10, y + 10, PW - 20, h - 20, 7, null, 2, 7581, '#c9a36b');
    Deco.rivets(x, y, PW, h, 16, '#e0c48c');
    Draw.rrect(PX - 105, y + 16, 210, 30, 4, '#c9b48a', 2.5, 7582);
    Draw.text('PANEL DE CONTROL', PX, y + 32, { size: 14, font: FONT.plate, spacing: 2 });
    if (confirm) { Draw.text('¿Borrar el progreso guardado?', PX, y + 84, { size: 24, color: PAL.bone }); Draw.text('(los ajustes de sonido se conservan)', PX, y + 112, { size: 17, color: '#e9cfa6' }); }
    bs.forEach(b => {
      const f = (kbd ? focus : hover) === b.id;
      Kit.plate(b.x, b.y, b.w, b.h, b.label, { size: b.big ? 21 : 15, fill: b.big ? '#f6dfb8' : PAL.bone, focus: f, press: f ? .4 : 0 });
      const lx = b.x - 22, ly = b.y + b.h / 2;
      if (f) Deco.glow(lx, ly, 22, 'rgba(255,200,90,A)', .7);
      Draw.ellipse(lx, ly, 8, 8, f ? '#ffd56a' : '#5a3a20', 2, 7590 + b.y);
    });
    if (!confirm) {
      const n = Object.keys(App.save.repaired).length;
      Draw.text('máquinas reparadas', PX - 60, y + h - 26, { size: 16, color: '#f3dcb6', align: 'right' });
      for (let k = 0; k < 8; k++) { const on = App.save.repaired[k + 1]; const bx = PX - 44 + k * 22; if (on) Deco.glow(bx, y + h - 26, 14, 'rgba(160,230,110,A)', .6); Draw.ellipse(bx, y + h - 26, 7, 7, on ? '#9be27a' : '#4a3020', 2, 7600 + k); }
    }
  }
  function drawGate(x, y, t) {
    // la máquina traductora sobre la cinta
    Draw.rrect(x - 100, y - 124, 200, 124, 16, PAL.mustard, 3.5, 7610);
    Deco.rivets(x - 100, y - 124, 200, 124, 12, PAL.mustardDeep);
    Draw.rrect(x - 50, y - 58, 100, 58, 8, '#2a2236', 3, 7611);
    ctx.save(); ctx.beginPath(); ctx.rect(x - 46, y - 54, 92, 54); ctx.clip(); for (let k = 0; k < 5; k++) Draw.line(x - 46 + k * 22, y - 54, x - 46 + k * 22 + Math.sin(t * 4 + k) * 4, y, 6, 7614 + k, '#4a3e5c'); ctx.restore();
    Draw.rrect(x - 30, y - 150, 60, 30, 8, '#c99a5e', 3, 7612); Draw.text('f', x, y - 135, { size: 24, font: FONT.title });
    Deco.gauge(x - 70, y - 86, 18, .45 + Math.sin(t * 1.7) * .15);
    [0, 1, 2].forEach(k => { const on = (Math.floor(t * 4) + k) % 3 === 0; if (on) Deco.glow(x + 46 + k * 18, y - 96, 12, 'rgba(160,230,110,A)', .6); Draw.ellipse(x + 46 + k * 18, y - 96, 5.5, 5.5, on ? '#9be27a' : '#5a4f63', 2, 7613 + k); });
    Deco.smoke(x + 76, y - 126, t, { n: 6, h: 90, r: 8, a: .35, rate: .3, wind: .4 });
    Draw.text('Z4 → Z2', x + 64, y - 72, { size: 11, font: FONT.plate });
  }
  return {
    bg: '#1b1834',
    music: 'title',
    enter() { window.__TITLE = this; },
    update(dt) {
      T += dt; updateEncargado(enc, dt); updateOperario(op, dt);
      const left = -App.view.ox - 120, right = 1600 + App.view.ox + 120;
      marchers.forEach((c, i) => {
        stepCritter(c, dt); c.x += c.speed * dt;
        c.hop = Math.abs(Math.sin(T * 6 + i)) * 9;
        if (c.x > 760 && c.x < 840) { c.alpha = 0; }
        else c.alpha = 1;
        if (c.x > 800 && !c.through) { c.through = true; c.species = speciesFor('Z2', c.v % 2); c.hat = { col: SRC_COL[c.v], label: String(c.v) }; setExpr(c, 'happy', 1.2); }
        if (c.x > right) { c.x = left; c.through = false; c.species = speciesFor('Z4', c.v); c.hat = null; }
      });
      lineT += dt; if (T > 3 && lineT > 7) { lineT = 0; line = (line + 1) % LINES.length; enc.talk = 2.5; }
      if (T > 3 && !enc.talked) { enc.talked = true; enc.talk = 2.5; lineT = 0; }
      // el operario aprieta una tuerca de la farola: chispas de vez en cuando
      if (!Clock.reduced && (T % 3.2) < dt) { op.tool = 'hammer'; op.toolT = .6; for (let k = 0; k < 10; k++) sparks.push({ x: op.x + 46, y: op.y - 6, vx: U.rand(-90, 90), vy: U.rand(-160, -40), t: 0 }); Math.random() < .5 && Sound.fam('gear', { vol: .12 }); }
      for (let i = sparks.length - 1; i >= 0; i--) { const s = sparks[i]; s.t += dt; s.vy += 400 * dt; s.x += s.vx * dt; s.y += s.vy * dt; if (s.t > .7) sparks.splice(i, 1); }
    },
    render() {
      const ox = App.view.ox, oy = App.view.oy, L = -ox, R = 1600 + ox, TOP = -oy, BOT = 900 + oy, t = T;
      Scenery.night(L, TOP, R - L, BOT - TOP, t, { seed: 11 });
      // estrella fugaz
      if (!Clock.reduced) { const u = (t % 9) / 1.1; if (u < 1) { const sx = 300 + u * 520, sy = 40 + u * 120; const g = ctx.createLinearGradient(sx - 120, sy - 30, sx, sy); g.addColorStop(0, 'rgba(255,246,220,0)'); g.addColorStop(1, 'rgba(255,246,220,.9)'); ctx.strokeStyle = g; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(sx - 120, sy - 30); ctx.lineTo(sx, sy); ctx.stroke(); } }
      Scenery.moon(1470, 112, 50);
      // nubes lentas
      for (let k = 0; k < 4; k++) { const cx = L + (((t * (6 + k * 2) + k * 520) % (R - L + 600)) - 300); Deco.cloud(cx, 120 + k * 70, 300 + k * 40, .12 + k * .03, k % 2 ? '150,120,170' : '110,90,140'); }
      // mundos flotantes a los lados
      const bob = k => Clock.reduced ? 0 : Math.sin(t * .8 + k) * 8;
      Scenery.island(130, 330 + bob(0), 105, PAL.island, PAL.islandDeep, 7620, { roots: true, t });
      [0, 1, 2, 3].forEach(i => drawBead(speciesFor('Z4', i), 70 + i * 40, 318 + bob(0) - Math.abs(Math.sin(t * 3 + i)) * 4, 11));
      Draw.text('reloj de 4', 130, 300 + bob(0) - 40, { size: 17, color: '#f6d9b8' });
      Scenery.island(1480, 360 + bob(2), 88, PAL.isle2, PAL.isle2Deep, 7630, { roots: true, t });
      [0, 1].forEach(i => drawBead(speciesFor('Z2', i), 1455 + i * 50, 348 + bob(2) - Math.abs(Math.sin(t * 3 + i)) * 4, 11));
      Draw.text('reloj de 2', 1480, 316 + bob(2), { size: 17, color: '#dfe3f6' });
      // horizonte lejano y colinas
      Scenery.skyline(L, R, 640, t, '#2c2546', 5);
      ctx.fillStyle = '#342a4c'; ctx.beginPath(); ctx.moveTo(L, BOT); for (let x = L; x <= R + 40; x += 40) ctx.lineTo(x, 660 + Math.sin(x * .005 + 1) * 22); ctx.lineTo(R, BOT); ctx.fill();
      // cables con cuentas entre los mundos y las fábricas
      const cableA = [[200, 360 + bob(0)], [260, 470], [330, 560]], cableB = [[1420, 390 + bob(2)], [1360, 480], [1300, 570]];
      [cableA, cableB].forEach((c, k) => { Draw.curve(c, 6, '#211c33'); Draw.curve(c, 3, '#7a7f9f'); const u = ((t * .25 + k * .5) % 1); const q = polyAt(c, u); Deco.glow(q.x, q.y, 14, 'rgba(255,214,120,A)', .7); Draw.ellipse(q.x, q.y, 4, 4, '#fff0b8', 0, 7640 + k); });
      Scenery.factory(330, 702, .78, t, true, { seed: 1 });
      Scenery.factory(1290, 712, .66, t + 2, true, { seed: 4, sign: 'NAVE 2 · ISOMORFISMOS', chims: [[-150, -280, 30, 170], [100, -300, 34, 180]] });
      // patio
      const gy = 728, gg = ctx.createLinearGradient(0, gy, 0, BOT); gg.addColorStop(0, '#4a3a5c'); gg.addColorStop(1, '#2a2238');
      ctx.fillStyle = gg; ctx.fillRect(L, gy, R - L, BOT - gy);
      Draw.line(L, gy, R, gy, 3, 7650, '#1f1a2e');
      ctx.save(); ctx.globalAlpha = .15; for (let x = L - 40; x < R; x += 90) Draw.line(x, gy + 6, x - 50, BOT, 1.5, 7651 + x, '#0f0c18'); ctx.restore();
      // farolas con su charco de luz
      [130, 560, 1040, 1520].forEach((lx, k) => {
        ctx.save(); ctx.globalAlpha = .5; const g = ctx.createRadialGradient(lx, 860, 0, lx, 860, 170); g.addColorStop(0, 'rgba(255,214,140,.45)'); g.addColorStop(1, 'rgba(255,214,140,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(lx, 860, 170, 40, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        const g2 = ctx.createLinearGradient(0, 650, 0, 860); g2.addColorStop(0, 'rgba(255,224,150,.22)'); g2.addColorStop(1, 'rgba(255,224,150,0)'); ctx.fillStyle = g2; ctx.beginPath(); ctx.moveTo(lx - 10, 652); ctx.lineTo(lx + 10, 652); ctx.lineTo(lx + 110, 860); ctx.lineTo(lx - 110, 860); ctx.fill();
        Draw.line(lx, 650, lx, 876, 5, 7660 + k, '#1f1a2e'); Draw.curve([[lx, 650], [lx + 10, 632], [lx + 26, 638]], 4, '#1f1a2e');
        Draw.shape([[lx - 14, 652], [lx - 8, 636], [lx + 8, 636], [lx + 14, 652]], '#3d5a4a', 2.5); Deco.glow(lx, 652, 30, 'rgba(255,230,160,A)', .8); Draw.ellipse(lx, 653, 6, 4, '#fff3c4', 0, 7665 + k);
        // polillas
        if (!Clock.reduced) for (let m = 0; m < 3; m++) { const a = t * (2 + m) + m * 2 + k; Draw.ellipse(lx + Math.cos(a) * (18 + m * 6), 660 + Math.sin(a * 1.3) * 10, 1.6, 1.6, '#fff3d6', 0, 7668); }
      });
      // cinta transportadora
      const by = 830;
      Draw.rrect(L - 20, by, R - L + 40, 24, 12, '#3a3448', 3, 7500);
      ctx.save(); ctx.beginPath(); ctx.rect(L, by + 2, R - L, 20); ctx.clip(); for (let x = L - 40; x < R; x += 32) Draw.line(x + (t * 64) % 32, by + 3, x + (t * 64) % 32 + 10, by + 21, 2, 7501, '#6b6380'); ctx.restore();
      for (let x = L + 30; x < R; x += 120) { Draw.line(x, by + 24, x - 8, BOT, 4, 7502 + x, '#1f1a2e'); Draw.ellipse(x, by + 12, 6, 6, '#8a8396', 1.5, 7503); }
      // el operario apretando la farola
      drawOperario(op, 8);
      sparks.forEach(s => { ctx.globalAlpha = 1 - s.t / .7; Draw.ellipse(s.x, s.y, 2.2, 2.2, '#ffd56a', 0, 7670); }); ctx.globalAlpha = 1;
      marchers.forEach(c => { if (c.alpha > 0) drawCritter(c); });
      drawGate(800, by, t);
      drawEncargado(enc);
      if (enc.talk > 0) App.drawBubble({ x: enc.x - 40, y: enc.y - 132 }, LINES[line], 1, Math.min(1, enc.talk * 2));
      drawSign(t);
      drawPanel();
      Deco.vignette(L, TOP, R - L, BOT - TOP, .35);
      Draw.text('clic o Enter · Tab para moverte', PX, 884, { size: 16, color: '#cbb9d9' });
      Draw.text('v4 · progreso guardado en este navegador', L + 20, BOT - 18, { size: 14, color: 'rgba(230,220,240,.45)', align: 'left' });
    },
    pointerDown(p) { kbd = false; Sound.init(); Music.start(); const b = buttons().find(o => inside(p, o)); if (b) { Sound.fam('clickin'); b.act(); } },
    pointerMove(p) { const b = buttons().find(o => inside(p, o)); if (b && b.id !== hover) Sound.fam('clickin', { vol: .15 }); hover = b ? b.id : null; App.setCursor(b ? 'pointer' : 'default'); },
    pointerUp() {},
    key(e) {
      Music.start();
      const bs = buttons();
      if (e.key === 'Tab' || e.key.startsWith('Arrow')) { kbd = true; let i = bs.findIndex(b => b.id === focus); i = (i + (e.shiftKey || e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 1) + bs.length) % bs.length; focus = bs[i].id; App.announce(bs[i].label); return true; }
      if (e.key === 'Enter' || e.key === ' ') { const b = bs.find(o => o.id === focus) || bs[0]; b.act(); return true; }
      if (e.key === 'Escape' && confirm) { confirm = false; return true; }
      return true;
    },
    debug: () => ({ buttons: buttons().map(b => b.id) }),
  };
};
function polyAt(pts, u) { const n = pts.length - 1, k = Math.min(n - 1, Math.floor(u * n)), f = u * n - k; return { x: U.lerp(pts[k][0], pts[k + 1][0], f), y: U.lerp(pts[k][1], pts[k + 1][1], f) }; }

/* ================================================================
 * EL CÓMIC — «El turno de noche»
 * Portada + 4 páginas. Cada viñeta tiene cartela, globos anclados a los personajes,
 * onomatopeyas y una pequeña animación propia que arranca cuando se revela.
 * ============================================================== */
window.ComicScene = function (App) {
  const ctx = Draw.ctx;
  let T = 0, page = 0, shown = 1, hover = null, flipT = 0, flipFrom = -1, flipDir = 1;
  const revealAt = {};   // clave "p.i" → instante de revelado
  const crit = (i, sp, s) => { const c = makeCritter('src', i, 0, 0, sp); c.s = s || 1; return c; };
  const cast = {
    z4: [0, 1, 2, 3].map(i => crit(i, speciesFor('Z4', i), .9)),
    v4: [0, 1, 2, 3].map(i => crit(i, speciesFor('V4', i), .9)),
    z2: [0, 1].map(i => crit(i, speciesFor('Z2', i), .9)),
    ghost: crit(1, speciesFor('V4', 1), .9),
  };
  const enc = makeEncargado(0, 0), op = makeOperario(0, 0);
  const ID = App.comicId || 'intro', extra = [];
  let halftone = null;
  function dots(col, a, step) {
    if (!halftone) { const c = document.createElement('canvas'); c.width = c.height = 12; const g = c.getContext('2d'); g.fillStyle = '#000'; g.beginPath(); g.arc(6, 6, 2.1, 0, Math.PI * 2); g.fill(); halftone = ctx.createPattern(c, 'repeat'); }
    return halftone;
  }
  function tone(w, h, a) { ctx.save(); ctx.globalAlpha = a || .08; ctx.fillStyle = dots(); ctx.fillRect(0, 0, w, h); ctx.restore(); }
  function rays(cx, cy, w, h, t, col, a, n) { ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = col; const N = n || 18, R = Math.hypot(w, h); for (let k = 0; k < N; k++) { const a0 = t * .1 + k / N * Math.PI * 2, a1 = a0 + Math.PI / N * .8; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a0) * R, cy + Math.sin(a0) * R); ctx.lineTo(cx + Math.cos(a1) * R, cy + Math.sin(a1) * R); ctx.fill(); } ctx.restore(); }
  function speed(cx, cy, w, h, t, a) { ctx.save(); ctx.globalAlpha = a || .25; ctx.strokeStyle = PAL.ink; ctx.lineWidth = 2; for (let k = 0; k < 40; k++) { const ang = U.hash(k * 3.3) * Math.PI, r0 = 120 + Math.abs(U.hash(k * 7.7 + Math.floor(t * 8))) * 80; ctx.beginPath(); ctx.moveTo(cx + Math.cos(ang * 2) * r0, cy + Math.sin(ang * 2) * r0); ctx.lineTo(cx + Math.cos(ang * 2) * (r0 + 120 + k % 3 * 40), cy + Math.sin(ang * 2) * (r0 + 120 + k % 3 * 40)); ctx.stroke(); } ctx.restore(); }
  /** Onomatopeya con estallido detrás. */
  function sfx(text, x, y, size, rot, fill, t, o) {
    o = o || {}; const pulse = Clock.reduced ? 1 : 1 + Math.max(0, .25 - (t % (o.every || 99)) ) * 1.6 + Math.sin(t * 9) * .02;
    if (t < 0) return; const pop = Math.min(1, t * 5);
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(Ease.back(pop) * pulse, Ease.back(pop) * pulse);
    if (o.burst !== false) { const pts = []; const N = 14, r = size * (Draw.textWidth(text, size, FONT.title) / size * .55 + .35); for (let k = 0; k < N * 2; k++) { const a = k / (N * 2) * Math.PI * 2, rr = k % 2 ? r * .72 : r; pts.push([Math.cos(a) * rr * 1.1, Math.sin(a) * rr * .62]); } Draw.shape(pts, o.burstCol || '#fff3c4', 3); }
    Draw.text(text, 0, 2, { size, font: FONT.title, color: fill, stroke: 7, strokeColor: PAL.ink, jitter: 1.4, seed: text.length * 7 });
    ctx.restore();
  }
  /** Globo de cómic: centro (bx, by), cola hacia (ax, ay). */
  function balloon(text, bx, by, ax, ay, o) {
    o = o || {}; const size = o.size || 20, lines = App.wrap(text, o.w || 250, size);
    const w = Math.max(...lines.map(l => Draw.textWidth(l, size, FONT.hand))) + 34, h = lines.length * (size + 4) + 22;
    const x = bx - w / 2, y = by - h / 2;
    const tx = U.clamp(ax, x + 24, x + w - 24), ty = by;
    Draw.shape([[tx - 12, ty], [ax, ay], [tx + 12, ty]], PAL.bone, 2.5);
    if (o.shout) { const pts = []; const N = 22; for (let k = 0; k < N; k++) { const a = k / N * Math.PI * 2, r = k % 2 ? 1 : 1.16; pts.push([bx + Math.cos(a) * w * .56 * r, by + Math.sin(a) * h * .62 * r]); } Draw.shape(pts, PAL.bone, 2.5); }
    else Draw.ellipse(bx, by, w * .56, h * .6, PAL.bone, 2.5, 8100 + Math.round(bx));
    ctx.fillStyle = PAL.bone; ctx.beginPath(); ctx.ellipse(bx, by, w * .54, h * .57, 0, 0, Math.PI * 2); ctx.fill();
    lines.forEach((l, i) => Draw.text(l, bx, y + 11 + (size + 4) * (i + .5), { size, color: PAL.ink, weight: o.shout ? 'bold' : '' }));
  }

  /* ---------------- viñetas ---------------- */
  function vCover(w, h, t, A) {
    const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#2b2152'); g.addColorStop(.6, '#7a3a6a'); g.addColorStop(1, '#e3a52e'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    rays(w / 2, h * .55, w, h, t, '#ffd98a', .12, 22);
    Deco.stars(0, 0, w, h * .4, t, 50, 21);
    Scenery.factory(w / 2 + 20, h * .78, 1.05, t, true, { seed: 2 });
    tone(w, h, .07);
    // cabecera
    ctx.fillStyle = '#e3a52e'; ctx.fillRect(0, 0, w, 150); ctx.fillStyle = PAL.ink; ctx.fillRect(0, 150, w, 6);
    Draw.text('THE ALGEBRA', w / 2 + 30, 52, { size: 54, font: FONT.title, color: PAL.bone, stroke: 8, strokeColor: PAL.ink, jitter: 1.4, seed: 81 });
    Draw.text('ENGINE', w / 2 + 30, 110, { size: 64, font: FONT.title, color: '#d9473a', stroke: 8, strokeColor: PAL.ink, jitter: 1.4, seed: 82 });
    Draw.ellipse(62, 74, 46, 46, PAL.bone, 3, 8200); Draw.text('Nº', 62, 58, { size: 16, font: FONT.plate }); Draw.text('1', 62, 88, { size: 38, font: FONT.title });
    Draw.text('OCTUBRE · TURNO DE NOCHE', w - 24, 140, { size: 12, font: FONT.plate, align: 'right' });
    // titular de la portada
    ctx.save(); ctx.translate(w / 2, 220); ctx.rotate(-.04);
    Draw.shape([[-290, -34], [290, -38], [300, 30], [-296, 34]], '#f6e27a', 3); Draw.text('«EL TURNO DE NOCHE»', 0, 0, { size: 38, font: FONT.title, color: PAL.ink, jitter: 1.2, seed: 83 });
    ctx.restore();
    // criaturas que se asoman al borde inferior
    cast.z4.forEach((c, i) => { c.x = 70 + i * 60; c.y = h - 30 - Math.abs(Math.sin(t * 2.4 + i)) * 10; c.s = .85; drawCritter(c); });
    cast.z2.forEach((c, i) => { c.x = w - 150 + i * 70; c.y = h - 36 - Math.abs(Math.sin(t * 2.4 + i + 2)) * 10; c.s = .9; drawCritter(c); });
    A.crit = { x: 160, y: h - 90 };
    // pegatina de precio y código de barras
    ctx.save(); ctx.translate(w - 76, 300); ctx.rotate(.25); const pts = []; for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2, r = k % 2 ? 46 : 56; pts.push([Math.cos(a) * r, Math.sin(a) * r]); } Draw.shape(pts, '#d9473a', 3); Draw.text('GRATIS', 0, -6, { size: 18, font: FONT.title, color: PAL.bone }); Draw.text('¡y sin', 0, 14, { size: 13, color: PAL.bone }); Draw.text('formularios!', 0, 28, { size: 13, color: PAL.bone }); ctx.restore();
    Draw.rrect(w - 116, h - 140, 96, 60, 2, PAL.bone, 2, 8210); for (let k = 0; k < 22; k++) { ctx.fillStyle = PAL.ink; ctx.fillRect(w - 108 + k * 3.7, h - 132, (k % 3) + 1, 36); } Draw.text('Z4 → Z2', w - 68, h - 88, { size: 9, font: FONT.plate });
  }
  function vExterior(w, h, t, A) {
    Scenery.night(0, 0, w, h, t, { seed: 5 }); Scenery.moon(w - 120, 80, 40);
    for (let k = 0; k < 3; k++) Deco.cloud(((t * 10 + k * 500) % (w + 400)) - 200, 90 + k * 40, 260, .15, '140,110,170');
    const b = k => Clock.reduced ? 0 : Math.sin(t * .9 + k) * 7;
    Scenery.island(170, 230 + b(0), 120, PAL.island, PAL.islandDeep, 7600, { roots: true, t });
    Scenery.island(w - 210, 220 + b(1), 104, PAL.isle2, PAL.isle2Deep, 7610, { roots: true, t });
    Scenery.island(w * .3, 110 + b(2), 52, '#d7d8e8', '#9ea3c6', 7620); Scenery.island(w * .71, 100 + b(3), 46, '#9fd29a', '#5f8f5a', 7630);
    [0, 1, 2, 3].forEach(i => drawBead(speciesFor('V4', i), w * .3 - 30 + i * 20, 100 + b(2), 7));
    [0, 1, 2].forEach(i => drawBead(speciesFor('U5', i), w * .71 - 20 + i * 20, 90 + b(3), 7));
    const pa = [[260, 240 + b(0)], [w / 2 - 230, 290], [w / 2 - 150, 330]], pb = [[w / 2 + 150, 330], [w / 2 + 230, 290], [w - 300, 230 + b(1)]];
    [pa, pb].forEach((c, k) => { Draw.curve(c, 12, PAL.ink); Draw.curve(c, 6, PAL.olive); for (let j = 0; j < 3; j++) { const q = polyAt(c, ((t * .3 + j / 3 + k * .15) % 1)); drawBead(k ? speciesFor('Z2', j % 2) : speciesFor('Z4', j), q.x, q.y - 10, 9); } });
    Scenery.island(w / 2, 372, 230, '#5a4a6e', '#3e3350', 7640);
    Scenery.factory(w / 2, 372, .8, t, true, { seed: 3 });
    [0, 1, 2, 3].forEach(i => { const c = cast.z4[i]; c.x = 110 + i * 38; c.y = 222 + b(0); c.s = .45; drawCritter(c); });
    [0, 1].forEach(i => { const c = cast.z2[i]; c.x = w - 240 + i * 56; c.y = 214 + b(1); c.s = .5; drawCritter(c); });
    sfx('chuf chuf', w / 2 + 210, 120, 22, .1, '#cfc6dd', t - .6, { burst: false });
  }
  function vClock(w, h, t, A) {
    ctx.fillStyle = '#f2d2ae'; ctx.fillRect(0, 0, w, h); tone(w, h, .1);
    Scenery.island(w / 2, h / 2 + 90, 250, PAL.island, PAL.islandDeep, 7700);
    // esfera del reloj dibujada en la isla
    ctx.save(); ctx.translate(w / 2, h / 2 + 90); ctx.scale(1, .32); Draw.ellipse(0, 0, 200, 200, null, 2, 7701, 'rgba(33,28,51,.35)'); for (let k = 0; k < 4; k++) { const a = -Math.PI / 2 + k * Math.PI / 2; Draw.line(Math.cos(a) * 180, Math.sin(a) * 180, Math.cos(a) * 200, Math.sin(a) * 200, 4, 7702 + k, 'rgba(33,28,51,.4)'); } ctx.restore();
    const u = Clock.reduced ? .8 : (t % 4.5) / 4.5, cx = w / 2, cy = h / 2 + 96;
    const z = cast.z4;
    z[0].x = cx - 190; z[0].y = cy - 10; z[3].x = cx + 190; z[3].y = cy - 10;
    const meet = U.clamp(u / .35, 0, 1), e = Ease.inOut(meet);
    z[1].x = U.lerp(cx - 110, cx - 26, e); z[2].x = U.lerp(cx + 110, cx + 26, e); z[1].y = z[2].y = cy + 20;
    z.forEach(c => { c.s = .85; c.hop = 0; });
    z[3].hop = u > .42 ? Math.abs(Math.sin(t * 8)) * 16 : 0; if (u > .42) setExpr(z[3], 'cheer', .3);
    [z[0], z[3]].forEach(drawCritter);
    if (u < .38) { drawCritter(z[1]); drawCritter(z[2]); }
    else { if (u < .55) Deco.puff(cx, cy, 50 * (1 + (u - .38) * 3), .7 * (1 - (u - .38) / .17), '255,250,235'); drawBead(speciesFor('Z4', 3), cx, cy - Math.min(40, (u - .38) * 200), 18); sfx('¡PLOP!', cx + 70, cy - 90, 30, -.15, PAL.c1, (u - .38) * 4.5); }
    A.three = { x: z[3].x, y: z[3].y - 60 };
    Draw.rrect(24, h - 72, 230, 44, 4, '#2f3a33', 3, 7720); Draw.text('3 + 2 = 1  (pasa del 4)', 139, h - 50, { size: 18, color: '#e8f0e0' });
  }
  function vKlein(w, h, t, A) {
    ctx.fillStyle = '#d7d8e8'; ctx.fillRect(0, 0, w, h); tone(w, h, .1);
    Scenery.island(w / 2, h / 2 + 90, 250, PAL.isle2, PAL.isle2Deep, 7710);
    const u = Clock.reduced ? .8 : (t % 4.5) / 4.5, cx = w / 2 + 40, cy = h / 2 + 96;
    const v = cast.v4; v[0].x = cx - 220; v[0].y = cy - 6; v[2].x = cx + 170; v[2].y = cy - 6; v[3].x = cx + 240; v[3].y = cy + 10;
    v.forEach(c => { c.s = .85; });
    const e = Ease.inOut(U.clamp(u / .35, 0, 1)), g = cast.ghost; g.s = .85;
    v[1].x = U.lerp(cx - 130, cx - 26, e); g.x = U.lerp(cx + 70, cx + 26, e); v[1].y = g.y = cy + 20;
    [v[2], v[3]].forEach(drawCritter);
    if (u < .38) { drawCritter(v[1]); drawCritter(g); drawCritter(v[0]); }
    else {
      if (u < .55) Deco.puff(cx, cy, 50 * (1 + (u - .38) * 3), .7 * (1 - (u - .38) / .17), '255,255,255');
      v[0].x = U.lerp(cx - 220, cx, Ease.out(U.clamp((u - .45) / .3, 0, 1))); v[0].hop = u > .75 ? Math.abs(Math.sin(t * 7)) * 12 : 0; drawCritter(v[0]);
      sfx('¡PUF!', cx + 40, cy - 110, 32, .12, '#7c6ab3', (u - .38) * 4.5);
    }
    A.e = { x: v[0].x, y: v[0].y - 60 };
    Draw.text('dos iguales se combinan…', 30, 104, { size: 18, color: '#3d4170', align: 'left' });
  }
  function vTranslate(w, h, t, A) {
    ctx.fillStyle = PAL.paper; ctx.fillRect(0, 0, w, h); tone(w, h, .08);
    const mx = w / 2, my = h / 2 + 60;
    Scenery.island(90, h - 22, 80, PAL.island, PAL.islandDeep, 7740); Scenery.island(w - 90, h - 22, 80, PAL.isle2, PAL.isle2Deep, 7741);
    [0, 2, 3].forEach((i, k) => drawBead(speciesFor('Z4', i), 50 + k * 30, h - 36, 9)); [0, 1].forEach(i => drawBead(speciesFor('Z2', i), w - 110 + i * 36, h - 36, 9));
    Scenery.machine(mx, my, .62, 'ok', t);
    const u = Clock.reduced ? .5 : (t % 3) / 3;
    Draw.curve([[60, h - 70], [mx - 110, h - 70], [mx - 110, my]], 10, PAL.ink); Draw.curve([[mx + 90, my + 30], [w - 60, h - 70]], 10, PAL.ink);
    const k = Math.floor(t / 3) % 4;
    if (u < .45) drawBead(speciesFor('Z4', k), U.lerp(60, mx - 110, u / .45), h - 84, 16);
    else if (u > .6) { drawBead(speciesFor('Z2', k % 2), U.lerp(mx + 90, w - 60, (u - .6) / .4), U.lerp(my + 18, h - 84, (u - .6) / .4), 16); }
    if (u > .45 && u < .7) sfx('¡ZUMM!', mx + 60, my - 140, 26, .14, PAL.ultra, (u - .45) * 3);
    Draw.text(k + '  →  ' + (k % 2), mx, h - 30, { size: 26, font: FONT.title, color: PAL.plum });
    Draw.text('reloj de 4', 90, h - 120, { size: 16, color: PAL.inkSoft }); Draw.text('reloj de 2', w - 90, h - 120, { size: 16, color: PAL.inkSoft });
  }
  function vRule(w, h, t, A) {
    ctx.fillStyle = '#e8cfa8'; ctx.fillRect(0, 0, w, h); rays(w * .66, h * .55, w, h, t, '#fff3c4', .35, 14); tone(w, h, .06);
    op.x = w * .3; op.y = h / 2 + 70; op.expr = 'cheer'; op.exprT = 1; drawOperario(op, 10);
    ctx.save(); ctx.translate(w * .66, h * .55); ctx.rotate(.05 + (Clock.reduced ? 0 : Math.sin(t * 2) * .02));
    Draw.rrect(-150, -86, 300, 172, 8, PAL.bone, 4, 8300); Deco.rivets(-150, -86, 300, 172, 14);
    Draw.text('REGLA DE ORO', 0, -56, { size: 15, font: FONT.plate, spacing: 2 });
    Draw.text('▲ = ●', 0, 4, { size: 64, font: FONT.title, color: PAL.ink, jitter: 1, seed: 90 });
    Draw.text('para todas las parejas', 0, 58, { size: 18, color: PAL.inkSoft });
    ctx.restore();
    A.op = { x: op.x + 10, y: op.y - 60 };
  }
  function vRoutes(w, h, t, A) {
    ctx.fillStyle = '#f1d6b0'; ctx.fillRect(0, 0, w, h); tone(w, h, .07);
    const u = Clock.reduced ? .95 : (t % 6) / 6, x0 = 150, x1 = w - 330, yT = 150, yB = h - 90;
    Draw.text('▲', x0 + 120, yT - 40, { size: 26, color: PAL.ochre }); Draw.text('combinar aquí y luego traducir', x0 + 290, yT - 40, { size: 18, color: PAL.inkSoft });
    Draw.text('●', x0 + 120, yB + 40, { size: 26, color: PAL.plum }); Draw.text('traducir y luego combinar allí', x0 + 290, yB + 40, { size: 18, color: PAL.inkSoft });
    Draw.curve([[x0, h / 2], [x0 + 80, yT], [x1, yT]], 4, PAL.ochre, [10, 8]); Draw.curve([[x0, h / 2], [x0 + 80, yB], [x1, yB]], 4, PAL.plum, [10, 8]);
    // el par de partida
    drawBead(speciesFor('Z4', 1), x0 - 26, h / 2, 16); drawBead(speciesFor('Z4', 2), x0 + 14, h / 2, 16);
    // ruta ▲: 1+2 = 3 → máquina → 1
    const ma = x0 + (x1 - x0) * .55;
    Draw.rrect(ma - 34, yT - 30, 68, 60, 10, PAL.mustard, 3, 8310); Draw.text('f', ma, yT, { size: 26, font: FONT.title });
    Draw.rrect(ma - 34, yB - 30, 68, 60, 10, PAL.mustard, 3, 8311); Draw.text('f', ma, yB, { size: 26, font: FONT.title });
    const s1 = U.clamp(u / .45, 0, 1), s2 = U.clamp((u - .45) / .4, 0, 1);
    if (u < .45) { const x = U.lerp(x0 + 80, ma - 40, s1); drawBead(speciesFor('Z4', 3), x, yT, 15); Draw.text('1 + 2 = 3', x, yT - 30, { size: 15, color: PAL.ochre }); }
    else { const x = U.lerp(ma + 40, x1 - 30, s2); drawBead(speciesFor('Z2', 1), x, yT, 15); }
    if (u < .45) { const x = U.lerp(x0 + 80, ma - 40, s1); drawBead(speciesFor('Z4', 1), x - 14, yB, 13); drawBead(speciesFor('Z4', 2), x + 14, yB, 13); }
    else { const x = U.lerp(ma + 40, x1 - 30, s2); if (s2 < .5) { drawBead(speciesFor('Z2', 1), x - 14, yB, 13); drawBead(speciesFor('Z2', 0), x + 14, yB, 13); } else { drawBead(speciesFor('Z2', 1), x, yB, 15); Draw.text('1 + 0 = 1', x, yB - 30, { size: 15, color: PAL.plum }); } }
    const done = u > .88;
    Draw.curve([[x1, yT], [w - 300, yT], [w - 270, h / 2 - 20]], 3, PAL.ochre, [6, 6]); Draw.curve([[x1, yB], [w - 130, yB], [w - 110, h / 2 - 20]], 3, PAL.plum, [6, 6]);
    Scenery.balance(w - 190, h / 2 - 60, done ? 0 : Math.sin(t * 3) * .12, done ? speciesFor('Z2', 1) : null, done ? speciesFor('Z2', 1) : null);
    if (done) sfx('¡CLIC!', w - 190, h / 2 - 120, 30, -.1, PAL.good, (u - .88) * 8);
  }
  function vAlarm(w, h, t, A) {
    Scenery.night(0, 0, w, h, t, { seed: 8, low: '#5a2840' });
    if (!Clock.reduced && (t % 2.6) < .12) { ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(0, 0, w, h); }
    Draw.curve([[w * .7, 0], [w * .62, 80], [w * .72, 130], [w * .6, 230]], 4, '#fff6c8');
    ctx.fillStyle = '#2a2238'; ctx.beginPath(); ctx.moveTo(0, h); ctx.lineTo(0, h - 130); for (let x = 0; x <= w; x += 40) ctx.lineTo(x, h - 124 + Math.sin(x * .02) * 6); ctx.lineTo(w, h); ctx.fill();
    Scenery.factory(w / 2, h - 120, .66, t, false, { seed: 7, tank: false });
    // baliza roja que barre
    const bx = w / 2 - 20, by = h - 330, a = t * 3;
    ctx.save(); ctx.globalAlpha = .28; ctx.fillStyle = '#ff4a3a'; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + Math.cos(a - .25) * 900, by + Math.sin(a - .25) * 900); ctx.lineTo(bx + Math.cos(a + .25) * 900, by + Math.sin(a + .25) * 900); ctx.fill(); ctx.restore();
    Deco.glow(bx, by, 40, 'rgba(255,80,60,A)', .9); Draw.ellipse(bx, by, 13, 13, '#ff5a3a', 3, 8400);
    // tubería rota con vapor
    Draw.curve([[0, h - 90], [w * .22, h - 90]], 18, PAL.ink); Draw.curve([[0, h - 90], [w * .22, h - 90]], 11, '#7a7f9f');
    Deco.smoke(w * .22 + 8, h - 90, t, { n: 8, h: 160, r: 12, a: .55, rate: .9, wind: 1.2, rgb: '230,226,236' });
    for (let k = 0; k < 6; k++) { const sp = (t * 2 + k / 6) % 1; Draw.ellipse(w * .6 + Math.cos(k) * sp * 80, h - 160 - sp * 60 + sp * sp * 120, 2.5, 2.5, '#ffd56a', 0, 8410 + k); }
    sfx('¡CRAAAC!', w / 2, 120, 44, -.12, '#ffd56a', t - .2, { burstCol: '#d9473a' });
    sfx('¡UIIIU!', w - 90, h - 300, 22, .2, PAL.bone, t - .7, { burst: false });
  }
  function vBroken(w, h, t, A) {
    ctx.fillStyle = '#e3c3a0'; ctx.fillRect(0, 0, w, h); speed(w * .35, h / 2 + 30, w, h, t, .14); tone(w, h, .08);
    Scenery.machine(w * .34, h / 2 + 50, .62, 'broken', t);
    Scenery.balance(w * .78, 70, .32 + Math.sin(t * 8) * .04, speciesFor('Z2', 0), speciesFor('Z2', 1));
    const c = cast.z4[2]; c.x = w * .62; c.y = h - 46; c.s = 1; c.shake = .5; setExpr(c, 'angry', 9); drawCritter(c);
    A.angry = { x: c.x, y: c.y - 70 };
    sfx('¡CLONK!', w * .25, 90, 28, -.2, PAL.c2, t - .3, { every: 1.4 });
  }
  function vOperator(w, h, t, A) {
    ctx.fillStyle = '#d9b48c'; ctx.fillRect(0, 0, w, h); tone(w, h, .09);
    Scenery.machine(w * .66, h / 2 + 50, .56, 'broken', t);
    for (let k = 0; k < 4; k++) Draw.line(w * .66 - 70 + k * 40, h / 2 - 20, w * .66 - 40 + k * 40, h / 2 + 70, 7, 7800 + k, '#e9d9a6');
    op.x = w * .26; op.y = h / 2 + 40; op.tool = 'hammer'; op.toolT = (t % 1); op.expr = 'panic'; drawOperario(op, 6);
    A.op = { x: op.x + 20, y: op.y - 60 };
    sfx('¡BONK!', w * .47, h / 2 - 40, 30, .2, PAL.mustard, t - .2, { every: .9 });
    // tornillos que saltan
    for (let k = 0; k < 3; k++) { const s = (t * .9 + k * .33) % 1; Draw.ellipse(w * .56 + s * 90 + k * 10, h / 2 - 20 - Math.sin(s * Math.PI) * 80, 4, 4, '#8a8396', 1.5, 8500 + k); }
  }
  function vOffice(w, h, t, A) {
    ctx.fillStyle = '#d9c09d'; ctx.fillRect(0, 0, w, h); Deco.wallpaper(0, 0, w, h - 100, '#5e3a1c');
    // archivadores y ventana nocturna
    for (let k = 0; k < 3; k++) { Draw.rrect(40 + k * 92, h - 290, 84, 200, 4, '#9ea3c6', 3, 8600 + k); for (let d = 0; d < 3; d++) { Draw.rrect(50 + k * 92, h - 278 + d * 64, 64, 54, 3, '#c7c9df', 2, 8610 + k * 3 + d); Draw.line(70 + k * 92, h - 254 + d * 64, 94 + k * 92, h - 254 + d * 64, 3, 8620); } }
    Draw.rrect(w - 300, 60, 200, 150, 4, '#2b2747', 4, 8630); Deco.stars(w - 296, 64, 192, 142, t, 14, 3); Draw.line(w - 200, 60, w - 200, 210, 3, 8631); Draw.line(w - 300, 135, w - 100, 135, 3, 8632);
    Deco.clock(w * .5, 80, 34, t * 30);
    Deco.lamp(w * .62, 0, 60, t, { reach: 260, spread: 120, a: .25 });
    ctx.fillStyle = '#b48659'; ctx.fillRect(0, h - 90, w, 90);
    // mesa y montaña de formularios que crece
    const n = Clock.reduced ? 10 : 6 + Math.floor((t * 1.5) % 9);
    Draw.rrect(w * .5 - 40, h - 130, 460, 26, 4, '#8d5a2f', 3, 7910); Draw.line(w * .5, h - 104, w * .5, h - 20, 5, 7911); Draw.line(w * .5 + 380, h - 104, w * .5 + 380, h - 20, 5, 7912);
    for (let k = 0; k < n; k++) Draw.rrect(w * .5 + 150 + Math.sin(k * 1.7) * 8, h - 146 - k * 13, 150, 12, 2, PAL.bone, 1.5, 7900 + k);
    Draw.rrect(w * .5 + 310, h - 176, 90, 46, 3, PAL.bone, 2, 7913); Draw.text('URGENTE', w * .5 + 355, h - 153, { size: 13, font: FONT.plate, color: PAL.bad });
    enc.x = w * .38; enc.y = h - 30; enc.face = 1; enc.talk = 1; const st = (t % 1.6); enc.stamp = st < .5 ? 1 - st * 2 : 0; drawEncargado(enc);
    A.enc = { x: enc.x + 10, y: enc.y - 150 };
    sfx('¡PLAF!', w * .38 + 130, h - 210, 26, -.15, PAL.bad, (t % 1.6) - .05, { every: 1.6 });
    ctx.save(); ctx.translate(w * .5 + 230, h - 282); ctx.rotate(-.05); Draw.rrect(-150, -18, 300, 36, 4, PAL.bone, 2.5, 7921); Draw.text('FORMULARIO 27-B: PETICIÓN DE TÉCNICO', 0, 0, { size: 13.5, font: FONT.plate }); ctx.restore();
  }
  function vDoor(w, h, t, A) {
    ctx.fillStyle = '#211c33'; ctx.fillRect(0, 0, w, h);
    const open = Clock.reduced ? 1 : Ease.out(U.clamp(t / 1.4, 0, 1));
    Deco.glow(w / 2, h / 2, 330 * (.4 + open * .6), 'rgba(255,226,140,A)', .75);
    // luz que entra por el suelo
    ctx.save(); ctx.globalAlpha = .55 * open; ctx.fillStyle = '#ffe6a6'; ctx.beginPath(); ctx.moveTo(w / 2 - 90, h - 24); ctx.lineTo(w / 2 + 90, h - 24); ctx.lineTo(w / 2 + 240, h); ctx.lineTo(w / 2 - 240, h); ctx.fill(); ctx.restore();
    Draw.rrect(w / 2 - 90, 40, 180, h - 64, 4, '#ffe6a6', 3, 7920);
    // sombra alargada del técnico (tú)
    ctx.save(); ctx.globalAlpha = .75 * open; ctx.fillStyle = '#211c33'; ctx.beginPath(); ctx.ellipse(w / 2, 120, 24, 28, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.moveTo(w / 2 - 44, 160); ctx.lineTo(w / 2 + 44, 160); ctx.lineTo(w / 2 + 34, h - 30); ctx.lineTo(w / 2 - 34, h - 30); ctx.fill(); ctx.restore();
    Deco.poly([[w / 2 - 90, 40], [w / 2 - 90 - 70 * open, 70], [w / 2 - 90 - 70 * open, h - 10], [w / 2 - 90, h - 24]], '#6b4a5c', 3); Draw.ellipse(w / 2 - 90 - 58 * open, h / 2, 5, 5, PAL.mustard, 1.5, 7932);
    Draw.rrect(w / 2 - 150, h - 112, 110, 62, 6, PAL.bad, 3, 7930); Draw.rrect(w / 2 - 115, h - 126, 40, 16, 4, null, 3, 7931); Draw.text('herramientas', w / 2 - 95, h - 80, { size: 13, color: PAL.bone });
    ctx.save(); ctx.translate(w / 2 + 120, h - 140); ctx.rotate(.1); Draw.rrect(-38, -50, 76, 100, 4, '#c7a36b', 2.5, 7940); Draw.rrect(-31, -40, 62, 84, 2, PAL.bone, 1.5, 7941); Draw.text('ORDEN', 0, -20, { size: 12, font: FONT.plate }); Draw.text('Nº 1', 0, 0, { size: 14, font: FONT.plate }); Draw.text('(urgente)', 0, 22, { size: 12, color: PAL.bad }); ctx.restore();
    sfx('ñiiic…', w / 2 + 140, 80, 20, .1, PAL.bone, t - .2, { burst: false });
  }
  function vMap(w, h, t, A) {
    ctx.fillStyle = PAL.paper; ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = .15; for (let x = 0; x < w; x += 30) Draw.line(x, 0, x, h, 1, 7950 + x, PAL.ultra); for (let y = 0; y < h; y += 30) Draw.line(0, y, w, y, 1, 7951 + y, PAL.ultra); ctx.globalAlpha = 1;
    const pts = []; for (let i = 0; i < 8; i++) pts.push([70 + i * (w - 140) / 7, h / 2 + 40 + Math.sin(i * 1.1) * 60]);
    Draw.curve(pts, 22, '#b8ab92');
    for (let i = 0; i < pts.length - 1; i++) for (let s = 0; s < 1; s += .2) { const q = polyAt([pts[i], pts[i + 1]], s); Draw.line(q.x, q.y - 9, q.x + 2, q.y + 9, 3, 7955, '#6b4a2e'); }
    [-5, 5].forEach(o => Draw.curve(pts.map(p => [p[0], p[1] + o]), 2.5, '#5b6170'));
    pts.forEach((p, i) => { Draw.ellipse(p[0], p[1] - 46, 22, 22, i ? '#d8d2c8' : '#ffe7a3', 3, 7960 + i); Draw.line(p[0], p[1] - 24, p[0], p[1] - 8, 3, 7961); Draw.text(String(i + 1), p[0], p[1] - 45, { size: 20, font: FONT.title }); if (i) { Draw.rrect(p[0] + 8, p[1] - 70, 14, 12, 2, PAL.mustardDeep, 2, 7970 + i); } });
    const u = Clock.reduced ? 0 : (Math.sin(t * .8) * .5 + .5) * .9, q = polyAt(pts.slice(0, 2), u);
    Draw.rrect(q.x - 18, q.y - 18, 36, 14, 3, PAL.mustard, 2, 7980); drawBead(speciesFor('Z4', 1), q.x - 7, q.y - 24, 6); drawBead(speciesFor('Z4', 3), q.x + 7, q.y - 24, 6);
    const b = Math.sin(t * 4) * 6; Draw.shape([[pts[0][0] - 10, pts[0][1] - 96 + b], [pts[0][0] + 10, pts[0][1] - 96 + b], [pts[0][0], pts[0][1] - 80 + b]], PAL.bad, 2.5);
    Draw.text('8 máquinas', w - 100, h - 34, { size: 22, font: FONT.title, color: PAL.plum });
  }

  // Páginas: layout + viñetas. bal: globos {at, text, dx, dy, shout}
  const INTRO = [
    { layout: 'cover', panels: [{ draw: vCover, bal: [{ at: 'crit', text: '¡Ocho máquinas rotas! ¡Un técnico novato!', dx: 120, dy: -110 }] }] },
    { layout: 'w2', panels: [
      { snd: 'hum', cap: 'Entre los mundos flotantes hay una fábrica. Su trabajo: llevar a los habitantes de un mundo a otro.', draw: vExterior },
      { snd: 'pop', cap: 'En el reloj de 4 sus habitantes se combinan sumando… y al pasar del 4 se da la vuelta.', draw: vClock, bal: [{ at: 'three', text: '¡1 + 2 = 3! ¡Yo!', dx: -40, dy: -70 }], capBottom: false },
      { snd: 'glass', cap: 'Otros mundos tienen reglas muy distintas.', draw: vKlein, bal: [{ at: 'e', text: 'a ∘ a = e. ¡Siempre!', dx: -120, dy: -80 }] },
    ] },
    { layout: '2w', panels: [
      { snd: 'transform', cap: 'Una máquina traduce: a cada habitante de aquí le asigna uno de allí.', draw: vTranslate },
      { snd: 'bell', cap: 'Pero no vale cualquier traducción: tiene que respetar cómo se combina cada mundo.', draw: vRule, bal: [{ at: 'op', text: '¡Esto es lo que revisamos!', dx: 30, dy: -90 }] },
      { snd: 'clickin', cap: 'Regla de oro: combinar y luego traducir (▲) da lo mismo que traducir y luego combinar (●). Con TODAS las parejas.', draw: vRoutes },
    ] },
    { layout: 'l3', panels: [
      { snd: 'crack', cap: 'Esta noche, algo se ha roto.', draw: vAlarm },
      { snd: 'collide', cap: 'Las dos rutas ya no llegan al mismo sitio.', draw: vBroken, bal: [{ at: 'angry', text: '¡Esto no suma!', dx: 70, dy: -60, shout: true }] },
      { snd: 'thud', cap: 'El operario lo intenta a su manera.', draw: vOperator, bal: [{ at: 'op', text: '¡Lo arreglo yo! Martillo y cinta.', dx: 60, dy: -90 }] },
    ] },
    { layout: 'w2', panels: [
      { snd: 'press', cap: 'Y el encargado sólo sabe rellenar formularios.', draw: vOffice, bal: [{ at: 'enc', text: 'Necesitamos un técnico de mantenimiento algebraico. Urgente.', dx: -230, dy: -40 }] },
      { snd: 'servo', cap: 'Ese técnico eres tú.', draw: vDoor },
      { snd: 'bell', cap: 'Ocho máquinas averiadas. No adivines: observa, prueba y compara las rutas.', draw: vMap, last: true },
    ] },
  ];
  // caja de herramientas para los cómics de cada máquina (src/comics.js)
  const K = { ctx, cast, enc, op, sfx, tone, rays, speed, polyAt, Scenery,
    crit(i, sp, s) { const c = makeCritter('src', i, 0, 0, sp); c.s = s || 1; extra.push(c); return c; },
    claw: makeClaw(60, 0), shred: makeShredder(0, 0), asm: makeAssembler() };
  const LC = ID !== 'intro' && window.LEVEL_COMICS && window.LEVEL_COMICS[ID];
  const PAGES = LC ? LC.pages(K) : INTRO;
  function area() { const ox = App.view.ox, L = -ox + 40, R = 1600 + ox - 40; return LC ? { L, R, w: R - L, top: 84, h: 746 } : { L, R, w: R - L, top: 30, h: 800 }; }
  function layout(kind) {
    const a = area(), g = 26, L = a.L, w = a.w, top = a.top, h = a.h;
    if (kind === 'cover') { const cw = Math.min(700, w); return [{ x: L + (w - cw) / 2, y: top, w: cw, h, rot: -.012 }]; }
    if (kind === 'w2') return [{ x: L, y: top, w, h: 400, rot: -.004 }, { x: L, y: top + 400 + g, w: w / 2 - g / 2, h: h - 400 - g, rot: .006 }, { x: L + w / 2 + g / 2, y: top + 400 + g, w: w / 2 - g / 2, h: h - 400 - g, rot: -.005 }];
    if (kind === '2w') return [{ x: L, y: top, w: w / 2 - g / 2, h: 360, rot: .005 }, { x: L + w / 2 + g / 2, y: top, w: w / 2 - g / 2, h: 360, rot: -.006 }, { x: L, y: top + 360 + g, w, h: h - 360 - g, rot: .003 }];
    if (kind === 'l3') { const lw = w * .44; return [{ x: L, y: top, w: lw, h, rot: -.006 }, { x: L + lw + g, y: top, w: w - lw - g, h: h / 2 - g / 2, rot: .005 }, { x: L + lw + g, y: top + h / 2 + g / 2, w: w - lw - g, h: h / 2 - g / 2, rot: -.004 }]; }
  }
  function next() {
    flipT = 0;
    const ping = pn => { if (pn && pn.snd) setTimeout(() => Sound.fam(pn.snd, { vol: .6 }), 260); };
    if (shown < PAGES[page].panels.length) { shown++; revealAt[page + '.' + (shown - 1)] = T; Sound.fam('slide'); ping(PAGES[page].panels[shown - 1]); return; }
    if (page < PAGES.length - 1) { flipFrom = page; flipDir = 1; page++; shown = 1; revealAt[page + '.0'] = T + .25; flipT = 1; Sound.whoosh(); ping(PAGES[page].panels[0]); return; }
    finish();
  }
  function prev() { if (shown > 1) shown--; else if (page > 0) { flipFrom = page; flipDir = -1; page--; shown = PAGES[page].panels.length; flipT = 1; } }
  function finish() { if (LC) { App.save.comics = App.save.comics || {}; App.save.comics[ID] = true; App.persist(); App.goto(ID); return; } App.save.comicSeen = true; App.persist(); App.goto('map'); }
  function skipRect() { return { x: 1600 + App.view.ox - 180 - 90, y: 846, w: 170, h: 38 }; }
  function nextRect() { return { x: 1600 + App.view.ox - 180 - 300, y: 846, w: 200, h: 38 }; }
  function backRect() { return { x: 1600 + App.view.ox - 180 - 430, y: 846, w: 116, h: 38 }; }
  const inside = (p, o) => p.x >= o.x && p.x <= o.x + o.w && p.y >= o.y && p.y <= o.y + o.h;
  revealAt['0.0'] = 0;

  function drawPage(pi, nShown, alphaMul) {
    const P = PAGES[pi], rs = layout(P.layout);
    P.panels.forEach((pn, i) => {
      const r = rs[i], vis = i < nShown;
      ctx.save(); ctx.translate(r.x + r.w / 2, r.y + r.h / 2); ctx.rotate(r.rot || 0); ctx.translate(-r.x - r.w / 2, -r.y - r.h / 2);
      Draw.rrect(r.x + 7, r.y + 9, r.w, r.h, 3, 'rgba(33,28,51,.32)', 0, 8000 + i);
      if (!vis) { Draw.rrect(r.x, r.y, r.w, r.h, 3, '#b48f68', 2.5, 8010 + i); Draw.text('?', r.x + r.w / 2, r.y + r.h / 2, { size: 60, font: FONT.title, color: '#9a7756' }); ctx.restore(); return; }
      const t0 = revealAt[pi + '.' + i] === undefined ? -10 : revealAt[pi + '.' + i], lt = Math.max(0, T - t0);
      const e = Clock.reduced ? 1 : Ease.out(U.clamp(lt / .45, 0, 1));
      ctx.globalAlpha = e * alphaMul;
      ctx.translate(r.x + r.w / 2, r.y + r.h / 2); ctx.scale(.94 + .06 * e, .94 + .06 * e); ctx.translate(-r.x - r.w / 2, -r.y - r.h / 2);
      Draw.rrect(r.x - 4, r.y - 4, r.w + 8, r.h + 8, 4, PAL.bone, 0, 8015 + i);
      ctx.save(); ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip(); ctx.translate(r.x, r.y);
      const A = {}; pn.draw(r.w, r.h, lt, A);
      // globos (en coordenadas de la viñeta)
      (pn.bal || []).forEach((b, k) => { const a = A[b.at]; if (!a || lt < .5 + k * .4) return; const bx = U.clamp(a.x + (b.dx || 0), 140, r.w - 140), capH = pn.cap ? App.wrap(pn.cap, Math.min(r.w - 70, 720), 21).length * 26 + 30 : 0, by = U.clamp(a.y + (b.dy || -100), Math.max(90, capH + 52), r.h - 60); ctx.save(); ctx.globalAlpha *= Math.min(1, (lt - .5 - k * .4) * 4); balloon(b.text, bx, by, a.x, a.y, { shout: b.shout, w: b.w }); ctx.restore(); });
      ctx.restore();
      Draw.rrect(r.x, r.y, r.w, r.h, 3, null, 4.5, 8020 + i);
      if (pn.cap) {
        const size = 21, lines = App.wrap(pn.cap, Math.min(r.w - 70, 720), size);
        const cw = Math.max(...lines.map(l => Draw.textWidth(l, size, FONT.hand))) + 32, chh = lines.length * 26 + 18;
        Draw.rrect(r.x + 16, r.y + 16, cw, chh, 2, 'rgba(33,28,51,.25)', 0, 8029 + i);
        Draw.rrect(r.x + 12, r.y + 12, cw, chh, 2, '#f6e27a', 2.5, 8030 + i);
        lines.forEach((l, k) => Draw.text(l, r.x + 28, r.y + 33 + k * 26, { size, align: 'left' }));
      }
      ctx.restore();
    });
  }
  return {
    bg: '#a8805c',
    music: 'comic',
    enter() { window.__COMIC = this; },
    update(dt) { T += dt; flipT = Math.max(0, flipT - dt * (Clock.reduced ? 10 : 2.4)); [...cast.z4, ...cast.v4, ...cast.z2, cast.ghost, ...extra].forEach(c => stepCritter(c, dt)); updateOperario(op, dt); updateEncargado(enc, dt); updateShredder(K.shred, dt); updateAssembler(K.asm, dt); },
    render() {
      const ox = App.view.ox, oy = App.view.oy;
      // mesa de dibujo: madera con vetas
      ctx.fillStyle = '#a8805c'; ctx.fillRect(-ox, -oy, 1600 + 2 * ox, 900 + 2 * oy);
      ctx.save(); ctx.globalAlpha = .12; for (let y = -oy; y < 900 + oy; y += 18) Draw.curve([[-ox, y], [400, y + Math.sin(y) * 6], [1200, y - 4], [1600 + ox, y + 3]], 1.5, '#4a2c16'); ctx.restore();
      if (App.grain) { ctx.fillStyle = App.grain; ctx.fillRect(-ox, -oy, 1600 + 2 * ox, 900 + 2 * oy); }
      // página de cómic (papel)
      const a = area();
      const e = Ease.inOut(flipT);
      if (flipT > 0 && flipFrom >= 0) {
        ctx.save(); ctx.translate(-flipDir * e * 0, 0); drawPage(page, shown, 1 - e); ctx.restore();
        ctx.save(); ctx.translate(800 - flipDir * (1 - e) * 1900, 450); ctx.rotate(-flipDir * (1 - e) * .25); ctx.translate(-800, -450); drawPage(flipFrom, PAGES[flipFrom].panels.length, 1); ctx.restore();
      } else drawPage(page, shown, 1);
      if (LC) {
        // cabecera del episodio
        ctx.save(); ctx.translate(a.L + a.w / 2, 44); ctx.rotate(-.006);
        Draw.rrect(-a.w / 2, -30, a.w, 56, 4, '#e3a52e', 3, 8750);
        Draw.ellipse(-a.w / 2 + 40, -2, 30, 30, PAL.bone, 3, 8751); Draw.text('Nº', -a.w / 2 + 40, -14, { size: 11, font: FONT.plate }); Draw.text(String(ID), -a.w / 2 + 40, 6, { size: 26, font: FONT.title });
        Draw.text('THE ALGEBRA ENGINE · MÁQUINA ' + ID, -a.w / 2 + 84, -10, { size: 13, font: FONT.plate, align: 'left', spacing: 1.5 });
        Draw.text('«' + LC.title + '»', -a.w / 2 + 84, 12, { size: 26, font: FONT.title, align: 'left', color: PAL.bone, stroke: 6, strokeColor: PAL.ink, jitter: 1, seed: 30 + ID });
        Draw.text(LC.tag || '', a.w / 2 - 20, 0, { size: 18, align: 'right', color: PAL.ink });
        ctx.restore();
      }
      Draw.text(LC ? 'viñeta ' + shown + ' de ' + PAGES[page].panels.length : 'página ' + (page === 0 ? 'portada' : page + ' de ' + (PAGES.length - 1)), a.L, 866, { size: 17, align: 'left', color: PAL.bone });
      // puntos de progreso
      PAGES.forEach((_, i) => Draw.ellipse(a.L + 190 + i * 22, 866, 6, 6, i === page ? PAL.mustard : 'rgba(251,239,220,.4)', 1.5, 8700 + i));
      const nr = nextRect(), sr = skipRect(), br = backRect(), last = page === PAGES.length - 1 && shown === PAGES[page].panels.length;
      if (page > 0 || shown > 1) Kit.plate(br.x, br.y, br.w, br.h, '◂ ATRÁS', { size: 13, focus: hover === 'back' });
      Kit.plate(nr.x, nr.y, nr.w, nr.h, last ? (LC ? '¡A LA MÁQUINA!' : '¡AL TRABAJO!') : 'SIGUIENTE ▸', { size: 15, fill: '#f6dfb8', focus: hover === 'next' });
      Kit.plate(sr.x, sr.y, sr.w, sr.h, 'SALTAR CÓMIC', { size: 13, focus: hover === 'skip' });
    },
    pointerDown(p) { Sound.init(); Music.start(); if (inside(p, skipRect())) { finish(); return; } if ((page > 0 || shown > 1) && inside(p, backRect())) { prev(); return; } next(); },
    pointerMove(p) { hover = inside(p, skipRect()) ? 'skip' : inside(p, nextRect()) ? 'next' : inside(p, backRect()) ? 'back' : null; App.setCursor('pointer'); },
    pointerUp() {},
    key(e) {
      const k = e.key;
      if (k === 'Escape') { finish(); return true; }
      if (k === 'ArrowLeft' || k === 'Backspace') { prev(); return true; }
      next(); const P = PAGES[page].panels.slice(0, shown); App.announce(P.map(p => (p.cap || '') + ' ' + (p.bal || []).map(b => '«' + b.text + '»').join(' ')).join(' ')); return true;
    },
    debug: () => ({ id: ID, page, shown, pages: PAGES.length, panels: PAGES.reduce((a, p) => a + p.panels.length, 0), finish }),
  };
};
