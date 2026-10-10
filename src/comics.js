/* THE ALGEBRA ENGINE — un cómic corto por máquina (iteración 6).
 * Cada cómic presenta el problema de la máquina con sus personajes antes de entrar en ella.
 * pages(K) recibe la caja de herramientas del motor de cómics (title.js): ctx, cast, enc, op, sfx, tone, rays,
 * speed, polyAt, Scenery, crit(), claw, shred, asm. Cada viñeta: draw(w, h, t, A) y A guarda los anclajes de los globos. */
'use strict';
window.LEVEL_COMICS = (function () {
  const C = {};
  const bg = (ctx, col, w, h) => { ctx.fillStyle = col; ctx.fillRect(0, 0, w, h); };
  const ring = (K, cx, cy, rx, ry, list, t, hop) => list.forEach((c, i) => { const a = -Math.PI / 2 + i * Math.PI * 2 / list.length; c.x = cx + Math.cos(a) * rx; c.y = cy + Math.sin(a) * ry; c.hop = hop ? Math.abs(Math.sin(t * 5 + i)) * hop : 0; drawCritter(c); });
  const label = (text, x, y, o) => { o = o || {}; const w = Draw.textWidth(text, o.size || 16, FONT.plate) + 24; Draw.rrect(x - w / 2, y - 15, w, 30, 4, o.fill || PAL.bone, 2, 9000 + x, o.stroke); Draw.text(text, x, y, { size: o.size || 16, font: FONT.plate, color: o.color || PAL.ink }); };

  /* ---------- 1 · La máquina que se comió el cuatro ---------- */
  C[1] = { title: 'La máquina que se comió el cuatro', tag: 'reloj de 4 → reloj de 2', pages: K => {
    const { ctx, cast, sfx, tone, rays } = K;
    return [{ layout: 'w2', panels: [
      { snd: 'hum', cap: 'La traductora lleva a los habitantes del reloj de 4 al reloj de 2. Pero allí sólo hay dos sitios.', draw(w, h, t, A) {
        bg(ctx, '#f2d2ae', w, h); tone(w, h, .08);
        Scenery.island(220, h - 110, 170, PAL.island, PAL.islandDeep, 9101); Scenery.island(w - 220, h - 110, 130, PAL.isle2, PAL.isle2Deep, 9102);
        cast.z4.forEach((c, i) => { c.x = 120 + i * 66; c.y = h - 120; c.s = .8; c.hop = 0; drawCritter(c); });
        cast.z2.forEach((c, i) => { c.x = w - 270 + i * 100; c.y = h - 120; c.s = .85; drawCritter(c); });
        Scenery.machine(w / 2, h / 2 + 40, .9, 'ok', t);
        // la barriga de la máquina con un «4» dentro
        Draw.ellipse(w / 2, h / 2 + 20, 46, 34, '#2a2236', 3, 9103); Draw.text('4', w / 2, h / 2 + 22, { size: 34, font: FONT.title, color: PAL.mustard, jitter: 1, seed: 9 });
        Draw.text('¡ñam!', w / 2 + 120, h / 2 - 90, { size: 22, font: FONT.title, color: PAL.plum });
        A.z2 = { x: w - 220, y: h - 180 };
        label('RELOJ DE 4', 220, h - 30); label('RELOJ DE 2', w - 220, h - 30);
      }, bal: [{ at: 'z2', text: '¿Sólo dos casas para cuatro inquilinos?', dx: -160, dy: -110 }] },
      { snd: 'pop', cap: 'Habrá que repartirlos… sin romper las sumas.', draw(w, h, t, A) {
        bg(ctx, '#ead9c2', w, h); tone(w, h, .09);
        const op = K.op; op.x = 150; op.y = h / 2 + 60; op.expr = 'thinking'; op.exprT = 1; drawOperario(op, 10);
        A.op = { x: op.x + 20, y: op.y - 60 };
        // pares → 0, impares → 1
        [[0, 0], [2, 0], [1, 1], [3, 1]].forEach(([x, y], k) => { const sx = 340 + (k % 2) * 70, sy = 120 + Math.floor(k / 2) * 110 + (y ? 0 : 0); drawBead(speciesFor('Z4', x), sx + (k >= 2 ? 0 : 0), 130 + k * 46, 16); Draw.curve([[sx + 30, 130 + k * 46], [w - 200, y ? h - 90 : 150]], 3, SRC_COL[x], [8, 6]); });
        drawBead(speciesFor('Z2', 0), w - 160, 150, 26); drawBead(speciesFor('Z2', 1), w - 160, h - 90, 26);
        Draw.text('pares', w - 90, 150, { size: 18, color: PAL.inkSoft }); Draw.text('impares', w - 80, h - 90, { size: 18, color: PAL.inkSoft });
      }, bal: [{ at: 'op', text: '¿Y si los pares van al 0 y los impares al 1?', dx: 140, dy: -50 }] },
      { snd: 'clickin', cap: 'Una pareja cuadra si las dos rutas llegan al mismo sitio. ¿Cuadrarán las 16?', draw(w, h, t, A) {
        bg(ctx, '#f1d6b0', w, h); rays(w * .62, h * .55, w, h, t, '#fff3c4', .3, 14); tone(w, h, .06);
        Draw.text('▲ 1 + 3 = 0  →  f(0) = 0', 40, 130, { size: 22, color: PAL.ochre, align: 'left' });
        Draw.text('● f(1) + f(3) = 1 + 1 = 0', 40, 170, { size: 22, color: PAL.plum, align: 'left' });
        Scenery.balance(w * .66, h / 2 - 40, 0, speciesFor('Z2', 0), speciesFor('Z2', 0));
        sfx('¡CUADRA!', w * .66, 90, 28, -.08, PAL.good, t - .6);
        for (let k = 0; k < 16; k++) { const done = k < Math.min(16, Math.floor(t * 4)); Draw.rrect(40 + (k % 8) * 34, h - 100 + Math.floor(k / 8) * 34, 28, 28, 3, done ? '#dfe8c8' : PAL.bone, 2, 9110 + k); if (done) Draw.curve([[46 + (k % 8) * 34, h - 86 + Math.floor(k / 8) * 34], [52 + (k % 8) * 34, h - 80 + Math.floor(k / 8) * 34], [62 + (k % 8) * 34, h - 94 + Math.floor(k / 8) * 34]], 2.5, PAL.good); }
        Draw.text('16 parejas', 180, h - 118, { size: 16, color: PAL.inkSoft });
      } },
    ] }];
  } };

  /* ---------- 2 · La garra del núcleo ---------- */
  C[2] = { title: 'La garra del núcleo', tag: 'núcleo y monomorfismo', pages: K => {
    const { ctx, sfx, tone, speed } = K, claw = K.claw;
    return [{ layout: '2w', panels: [
      { snd: 'servo', cap: 'En el taller, la garra revisa quién cae en la bandeja del neutro.', draw(w, h, t, A) {
        bg(ctx, PAL.paper, w, h); tone(w, h, .08);
        claw.railY = 70; claw.x = w / 2 + Math.sin(t * 1.2) * 160; claw.y = 70 + 120 + Math.sin(t * 2) * 10; claw.open = 1; claw.mood = 'search'; drawClaw(claw, 40, w - 40);
        [0, 1, 2, 3].forEach(j => { const x = 130 + j * ((w - 260) / 3); Draw.shape([[x - 60, h - 110], [x + 60, h - 110], [x + 50, h - 40], [x - 50, h - 40]], j ? '#c7c2a8' : '#cdb8d9', 3); drawBead(speciesFor('Z4', j), x, h - 60, 13); if (!j) Draw.text('NEUTRO', x, h - 20, { size: 12, font: FONT.plate, color: PAL.plum }); });
        A.claw = { x: claw.x + 30, y: claw.y - 40 };
      }, bal: [{ at: 'claw', text: 'Mi trabajo: mirar quién acaba en el 0.', dx: 170, dy: -20 }] },
      { snd: 'collide', cap: 'Si dos caen en el neutro, la máquina ya no sabe distinguirlos.', draw(w, h, t, A) {
        bg(ctx, '#e8cfa8', w, h); speed(w / 2, h / 2 + 40, w, h, t, .15); tone(w, h, .08);
        const x = w / 2; Draw.shape([[x - 110, h - 140], [x + 110, h - 140], [x + 90, h - 30], [x - 90, h - 30]], '#cdb8d9', 3.5); Draw.text('NEUTRO', x, h - 50, { size: 14, font: FONT.plate, color: PAL.plum });
        const a = K.cast.z4[0], b = K.cast.z4[2]; a.x = x - 46; b.x = x + 46; a.y = b.y = h - 130; a.s = b.s = 1; setExpr(a, 'confused', 9); setExpr(b, 'angry', 9); drawCritter(a); drawCritter(b);
        A.b = { x: b.x, y: b.y - 70 };
        sfx('¡CLANC!', x + 200, 110, 28, .15, PAL.c2, t - .4);
      }, bal: [{ at: 'b', text: '¡Que yo soy el 2, no el 0!', dx: 140, dy: -50, shout: true }] },
      { snd: 'gear', cap: 'La pista: el 1 manda. Si sabes adónde va el 1, sabes adónde va todo: f(2) = f(1) + f(1).', draw(w, h, t, A) {
        bg(ctx, '#3a3150', w, h);
        const cx = 240, cy = h / 2 + 10, a = t * .6;
        Draw.ellipse(cx, cy, 120, 120, '#e8b23c', 3, 9201); ['0', '1', '2', '3'].forEach((l, j) => { const an = -Math.PI / 2 + j * Math.PI / 2 - a; Draw.text(l, cx + Math.cos(an) * 90, cy + Math.sin(an) * 90, { size: 26, font: FONT.title }); });
        Draw.ellipse(cx, cy, 16, 16, PAL.ink, 0, 9202); Draw.text('¿a dónde va el 1?', cx, 60, { size: 20, color: PAL.bone });
        [[480, 130, 50], [560, 240, 34], [720, 170, 60], [880, 110, 40], [960, 230, 46]].forEach(([x, y, r], k) => Scenery.gear(x, y, r, 8 + k, (k % 2 ? -1 : 1) * t * (120 / r) * .3, k % 2 ? '#6f8436' : '#b97e17'));
        const op = K.op; op.x = w - 150; op.y = h - 100; op.expr = 'cheer'; op.exprT = 1; drawOperario(op, -10);
        A.op = { x: op.x, y: op.y - 70 };
        Draw.text('f(2) = f(1) + f(1)   ·   f(3) = f(2) + f(1)', w / 2 + 120, h - 28, { size: 22, color: '#f6e27a' });
      }, bal: [{ at: 'op', text: '¡Giro la rueda grande y todo la sigue!', dx: -230, dy: -40 }] },
    ] }];
  } };

  /* ---------- 3 · La trituradora de destinos ---------- */
  C[3] = { title: 'La trituradora de destinos', tag: 'imagen y epimorfismo', pages: K => {
    const { ctx, sfx, tone, rays } = K, shred = K.shred;
    return [{ layout: 'w2', panels: [
      { snd: 'hum', cap: 'En la planta, cada contenedor del reloj de 4 cuenta sus visitas. Por la tolva sólo entran el 0 y el 2.', draw(w, h, t, A) {
        bg(ctx, '#e7bf95', w, h); tone(w, h, .08);
        Draw.shape([[150, 120], [330, 120], [270, 200], [210, 200]], '#7c8a4a', 3); Draw.text('TOLVA {0, 2}', 240, 144, { size: 15, font: FONT.plate, color: PAL.bone });
        [0, 1].forEach(k => { const u = ((t * .4 + k * .5) % 1); drawBead(speciesFor('Z4', k * 2), U.lerp(240, 500 + k * 2 * 260, u), U.lerp(200, h - 150, Math.min(1, u * 1.3)), 13); });
        [0, 1, 2, 3].forEach(j => { const x = 500 + j * 260, vis = j % 2 === 0; Draw.shape([[x - 80, h - 140], [x + 80, h - 140], [x + 66, h - 30], [x - 66, h - 30]], '#c7c2a8', 3); drawBead(speciesFor('Z4', j), x - 40, h - 60, 13);
          Draw.rrect(x, h - 120, 56, 38, 4, '#211c33', 2, 9300 + j); Draw.text(vis ? String(1 + Math.floor(t) % 3) : '0', x + 28, h - 101, { size: 22, font: FONT.title, color: vis ? '#b9e08a' : '#f0705f' });
          if (!vis) { ctx.save(); ctx.globalAlpha = .55; for (let k = 0; k < 5; k++) Draw.line(x - 70 + k * 10, h - 140, x - 40 - k * 6, h - 100 + k * 4, 1, 9310 + k, '#ffffff'); ctx.restore(); Draw.text('0 visitas', x, h - 160, { size: 16, color: PAL.bad }); } });
      } },
      { snd: 'shred', cap: 'La trituradora puede quitar los contenedores vacíos…', draw(w, h, t, A) {
        bg(ctx, '#ead9c2', w, h); rays(w * .35, h * .55, w, h, t, '#fff3c4', .25, 12); tone(w, h, .07);
        shred.x = w * .35; shred.y = h / 2 - 50; shred.mood = 'eager'; shred.chew = (t % 1.2) < .4 ? 1 : 0;
        ctx.save(); ctx.translate(shred.x, shred.y); ctx.scale(.85, .85); ctx.translate(-shred.x, -shred.y); drawShredder(shred, shred.x, shred.x); ctx.restore();
        A.shred = { x: shred.x + 40, y: shred.y - 70 };
        sfx('¡ÑAM!', w * .72, h / 2, 34, .12, PAL.olive, (t % 1.2) - .1, { every: 1.2 });
      }, bal: [{ at: 'shred', text: '¡Me los como! ¡Todos! ¿Puedo?', dx: 170, dy: -30, shout: true }] },
      { snd: 'bell', cap: '…pero lo que quede tiene que seguir siendo un grupo: cerrado al sumar y con su neutro.', draw(w, h, t, A) {
        bg(ctx, '#d7d8e8', w, h); tone(w, h, .08);
        const x = 180, y = h / 2 + 60; Draw.rrect(x - 70, y - 90, 140, 170, 14, '#5b6a96', 3.5, 9320); Draw.ellipse(x, y - 30, 28, 28, '#b9e08a', 3, 9321); Draw.text('+', x, y - 29, { size: 30, font: FONT.title }); Draw.text('PROBADOR', x, y + 40, { size: 13, font: FONT.plate, color: PAL.bone });
        A.reg = { x: x + 20, y: y - 90 };
        const lines = ['0 + 0 = 0 ✓', '0 + 2 = 2 ✓', '2 + 2 = 0 ✓', '… ¡cierra!'];
        Draw.rrect(x + 110, y - 90, 260, 180, 3, PAL.bone, 2, 9322);
        lines.slice(0, Math.min(4, 1 + Math.floor(t * 2))).forEach((l, i) => Draw.text(l, x + 130, y - 60 + i * 38, { size: 22, align: 'left', color: PAL.good }));
        label('{0, 2} es un grupo', x + 520, y, { fill: '#dfe8c8' });
      }, bal: [{ at: 'reg', text: '¡ALTO! Primero, el probador.', dx: 470, dy: 0 }] },
    ] }];
  } };

  /* ---------- 4 · El espejo de las identidades ---------- */
  C[4] = { title: 'El espejo de las identidades', tag: 'el neutro va al neutro', pages: K => {
    const { ctx, sfx, tone } = K;
    const m0 = K.crit(0, speciesFor('MIRROR', 0), .95), m1 = K.crit(1, speciesFor('MIRROR', 1), .95);
    return [{ layout: 'l3', panels: [
      { snd: 'glass', cap: 'En el mundo espejo se combina distinto: iguales dan «1», distintos dan «0».', draw(w, h, t, A) {
        const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#d7d8e8'); g.addColorStop(.5, '#eef0fa'); g.addColorStop(.5, PAL.paper); g.addColorStop(1, '#e8c597'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
        ctx.save(); ctx.globalAlpha = .3; for (let k = 0; k < 8; k++) Draw.line(k * 120 - 60, 0, k * 120 + 60, h / 2, 14, 9400 + k, '#ffffff'); ctx.restore();
        Draw.line(0, h / 2, w, h / 2, 6, 9401, '#5d6080');
        const cx = w / 2;
        Draw.ellipse(cx, h / 2 - 130, 120, 150, '#7c3b73', 4, 9402); Draw.ellipse(cx, h / 2 - 130, 100, 130, '#e9ecf8', 3, 9403);
        const c = K.cast.z4[0]; c.x = cx; c.y = h / 2 + 180; c.s = 1.2; setExpr(c, 'surprise', 9); drawCritter(c);
        m1.x = cx; m1.y = h / 2 - 90; m1.s = 1.1; drawCritter(m1);
        A.m = { x: cx + 40, y: h / 2 - 190 };
        Draw.text('aquí: 0 + 0 = 0', cx, h - 40, { size: 20, color: PAL.inkSoft });
        Draw.text('allí: «1» ⊙ «1» = «1»', cx + 270, h / 2 - 60, { size: 18, color: '#3d4170' });
      }, bal: [{ at: 'm', text: '¿Mi reflejo lleva monóculo?', dx: 120, dy: -60 }] },
      { snd: 'bell', cap: 'El neutro de allí no se llama como el de aquí.', draw(w, h, t, A) {
        bg(ctx, '#e4e6f3', w, h); tone(w, h, .08);
        m1.x = 200; m1.y = h / 2 + 80; m1.s = 1.2; drawCritter(m1); A.m1 = { x: m1.x, y: m1.y - 80 };
        m0.x = w - 200; m0.y = h / 2 + 80; m0.s = 1.1; drawCritter(m0);
        Draw.text('«1» ⊙ «0» = «0»', w / 2 + 40, h / 2 + 60, { size: 26, font: FONT.title, color: PAL.plum });
        Draw.text('(combinarse con «1» no cambia a nadie)', w / 2 + 40, h / 2 + 100, { size: 17, color: PAL.inkSoft });
      }, bal: [{ at: 'm1', text: 'Aquí el neutro soy yo: «1».', dx: 170, dy: -50 }] },
      { snd: 'clickin', cap: 'Regla de los espejos: el neutro tiene que reflejarse en el neutro.', draw(w, h, t, A) {
        bg(ctx, PAL.paper, w, h); tone(w, h, .08);
        drawBead(speciesFor('Z4', 0), 160, h / 2 + 30, 30); Draw.curve([[200, h / 2 + 30], [w / 2, h / 2 - 30], [w - 210, h / 2 + 30]], 6, PAL.ultra, [12, 8]); drawBead(speciesFor('MIRROR', 1), w - 170, h / 2 + 30, 30);
        Draw.text('f(0) = «1»', w / 2, h / 2 + 90, { size: 32, font: FONT.title, color: PAL.ultra });
        const op = K.op; op.x = 110; op.y = h - 80; op.expr = 'cheer'; op.exprT = 1; drawOperario(op, 8);
        sfx('¡APUNTADO!', w - 170, 120, 22, .1, PAL.good, t - .5);
      } },
    ] }];
  } };

  /* ---------- 5 · La fábrica de copias ---------- */
  C[5] = { title: 'La fábrica de copias', tag: 'choques ≠ vacíos', pages: K => {
    const { ctx, sfx, tone, speed } = K;
    const copier = (x, y, col, l, t, mood) => { Draw.rrect(x - 70, y - 50, 140, 100, 14, col, 3, 9500 + x); Draw.ellipse(x - 26, y - 6, 9, mood === 'x' ? 4 : 9, PAL.bone, 2, 9501 + x); Draw.ellipse(x + 26, y - 6, 9, mood === 'x' ? 4 : 9, PAL.bone, 2, 9502 + x); Draw.ellipse(x - 26, y - 4, 3.5, 3.5, PAL.ink, 0, 9503); Draw.ellipse(x + 26, y - 4, 3.5, 3.5, PAL.ink, 0, 9504); Draw.curve([[x - 14, y + 20], [x, y + (mood === 'ok' ? 30 : 14)], [x + 14, y + 20]], 3, PAL.ink); Draw.text(l, x - 50, y - 34, { size: 20, font: FONT.title }); Draw.ellipse(x - 44, y + 54, 12, 12, PAL.ink, 0, 9505); Draw.ellipse(x + 44, y + 54, 12, 12, PAL.ink, 0, 9506); };
    return [{ layout: 'w2', panels: [
      { snd: 'press', cap: 'Cuatro copiadoras. Cada una tiene una avería distinta… o ninguna.', draw(w, h, t, A) {
        bg(ctx, '#e8c597', w, h); tone(w, h, .07);
        Draw.rrect(40, h - 110, w - 80, 22, 11, '#4b4536', 3, 9510);
        ['A', 'B', 'C', 'D'].forEach((l, i) => copier(220 + i * (w - 440) / 3, h - 190 + Math.sin(t * 3 + i) * 4, [PAL.mustard, '#cfa148', '#b98c34', '#86a04a'][i], l, t, i === 3 ? 'ok' : 'x'));
        A.d = { x: 220 + 3 * (w - 440) / 3, y: h - 260 };
      }, bal: [{ at: 'd', text: 'Yo estoy perfecta. Creo.', dx: -60, dy: -70 }] },
      { snd: 'collide', cap: 'Si dos copias caen en el mismo casillero, es un CHOQUE. Si un casillero queda sin nadie, es un VACÍO.', draw(w, h, t, A) {
        bg(ctx, '#ead9c2', w, h); speed(w * .3, h / 2, w, h, t, .1); tone(w, h, .07);
        [0, 1, 2, 3].forEach(j => { const x = 120 + j * 160; Draw.rrect(x - 60, 112, 120, 132, 6, PAL.bone, 2.5, 9520 + j); });
        drawBead(speciesFor('Z4', 1), 280 - 20, 180, 18); drawBead(speciesFor('Z4', 3), 280 + 20, 180, 18); sfx('¡CHOQUE!', 280, 262, 17, -.1, PAL.bad, t - .3);
        // farolero con bandera en el vacío
        const fx = 600; Draw.line(fx, 240, fx, 126, 3, 9530); Draw.shape([[fx, 126], [fx + 40, 138 + Math.sin(t * 4) * 4], [fx, 150]], PAL.bad, 2); sfx('¡VACÍO!', fx, 262, 17, .08, '#e3a52e', t - .8);
        Draw.text('no inyectiva', 280, h - 12, { size: 18, color: PAL.inkSoft }); Draw.text('no sobreyectiva', 600, h - 12, { size: 18, color: PAL.inkSoft });
      } },
      { snd: 'bell', cap: 'Tu trabajo: probar cada una y mandarla a su taller. Con pruebas.', draw(w, h, t, A) {
        bg(ctx, '#c99064', w, h); tone(w, h, .08);
        ['CHOQUES', 'VACÍOS', 'SUMAS', 'APTO'].forEach((n, i) => { const x = 250 + i * ((w - 340) / 3); Draw.rrect(x - 66, 120, 132, 120, 6, '#8d5a2f', 3, 9540 + i); Draw.rrect(x - 54, 146, 108, 84, 3, '#2a2236', 2, 9541 + i); label(n, x, 120, { size: 12 }); });
        const e = K.enc; e.x = 80; e.y = h - 10; e.face = 1; e.talk = 1; drawEncargado(e); A.enc = { x: e.x + 30, y: e.y - 160 };
      }, bal: [{ at: 'enc', text: 'Cada copiadora, a su taller. Y firme el parte.', dx: 260, dy: 110 }] },
    ] }];
  } };

  /* ---------- 6 · El ensamblador reversible ---------- */
  C[6] = { title: 'El ensamblador reversible', tag: 'isomorfismo: ida y vuelta', pages: K => {
    const { ctx, sfx, tone } = K, asm = K.asm;
    return [{ layout: 'l3', panels: [
      { snd: 'hum', cap: 'Una torre de ascensores. Abajo se SUMA (reloj de 4). Arriba se MULTIPLICA (módulo 5).', draw(w, h, t, A) {
        bg(ctx, '#e5c29a', w, h); ctx.fillStyle = '#c7c9df'; ctx.fillRect(0, 0, w, 200); tone(w, h, .07);
        for (let y = 230; y < h - 60; y += 46) for (let x = (y / 46) % 2 ? 0 : 30; x < w; x += 60) Draw.rrect(x + 3, y + 3, 54, 40, 3, null, 1, 9600 + x + y, 'rgba(33,28,51,.1)');
        [0, 1, 2, 3].forEach(j => { const x = 100 + j * (w - 200) / 3; Draw.rrect(x - 40, 200, 80, h - 260, 4, 'rgba(120,90,70,.3)', 2.5, 9610 + j); const u = (Math.sin(t * .8 + j) * .5 + .5); const cy = U.lerp(h - 120, 220, u); Draw.rrect(x - 32, cy, 64, 60, 4, PAL.mustard, 2.5, 9620 + j); drawBead(u > .5 ? speciesFor('U5', j) : speciesFor('Z4', j), x, cy + 30, 16); });
        Draw.text('ARRIBA: ×  (módulo 5)', w / 2, 60, { size: 22, color: '#3d4170' }); Draw.text('ABAJO: +  (reloj de 4)', w / 2, h - 30, { size: 22, color: PAL.inkSoft });
        sfx('¡DING!', w - 90, 150, 22, .15, PAL.mustard, (t % 2) - .3, { every: 2 });
      } },
      { snd: 'clickin', cap: 'Sumar abajo tiene que corresponder a multiplicar arriba.', draw(w, h, t, A) {
        bg(ctx, '#f1d6b0', w, h); tone(w, h, .07);
        Draw.text('1 + 1 = 2', 160, h / 2 - 30, { size: 34, font: FONT.title, color: PAL.ink }); Draw.text('abajo', 160, h / 2 + 14, { size: 18, color: PAL.inkSoft });
        Draw.curve([[290, h / 2 - 30], [w / 2, h / 2 - 90], [w - 290, h / 2 - 30]], 4, PAL.ultra, [10, 6]);
        Draw.text('2 × 2 = 4', w - 160, h / 2 - 30, { size: 34, font: FONT.title, color: '#3d4170' }); Draw.text('arriba', w - 160, h / 2 + 14, { size: 18, color: PAL.inkSoft });
        Draw.text('si f(1) = 2', w / 2, h / 2 + 80, { size: 22, color: PAL.ultra });
      } },
      { snd: 'fail', cap: 'Y el viaje tiene que poder deshacerse: un andén por habitante.', draw(w, h, t, A) {
        bg(ctx, '#e4e6f3', w, h); tone(w, h, .08);
        asm.dizzy = 2; asm.sing = 0; drawAssembler(asm, w / 2 - 90, w / 2 + 90, h / 2 + 40);
        const a = K.cast.z4[0], b = K.cast.z4[2]; a.x = w / 2 - 50; b.x = w / 2 + 50; a.y = b.y = h / 2 - 40; a.s = b.s = .8; setExpr(a, 'angry', 9); setExpr(b, 'confused', 9); drawCritter(a); drawCritter(b);
        Draw.rrect(w / 2 - 110, h / 2 - 20, 220, 18, 4, '#8d5a2f', 3, 9630); Draw.text('ANDÉN 1', w / 2, h / 2 - 11, { size: 12, font: FONT.plate, color: PAL.bone });
        A.asm = { x: w / 2 + 90, y: h / 2 + 10 };
      }, bal: [{ at: 'asm', text: 'Dos en el mismo andén… ¿a cuál bajo? Me mareo.', dx: 150, dy: 60 }] },
    ] }];
  } };

  /* ---------- 7 · Los gemelos imposibles ---------- */
  C[7] = { title: 'Los gemelos imposibles', tag: 'órdenes: la huella de cada uno', pages: K => {
    const { ctx, cast, sfx, tone, rays } = K;
    return [{ layout: 'w2', panels: [
      { snd: 'hum', cap: 'Dos terrarios con cuatro habitantes cada uno. Dicen que son gemelos. ¿Mismo tamaño = misma estructura?', draw(w, h, t, A) {
        bg(ctx, '#e3c7a2', w, h); tone(w, h, .07);
        [[w * .25, PAL.island, 'z4'], [w * .75, PAL.isle2, 'v4']].forEach(([x, col, key], k) => { Draw.ellipse(x, h / 2 + 10, 190, 150, k ? 'rgba(199,201,223,.6)' : 'rgba(239,201,162,.6)', 3, 9700 + k); Draw.rrect(x - 210, h / 2 + 150, 420, 30, 6, '#8d5a2f', 3, 9702 + k); ring(K, x, h / 2 + 30, 90, 60, cast[key], t, 4); });
        Draw.text('=?', w / 2, h / 2, { size: 60, font: FONT.title, color: PAL.plum, jitter: 1, seed: 7 });
        const e = K.enc; e.x = w / 2; e.y = h - 6; e.face = 1; e.talk = 1; drawEncargado(e); A.enc = { x: e.x + 10, y: e.y - 160 };
      }, bal: [{ at: 'enc', text: 'Cuatro y cuatro. Para mí, gemelos. Demuéstreme lo contrario.', dx: 0, dy: -60, w: 300 }] },
      { snd: 'bell', cap: 'Cada habitante tarda un número de pasos en volver a casa combinándose consigo mismo. Es su huella.', draw(w, h, t, A) {
        bg(ctx, '#f2d2ae', w, h); tone(w, h, .08);
        const cx = 170, cy = h / 2 + 30, seq = ['1', '2', '3', '0'], k = Math.floor(t * 1.4) % 5;
        Scenery.gear(cx, cy + 60, 70, 12, t, '#c7c2a8');
        drawBead(speciesFor('Z4', [1, 2, 3, 0][Math.min(3, k)]), cx, cy - 20, 30);
        Draw.text(seq.slice(0, Math.min(4, k + 1)).join(' → '), cx + 260, cy + 14, { size: 26, color: PAL.plum });
        if (k >= 3) { Draw.text('¡4 pasos!', cx + 260, cy + 62, { size: 30, font: FONT.title, color: PAL.bad }); }
        Draw.text('a → e', w - 160, cy + 80, { size: 26, color: '#3d4170' }); Draw.text('2 pasos', w - 160, cy + 116, { size: 20, color: '#3d4170' });
        A.one = { x: cx, y: cy - 60 };
      }, bal: [{ at: 'one', text: '¡Yo tardo cuatro vueltas!', dx: 150, dy: -50 }] },
      { snd: 'discover', cap: 'Si las huellas no coinciden, no hay traducción reversible. Mide, prueba el puente y redacta el informe.', draw(w, h, t, A) {
        bg(ctx, '#e8cfa8', w, h); rays(w * .3, h / 2, w, h, t, '#fff3c4', .3, 14); tone(w, h, .06);
        const op = K.op; op.x = 160; op.y = h / 2 + 60; op.expr = 'focus'; op.exprT = 1; drawOperario(op, 10);
        // lupa
        Draw.ellipse(250, h / 2 - 10, 42, 42, 'rgba(220,235,255,.5)', 5, 9710); Draw.line(280, h / 2 + 20, 330, h / 2 + 70, 8, 9711, '#6b4a2e');
        Draw.rrect(w / 2 - 40, 100, 330, 180, 4, PAL.bone, 3, 9712); Draw.text('EXPEDIENTE Nº 7', w / 2 + 125, 124, { size: 14, font: FONT.plate });
        ['1 · medir vueltas', '2 · probar el puente', '3 · informe'].forEach((l, i) => Draw.text((t > .6 + i * .5 ? '✓ ' : '· ') + l, w / 2 - 20, 162 + i * 38, { size: 20, align: 'left', color: t > .6 + i * .5 ? PAL.good : PAL.ink }));
        sfx('¡IMPOSIBLE!', w / 2 + 125, h - 34, 20, -.08, PAL.bad, t - 2.2, { burstCol: '#fff3c4' });
        A.op = { x: op.x + 20, y: op.y - 70 };
      }, bal: [{ at: 'op', text: 'Pruebas, no presentimientos.', dx: 60, dy: -80 }] },
    ] }];
  } };

  /* ---------- 8 · El corazón de la fábrica ---------- */
  C[8] = { title: 'El corazón de la fábrica', tag: 'todo junto', pages: K => {
    const { ctx, sfx, tone, rays } = K, claw = K.claw, shred = K.shred, asm = K.asm;
    const heart = (x, y, s, beat, col, happy) => { ctx.save(); ctx.translate(x, y); ctx.scale(s * (1 + Math.sin(beat) * .04), s * (1 + Math.sin(beat) * .04)); Draw.shape([[0, 70], [-80, 0], [-74, -46], [-36, -60], [0, -30], [36, -60], [74, -46], [80, 0]], col, 3); const f = { id: 1, blink: 0, lookX: 0 }; eyes(-22, -8, 8, f, { expr: happy ? 'happy' : 'sleepy', blink: 0 }); eyes(22, -8, 8, f, { expr: happy ? 'happy' : 'sleepy', blink: 0 }); mouth(0, 24, 12, happy ? 'happy' : 'sad'); ctx.restore(); };
    return [{ layout: 'w2', panels: [
      { snd: 'hum', cap: 'En el centro de la fábrica late el corazón. Débil. Tiene cuatro válvulas, y las cuatro están cerradas.', draw(w, h, t, A) {
        bg(ctx, '#cfae8e', w, h); tone(w, h, .08);
        heart(w / 2, h / 2 + 10, 1.9, t * 2, '#7a3a33', false);
        [['1 · el engranaje cierra', -1, -1], ['2 · en el neutro, sólo el 0', -1, 1], ['3 · ningún contenedor vacío', 1, -1], ['4 · el viaje se deshace', 1, 1]].forEach(([l, dx, dy], i) => { const x = w / 2 + dx * 420, y = h / 2 + dy * 100; Draw.curve([[w / 2 + dx * 120, h / 2 + dy * 50], [x - dx * 150, y]], 16, '#7a3a33'); Draw.rrect(x - 150, y - 24, 300, 48, 6, PAL.bone, 2.5, 9800 + i); Draw.ellipse(x - 124, y, 12, 12, '#5a4f63', 2, 9801 + i); Draw.text(l, x + 10, y, { size: 18 }); });
        sfx('pum…', w / 2 + 210, 70, 20, .1, PAL.bone, t - .3, { burst: false });
        A.heart = { x: w / 2, y: h / 2 - 110 };
      } },
      { snd: 'gear', cap: 'Cada válvula se abre con algo que ya sabes hacer… y cada personaje vuelve a su puesto.', draw(w, h, t, A) {
        bg(ctx, '#e8cfa8', w, h); tone(w, h, .07);
        const q = (w - 80) / 4;
        Scenery.gear(40 + q * .5, h / 2, 50, 10, t, '#e3a52e'); Draw.text('máq. 1 y 2', 40 + q * .5, h - 40, { size: 16, color: PAL.inkSoft });
        claw.railY = 60; claw.x = 40 + q * 1.5; claw.y = 150 + Math.sin(t * 2) * 8; claw.mood = 'happy'; drawClaw(claw, 40 + q * 1.1, 40 + q * 1.9); Draw.text('máq. 2', 40 + q * 1.5, h - 40, { size: 16, color: PAL.inkSoft });
        shred.x = 40 + q * 2.5; shred.y = h / 2 - 40; shred.mood = 'eager'; ctx.save(); ctx.translate(shred.x, shred.y); ctx.scale(.5, .5); ctx.translate(-shred.x, -shred.y); drawShredder(shred, shred.x, shred.x); ctx.restore(); Draw.text('máq. 3', 40 + q * 2.5, h - 40, { size: 16, color: PAL.inkSoft });
        asm.sing = 1; drawAssembler(asm, 40 + q * 3.2, 40 + q * 3.8, h / 2); Draw.text('máq. 6', 40 + q * 3.5, h - 40, { size: 16, color: PAL.inkSoft });
        A.shred = { x: shred.x, y: shred.y - 50 };
      }, bal: [{ at: 'shred', text: '¡Todos al corazón!', dx: 0, dy: -50 }] },
      { snd: 'repair', cap: 'Repáralo con todo lo aprendido: engranaje, garra, probador y vuelta.', draw(w, h, t, A) {
        bg(ctx, '#f0cfa4', w, h); rays(w / 2, h / 2, w, h, t, '#ffe9a8', .4, 16); tone(w, h, .05);
        heart(w / 2, h / 2 + 10, 1.4, t * 6, '#e0533f', true);
        [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([dx, dy], i) => { const x = w / 2 + dx * 220, y = h / 2 + dy * 80; Deco.glow(x, y, 40, 'rgba(160,240,120,A)', .7); Draw.ellipse(x, y, 16, 16, '#9be27a', 2.5, 9820 + i); Draw.text(String(i + 1), x, y + 1, { size: 15, font: FONT.title }); });
        sfx('¡PUM-PUM!', w / 2, 70, 30, -.08, PAL.bad, (t % 1) - .1, { every: 1 });
      } },
    ] }];
  } };
  return C;
})();
