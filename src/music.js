/* THE ALGEBRA ENGINE — música generativa (Web Audio, sin archivos).
 * Un pequeño conjunto de taller: bajo de cuerda pulsada, marimba de chapa, armonio, escobilla y un clarinete torcido.
 * Cada escena elige un "ánimo"; los compases se generan con semilla para variar sin perder el carácter. */
'use strict';
const Music = (function () {
  const M = { level: 2, levels: [0, .1, .2, .34], mood: null, nextMood: null, gain: null, bus: null, timer: null, step: 0, nextT: 0, bar: 0, fade: 1, started: false };
  const MOODS = {
    // root: nota MIDI de la tónica; prog: grados (semitonos desde la tónica) y calidad
    title: { bpm: 92, root: 50, prog: [[0, 'm7'], [5, '7'], [10, 'maj7'], [7, 'm7']], mel: .55, arp: .7, swing: .1, hat: .5, pad: .9 },
    comic: { bpm: 78, root: 55, prog: [[0, 'maj7'], [9, 'm7'], [5, 'maj7'], [7, '7']], mel: .25, arp: .9, swing: 0, hat: 0, pad: 1 },
    map: { bpm: 104, root: 53, prog: [[0, 'maj7'], [2, 'm7'], [5, 'maj7'], [7, '7']], mel: .4, arp: .8, swing: .12, hat: .8, pad: .6 },
    level: { bpm: 84, root: 48, prog: [[0, 'm7'], [3, 'maj7'], [8, 'maj7'], [7, 'sus']], mel: .15, arp: .45, swing: .06, hat: .35, pad: .8 },
    finale: { bpm: 112, root: 52, prog: [[0, 'maj7'], [5, 'maj7'], [7, '7'], [0, 'maj7']], mel: .8, arp: .9, swing: .14, hat: .9, pad: .7 },
  };
  const Q = { m7: [0, 3, 7, 10], '7': [0, 4, 7, 10], maj7: [0, 4, 7, 11], sus: [0, 5, 7, 10] };
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  let seed = 1; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

  function ac() { return Sound.ac; }
  function ensure() {
    if (!ac()) return false;
    if (!M.gain) {
      const a = ac();
      M.gain = a.createGain(); M.gain.gain.value = 0;
      M.bus = a.createBiquadFilter(); M.bus.type = 'lowpass'; M.bus.frequency.value = 5200;
      const comp = a.createDynamicsCompressor(); comp.threshold.value = -20;
      M.bus.connect(M.gain); M.gain.connect(comp); comp.connect(a.destination);
    }
    return true;
  }
  function env(node, t, a, peak, d) { node.gain.setValueAtTime(0, t); node.gain.linearRampToValueAtTime(peak, t + a); node.gain.exponentialRampToValueAtTime(.0005, t + a + d); }
  /* ---- instrumentos ---- */
  function bass(t, m, dur) {
    const a = ac(), o = a.createOscillator(), o2 = a.createOscillator(), g = a.createGain(), f = a.createBiquadFilter();
    o.type = 'triangle'; o2.type = 'sawtooth'; o.frequency.value = hz(m); o2.frequency.value = hz(m) * 1.003;
    f.type = 'lowpass'; f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(220, t + dur);
    const g2 = a.createGain(); g2.gain.value = .25;
    o.connect(f); o2.connect(g2); g2.connect(f); f.connect(g); g.connect(M.bus); env(g, t, .008, .32, dur);
    o.start(t); o2.start(t); o.stop(t + dur + .05); o2.stop(t + dur + .05);
  }
  function marimba(t, m, vel) {
    const a = ac(), o = a.createOscillator(), o2 = a.createOscillator(), g = a.createGain(), g2 = a.createGain();
    o.type = 'sine'; o2.type = 'sine'; o.frequency.value = hz(m); o2.frequency.value = hz(m) * 3.98;
    o.connect(g); o2.connect(g2); g.connect(M.bus); g2.connect(M.bus);
    env(g, t, .004, .16 * vel, .55); env(g2, t, .002, .05 * vel, .08);
    o.start(t); o2.start(t); o.stop(t + .7); o2.stop(t + .2);
  }
  function pad(t, notes, dur, lvl) {
    const a = ac(), f = a.createBiquadFilter(), g = a.createGain();
    f.type = 'lowpass'; f.frequency.value = 1100; f.Q.value = .7; f.connect(g); g.connect(M.bus);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.045 * lvl, t + .5); g.gain.setValueAtTime(.045 * lvl, t + dur - .4); g.gain.linearRampToValueAtTime(0, t + dur);
    notes.forEach((m, i) => { [0, 7].forEach(det => { const o = a.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(m); o.detune.value = det - 3.5 + i; o.connect(f); o.start(t); o.stop(t + dur + .05); }); });
  }
  function brush(t, vel) {
    const a = ac(), src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    src.buffer = Sound.noiseBuf; f.type = 'highpass'; f.frequency.value = 6500;
    src.connect(f); f.connect(g); g.connect(M.bus); env(g, t, .002, .05 * vel, .06);
    src.start(t); src.stop(t + .1);
  }
  function thump(t) {
    const a = ac(), o = a.createOscillator(), g = a.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(48, t + .14);
    o.connect(g); g.connect(M.bus); env(g, t, .003, .22, .18); o.start(t); o.stop(t + .25);
  }
  function clarinet(t, m, dur) {
    const a = ac(), o = a.createOscillator(), f = a.createBiquadFilter(), g = a.createGain(), l = a.createOscillator(), lg = a.createGain();
    o.type = 'square'; o.frequency.value = hz(m); l.frequency.value = 5.2; lg.gain.value = hz(m) * .006; l.connect(lg); lg.connect(o.frequency);
    f.type = 'lowpass'; f.frequency.value = 1500; f.Q.value = 2;
    o.connect(f); f.connect(g); g.connect(M.bus);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.05, t + .05); g.gain.setValueAtTime(.05, t + dur * .7); g.gain.exponentialRampToValueAtTime(.0005, t + dur);
    o.start(t); l.start(t); o.stop(t + dur + .05); l.stop(t + dur + .05);
  }

  /* ---- un paso de semicorchea ---- */
  let melNote = 0;
  function play(st, t) {
    const md = MOODS[M.mood]; if (!md) return;
    const spb = 60 / md.bpm / 4, bar = Math.floor(st / 16), s = st % 16, ch = md.prog[bar % md.prog.length];
    const root = md.root + (M.transpose || 0) + ch[0], tones = Q[ch[1]].map(n => root + n);
    if (s === 0) { seed = 1000 + bar * 37 + (M.transpose || 0) * 7; if (md.pad) pad(t, tones.map(n => n + 12), spb * 16, md.pad); }
    if (s === 0 || s === 8) bass(t, root - 12, spb * 5);
    if (s === 6 && rnd() < .5) bass(t, root - 12 + (rnd() < .5 ? 7 : 12), spb * 2);
    if (s === 14 && rnd() < .4) bass(t, root - 12 + (rnd() < .5 ? -2 : 5), spb * 2);
    if (md.hat && s % 4 === 2) brush(t, md.hat);
    if (md.hat && s % 4 === 0 && (s === 0 || rnd() < .3)) thump(t);
    if (s % 2 === 0 && rnd() < md.arp) marimba(t, tones[(s / 2 + bar) % 4] + 24 + (rnd() < .2 ? 12 : 0), .7 + rnd() * .3);
    if (md.mel && (s === 0 || s === 6 || s === 10) && rnd() < md.mel) {
      const scale = [0, 2, 3, 5, 7, 9, 10].map(n => md.root + (M.transpose || 0) + n + 12);
      melNote = U.clamp(melNote + (rnd() < .5 ? 1 : -1) * (1 + (rnd() * 2 | 0)), 0, 9);
      const m = scale[melNote % 7] + (melNote >= 7 ? 12 : 0);
      clarinet(t, m, spb * (s === 10 ? 6 : 4));
    }
  }
  function tick() {
    if (!ensure() || !M.mood) return;
    const a = ac(), md = MOODS[M.mood];
    if (M.nextT < a.currentTime) M.nextT = a.currentTime + .05;
    while (M.nextT < a.currentTime + .25) {
      const spb = 60 / md.bpm / 4, sw = (M.step % 2) ? md.swing * spb : 0;
      play(M.step, M.nextT + sw);
      M.nextT += spb; M.step++;
      if (M.nextMood && M.step % 16 === 0) { M.mood = M.nextMood.mood; M.transpose = M.nextMood.tr; M.nextMood = null; M.step = 0; }
    }
  }
  M.start = function () {
    if (!ensure()) return;
    if (!M.timer) M.timer = setInterval(tick, 40);
    M.applyLevel();
  };
  M.applyLevel = function () { if (!M.gain) return; M.gain.gain.setTargetAtTime(M.levels[M.level] * (M.duck || 1), ac().currentTime, .3); };
  M.setLevel = function (i) { M.level = (i + M.levels.length) % M.levels.length; M.applyLevel(); };
  /** Cambia de ánimo al terminar el compás (sin cortes). tr: transposición en semitonos. */
  M.setMood = function (mood, tr) {
    if (M.mood === mood && (M.transpose || 0) === (tr || 0)) return;
    if (!M.mood) { M.mood = mood; M.transpose = tr || 0; M.step = 0; return; }
    M.nextMood = { mood, tr: tr || 0 };
  };
  /** Baja un poco la música mientras alguien habla o hay una secuencia. */
  M.setDuck = function (d) { if (M.duck === d) return; M.duck = d; M.applyLevel(); };
  return M;
})();
