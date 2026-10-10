/* THE ALGEBRA ENGINE — grupos finitos genéricos, verificadores y estado de los niveles 2–8.
 * Sin DOM. Los elementos son índices 0..n-1 con etiquetas; la operación es una tabla de Cayley.
 * Nada aquí supone que la identidad se llama "0".
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AlgebraGroups = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* =============================================================
   * 1. GRUPOS
   * =========================================================== */
  function makeGroup(key, name, labels, opIdx, symbol) {
    const n = labels.length, table = [];
    for (let i = 0; i < n; i++) { table.push([]); for (let j = 0; j < n; j++) table[i].push(opIdx(i, j)); }
    const G = { key, name, labels: labels.slice(), n, table, symbol: symbol || '+',
      op: (i, j) => table[i][j], idx: lab => labels.indexOf(String(lab)) };
    const rep = groupAxioms(G);
    if (!rep.isGroup) throw new Error(key + ' no es un grupo: ' + JSON.stringify(rep.failure));
    G.identity = rep.identity;
    G.inverse = i => { for (let j = 0; j < n; j++) if (table[i][j] === G.identity) return j; return null; };
    return G;
  }
  /** Comprueba los axiomas con testigo del primer fallo. */
  function groupAxioms(G, subset) {
    const S = subset || G.labels.map((_, i) => i), inS = x => S.indexOf(x) !== -1;
    if (!S.length) return { isGroup: false, failure: { kind: 'empty' } };
    for (const a of S) for (const b of S) { const c = G.table[a][b]; if (!inS(c)) return { isGroup: false, failure: { kind: 'closure', a, b, c } }; }
    for (const a of S) for (const b of S) for (const c of S)
      if (G.table[G.table[a][b]][c] !== G.table[a][G.table[b][c]]) return { isGroup: false, failure: { kind: 'assoc', a, b, c } };
    let e = null;
    for (const x of S) if (S.every(y => G.table[x][y] === y && G.table[y][x] === y)) { e = x; break; }
    if (e === null) return { isGroup: false, failure: { kind: 'identity' } };
    for (const a of S) if (!S.some(b => G.table[a][b] === e && G.table[b][a] === e)) return { isGroup: false, failure: { kind: 'inverse', a }, identity: e };
    return { isGroup: true, identity: e };
  }
  /** ¿Es S ⊆ G un subgrupo (con la identidad de G)? */
  function subgroupReport(G, S) {
    if (!S.length) return { ok: false, failure: { kind: 'empty' } };
    if (S.indexOf(G.identity) === -1) return { ok: false, failure: { kind: 'identity', e: G.identity } };
    const r = groupAxioms(G, S);
    return r.isGroup ? { ok: true } : { ok: false, failure: r.failure };
  }
  function orderOf(G, i) {
    let x = i, k = 1;
    while (x !== G.identity) { x = G.op(x, i); k++; if (k > G.n + 1) return Infinity; }
    return k;
  }
  /** Potencias x, x∘x, … hasta volver a la identidad (para la máquina de órdenes). */
  function powers(G, i) {
    const out = [i]; let x = i;
    while (x !== G.identity && out.length <= G.n) { x = G.op(x, i); out.push(x); }
    return out;
  }
  function orderProfile(G) { return G.labels.map((_, i) => orderOf(G, i)).sort((a, b) => a - b); }

  const Z = n => makeGroup('Z' + n, 'Z' + n, Array.from({ length: n }, (_, i) => String(i)), (i, j) => (i + j) % n, '+');
  const GROUPS = {
    Z2: Z(2), Z4: Z(4), Z8: Z(8),
    // {0,2} ⊂ Z4 como grupo por derecho propio (etiquetas reales 0 y 2, suma módulo 4)
    SUB2: makeGroup('SUB2', '{0, 2} ⊂ Z4', ['0', '2'], (i, j) => ((i * 2 + j * 2) % 4) / 2, '+'),
    // Mundo espejo: {0,1} con a⊙b = 1 si a = b. Su identidad es el "1".
    MIRROR: makeGroup('MIRROR', 'Espejo', ['0', '1'], (i, j) => (i === j ? 1 : 0), '⊙'),
    // Unidades módulo 5 con el producto
    U5: makeGroup('U5', 'U(5)', ['1', '2', '3', '4'], (i, j) => [1, 2, 3, 4].indexOf(((i + 1) * (j + 1)) % 5), '×'),
    // Grupo de Klein
    V4: makeGroup('V4', 'V4', ['e', 'a', 'b', 'c'], (i, j) => i ^ j, '∘'),
  };

  /* =============================================================
   * 2. FUNCIONES ENTRE GRUPOS
   * =========================================================== */
  /** Análisis completo de f: G → H (f[i] = índice en H o null), con codominio opcional C ⊆ H. */
  function analyze(G, H, f, codomain) {
    const C = codomain || H.labels.map((_, i) => i), inC = y => C.indexOf(y) !== -1;
    const def = x => f[x] !== null && f[x] !== undefined;
    const missing = [], outside = [];
    for (let x = 0; x < G.n; x++) { if (!def(x)) missing.push(x); else if (!inC(f[x])) outside.push(x); }
    const total = missing.length === 0 && outside.length === 0;
    const codomainReport = subgroupReport(H, C);
    const pairs = [];
    for (let a = 0; a < G.n; a++) for (let b = 0; b < G.n; b++) {
      const s = G.op(a, b), A = def(s) ? f[s] : null;
      const B = def(a) && def(b) ? H.op(f[a], f[b]) : null;
      let status = A === null || B === null ? 'undefined' : A === B ? 'ok' : 'fail';
      pairs.push({ a, b, sumG: s, routeA: A, fa: def(a) ? f[a] : null, fb: def(b) ? f[b] : null, routeB: B, status, ok: status === 'ok' });
    }
    const allOk = pairs.every(p => p.ok);
    const hom = total && allOk;
    const byImg = {};
    for (let x = 0; x < G.n; x++) if (def(x)) (byImg[f[x]] = byImg[f[x]] || []).push(x);
    const image = Object.keys(byImg).map(Number).sort((a, b) => a - b);
    const collisions = image.filter(y => byImg[y].length > 1).map(y => ({ y, xs: byImg[y] }));
    const unreached = C.filter(y => !byImg[y]);
    const injective = total && collisions.length === 0;
    const surjective = total && unreached.length === 0;
    const kernel = G.labels.map((_, x) => x).filter(x => f[x] === H.identity);
    const kernelTrivial = total && kernel.length === 1 && kernel[0] === G.identity;
    const identityOk = def(G.identity) && f[G.identity] === H.identity;
    let inverseHom = false;
    if (hom && injective && surjective && codomainReport.ok) {
      const inv = {}; for (let x = 0; x < G.n; x++) inv[f[x]] = x;
      inverseHom = C.every(u => C.every(v => inv[H.op(u, v)] === G.op(inv[u], inv[v])));
    }
    const groupOk = codomainReport.ok;
    return {
      total, missing, outside, pairs, checkedPairs: pairs.length, hom,
      counterexample: usefulCounterexample(pairs, G),
      kernel, kernelTrivial, image, imageIsSubgroup: subgroupReport(H, image).ok,
      collisions, unreached, injective, surjective, identityOk,
      codomain: C.slice(), codomainReport,
      // en la categoría de grupos: mono ⇔ homomorfismo inyectivo; epi ⇔ homomorfismo sobreyectivo
      mono: hom && injective, epi: hom && surjective && groupOk,
      iso: hom && injective && surjective && groupOk, inverseHom,
    };
  }
  function usefulCounterexample(pairs, G) {
    const bad = pairs.filter(p => p.status === 'fail');
    if (!bad.length) return null;
    const e = G ? G.identity : 0;
    const key = p => (p.a === e && p.b === e ? -1000 : 0) + (p.a === e || p.b === e ? -100 : 0) + p.a * 10 + p.b;
    return bad.sort((p, q) => key(p) - key(q))[0];
  }
  function permutations(arr) {
    if (arr.length <= 1) return [arr.slice()];
    const out = [];
    arr.forEach((x, i) => permutations(arr.slice(0, i).concat(arr.slice(i + 1))).forEach(p => out.push([x].concat(p))));
    return out;
  }
  function allHoms(G, H) {
    const out = [], f = Array(G.n).fill(0);
    const rec = k => { if (k === G.n) { if (analyze(G, H, f).hom) out.push(f.slice()); return; } for (let y = 0; y < H.n; y++) { f[k] = y; rec(k + 1); } };
    rec(0); return out;
  }
  function isomorphisms(G, H) {
    if (G.n !== H.n) return [];
    return permutations(H.labels.map((_, i) => i)).filter(p => analyze(G, H, p).iso);
  }

  /* =============================================================
   * 3. DEFINICIONES DE NIVEL (fuente de verdad de cada objetivo)
   * =========================================================== */
  const L = lab => lab;  // las etiquetas se convierten a índices al crear el puzle
  const LEVELS = {
    1: { name: 'La máquina que se comió el cuatro', machine: 'traductora', concept: 'homomorfismo' },
    2: { name: 'La garra del núcleo', machine: 'garra', concept: 'núcleo y monomorfismo',
      G: 'Z4', H: 'Z4', initial: ['0', '2', '0', '2'],
      goals: ['hom', 'kernelTrivial'],
      order: 'Que la garra no encuentre nada en el núcleo salvo la identidad, sin romper las sumas.' },
    3: { name: 'La trituradora de destinos', machine: 'trituradora', concept: 'imagen, sobreyectividad y epimorfismo',
      G: 'SUB2', H: 'Z4', initial: ['0', '2'], mapLocked: true, shredder: true,
      goals: ['hom', 'codomainGroup', 'surjective'],
      order: 'Que ningún destino se quede sin visitas. El cable está soldado: sólo se puede tocar el destino.' },
    4: { name: 'El espejo de las identidades', machine: 'espejo', concept: 'f(e) = e',
      G: 'Z4', H: 'MIRROR', initial: ['0', '1', '0', '1'],
      goals: ['hom', 'surjective'], showIdentity: true,
      order: 'Traducir el reloj de 4 al mundo espejo sin romper las sumas, visitando a los dos.' },
    5: { name: 'La fábrica de copias', machine: 'copias', concept: 'inyectividad y sobreyectividad',
      machines: [
        { name: 'COPIADORA A', G: 'Z4', H: 'Z2', f: ['0', '1', '0', '1'] },
        { name: 'COPIADORA B', G: 'Z2', H: 'Z4', f: ['0', '2'] },
        { name: 'COPIADORA C', G: 'Z4', H: 'Z4', f: ['0', '1', '3', '2'] },
      ],
      order: 'Rellenar el parte de cada copiadora: ¿conserva la suma? ¿inyectiva? ¿sobreyectiva?' },
    6: { name: 'El ensamblador reversible', machine: 'ensamblador', concept: 'isomorfismo',
      G: 'Z4', H: 'U5', initial: ['1', '4', '1', '4'],
      goals: ['hom', 'injective', 'surjective', 'inverseHom'],
      order: 'Que la máquina pueda ir y volver sin perder a nadie, conservando la operación.' },
    7: { name: 'Los gemelos imposibles', machine: 'gemelos', concept: 'orden de los elementos',
      G: 'Z4', H: 'V4', initial: ['e', 'a', 'b', 'c'],
      order: 'Conectar el reloj de 4 con los gemelos de Klein mediante un isomorfismo. (O demostrar que no se puede.)' },
    8: { name: 'El corazón de la fábrica', machine: 'corazon', concept: 'síntesis',
      G: 'Z4', H: 'Z8', initial: ['0', '4', '0', '4'], shredder: true,
      goals: ['hom', 'kernelTrivial', 'codomainGroup', 'surjective', 'iso'],
      order: 'Que el corazón traduzca el reloj de 4 sin perder a nadie y sin destinos vacíos: reversible en los dos sentidos.' },
  };
  const GOAL_TEXT = {
    hom: 'las sumas sobreviven (16 pares)', kernelTrivial: 'en el núcleo sólo la identidad', injective: 'nadie comparte destino',
    surjective: 'ningún destino sin visitas', codomainGroup: 'el destino sigue siendo un grupo', inverseHom: 'el camino de vuelta también conserva',
    iso: 'reversible: es un isomorfismo', identity: 'el neutro va al neutro: f(e) = e',
  };

  /* =============================================================
   * 4. ESTADO DE UN NIVEL DE BANCO DE TRABAJO (2, 3, 4, 6, 8)
   * =========================================================== */
  function history(initial) {
    let cfg = JSON.parse(JSON.stringify(initial));
    const past = [], listeners = [];
    return {
      get cfg() { return cfg; },
      on: fn => listeners.push(fn),
      emit: (t, d) => listeners.forEach(l => l(t, d || {})),
      commit(label, mutate) {
        const before = JSON.parse(JSON.stringify(cfg));
        const r = mutate(cfg) || { ok: true };
        if (r.rejected) { cfg = before; return r; }
        past.push(before); if (past.length > 200) past.shift();
        this.emit('change', { label, result: r }); return r;
      },
      undo() { if (!past.length) return { ok: false }; cfg = past.pop(); this.emit('change', { label: 'undo', result: {} }); return { ok: true }; },
      canUndo: () => past.length > 0,
      reset() { return this.commit('reset', c => { const fresh = JSON.parse(JSON.stringify(initial)); for (const k in fresh) c[k] = fresh[k]; return { ok: true }; }); },
    };
  }

  function createPuzzle(id) {
    const def = LEVELS[id], G = GROUPS[def.G], H = GROUPS[def.H];
    const init = { map: def.initial.map(l => H.idx(l)), codomain: H.labels.map((_, i) => i) };
    const h = history(init);
    const api = {
      id, def, G, H, on: h.on,
      get config() { return h.cfg; },
      canUndo: h.canUndo, undo: () => h.undo(), reset: () => h.reset(),
      plug(x, y) {
        if (def.mapLocked) return { rejected: true, reason: 'locked' };
        if (h.cfg.codomain.indexOf(y) === -1) return { rejected: true, reason: 'shredded' };
        if (h.cfg.map[x] === y) return { ok: true, noop: true };
        return h.commit('plug', c => { c.map[x] = y; return { ok: true, x, y }; });
      },
      unplug(x) {
        if (def.mapLocked) return { rejected: true, reason: 'locked' };
        if (h.cfg.map[x] === null) return { ok: true, noop: true };
        return h.commit('unplug', c => { const y = c.map[x]; c.map[x] = null; return { ok: true, x, y }; });
      },
      /** La trituradora valida ANTES de triturar: lo que queda debe ser un subgrupo que contenga la imagen. */
      checkShred(list) {
        if (!def.shredder) return { ok: false, reason: 'noshredder' };
        const cod = h.cfg.codomain, rest = cod.filter(y => list.indexOf(y) === -1);
        const reached = list.filter(y => h.cfg.map.indexOf(y) !== -1);
        if (!list.length) return { ok: false, reason: 'nothing' };
        if (reached.length) return { ok: false, reason: 'reached', reached };
        const sg = subgroupReport(H, rest);
        if (!sg.ok) return { ok: false, reason: 'subgroup', failure: sg.failure, rest };
        return { ok: true, rest };
      },
      shred(list) {
        const r = api.checkShred(list);
        if (!r.ok) return Object.assign({ rejected: true }, r);
        return h.commit('shred', c => { c.codomain = r.rest; return { ok: true, shredded: list.slice(), rest: r.rest }; });
      },
      evaluate() {
        const c = h.cfg, A = analyze(G, H, c.map, c.codomain);
        const val = {
          hom: A.hom, kernelTrivial: A.kernelTrivial, injective: A.injective, surjective: A.surjective,
          codomainGroup: A.codomainReport.ok, inverseHom: A.inverseHom, iso: A.iso, identity: A.identityOk,
        };
        const goals = def.goals.map(k => ({ key: k, text: GOAL_TEXT[k], ok: !!val[k] }));
        return { analysis: A, goals, done: goals.every(g => g.ok), map: c.map.slice(), codomain: c.codomain.slice() };
      },
      reverse(y) {
        const xs = h.cfg.map.map((v, x) => v === y ? x : -1).filter(x => x >= 0);
        return { y, sources: xs, unique: xs.length === 1 };
      },
    };
    return api;
  }

  /* =============================================================
   * 5. NIVEL 5 — diagnóstico de tres copiadoras
   * =========================================================== */
  const PROPS = ['hom', 'injective', 'surjective'];
  function createCopies() {
    const def = LEVELS[5];
    const machines = def.machines.map(m => {
      const G = GROUPS[m.G], H = GROUPS[m.H], f = m.f.map(l => H.idx(l));
      const A = analyze(G, H, f);
      return { name: m.name, G, H, f, analysis: A, truth: { hom: A.hom, injective: A.injective, surjective: A.surjective } };
    });
    const h = history({ diag: machines.map(() => ({ hom: null, injective: null, surjective: null })), tested: machines.map(() => ({ hom: false, injective: false, surjective: false })) });
    const api = {
      id: 5, def, machines, on: h.on, PROPS,
      get config() { return h.cfg; },
      canUndo: h.canUndo, undo: () => h.undo(), reset: () => h.reset(),
      /** Ejecutar una herramienta sobre una copiadora (experimento real). */
      test(m, prop) {
        const M = machines[m], A = M.analysis;
        let detail;
        if (prop === 'hom') detail = { pairs: A.pairs, counterexample: A.counterexample };
        if (prop === 'injective') detail = { collisions: A.collisions };
        if (prop === 'surjective') detail = { unreached: A.unreached };
        if (!h.cfg.tested[m][prop]) h.commit('test', c => { c.tested[m][prop] = true; return { ok: true, m, prop }; });
        return Object.assign({ m, prop, value: M.truth[prop] }, detail);
      },
      setDiag(m, prop, value) { return h.commit('diag', c => { c.diag[m][prop] = value; return { ok: true, m, prop, value }; }); },
      evaluate() {
        const rows = machines.map((M, m) => PROPS.map(p => ({ prop: p, set: h.cfg.diag[m][p], truth: M.truth[p], ok: h.cfg.diag[m][p] === M.truth[p] })));
        const done = rows.every(r => r.every(c => c.ok));
        return { rows, done, wrong: rows.flatMap((r, m) => r.filter(c => c.set !== null && !c.ok).map(c => ({ m, prop: c.prop }))) };
      },
    };
    return api;
  }

  /* =============================================================
   * 6. NIVEL 7 — Z4 frente a V4
   * =========================================================== */
  function createTwins() {
    const def = LEVELS[7], G = GROUPS[def.G], H = GROUPS[def.H];
    const h = history({ map: def.initial.map(l => H.idx(l)) });
    const measured = { G: {}, H: {} };   // conocimiento adquirido: no se deshace
    const api = {
      id: 7, def, G, H, on: h.on, measured,
      get config() { return h.cfg; },
      canUndo: h.canUndo, undo: () => h.undo(), reset: () => h.reset(),
      plug(x, y) {
        if (h.cfg.map[x] === y) return { ok: true, noop: true };
        // conectar a un destino ocupado intercambia los cables: siempre una biyección
        return h.commit('plug', c => { const prev = c.map.indexOf(y), old = c.map[x]; c.map[x] = y; if (prev !== -1 && prev !== x) c.map[prev] = old; return { ok: true, x, y, swapped: prev !== -1 && prev !== x ? prev : null }; });
      },
      measure(side, i) {
        const K = side === 'G' ? G : H, o = orderOf(K, i);
        measured[side][i] = o;
        return { side, i, order: o, powers: powers(K, i) };
      },
      evaluate() { return { analysis: analyze(G, H, h.cfg.map), map: h.cfg.map.slice() }; },
      /** Declarar imposible: sólo vale con pruebas que realmente lo demuestren. */
      declareImpossible() {
        const truth = isomorphisms(G, H).length === 0;
        const hMeasured = Object.keys(measured.H).length === H.n;
        const hOrders = Object.values(measured.H);
        const witness = Object.keys(measured.G).map(Number).find(g => hMeasured && hOrders.indexOf(measured.G[g]) === -1);
        if (witness !== undefined && truth) return { ok: true, witness, order: measured.G[witness], hOrders: H.labels.map((_, i) => measured.H[i]) };
        // pruebas insuficientes: decir qué falta, sin dar la respuesta
        const missingH = H.labels.map((_, i) => i).filter(i => measured.H[i] === undefined);
        return { ok: false, reason: missingH.length ? 'measureH' : 'noWitness', missingH, truth };
      },
    };
    return api;
  }

  /* =============================================================
   * 7. DIAGNÓSTICO (iteración 3): cada fallo devuelve información
   * =========================================================== */
  /** a · b⁻¹ en G. Si f(a) = f(b) y f es homomorfismo, f(a·b⁻¹) = e. */
  function difference(G, a, b) { return G.op(a, G.inverse(b)); }
  /** Distingue los cinco casos que el jugador debe poder separar. */
  function diagnose(G, H, f, codomain) {
    const A = analyze(G, H, f, codomain);
    const d = { analysis: A, missing: A.missing, outside: A.outside };
    if (!A.total) { d.kind = 'incomplete'; return d; }
    if (!A.hom) { d.kind = 'broken'; d.counterexample = A.counterexample; return d; }
    d.collision = A.collisions[0] || null;
    if (d.collision) {
      const [a, b] = d.collision.xs, dd = difference(G, b, a);
      d.witness = { a, b, d: dd, fd: f[dd] };      // f(b·a⁻¹) cae en el neutro
    }
    d.empty = A.unreached.slice();
    d.kind = A.iso ? 'iso' : !A.injective && !A.surjective ? 'hom-neither' : !A.injective ? 'hom-noninj' : !A.surjective ? 'hom-nonsurj' : 'iso';
    if (d.kind === 'iso' && !A.codomainReport.ok) d.kind = 'hom-badcodomain';
    return d;
  }
  /** Para G cíclico con generador gen: f(genᵏ) := imgᵏ. Si la vuelta no cierra, se indica dónde. */
  function powerMap(G, H, gen, img) {
    const f = Array(G.n).fill(null);
    let x = G.identity, y = H.identity, k = 0;
    while (f[x] === null && k <= G.n) { f[x] = y; x = G.op(x, gen); y = H.op(y, img); k++; }
    const closes = y === f[x];            // al volver al principio, ¿el destino también vuelve?
    return { f, steps: k, closes, endsAt: y, ord: orderOf(G, gen) };
  }
  /** Lo que comprueba el probador de cierre, par por par, con el primer fallo. */
  function closureRun(H, set) {
    const checks = [];
    if (set.indexOf(H.identity) === -1) return { ok: false, checks, failure: { kind: 'identity', e: H.identity } };
    for (const a of set) for (const b of set) { const c = H.op(a, b); checks.push({ a, b, c, ok: set.indexOf(c) !== -1 }); }
    const bad = checks.find(c => !c.ok);
    if (bad) return { ok: false, checks, failure: { kind: 'closure', a: bad.a, b: bad.b, c: bad.c } };
    const noInv = set.find(a => set.indexOf(H.inverse(a)) === -1);
    if (noInv !== undefined) return { ok: false, checks, failure: { kind: 'inverse', a: noInv } };
    return { ok: true, checks };
  }

  /* =============================================================
   * 8. ESTADOS DE LOS NIVELES REDISEÑADOS (iteración 3)
   *    Todos aceptan CUALQUIER solución que cumpla las condiciones.
   * =========================================================== */
  const isNum = v => v !== null && v !== undefined;
  /* --- Nivel 2: taller de inspección --- */
  function createWorkshop(opts) {
    opts = opts || {};
    const G = GROUPS[opts.G || 'Z4'], H = GROUPS[opts.H || 'Z4'];
    const gen = G.idx('1');
    const h = history({ k: H.idx(opts.k || '2'), coupled: true, manual: null });
    const api = {
      G, H, gen, on: h.on, get config() { return h.cfg; }, canUndo: h.canUndo, undo: () => h.undo(), reset: () => h.reset(),
      map() { const c = h.cfg; return c.coupled ? powerMap(G, H, gen, c.k).f : c.manual.slice(); },
      gear() { return powerMap(G, H, gen, h.cfg.k); },
      setK(y) { if (h.cfg.k === y && h.cfg.coupled) return { ok: true, noop: true }; return h.commit('k', c => { c.k = y; c.coupled = true; c.manual = null; return { ok: true, k: y }; }); },
      decouple() { if (!h.cfg.coupled) return { ok: true, noop: true }; const f = api.map(); return h.commit('decouple', c => { c.coupled = false; c.manual = f; return { ok: true }; }); },
      setManual(x, y) { if (h.cfg.coupled) api.decouple(); if (h.cfg.manual[x] === y) return { ok: true, noop: true }; return h.commit('manual', c => { c.manual[x] = y; return { ok: true, x, y }; }); },
      diagnose() { return diagnose(G, H, api.map()); },
      evaluate() { const d = api.diagnose(), A = d.analysis; const goals = [{ key: 'hom', ok: A.hom }, { key: 'kernelTrivial', ok: A.kernelTrivial }]; return { d, goals, done: goals.every(g => g.ok), map: api.map() }; },
      /** Lupa comparadora: dos piezas del mismo cajón → su diferencia y adónde cae. */
      compare(a, b) { const f = api.map(), dd = difference(G, b, a); return { a, b, d: dd, fa: f[a], fb: f[b], fd: f[dd], same: f[a] === f[b], inKernel: f[dd] === H.identity }; },
    };
    return api;
  }
  /* --- Nivel 3: planta de clasificación --- */
  function createPlant() {
    const G = GROUPS.SUB2, H = GROUPS.Z4, f = [H.idx('0'), H.idx('2')];
    const h = history({ codomain: [0, 1, 2, 3], tags: [], tested: null });
    const api = {
      G, H, f, on: h.on, get config() { return h.cfg; }, canUndo: h.canUndo, undo: () => h.undo(), reset: () => h.reset(),
      preimages(y) { return f.map((v, x) => v === y ? x : -1).filter(x => x >= 0); },
      tag(y) { const c = h.cfg; if (c.codomain.indexOf(y) === -1) return { rejected: true, reason: 'gone' }; return h.commit('tag', c2 => { const i = c2.tags.indexOf(y); if (i === -1) c2.tags.push(y); else c2.tags.splice(i, 1); c2.tags.sort(); c2.tested = null; return { ok: true, y, tagged: i === -1 }; }); },
      /** El probador de cierre trabaja sobre lo que QUEDARÍA. */
      test() {
        const c = h.cfg, rest = c.codomain.filter(y => c.tags.indexOf(y) === -1);
        const visited = c.tags.filter(y => api.preimages(y).length);
        const run = closureRun(H, rest);
        const res = { rest, visited, run, ok: run.ok && !visited.length && c.tags.length > 0 };
        h.commit('test', c2 => { c2.tested = { tags: c2.tags.slice(), ok: res.ok }; return { ok: true }; });
        return res;
      },
      shred() {
        const c = h.cfg;
        if (!c.tags.length) return { rejected: true, reason: 'nothing' };
        if (!c.tested || JSON.stringify(c.tested.tags) !== JSON.stringify(c.tags)) return { rejected: true, reason: 'untested' };
        if (!c.tested.ok) return { rejected: true, reason: 'failed' };
        return h.commit('shred', c2 => { const gone = c2.tags.slice(); c2.codomain = c2.codomain.filter(y => gone.indexOf(y) === -1); c2.tags = []; c2.tested = null; return { ok: true, gone }; });
      },
      diagnose() { return diagnose(G, H, f, h.cfg.codomain); },
      evaluate() { const d = api.diagnose(), A = d.analysis; const goals = [{ key: 'hom', ok: A.hom }, { key: 'codomainGroup', ok: A.codomainReport.ok }, { key: 'surjective', ok: A.surjective }]; return { d, goals, done: goals.every(g => g.ok) }; },
    };
    return api;
  }
  /* --- Nivel 4: sala de espejos --- */
  function createMirrors() {
    const G = GROUPS.Z4, H = GROUPS.MIRROR;
    const h = history({ faces: [H.idx('0'), H.idx('1'), H.idx('0'), H.idx('1')], walks: 0 });
    const api = {
      G, H, on: h.on, get config() { return h.cfg; }, canUndo: h.canUndo, undo: () => h.undo(), reset: () => h.reset(),
      flip(x) { return h.commit('flip', c => { c.faces[x] = 1 - c.faces[x]; return { ok: true, x, y: c.faces[x] }; }); },
      /** Una pareja pasea por la pasarela: las dos rutas, de verdad. */
      walk(a, b) { const f = h.cfg.faces, s = G.op(a, b); return { a, b, s, A: f[s], fa: f[a], fb: f[b], B: H.op(f[a], f[b]), ok: f[s] === H.op(f[a], f[b]) }; },
      neutralTest(y) { return H.labels.map((_, z) => ({ z, r: H.op(y, z), same: H.op(y, z) === z })); },
      diagnose() { return diagnose(G, H, h.cfg.faces); },
      evaluate() { const d = api.diagnose(), A = d.analysis; const goals = [{ key: 'identity', ok: A.identityOk }, { key: 'hom', ok: A.hom }, { key: 'surjective', ok: A.surjective }]; return { d, goals, done: A.hom && A.surjective }; },
    };
    return api;
  }
  /* --- Nivel 6: torre de ascensores --- */
  function createTower() {
    const G = GROUPS.Z4, H = GROUPS.U5;
    const h = history({ floors: ['1', '4', '1', '4'].map(l => H.idx(l)) });
    const api = {
      G, H, on: h.on, get config() { return h.cfg; }, canUndo: h.canUndo, undo: () => h.undo(), reset: () => h.reset(),
      setFloor(x, y) { if (h.cfg.floors[x] === y) return { ok: true, noop: true }; return h.commit('floor', c => { c.floors[x] = y; return { ok: true, x, y }; }); },
      diagnose() { return diagnose(G, H, h.cfg.floors); },
      /** Bajada: para cada andén, a qué ascensores podría volver. */
      descend() { const f = h.cfg.floors; return H.labels.map((_, y) => ({ y, from: f.map((v, x) => v === y ? x : -1).filter(x => x >= 0) })); },
      evaluate() { const d = api.diagnose(), A = d.analysis; const goals = [{ key: 'hom', ok: A.hom }, { key: 'injective', ok: A.injective }, { key: 'surjective', ok: A.surjective }, { key: 'inverseHom', ok: A.inverseHom }]; return { d, goals, done: goals.every(g => g.ok) }; },
    };
    return api;
  }
  /* --- Nivel 7: laboratorio de gemelos (una demostración, no una búsqueda) --- */
  function createLab() {
    const G = GROUPS.Z4, H = GROUPS.V4;
    const facts = { combos: { G: {}, H: {} }, orders: { G: {}, H: {} }, bridge: null };
    const h = history({ slots: [null, null, null] });
    const api = {
      G, H, facts, on: h.on, get config() { return h.cfg; }, canUndo: h.canUndo, undo: () => h.undo(), reset: () => h.reset(),
      combine(side, a, b) { const K = side === 'G' ? G : H, c = K.op(a, b); facts.combos[side][a + ',' + b] = c; return { side, a, b, c, identity: c === K.identity }; },
      repeat(side, x) { const K = side === 'G' ? G : H, pw = powers(K, x); facts.orders[side][x] = pw.length; return { side, x, powers: pw, order: pw.length }; },
      /** Puente de prueba: si f(1) = y, el resto queda obligado. */
      bridge(y) { const pm = powerMap(G, H, G.idx('1'), y), d = diagnose(G, H, pm.f); facts.bridge = { y, f: pm.f, collision: d.analysis.collisions[0] || null }; return facts.bridge; },
      pins() {
        const p = [], og = facts.orders.G, oh = facts.orders.H;
        const four = Object.keys(og).map(Number).find(x => og[x] === 4);
        if (four !== undefined) p.push({ id: 'G4', kind: 'G', text: 'En Z4, el ' + G.labels[four] + ' tarda 4 pasos en volver al 0.', x: four });
        if (H.labels.every((_, y) => oh[y] !== undefined)) p.push({ id: 'H2', kind: 'H', text: 'En V4 todos vuelven a e en 1 o 2 pasos: x∘x = e.' });
        Object.keys(og).map(Number).filter(x => og[x] !== 4).forEach(x => p.push({ id: 'Go' + x, kind: 'decoy', text: 'En Z4, el ' + G.labels[x] + ' tarda ' + og[x] + (og[x] === 1 ? ' paso.' : ' pasos.') }));
        if (facts.bridge) p.push({ id: 'BR', kind: 'bridge', text: 'Si f(1) = ' + H.labels[facts.bridge.y] + ', entonces f(2) = f(1)∘f(1) = ' + H.labels[facts.bridge.f[2]] + ' = f(0).' });
        return p;
      },
      place(slot, pinId) { return h.commit('place', c => { const i = c.slots.indexOf(pinId); if (i !== -1) c.slots[i] = null; c.slots[slot] = pinId; return { ok: true, slot, pinId }; }); },
      clear(slot) { return h.commit('clear', c => { c.slots[slot] = null; return { ok: true }; }); },
      /** La demostración vale si las tres piezas son las correctas y en su sitio. */
      proof() {
        const want = ['G', 'H', 'bridge'], ps = api.pins(), s = h.cfg.slots;
        const kinds = s.map(id => { const p = ps.find(q => q.id === id); return p ? p.kind : null; });
        const ok = kinds.every((k, i) => k === want[i]);
        const truth = isomorphisms(G, H).length === 0;
        return { ok: ok && truth, kinds, wrong: kinds.map((k, i) => k !== null && k !== want[i]) };
      },
    };
    return api;
  }
  /* --- Nivel 7 (iteración 6): el caso de los gemelos imposibles ---
   * Tres pasos con sentido propio: 1) medir la huella de vueltas (órdenes) de cada mundo,
   * 2) probar el puente f(1) = y con los cuatro gemelos (f(1) lo decide todo),
   * 3) rellenar un informe cuyas líneas siguen el orden del razonamiento. */
  function createCase() {
    const G = GROUPS.Z4, H = GROUPS.V4;
    const facts = { orders: { G: {}, H: {} }, tried: {} };
    const LINES = [
      { fields: [{ key: 'x', opts: G.labels.map((_, i) => i) }, { key: 'n', opts: [1, 2, 3, 4] }] },
      { fields: [{ key: 'max', opts: [1, 2, 3, 4] }] },
      { fields: [{ key: 'keep', opts: ['conserva', 'cambia'] }] },
      { fields: [{ key: 'exists', opts: ['no existe', 'existe'] }] },
    ];
    const h = history({ report: LINES.map(L => { const o = {}; L.fields.forEach(f => { o[f.key] = null; }); return o; }) });
    const ordG = x => orderOf(G, x), maxH = Math.max(...H.labels.map((_, y) => orderOf(H, y)));
    const api = {
      G, H, facts, LINES, on: h.on, get config() { return h.cfg; }, canUndo: h.canUndo, undo: () => h.undo(), reset: () => h.reset(),
      repeat(side, x) { const K = side === 'G' ? G : H, pw = powers(K, x); facts.orders[side][x] = pw.length; return { side, x, powers: pw, order: pw.length }; },
      measuredAll: side => (side === 'G' ? G : H).labels.every((_, i) => facts.orders[side][i] !== undefined),
      /** Huella: cuántos habitantes (medidos) tardan 1, 2, 3, 4 pasos. */
      fingerprint(side) { const out = { 1: [], 2: [], 3: [], 4: [] }; Object.keys(facts.orders[side]).forEach(x => out[facts.orders[side][x]].push(+x)); return out; },
      bridge(y) { const pm = powerMap(G, H, G.idx('1'), y), d = diagnose(G, H, pm.f); const col = d.analysis.collisions[0] || null; facts.tried[y] = { y, f: pm.f, collision: col }; return facts.tried[y]; },
      triedAll: () => H.labels.every((_, y) => facts.tried[y]),
      set(line, key, value) { return h.commit('report', c => { c.report[line][key] = value; return { ok: true, line, key, value }; }); },
      cycle(line, key) { const F = LINES[line].fields.find(f => f.key === key), cur = h.cfg.report[line][key], i = F.opts.indexOf(cur); return api.set(line, key, F.opts[(i + 1) % F.opts.length]); },
      /** Cada línea del informe se comprueba con lo medido; el motivo del fallo es concreto. */
      checkLine(i) {
        const r = h.cfg.report[i];
        if (i === 0) {
          if (r.x === null || r.n === null) return { ok: false, why: 'incomplete' };
          const o = facts.orders.G[r.x]; if (o === undefined) return { ok: false, why: 'unmeasured' };
          if (r.n !== o) return { ok: false, why: 'mismatch', real: o };
          if (o !== 4) return { ok: false, why: 'weak', real: o };
          return { ok: true };
        }
        if (i === 1) {
          if (r.max === null) return { ok: false, why: 'incomplete' };
          if (!api.measuredAll('H')) return { ok: false, why: 'unmeasured' };
          return r.max === maxH ? { ok: true } : { ok: false, why: 'mismatch', real: maxH };
        }
        if (i === 2) { if (r.keep === null) return { ok: false, why: 'incomplete' }; return r.keep === 'conserva' ? { ok: true } : { ok: false, why: 'wrong' }; }
        if (r.exists === null) return { ok: false, why: 'incomplete' };
        if (![0, 1, 2].every(k => api.checkLine(k).ok)) return { ok: false, why: 'premature' };
        return r.exists === 'no existe' ? { ok: true } : { ok: false, why: 'wrong' };
      },
      stage() { if (!api.measuredAll('G') || !api.measuredAll('H')) return 1; if (!api.triedAll()) return 2; if (!api.proof().ok) return 3; return 4; },
      proof() { const lines = LINES.map((_, i) => api.checkLine(i)); const truth = isomorphisms(G, H).length === 0; return { ok: truth && lines.every(l => l.ok) && api.triedAll(), lines }; },
    };
    return api;
  }
  /* --- Nivel 5: línea de producción --- */
  function createLine() {
    const specs = [
      { name: 'COPIADORA A', G: 'Z4', H: 'Z2', f: ['0', '1', '0', '1'] },
      { name: 'COPIADORA B', G: 'Z2', H: 'Z4', f: ['0', '2'] },
      { name: 'COPIADORA C', G: 'Z4', H: 'Z4', f: ['0', '1', '3', '2'] },
      { name: 'COPIADORA D', G: 'Z4', H: 'U5', f: ['1', '2', '4', '3'] },
    ];
    const machines = specs.map(m => { const G = GROUPS[m.G], H = GROUPS[m.H], f = m.f.map(l => H.idx(l)), d = diagnose(G, H, f);
      const bay = d.kind === 'broken' ? 'sumas' : d.kind === 'hom-noninj' ? 'choques' : d.kind === 'hom-nonsurj' ? 'vacios' : d.kind === 'iso' ? 'apto' : 'otro';
      return { name: m.name, G, H, f, d, bay }; });
    const h = history({ sent: machines.map(() => null), observed: machines.map(() => ({ run: false })) });
    const api = {
      machines, on: h.on, get config() { return h.cfg; }, canUndo: h.canUndo, undo: () => h.undo(), reset: () => h.reset(),
      observe(m) { if (!h.cfg.observed[m].run) h.commit('observe', c => { c.observed[m].run = true; return { ok: true }; }); return machines[m].d; },
      send(m, bay) { return h.commit('send', c => { c.sent[m] = bay; return { ok: true, m, bay, right: machines[m].bay === bay }; }); },
      evaluate() { const s = h.cfg.sent; return { done: machines.every((M, m) => s[m] === M.bay), wrong: machines.map((M, m) => s[m] !== null && s[m] !== M.bay) }; },
    };
    return api;
  }
  /* --- Nivel 8: el corazón --- */
  function createHeart() {
    const G = GROUPS.Z4, H = GROUPS.Z8, gen = G.idx('1');
    const h = history({ k: H.idx('4'), codomain: H.labels.map((_, i) => i), tags: [], tested: null, returned: false });
    const api = {
      G, H, on: h.on, get config() { return h.cfg; }, canUndo: h.canUndo, undo: () => h.undo(), reset: () => h.reset(),
      gear() { return powerMap(G, H, gen, h.cfg.k); },
      map() { return powerMap(G, H, gen, h.cfg.k).f; },
      setK(y) { if (h.cfg.k === y) return { ok: true, noop: true }; return h.commit('k', c => { c.k = y; c.returned = false; return { ok: true }; }); },
      tag(y) { if (h.cfg.codomain.indexOf(y) === -1) return { rejected: true, reason: 'gone' }; return h.commit('tag', c => { const i = c.tags.indexOf(y); if (i === -1) c.tags.push(y); else c.tags.splice(i, 1); c.tags.sort((a, b) => a - b); c.tested = null; return { ok: true, y }; }); },
      test() {
        const c = h.cfg, f = api.map(), rest = c.codomain.filter(y => c.tags.indexOf(y) === -1);
        const visited = c.tags.filter(y => f.indexOf(y) !== -1), run = closureRun(H, rest);
        const res = { rest, visited, run, ok: run.ok && !visited.length && c.tags.length > 0 };
        h.commit('test', c2 => { c2.tested = { tags: c2.tags.slice(), ok: res.ok }; return { ok: true }; });
        return res;
      },
      shred() {
        const c = h.cfg;
        if (!c.tags.length) return { rejected: true, reason: 'nothing' };
        if (!c.tested || JSON.stringify(c.tested.tags) !== JSON.stringify(c.tags) || !c.tested.ok) return { rejected: true, reason: c.tested && c.tested.ok === false ? 'failed' : 'untested' };
        return h.commit('shred', c2 => { const gone = c2.tags.slice(); c2.codomain = c2.codomain.filter(y => gone.indexOf(y) === -1); c2.tags = []; c2.tested = null; return { ok: true, gone }; });
      },
      restoreCodomain() { return h.commit('restore', c => { c.codomain = H.labels.map((_, i) => i); c.tags = []; c.tested = null; c.returned = false; return { ok: true }; }); },
      markReturned(ok) { return h.commit('return', c => { c.returned = ok; return { ok: true }; }); },
      diagnose() { return diagnose(G, H, api.map(), h.cfg.codomain); },
      evaluate() {
        const d = api.diagnose(), A = d.analysis;
        const goals = [{ key: 'hom', ok: A.hom }, { key: 'kernelTrivial', ok: A.kernelTrivial }, { key: 'codomainGroup', ok: A.codomainReport.ok }, { key: 'surjective', ok: A.surjective }, { key: 'iso', ok: A.iso && A.inverseHom }];
        return { d, goals, done: goals.every(g => g.ok) && h.cfg.returned };
      },
    };
    return api;
  }

  return {
    makeGroup, groupAxioms, subgroupReport, orderOf, powers, orderProfile, GROUPS,
    analyze, usefulCounterexample, allHoms, isomorphisms, permutations,
    LEVELS, GOAL_TEXT, createPuzzle, createCopies, createTwins, PROPS,
    difference, diagnose, powerMap, closureRun,
    createWorkshop, createPlant, createMirrors, createTower, createLab, createCase, createLine, createHeart,
  };
});
