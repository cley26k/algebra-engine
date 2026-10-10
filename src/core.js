/* THE ALGEBRA ENGINE — núcleo matemático y estado lógico.
 * Sin dependencias del DOM. Esta es la única fuente de verdad matemática:
 * el render sólo dibuja lo que este módulo calcula.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AlgebraCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------------------------------------------------------------
   * 1. ESTRUCTURAS
   * ------------------------------------------------------------- */

  /** Conjunto con operación "suma módulo mod". Si elements no es {0..mod-1}
   *  la estructura puede no ser cerrada: eso se detecta, no se oculta. */
  function additiveStructure(elements, mod, name) {
    if (!Number.isInteger(mod) || mod < 1) throw new Error('módulo inválido: ' + mod);
    const els = elements.slice();
    return {
      name: name || ('({' + els.join(',') + '}, +' + mod + ')'),
      elements: els,
      mod: mod,
      op: function (a, b) { return mod_(a + b, mod); },
      has: function (x) { return els.indexOf(x) !== -1; }
    };
  }

  function mod_(x, n) { return ((x % n) + n) % n; }

  /** Grupo cíclico Z_n = ({0..n-1}, +n). */
  function Zn(n) {
    const els = [];
    for (let i = 0; i < n; i++) els.push(i);
    return additiveStructure(els, n, 'Z' + n);
  }

  /** Pares (a,b) cuyo resultado se sale del conjunto. */
  function closureFailures(S) {
    const out = [];
    for (const a of S.elements) for (const b of S.elements) {
      const r = S.op(a, b);
      if (!S.has(r)) out.push({ a: a, b: b, result: r });
    }
    return out;
  }

  /** Comprobación completa de axiomas de grupo (conjunto finito). */
  function groupReport(S) {
    const closure = closureFailures(S);
    const closed = closure.length === 0;
    let assoc = true;
    if (closed) {
      for (const a of S.elements) for (const b of S.elements) for (const c of S.elements)
        if (S.op(S.op(a, b), c) !== S.op(a, S.op(b, c))) assoc = false;
    }
    let identity = null;
    for (const e of S.elements) {
      if (S.elements.every(function (x) { return S.op(e, x) === x && S.op(x, e) === x; })) { identity = e; break; }
    }
    let inverses = identity !== null && S.elements.every(function (x) {
      return S.elements.some(function (y) { return S.op(x, y) === identity && S.op(y, x) === identity; });
    });
    return { closed: closed, closure: closure, associative: assoc, identity: identity,
      inverses: inverses, isGroup: closed && assoc && identity !== null && inverses };
  }

  /* ---------------------------------------------------------------
   * 2. FUNCIONES Y VERIFICADOR
   * ------------------------------------------------------------- */

  /** f se representa como un array: f[x] = imagen o null (sin imagen). */
  function fromFunction(G, fn) { return G.elements.map(function (x) { return fn(x); }); }

  /** Verifica f: G → H sobre TODOS los pares ordenados (|G|² pares).
   *  Ruta A: combinar en G, luego transformar.  f(a +G b)
   *  Ruta B: transformar por separado, luego combinar en H.  f(a) +H f(b)
   */
  function checkHomomorphism(G, H, f) {
    const missing = G.elements.filter(function (x) { return f[x] === null || f[x] === undefined; });
    const outOfRange = G.elements.filter(function (x) { return f[x] !== null && f[x] !== undefined && !H.has(f[x]); });
    const total = missing.length === 0 && outOfRange.length === 0;
    const hGroup = groupReport(H);
    const pairs = [];
    for (const a of G.elements) for (const b of G.elements) {
      const sumG = G.op(a, b);
      const imgA = f[sumG];
      const fa = f[a], fb = f[b];
      const aDefined = imgA !== null && imgA !== undefined;
      const bDefined = fa !== null && fa !== undefined && fb !== null && fb !== undefined;
      const sumH = bDefined ? H.op(fa, fb) : null;
      let status;
      if (!aDefined || !bDefined) status = 'undefined';
      else if (!H.has(sumH)) status = 'escape';           // el resultado no vive en H
      else status = (imgA === sumH) ? 'ok' : 'fail';
      // 'escape' también es un desacuerdo real entre rutas (o un H no cerrado)
      pairs.push({ a: a, b: b, sumG: sumG, routeA: aDefined ? imgA : null,
        fa: bDefined ? fa : (fa === undefined ? null : fa), fb: bDefined ? fb : (fb === undefined ? null : fb),
        routeB: sumH, status: status, ok: status === 'ok' });
    }
    const allOk = pairs.every(function (p) { return p.ok; });
    const isHom = total && hGroup.isGroup && allOk;

    // Propiedades de la función (sólo con sentido si es total)
    let injective = false, surjective = false, collisions = [], kernel = [], image = [];
    if (total) {
      const byImage = {};
      for (const x of G.elements) (byImage[f[x]] = byImage[f[x]] || []).push(x);
      image = Object.keys(byImage).map(Number).sort(function (a, b) { return a - b; });
      collisions = image.filter(function (y) { return byImage[y].length > 1; })
        .map(function (y) { return { image: y, sources: byImage[y] }; });
      injective = collisions.length === 0;
      surjective = H.elements.every(function (y) { return byImage[y] !== undefined; });
      const idH = hGroup.identity;
      kernel = idH === null ? [] : G.elements.filter(function (x) { return f[x] === idH; });
    }
    const bijective = injective && surjective;
    return {
      total: total, missing: missing, outOfRange: outOfRange,
      target: hGroup, pairs: pairs, checkedPairs: pairs.length,
      allPairsAgree: allOk, isHomomorphism: isHom,
      injective: injective, surjective: surjective, bijective: bijective,
      isIsomorphism: isHom && bijective,
      collisions: collisions, kernel: kernel, image: image,
      counterexample: usefulCounterexample(pairs)
    };
  }

  /** El contraejemplo más didáctico: primero los que implican al neutro
   *  (0+0), luego por suma más pequeña. Ignora pares indefinidos. */
  function usefulCounterexample(pairs) {
    const bad = pairs.filter(function (p) { return p.status === 'fail' || p.status === 'escape'; });
    if (!bad.length) return null;
    bad.sort(function (p, q) {
      const k = function (r) { return (r.a === 0 && r.b === 0 ? -100 : 0) + (r.a + r.b) * 10 + r.a; };
      return k(p) - k(q);
    });
    return bad[0];
  }

  /* ---------------------------------------------------------------
   * 3. ESTADO LÓGICO DEL NIVEL ("La máquina que se comió el cuatro")
   *
   * Gramática de reglas (pequeña y sin ambigüedad):
   *   El riel tiene 4 ranuras con muesca de forma distinta. Cada ranura
   *   acepta sólo bloques de su tipo. Una regla está ACTIVA ⇔ está encajada.
   *     motor  ← ARRANCA      (sin él la palanca está trabada)
   *     total  ← TODO         (cada elemento debe tener imagen)
   *     puerta ← COMPARTIDO | EXCLUSIVO   (política de destinos; obligatoria para ejecutar)
   *     ley    ← CONSERVA     (la máquina compara Ruta A y Ruta B)
   *   El cartel del mundo de destino es la frase "AQUÍ SE SUMA MÓD [ficha]".
   *   La ficha (2 ó 4) es obligatoria para ejecutar. Las fichas retiradas
   *   se las come la máquina (quedan en su barriga, visible por la ventanilla).
   * ------------------------------------------------------------- */

  const BLOCKS = {
    ARRANCA:    { slot: 'motor',  text: ['LA MÁQUINA', 'ARRANCA'] },
    TODO:       { slot: 'total',  text: ['TODO', 'TIENE IMAGEN'] },
    COMPARTIDO: { slot: 'puerta', text: ['DESTINO', 'COMPARTIDO'] },
    EXCLUSIVO:  { slot: 'puerta', text: ['DESTINO', 'EXCLUSIVO'] },
    CONSERVA:   { slot: 'ley',    text: ['CONSERVA', 'LA SUMA'] }
  };
  const SLOTS = ['motor', 'total', 'puerta', 'ley'];

  function initialConfig() {
    return {
      slots: { motor: null, total: 'TODO', puerta: 'EXCLUSIVO', ley: 'CONSERVA' },
      tray: ['ARRANCA', 'COMPARTIDO'],
      chip: 4,          // la máquina copió el 4 del origen sin pensar
      belly: [2],       // el 2 está dentro de la máquina
      map: [null, null, null, null],
      plugOrder: [0, 0, 0, 0],
      plugCounter: 0
    };
  }

  function clone(c) { return JSON.parse(JSON.stringify(c)); }

  function createLevel() {
    const G = Zn(4);
    let cfg = initialConfig();
    const history = [];
    const listeners = [];

    function emit(type, data) { for (const l of listeners) l(type, data || {}); }
    function commit(label, mutate) {
      const before = clone(cfg);
      const result = mutate(cfg);
      if (result && result.rejected) { cfg = before; return result; }
      history.push({ label: label, cfg: before });
      if (history.length > 200) history.shift();
      emit('change', { label: label, result: result || {} });
      return result || { ok: true };
    }

    function target() { return additiveStructure([0, 1], cfg.chip || 1, 'H'); }

    function sharersOf(c, y) { return [0, 1, 2, 3].filter(function (x) { return c.map[x] === y; }); }

    /** Aplica la regla EXCLUSIVO al estado: expulsa a los que llegaron después. */
    function enforceExclusive(c) {
      const evicted = [];
      if (c.slots.puerta !== 'EXCLUSIVO') return evicted;
      for (const y of [0, 1]) {
        const s = sharersOf(c, y).sort(function (p, q) { return c.plugOrder[p] - c.plugOrder[q]; });
        for (let i = 1; i < s.length; i++) { c.map[s[i]] = null; evicted.push({ x: s[i], y: y, keeper: s[0] }); }
      }
      return evicted;
    }

    const api = {
      G: G,
      BLOCKS: BLOCKS, SLOTS: SLOTS,
      get config() { return cfg; },
      target: target,
      on: function (fn) { listeners.push(fn); },
      canUndo: function () { return history.length > 0; },

      plug: function (x, y) {
        if (!(x >= 0 && x < 4) || !(y === 0 || y === 1)) return { rejected: true, reason: 'invalid' };
        if (cfg.map[x] === y) return { ok: true, noop: true };
        if (cfg.slots.puerta === 'EXCLUSIVO') {
          const occ = sharersOf(cfg, y).filter(function (o) { return o !== x; });
          if (occ.length) return { rejected: true, reason: 'exclusive', occupant: occ[0] };
        }
        return commit('plug', function (c) {
          c.map[x] = y; c.plugOrder[x] = ++c.plugCounter;
          const sharers = sharersOf(c, y);
          return { ok: true, x: x, y: y, shared: sharers.length > 1 ? sharers : null };
        });
      },
      unplug: function (x) {
        if (cfg.map[x] === null) return { ok: true, noop: true };
        return commit('unplug', function (c) { const y = c.map[x]; c.map[x] = null; return { ok: true, x: x, y: y }; });
      },
      /** Encaja un bloque en su ranura. Si estaba ocupada, intercambia. */
      insertBlock: function (id, slot) {
        const b = BLOCKS[id];
        if (!b) return { rejected: true, reason: 'unknown' };
        slot = slot || b.slot;
        if (b.slot !== slot) return { rejected: true, reason: 'shape', id: id, slot: slot };
        if (cfg.slots[slot] === id) return { ok: true, noop: true };
        return commit('insert', function (c) {
          const prev = c.slots[slot];
          c.tray = c.tray.filter(function (t) { return t !== id; });
          for (const s of SLOTS) if (c.slots[s] === id) c.slots[s] = null;
          c.slots[slot] = id;
          if (prev) c.tray.push(prev);
          const evicted = enforceExclusive(c);
          return { ok: true, id: id, slot: slot, swapped: prev, evicted: evicted };
        });
      },
      removeBlock: function (id) {
        const slot = SLOTS.filter(function (s) { return cfg.slots[s] === id; })[0];
        if (!slot) return { ok: true, noop: true };
        return commit('remove', function (c) { c.slots[slot] = null; c.tray.push(id); return { ok: true, id: id, slot: slot }; });
      },
      /** Pone una ficha (desde la barriga) en el cartel; la anterior se la come la máquina. */
      setChip: function (n) {
        if (cfg.chip === n) return { ok: true, noop: true };
        if (cfg.belly.indexOf(n) === -1) return { rejected: true, reason: 'nochip' };
        return commit('chip', function (c) {
          const prev = c.chip;
          c.belly = c.belly.filter(function (k) { return k !== n; });
          if (prev !== null) c.belly.push(prev);
          c.chip = n;
          return { ok: true, chip: n, eaten: prev };
        });
      },
      removeChip: function () {
        if (cfg.chip === null) return { ok: true, noop: true };
        return commit('chip', function (c) { const p = c.chip; c.belly.push(p); c.chip = null; return { ok: true, eaten: p }; });
      },
      undo: function () {
        if (!history.length) return { ok: false };
        const h = history.pop();
        cfg = h.cfg;
        emit('change', { label: 'undo', undone: h.label, result: {} });
        return { ok: true, undone: h.label };
      },
      /** Reiniciar también se puede deshacer: nunca se pierde un experimento. */
      reset: function () {
        return commit('reset', function (c) {
          const fresh = initialConfig();
          for (const k in fresh) c[k] = fresh[k];
          return { ok: true };
        });
      },

      /** Fija un estado sin historial (secuencias narrativas). Notifica para que el mundo lo anime. */
      setRaw: function (c, label) {
        cfg = clone(c);
        emit('change', { label: label || 'raw', result: {} });
      },
      clearHistory: function () { history.length = 0; },

      /** Comprobaciones de gramática antes de ejecutar. */
      preflight: function () {
        const problems = [];
        if (cfg.slots.motor !== 'ARRANCA') problems.push('motor');
        if (cfg.chip === null) problems.push('chip');
        if (!cfg.slots.puerta) problems.push('puerta');
        return { ok: problems.length === 0, problems: problems };
      },

      /** Ejecuta la máquina: devuelve un informe puramente lógico. */
      run: function () {
        const pre = api.preflight();
        if (!pre.ok) return { ran: false, preflight: pre };
        const H = target();
        const f = cfg.map.slice();
        const rules = {
          total: cfg.slots.total === 'TODO',
          conserve: cfg.slots.ley === 'CONSERVA',
          exclusive: cfg.slots.puerta === 'EXCLUSIVO'
        };
        const check = checkHomomorphism(G, H, f);
        let verdict;
        if (rules.total && !check.total) verdict = 'incomplete';
        else if (!rules.conserve) verdict = check.total ? 'unchecked' : 'partial-unchecked';
        else if (!check.total) verdict = 'uncertifiable';
        else if (check.isHomomorphism) verdict = 'homomorphism';
        else verdict = 'broken';
        const order = {
          sums: verdict === 'homomorphism',
          visits: check.total && check.surjective,
        };
        order.done = order.sums && order.visits;
        return { ran: true, f: f, chip: cfg.chip, rules: rules, check: check, verdict: verdict, order: order,
          signature: JSON.stringify([f, cfg.chip, cfg.slots]) };
      },

      /** Intenta invertir la máquina para una imagen y: ¿de dónde vino? */
      reverse: function (y) {
        const sources = cfg.map.map(function (v, x) { return v === y ? x : -1; }).filter(function (x) { return x >= 0; });
        return { y: y, sources: sources, unique: sources.length === 1 };
      }
    };
    return api;
  }

  return {
    mod: mod_, Zn: Zn, additiveStructure: additiveStructure,
    closureFailures: closureFailures, groupReport: groupReport,
    fromFunction: fromFunction, checkHomomorphism: checkHomomorphism,
    usefulCounterexample: usefulCounterexample,
    BLOCKS: BLOCKS, SLOTS: SLOTS, initialConfig: initialConfig, createLevel: createLevel
  };
});
