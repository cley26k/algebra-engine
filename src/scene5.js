/* THE ALGEBRA ENGINE — Nivel 5: la línea de copias.
 * Cuatro copiadoras esperan en el patio. Cada una se baja a la línea y produce: las copias pasan por la caseta de sumas,
 * llegan al CLASIFICADOR DE CHOQUES (casilleros con puerta de muelle) y después pasa el FAROLERO DE VACÍOS.
 * Dos averías, dos mecanismos que se ven y suenan distinto. El jugador envía cada copiadora al taller que le toca. */
'use strict';
window.LineScene = function (App) {
const W = 1600, H = 900, ctx = Draw.ctx, AG = AlgebraGroups;
const P = AG.createLine();
const M = P.machines;
const YARD = m => ({ x: 330 + m * 250, y: 220 });
const LINE = { x: 330, y: 470 }, BOOTH = { x: 690, y: 450 }, RACK = { x0: 900, y: 460 };
const SLOT = (n, j) => ({ x: RACK.x0 + 40 + j * Math.min(110, 420 / n), y: RACK.y });
const BAYS = [{ id: 'choques', name: 'TALLER DE CHOQUES', sub: 'dos comparten destino', x: 330 }, { id: 'vacios', name: 'TALLER DE VACÍOS', sub: 'destinos sin visitas', x: 600 },
  { id: 'sumas', name: 'TALLER DE SUMAS', sub: 'las rutas se separan', x: 870 }, { id: 'apto', name: 'APTO', sub: 'sale de fábrica', x: 1140 }];
const BAY_Y = 760;

const op = makeOperario(1480, 250);
const S = Kit.base(App, 5, {
  order: 'Cada copiadora tiene una avería distinta (o ninguna). Pruébela en la línea y mándela a su taller.',
  groups: () => current !== null ? [M[current].G, M[current].H] : [M[0].G, M[0].H], verdictAt: { x: 800, y: 64 }, ticketAt: { x: 1420, y: 830 }, stampAt: { x: 1300, y: 170 },
  cast: { op: { pos: () => ({ x: op.x - 20, y: op.y - 50 }), voice: 'op', screen: true }, lamp: { pos: () => ({ x: lamp.x, y: lamp.y - 60 }), voice: 'claw', screen: true }, rack: { pos: () => ({ x: 1120, y: RACK.y - 120 }), voice: 'shred', screen: true } },
  state: () => hintState(),
  hints: [
    { topic: 'producir', when: s => !s.anyObserved, tiers: [
      { text: 'Baje una copiadora del patio a la línea (clic) y pulse PRODUCIR.', point: () => ({ x: YARD(0).x, y: YARD(0).y, screen: true }) },
      { text: 'Fíjese en tres cosas: la caseta de sumas, el clasificador de choques y el farolero.' }] },
    { topic: 'observar', when: s => s.unobserved.length > 0 && s.sentCount === 0, tiers: [
      { text: t => 'Faltan por probar: ' + t.unobserved.join(', ') + '. No se manda a nadie a ciegas.' }] },
    { topic: 'enviar', when: s => s.observedUnsent.length > 0, tiers: [
      { text: t => 'La ' + t.observedUnsent[0] + ' ya se probó. ¿Qué mecanismo se quejó?' },
      { text: 'Si sonó el clasificador: choques. Si el farolero plantó bandera: vacíos. Si se atascó la caseta: sumas.' },
      { text: t => { const m = t.observedUnsentIdx[0]; return 'La ' + M[m].name.split(' ')[1] + ': ' + ({ choques: 'el clasificador sonó', vacios: 'el farolero plantó bandera', sumas: 'la caseta se atascó', apto: 'nada se quejó' })[M[m].bay] + '.'; } }] },
    { topic: 'firmar', when: s => s.sentCount === M.length, tiers: [{ text: 'Todas en un taller. Firme el parte.' }] },
  ],
});
const LINES = {
  choque: [[['rack', '¡CLANG! Dos copias en el mismo casillero.'], ['op', 'Que se apretujen, ¿no?'], ['rack', 'Al salir, nadie sabrá de quién es cada una.']], [['rack', '¡Casillero {y} doble! ¡Muelle saltado!']]],
  vacio: [[['lamp', 'Casillero {y}: vacío. Bandera.']], [['lamp', 'Aquí no ha llegado nadie. Apunto: {y}.']]],
  limpio: [[['lamp', 'Todos los casilleros con su copia. Ni vacíos ni dobles.']]],
  atasco: [[['op', '¡La caseta se ha atascado!'], ['op', 'Dice que sumar antes y sumar después no da lo mismo.']]],
  sent: [[['op', 'Rumbo al {bay}.']], [['op', 'Al {bay}, con cariño.']]],
  blind: [[['op', '¿Sin probarla? Bueno… usted manda.']]],
};

/* ---------------- estado de escena ---------------- */
let current = null, onLine = null, cart = { x: LINE.x, y: LINE.y }, pieces = [], slots = [], flags = [], booth = { jam: 0, ok: 0 }, observedKind = M.map(() => null);
const lamp = { x: 1360, y: RACK.y + 120, lit: 0 };
const yardPos = M.map((_, m) => ({ x: YARD(m).x, y: YARD(m).y }));
function hintState() {
  const c = P.config, obs = c.observed.map(o => o.run);
  const names = m => M[m].name.split(' ')[1];
  return { anyObserved: obs.some(Boolean), unobserved: M.map((_, m) => m).filter(m => !obs[m]).map(names), sentCount: c.sent.filter(Boolean).length,
    observedUnsent: M.map((_, m) => m).filter(m => obs[m] && !c.sent[m]).map(names), observedUnsentIdx: M.map((_, m) => m).filter(m => obs[m] && !c.sent[m]) };
}
P.on(() => S.progress());

/* ---------------- producción ---------------- */
function load(m) {
  if (S.run.active) return;
  if (P.config.sent[m]) { S.say('op', 'Ésa ya está en un taller. Sáquela si quiere volver a probarla (clic en su taller).'); return; }
  current = m; onLine = m; slots = []; flags = []; pieces = []; booth.jam = 0; S.verdict = null; if (S.slip) S.slip.closing = true;
  Sound.fam('servo'); S.tw.add(yardPos[m], { x: LINE.x, y: LINE.y }, .7, { ease: Ease.inOut, done: () => Sound.fam('thud') });
  App.announce(M[m].name + ' en la línea: ' + M[m].G.name + ' → ' + M[m].H.name + '. Pulsa PRODUCIR.');
}
function produce() {
  if (S.run.active) { S.run.scale = 5; return; }
  if (onLine === null) { S.say('op', 'Primero, una copiadora en la línea.'); return; }
  App.levelStarted(5); S.progress();
  const m = onLine, Mm = M[m], d = P.observe(m), tw = S.run.tw;
  slots = Mm.H.labels.map(() => []); flags = []; pieces = []; booth.jam = 0;
  S.run.start((function* () {
    for (let x = 0; x < Mm.G.n; x++) {
      const p = makeCritter('src', x, LINE.x - 60, LINE.y - 160, speciesFor(Mm.G.key, x)); p.s = .55; pieces.push(p);
      Kit.travel(tw, p, [[LINE.x - 60, LINE.y - 160], [LINE.x, LINE.y - 40]], .45, { done: () => {
        Sound.fam('press', { vol: .6 }); p.species = speciesFor(Mm.H.key, Mm.f[x]); p.hat = { col: speciesColor(speciesFor(Mm.G.key, x)), label: Mm.G.labels[x] }; p.y = LINE.y + 10;
        Kit.travel(tw, p, [[LINE.x + 60, LINE.y + 10], [BOOTH.x - 40, LINE.y + 10]], .6, { ease: Ease.linear });
      } });
      yield .45;
    }
    yield 1.1;
    // caseta de sumas: compara las dos rutas; si divergen, se atasca aquí
    if (d.kind === 'broken') {
      booth.jam = 1; Sound.fam('fail'); Sound.fam('crack'); pieces.forEach(p => Kit.react(p, 'frustration', 2.5));
      const c = d.counterexample;
      S.slip = Kit.RouteSlip(Mm.G, Mm.H, Mm.f, c.a, c.b, { x: 120, y: 640, title: M[m].name + ': LA CASETA SE ATASCA EN ESTE PAR' });
      S.dir.play(LINES, 'atasco', {}, { force: true }); operarioDo(op, 'panic', 2);
      observedKind[m] = 'sumas'; S.verdict = d; return;
    }
    booth.ok = 1; Sound.fam('clickin');
    // al clasificador: cada copia a su casillero; el muelle salta si ya hay alguien
    const n = Mm.H.n;
    for (let x = 0; x < Mm.G.n; x++) {
      const p = pieces[x], y = Mm.f[x], s = SLOT(n, y);
      Kit.travel(tw, p, [[p.x, p.y], [s.x, LINE.y + 10], [s.x, s.y - 30]], .6, { ease: Ease.inOut, done: () => {
        slots[y].push(p); p.slot = y;
        if (slots[y].length > 1) {
          Sound.fam('collide'); Sound.fam('thud'); slots[y].forEach(q => { Kit.react(q, 'anger', 2.4); q.shake = .7; });
          p.y -= 16 * (slots[y].length - 1); p.x += 10;
          S.dir.play(LINES, 'choque', { y: Mm.H.labels[y] }, { cooldown: 4 });
        } else Sound.fam('clickin');
      } });
      yield .5;
    }
    yield .8;
    // el farolero recorre los casilleros con su farol
    for (let y = 0; y < n; y++) {
      const s = SLOT(n, y); tw.add(lamp, { x: s.x }, .45, { ease: Ease.inOut }); yield .5;
      lamp.lit = 1; Sound.fam('servo', { vol: .5 });
      if (!slots[y].length) { flags.push(y); Sound.fam('bell'); S.dir.play(LINES, 'vacio', { y: Mm.H.labels[y] }, { cooldown: 2 }); yield .5; }
      else yield .2;
    }
    tw.add(lamp, { x: 1360 }, .6); yield .6;
    if (!flags.length && !d.collision) S.dir.play(LINES, 'limpio', {}, { force: true });
    observedKind[m] = d.collision ? 'choques' : d.empty.length ? 'vacios' : 'apto';
    S.verdict = d;
  })(), 'produce');
}
function send(bay) {
  if (onLine === null) { S.say('op', 'No hay copiadora en la línea.'); return; }
  const m = onLine;
  if (!P.config.observed[m].run) S.dir.play(LINES, 'blind', {}, { force: true });
  P.send(m, bay); Sound.fam('servo');
  const B = BAYS.find(b => b.id === bay);
  S.tw.add(yardPos[m], { x: B.x, y: BAY_Y - 10 }, .8, { ease: Ease.inOut, done: () => Sound.fam('thud') });
  S.dir.play(LINES, 'sent', { bay: B.name.toLowerCase() }, { cooldown: 4 });
  onLine = null; slots = []; flags = []; pieces = []; booth.jam = 0; booth.ok = 0;
}
function unsend(bay) {
  const c = P.config, m = c.sent.findIndex(b => b === bay); if (m === -1) return;
  P.send(m, null); Sound.fam('slide'); S.tw.add(yardPos[m], { x: YARD(m).x, y: YARD(m).y }, .7, { ease: Ease.inOut });
}
function sign() {
  S.enc.tx = 90; S.later(.5, () => { S.enc.stamp = 1; });
  const ev = P.evaluate();
  if (ev.done) { S.later(.8, () => S.complete({}, 'Parte archivado. Cada avería en su taller: los choques rompen la inyectividad, los vacíos la sobreyectividad, y las sumas son otra cosa. Vuelva a la fábrica (Esc).')); return; }
  S.later(.9, () => {
    Sound.fam('fail'); S.enc.expr = 'stern'; S.enc.exprT = 2.5;
    const unsent = P.config.sent.findIndex(b => b === null);
    if (unsent !== -1) { S.say('enc', 'La ' + M[unsent].name.split(' ')[1] + ' no tiene taller. Un parte a medias no se firma.'); return; }
    const w = ev.wrong.indexOf(true), Mm = M[w], obs = observedKind[w];
    const evid = obs === null ? 'ni siquiera la ha probado' : { choques: 'en la línea sonó el clasificador de choques', vacios: 'en la línea el farolero plantó bandera', sumas: 'en la línea se atascó la caseta de sumas', apto: 'en la línea nada se quejó' }[obs];
    S.say('enc', 'La ' + Mm.name.split(' ')[1] + ' está en el ' + BAYS.find(b => b.id === P.config.sent[w]).name.toLowerCase() + ', pero ' + evid + '.', { dur: 5 });
  });
}

/* ---------------- interacción ---------------- */
function items() {
  const out = S.hudItems();
  M.forEach((Mm, m) => { if (P.config.sent[m] || onLine === m) return; const p = yardPos[m]; out.push({ id: 'cop' + m, screen: true, x: p.x - 90, y: p.y - 70, w: 180, h: 130, label: Mm.name + ' (' + Mm.G.name + ' → ' + Mm.H.name + '): bajar a la línea (' + (m + 1) + ')', act: () => load(m), pri: 2, hoverOutline: true }); });
  out.push({ id: 'produce', screen: true, x: 140, y: 520, w: 150, h: 44, label: 'PRODUCIR (R)', act: produce, pri: 1 });
  BAYS.forEach(b => out.push({ id: 'bay' + b.id, screen: true, x: b.x - 110, y: BAY_Y - 70, w: 220, h: 140, label: b.name + (P.config.sent.indexOf(b.id) !== -1 ? ' (ocupado: clic para sacar)' : onLine !== null ? ': enviar la copiadora' : ''), act: () => { if (onLine !== null) send(b.id); else unsend(b.id); }, pri: 3, hoverOutline: true }));
  out.push({ id: 'sign', screen: true, x: 1360, y: 640, w: 190, h: 48, label: 'FIRMAR EL PARTE', act: sign, pri: 1 });
  return out;
}

/* ---------------- dibujo ---------------- */
function drawCopier(Mm, m, x, y) {
  const face = { id: 900 + m, blink: 0, lookX: Math.sin(S.T + m) * .5 };
  Draw.rrect(x - 84, y - 50, 168, 96, 14, ['#e3a52e', '#cfa148', '#b98c34', '#8fae5a'][m], 3, 11000 + m);
  Draw.rrect(x - 56, y - 74, 112, 28, 3, PAL.bone, 2, 11010 + m);
  Draw.text(Mm.name.split(' ')[1], x - 64, y - 30, { size: 22, font: FONT.title });
  Draw.text(Mm.G.name + ' → ' + Mm.H.name, x + 16, y - 60, { size: 13, font: FONT.plate });
  const busy = onLine === m && S.run.active;
  eyes(x - 18, y - 6, 7, face, { expr: busy ? 'focus' : 'idle', blink: 0, lookX: face.lookX }); eyes(x + 18, y - 6, 7, face, { expr: busy ? 'focus' : 'idle', blink: 0, lookX: face.lookX });
  mouth(x, y + 20, 12, booth.jam && onLine === m ? 'shock' : 'idle');
  [x - 60, x + 60].forEach((wx, i) => Draw.ellipse(wx, y + 50, 12, 12, PAL.ink, 0, 11020 + i + m));
}
function drawLine() {
  ctx.fillStyle = '#e8c597'; ctx.fillRect(-1200, -800, W + 2400, H + 1600);
  if (App.grain) { ctx.fillStyle = App.grain; ctx.fillRect(-1200, -800, W + 2400, H + 1600); }
  ctx.fillStyle = '#d4a676'; ctx.fillRect(-1200, 330, W + 2400, 6);
  Draw.text('PATIO DE COPIADORAS', 120, 116, { size: 14, font: FONT.plate, align: 'left', color: PAL.inkSoft, spacing: 2 });
  ctx.fillStyle = '#c99064'; ctx.fillRect(-1200, 640, W + 2400, 1060);
  Deco.room(S.T, { wall: [-1200, -800, W + 1200, 640], floor: [640, -1200, W + 1200, 400], lamps: [620, 1340], len: 0, reach: 480, clock: [1470, 78, 24], posters: [
    [1232, 110, 160, 118, 'CONTROL DE CALIDAD', ['choques ≠ vacíos', 'cada avería', 'a su taller'], { stripe: '#7c3b73', rot: -.025, tsize: 10.5 }]] });
  Deco.hazard(430, 548, 440, 12);
  Draw.text('TALLERES', 120, 666, { size: 14, font: FONT.plate, align: 'left', color: PAL.bone, spacing: 2 });
  // línea: tolva de origen, prensa, cinta
  Draw.shape([[LINE.x - 120, LINE.y - 200], [LINE.x, LINE.y - 200], [LINE.x - 40, LINE.y - 130], [LINE.x - 80, LINE.y - 130]], '#7c8a4a', 3);
  Draw.rrect(LINE.x + 40, LINE.y + 26, 1100 - LINE.x, 18, 9, '#4b4536', 3, 11100);
  ctx.save(); ctx.beginPath(); ctx.rect(LINE.x + 46, LINE.y + 28, 1090 - LINE.x, 14); ctx.clip();
  for (let x = LINE.x; x < 1200; x += 26) Draw.line(x + ((S.T * (S.run.active ? 80 : 0)) % 26), LINE.y + 28, x + ((S.T * (S.run.active ? 80 : 0)) % 26) + 8, LINE.y + 42, 2, 11101, '#8a7f63'); ctx.restore();
  // caseta de sumas
  const bx = BOOTH.x, by = BOOTH.y;
  Draw.rrect(bx - 50, by - 120, 100, 110, 8, booth.jam ? '#f0b3a8' : '#c7c9df', 3, 11110);
  Draw.shape([[bx - 60, by - 120], [bx, by - 160], [bx + 60, by - 120]], '#7c3b73', 3);
  Draw.text('▲ = ●', bx, by - 80, { size: 20, font: FONT.title, color: booth.jam ? PAL.bad : '#3d4170' });
  Draw.text('CASETA', bx, by - 46, { size: 11, font: FONT.plate }); Draw.text('DE SUMAS', bx, by - 32, { size: 11, font: FONT.plate });
  if (booth.jam) { Draw.line(bx - 50, by - 10, bx + 50, by - 10, 6, 11111, PAL.bad); Draw.text('ATASCO', bx, by + 6, { size: 12, font: FONT.plate, color: PAL.bad }); }
  // clasificador de choques: casilleros con puerta de muelle
  const Mm = current !== null ? M[current] : null, n = Mm ? Mm.H.n : 4;
  Draw.rrect(RACK.x0 - 10, RACK.y - 110, 470, 160, 8, '#6f6a55', 3, 11120);
  Draw.text('CLASIFICADOR DE CHOQUES', RACK.x0 + 225, RACK.y - 126, { size: 13, font: FONT.plate, spacing: 1 });
  for (let j = 0; j < n; j++) {
    const s = SLOT(n, j), full = slots[j] ? slots[j].length : 0, bang = full > 1;
    Draw.rrect(s.x - 40, s.y - 96, 80, 110, 6, bang ? '#f0b3a8' : '#e9e2cf', 2.5, 11130 + j);
    // puerta de muelle: se dispara con un choque
    const door = bang ? Math.sin(S.T * 30) * 6 : 0;
    Draw.curve([[s.x - 40, s.y - 96], [s.x - 30 + door, s.y - 70], [s.x - 40, s.y - 50], [s.x - 30 + door, s.y - 30]], 2.5, PAL.ink);
    if (Mm) drawBead(speciesFor(Mm.H.key, j), s.x, s.y + 32, 13);
    if (bang) { Draw.ellipse(s.x + 26, s.y - 104, 9, 9, Math.sin(S.T * 12) > 0 ? '#ff6b4a' : '#7a2a20', 2, 11140 + j); Draw.text('¡CHOQUE!', s.x, s.y - 118, { size: 12, font: FONT.plate, color: PAL.bad }); }
    if (flags.indexOf(j) !== -1) { Draw.line(s.x + 20, s.y + 10, s.x + 20, s.y - 50, 2.5, 11150 + j); Draw.shape([[s.x + 20, s.y - 50], [s.x + 52 + Math.sin(S.T * 6) * 4, s.y - 42], [s.x + 20, s.y - 34]], '#f6e27a', 2); Draw.text('VACÍO', s.x - 4, s.y - 20, { size: 12, font: FONT.plate, color: PAL.bad }); }
  }
  // farolero de vacíos: carrito con farol en un riel bajo el clasificador
  Draw.line(RACK.x0 - 10, RACK.y + 128, 1420, RACK.y + 128, 4, 11160);
  Draw.rrect(lamp.x - 26, lamp.y - 6, 52, 34, 6, '#5b6a96', 3, 11161);
  Draw.line(lamp.x, lamp.y - 6, lamp.x, lamp.y - 50, 3, 11162); Draw.ellipse(lamp.x, lamp.y - 58, 12, 12, lamp.lit > .1 ? '#ffe27a' : '#c9c2a8', 2.5, 11163);
  if (lamp.lit > .1) { ctx.save(); ctx.globalAlpha = lamp.lit * .3; Draw.shape([[lamp.x - 8, lamp.y - 66], [lamp.x + 8, lamp.y - 66], [lamp.x + 40, lamp.y - 200], [lamp.x - 40, lamp.y - 200]], '#fff3c4', 0); ctx.restore(); }
  const lf = { id: 950, blink: 0, lookX: 0 }; eyes(lamp.x - 9, lamp.y + 8, 4.5, lf, { expr: 'idle', blink: 0 }); eyes(lamp.x + 9, lamp.y + 8, 4.5, lf, { expr: 'idle', blink: 0 });
  Draw.text('FAROLERO DE VACÍOS', lamp.x, lamp.y + 46, { size: 11, font: FONT.plate });
  // talleres
  BAYS.forEach(b => {
    const occupied = P.config.sent.indexOf(b.id) !== -1;
    Draw.rrect(b.x - 110, BAY_Y - 70, 220, 140, 8, '#a7744a', 3, 11200 + b.x);
    Draw.rrect(b.x - 90, BAY_Y - 40, 180, 110, 4, occupied ? '#5b4a3a' : '#3a3150', 2.5, 11201 + b.x);
    for (let k = 0; k < 5; k++) Draw.line(b.x - 90, BAY_Y - 30 + k * 18, b.x + 90, BAY_Y - 30 + k * 18, 1.5, 11202 + k, 'rgba(251,239,220,.25)');
    Draw.text(b.name, b.x, BAY_Y - 54, { size: 12, font: FONT.plate, color: PAL.bone, spacing: 1 });
    Draw.text(b.sub, b.x, BAY_Y + 88, { size: 15, color: PAL.bone });
    // icono físico de cada taller
    const ix = b.x + 80, iy = BAY_Y - 54;
    if (b.id === 'choques') { Draw.ellipse(ix, iy, 8, 8, '#ff6b4a', 1.5, 11210); }
    if (b.id === 'vacios') { Draw.shape([[ix - 4, iy - 8], [ix + 10, iy - 4], [ix - 4, iy]], '#f6e27a', 1.5); }
    if (b.id === 'sumas') Draw.text('≠', ix, iy, { size: 16, color: '#f0b3a8' });
    if (b.id === 'apto') Draw.curve([[ix - 8, iy], [ix - 2, iy + 6], [ix + 8, iy - 8]], 3, PAL.good);
  });
  // copiadoras
  M.forEach((Mm2, m) => { const p = yardPos[m]; drawCopier(Mm2, m, p.x, p.y); });
  pieces.forEach(p => { drawCritter(p); Kit.drawMark(p); });
  drawOperario(op, -4);
  Kit.plate(140, 520, 150, 44, 'PRODUCIR', { fill: onLine !== null ? '#dfe8c8' : '#d8d2c8', focus: S.kbd && S.focusId === 'produce' });
  Kit.plate(1360, 640, 190, 48, 'FIRMAR EL PARTE', { fill: '#f6dfb8', focus: S.kbd && S.focusId === 'sign' });
  S.drawParts();
}

/* ---------------- escena ---------------- */
const goals = () => { const c = P.config; return M.map((Mm, m) => ({ text: Mm.name.toLowerCase() + ': ' + (c.sent[m] ? BAYS.find(b => b.id === c.sent[m]).name.toLowerCase() : c.observed[m].run ? 'probada' : 'sin probar'), ok: !!c.sent[m] && P.evaluate().done, seen: false })); };
const scene = {
  enter() {
    window.__L5 = debug;
    S.encIn('Orden nº 5: cuatro copiadoras. Cada una a su taller. Ojo: los choques y los vacíos no son la misma avería.', { leaveAfter: 9 });
    S.later(6, () => S.say('op', 'Yo las mandaría todas al mismo taller. Por simplificar.'), 'intro');
  },
  exit() { if (window.__L5 === debug) window.__L5 = null; },
  update(dt) { S.update(dt); updateOperario(op, dt); lamp.lit = Math.max(0, lamp.lit - dt * 1.5); pieces.forEach(p => Kit.live(p, dt)); },
  render() {
    drawLine();
    Draw.text('THE ALGEBRA ENGINE · MÁQUINA 5', 34, 26, { size: 15, font: FONT.plate, align: 'left', color: PAL.inkSoft, spacing: 2 });
    Draw.text('La fábrica de copias', 32, 54, { size: 30, font: FONT.title, align: 'left', jitter: 1.2, seed: 38 });
    S.drawHud(goals());
    S.drawFocus(items());
  },
  pointerDown(p) { S.kbd = false; S.cancel('intro'); S.progress(); const it = S.hit(items(), p); if (it) it.act(); },
  pointerMove(p) { S.pointer = { x: p.x, y: p.y, inside: true }; const it = S.hit(items(), p); S.hoverId = it ? it.id : null; App.setCursor(it ? 'pointer' : 'default'); },
  pointerUp() {}, pointerLeave() { S.pointer.inside = false; },
  key(e) {
    if (S.navKey(e, items())) return true;
    const k = e.key.toLowerCase();
    if (k === 'r') { produce(); return true; }
    if (/^[1-4]$/.test(k)) { load(+k - 1); return true; }
    if (k === 'z' || (e.ctrlKey && k === 'z')) { P.undo(); return true; }
    return false;
  },
  hint: () => S.giveHint(), busy: () => S.run.active, skip: () => S.run.skip(),
  tableContext: () => { const Mm = current !== null ? M[current] : M[0]; return { groups: Mm.G.key === Mm.H.key ? [Mm.G] : [Mm.G, Mm.H], highlight: S.slip ? S.slip.highlights() : {}, note: 'Las tablas no dicen si hay choques: eso lo dice el clasificador.' }; },
};
const debug = { P, S, load, produce, send, unsend, sign, items, observedKind,
  fast() { for (let i = 0; i < 6000 && (S.run.active || S.timers.length); i++) scene.update(1 / 30); }, step(s) { for (let i = 0; i < s * 30; i++) scene.update(1 / 30); } };
scene.debug = () => debug;
return scene;
};
