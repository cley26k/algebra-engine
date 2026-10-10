"""Iteración 3 · prueba de campaña y de experiencia en Chromium.
Juega los ocho niveles rediseñados, con ratón y teclado donde importa, y verifica:
estado lógico, feedback informativo, pistas graduadas, veredictos, deshacer, guardado.
    PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers python3 test/campaign_test.py [carpeta_capturas]
"""
import sys, pathlib
from playwright.sync_api import sync_playwright

class SceneMouse:
    """Convierte coordenadas de escena (1600×900) a píxeles de página: el lienzo ahora ocupa toda la ventana."""
    def __init__(self, page): self.page, self.m = page, page.mouse
    def _c(self, x, y): q = self.page.evaluate(f'__APP.toPage({x}, {y})'); return q['x'], q['y']
    def move(self, x, y, **k): self.m.move(*self._c(x, y), **k)
    def click(self, x, y, **k): self.m.click(*self._c(x, y), **k)
    def down(self, **k): self.m.down(**k)
    def up(self, **k): self.m.up(**k)

ROOT = pathlib.Path(__file__).resolve().parent.parent
URL = (ROOT / 'dist' / 'index.html').as_uri()
SHOTS = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else ROOT / 'test' / 'shots')
SHOTS.mkdir(parents=True, exist_ok=True)
results = []
def check(name, cond, extra=''):
    results.append(bool(cond)); print(('  ✓ ' if cond else '  ✗ ') + name + (('  — ' + str(extra)[:300]) if extra and not cond else ''))

with sync_playwright() as p:
    b = p.chromium.launch()
    page = b.new_page(viewport={'width': 1600, 'height': 900})
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e) + ' @ ' + str(getattr(e, 'stack', ''))[:400]))
    page.on('console', lambda m: errors.append(m.text) if m.type == 'error' and 'ERR_' not in m.text else None)
    page.goto(URL); page.evaluate('__APP.reset()'); page.reload(); page.wait_for_timeout(1800)
    js = page.evaluate
    shot = lambda n: page.screenshot(path=str(SHOTS / (n + '.png')))
    mouse = SceneMouse(page)
    print('Iteración 4 · inicio, cómic, ficha, riel, sin márgenes')
    check('arranca en la pantalla de inicio', js('__APP.sceneId') == 'title')
    cv = js("(() => { const r = document.querySelector('canvas').getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; })()")
    check('el lienzo ocupa toda la ventana (sin márgenes)', cv == [0, 0, 1600, 900], cv)
    check('en el inicio sólo hay controles de audio en el riel', sorted(o['id'] for o in js('__APP.globalButtons().map(o => ({id: o.id}))')) == ['motion', 'music', 'sound'])
    page.keyboard.press('Enter'); page.wait_for_function("__APP.sceneId === 'comic'", timeout=5000); page.wait_for_timeout(300)
    check('partida nueva → el cómic', js('__APP.sceneId') == 'comic')
    check('la música se pone en marcha con el primer gesto', js('!!__APP.Music.timer') and js('__APP.Music.mood') in ('comic', 'title'))
    for _ in range(24):
        if js('__APP.sceneId') != 'comic': break
        page.keyboard.press('ArrowRight'); page.wait_for_timeout(200)
    page.wait_for_function("__APP.sceneId === 'map' && !__APP.overlay", timeout=6000); page.wait_for_timeout(300)
    check('el cómic termina en el mapa y queda marcado', js('__APP.sceneId') == 'map' and js('__APP.save.comicSeen'))
    rl = js("__APP.railToPage('home')"); check('el mapa tiene botón INICIO en el riel', rl is not None)
    js('__APP.scene.select(1)'); js('__APP.scene.enterSelected()'); page.wait_for_function("__APP.sceneId === 'comic'", timeout=6000)
    check('la primera vez, cada máquina abre su propio cómic', js('__APP.scene.debug().id') == 1 and js('__APP.scene.debug().panels') == 3)
    page.wait_for_timeout(900); shot('i4-comic-maquina1')
    for _ in range(8):
        if js('__APP.sceneId') != 'comic': break
        page.keyboard.press('ArrowRight'); page.wait_for_timeout(250)
    page.wait_for_function("__APP.sceneId === 1 && __APP.overlay", timeout=6000)
    check('al terminar el cómic se entra en la máquina y queda marcado', js('__APP.save.comics[1]'))
    check('hay un cómic para cada una de las 8 máquinas', js("[1,2,3,4,5,6,7,8].every(i => LEVEL_COMICS[i] && LEVEL_COMICS[i].title)"))
    check('al entrar por primera vez se abre la ficha de la máquina', (js('__APP.overlay') or {}).get('kind') == 'brief')
    shot('i4-ficha')
    page.keyboard.press('Enter'); page.wait_for_timeout(200)
    check('Enter cierra la ficha y la recuerda', js('__APP.overlay') is None and js('__APP.save.briefed[1]'))
    m = js("__APP.railToPage('menu')"); check('MENÚ explícito en el riel', m is not None)
    page.mouse.click(m['x'], m['y']); page.wait_for_timeout(200)
    check('el botón MENÚ abre la pausa', (js('__APP.overlay') or {}).get('kind') == 'pause')
    page.keyboard.press('Escape'); page.wait_for_timeout(100)
    fm = js("__APP.railToPage('brief')"); page.mouse.click(fm['x'], fm['y']); page.wait_for_timeout(200)
    check('FICHA vuelve a abrir la explicación', (js('__APP.overlay') or {}).get('kind') == 'brief')
    page.keyboard.press('Escape')
    check('cada nivel tiene ficha con operación y controles', js("[1,2,3,4,5,6,7,8].every(i => BRIEFS[i] && BRIEFS[i].worlds.every(w => w.rule && __APP.App.GS[w.key]) && BRIEFS[i].controls.length >= 3)"))
    js('__APP.reset()'); page.reload(); page.wait_for_timeout(1800)
    page.evaluate("__APP.testMode(); __APP.goto('map')"); page.wait_for_timeout(300)
    key = page.keyboard.press
    def item(api, ident):
        for o in js(f'{api}.items().map(o => ({{id: o.id, screen: !!o.screen, x: o.r ? o.x : o.x + o.w / 2, y: o.r ? o.y : o.y + o.h / 2}}))'):
            if o['id'] == ident:
                if not o['screen']:
                    s = js(f"{api}.S.cam.toScreen({{x: {o['x']}, y: {o['y']}}})"); return s['x'], s['y']
                return o['x'], o['y']
        raise Exception('sin item ' + ident)
    def click(api, ident): x, y = item(api, ident); mouse.click(x, y); page.wait_for_timeout(60)
    def bubbles(api): return js(f'{api}.S.dir.texts()')
    def enter(n, api):
        js(f'__APP.goto({n})'); page.wait_for_timeout(300); js(f"{api}.S.cancel('intro'); {api}.S.dir.hush()")
    def fast(api): js(f'{api}.fast()')
    def verdict(api): v = js(f'{api}.S.verdict'); return v and v['kind']
    def hint3(api):
        out = []
        for _ in range(3): js(f'{api}.S.dir.hush()'); h = js(f'{api}.S.giveHint()'); out.append(h)
        return out

    print('Mapa y nivel 1 (introducción conservada)')
    check('mapa: sólo la 1 disponible', js('__APP.scene.debug().states')[0] == 'disponible')
    js('__APP.goto(1)'); page.wait_for_timeout(300)
    js('__AE.skipIntro()'); js('__AE.step(1)')
    js("__AE.clickBlock('ARRANCA'); __AE.clickBlock('COMPARTIDO'); __AE.L.setChip(2)")
    for a, t in [('0', '0'), ('1', '1'), ('2', '0'), ('3', '1')]: key(a); key(t)
    key('r'); js('__AE.fastForward()')
    check('nivel 1 resuelto como antes', js('__APP.save.repaired[1]'))
    key('k'); page.wait_for_timeout(500)
    check('la tabla portátil se abre también en el nivel 1', js('__APP.tableP.target') == 1)
    shot('d01-tabla'); key('k')

    print('Nivel 2 · taller de inspección')
    enter(2, '__L2')
    check('el taller es más ancho que la pantalla (cámara)', js('__L2.S.cam.world.w') > 1600)
    x, y = item('__L2', 'lever'); mouse.click(x, y); fast('__L2')
    check('×2: homomorfismo no inyectivo (no "incorrecto")', verdict('__L2') == 'hom-neither', verdict('__L2'))
    check('la garra deja dos piezas en la mesa', len(js('__L2.bench()')) == 2)
    shot('d02-garra')
    h = hint3('__L2')
    check('pistas graduadas: tres textos distintos, ninguno resuelve', len(set(t['text'] for t in h)) == 3 and h[0]['tier'] == 1 and h[2]['tier'] == 3, [t['text'] for t in h])
    js('__L2.S.dir.hush()')
    js('__L2.pick(__L2.bench()[0]); __L2.pick(__L2.bench()[1])'); fast('__L2')
    check('la lupa revela que la diferencia cae en el neutro', js('__L2.insight()'))
    check('el diálogo interpreta (no recita la definición)', any('diferencia' in t.lower() and ('neutro' in t or 'bandeja del 0' in t) for t in js('__L2.S.dir.log')), js('__L2.S.dir.log')[-4:])
    js('__L2.clutch()'); js('__L2.dialClick(2)'); js('__L2.runBelt()'); fast('__L2')
    check('desacoplado y roto: contraejemplo con las dos rutas', verdict('__L2') == 'broken' and js('!!__L2.S.slip'))
    key('z'); key('z')
    check('deshacer devuelve el tren acoplado', js('__L2.P.config.coupled'))
    js('__L2.turnWheel(1)'); js('__L2.runBelt()'); fast('__L2')
    check('rueda en 3: monomorfismo, reparada', js('__APP.save.repaired[2]') and verdict('__L2') == 'iso')

    print('Nivel 3 · planta de clasificación')
    enter(3, '__L3')
    click('__L3', 'produce'); fast('__L3')
    check('producir: contadores 1 y 3 en cero', js('[__L3.counters[1], __L3.counters[3]]') == [0, 0])
    check('veredicto: homomorfismo no sobreyectivo', verdict('__L3') == 'hom-nonsurj')
    click('__L3', 'bin1'); page.wait_for_timeout(300)
    check('el periscopio muestra que nadie viene al 1', js('__L3.P.preimages(1).length') == 0)
    click('__L3', 'tag'); key('p'); fast('__L3')
    lt = js('__L3.lastTest()')
    check('probador: triturar sólo el 1 falla con el par concreto', not lt['ok'] and lt['run']['failure']['kind'] == 'closure', lt)
    key('t'); fast('__L3')
    check('la trituradora no tritura sin permiso', js('__L3.P.config.codomain.length') == 4)
    shot('d03-alto')
    js('__L3.tag(3)'); key('p'); fast('__L3'); key('t'); fast('__L3'); key('r'); fast('__L3')
    check('{0,2}: epimorfismo, reparada', js('__APP.save.repaired[3]'))

    print('Nivel 4 · sala de espejos')
    enter(4, '__L4')
    check('los reflejos tiemblan al empezar (f(0) ≠ neutro)', js('__L4.wobble()') > .5)
    click('__L4', 'walker0'); click('__L4', 'walker0'); click('__L4', 'walk'); fast('__L4')
    check('0 + 0 en la pasarela: se separan y lo explica', js('!!__L4.S.slip') and any('neutro' in t or 'opera' in t for t in bubbles('__L4')), bubbles('__L4'))
    shot('d04-espejo')
    js('__L4.neutralProbe(1)')
    check('examinar «1» descubre el neutro', any('NEUTRO' in t for t in bubbles('__L4')))
    for x in [0, 2]: click('__L4', f'flip{x}')
    js('__L4.step(2)')
    check('al reflejar el neutro en el neutro, dejan de temblar', js('__L4.wobble()') < .2)
    click('__L4', 'parade'); fast('__L4')
    check('todo a «1»: homomorfismo reconocido como válido, pero no sobreyectivo', verdict('__L4') == 'hom-neither' and not js('__APP.save.repaired[4]'))
    for x in [1, 3]: click('__L4', f'flip{x}')
    key('d'); fast('__L4')
    check('par → «1», impar → «0»: reparada', js('__APP.save.repaired[4]'))

    print('Nivel 5 · línea de copias')
    enter(5, '__L5')
    check('cuatro copiadoras con averías distintas', js('__L5.P.machines.map(m => m.bay)') == ['choques', 'vacios', 'sumas', 'apto'])
    for m in range(4):
        click('__L5', f'cop{m}'); js('__L5.step(1)'); key('r'); fast('__L5')
        if m == 0: check('A: el clasificador de choques se dispara', js('__L5.observedKind[0]') == 'choques'); shot('d05-choques')
        if m == 1: check('B: el farolero planta bandera en los vacíos', js('__L5.observedKind[1]') == 'vacios'); shot('d05-vacios')
        if m == 2: check('C: la caseta de sumas se atasca con contraejemplo', js('__L5.observedKind[2]') == 'sumas' and js('!!__L5.S.slip'))
        bay = ['choques', 'apto', 'sumas', 'vacios'][m]
        click('__L5', 'bay' + bay); js('__L5.step(1)')
    click('__L5', 'sign'); js('__L5.step(2)')
    check('parte con error: el encargado cita la evidencia', any('farolero' in t or 'nada se quejó' in t for t in bubbles('__L5')), bubbles('__L5'))
    js("__L5.unsend('apto'); __L5.unsend('vacios'); __L5.step(1); __L5.load(1); __L5.step(1); __L5.send('vacios'); __L5.load(3); __L5.step(1); __L5.send('apto'); __L5.sign()"); fast('__L5')
    check('parte correcto: reparada', js('__APP.save.repaired[5]'))

    print('Nivel 6 · torre de ascensores')
    enter(6, '__L6')
    check('la torre es más alta que la pantalla', js('__L6.S.cam.world.h') > 900)
    key('u'); fast('__L6')
    check('subir con (1,4,1,4): homomorfismo, faltan inyectividad y sobreyectividad', verdict('__L6') == 'hom-neither')
    key('b'); fast('__L6')
    check('bajar: los que comparten andén se quedan dudando', len(js('__L6.stuck()')) >= 2 and js('!__L6.returned()'))
    shot('d06-mareo')
    for x, n in [(1, 2), (2, 3), (3, 3)]:
        for _ in range(n): click('__L6', f'pulley{x}')
    check('poleas en (1,2,4,3)', js('JSON.stringify(__L6.P.config.floors)') == '[0,1,3,2]')
    key('u'); fast('__L6'); key('b'); fast('__L6')
    check('sube y baja sin dudas, y la vuelta conserva: reparada', js('__APP.save.repaired[6]') and js('__L6.returned()'))
    shot('d06-vuelta')

    print('Nivel 7 · el caso de los gemelos (rediseño)')
    enter(7, '__L7')
    js('__L7.stamp()'); js('__L7.step(2)')
    check('sellar sin pruebas: rechazado', not js('__L7.stamped()'))
    js('__L7.tryBridge(1)'); js('__L7.step(1)')
    check('el puente espera a que estén las huellas', js('Object.keys(__L7.P.facts.tried).length') == 0)
    click('__L7', 'Gc1'); fast('__L7')
    check('la noria mide 4 pasos para el 1 del reloj', js('__L7.P.facts.orders.G[1]') == 4)
    for side in 'GH':
        for v in range(4):
            if side == 'G' and v == 1: continue
            click('__L7', f'{side}c{v}'); fast('__L7')
    check('huellas: reloj 1·2·4·4, gemelos 1·2·2·2', js('JSON.stringify(__L7.P.fingerprint("G"))') == '{"1":[0],"2":[2],"3":[],"4":[1,3]}' and js('__L7.P.fingerprint("H")[2].length') == 3)
    check('el expediente pasa al paso 2', js('__L7.P.stage()') == 2)
    for y in range(4): click('__L7', f'sel{y}'); js('__L7.step(2.5)')
    check('los cuatro gemelos chocan en el puente', all(js(f'!!__L7.P.facts.tried[{y}].collision') for y in range(4)) and js('__L7.P.stage()') == 3)
    for _ in range(3): click('__L7', 'f0x')
    for _ in range(2): click('__L7', 'f0n')
    check('informe: «el 2 tarda 2» es cierto pero no sirve', js('__L7.P.checkLine(0).why') == 'weak')
    click('__L7', 'f0x'); click('__L7', 'f0n'); click('__L7', 'f0n')
    check('informe línea 1: el 3 tarda 4 pasos', js('__L7.P.checkLine(0).ok'))
    for _ in range(2): click('__L7', 'f1max')
    click('__L7', 'f2keep'); click('__L7', 'f3exists')
    check('el informe completo se sostiene', js('__L7.P.proof().ok'))
    key('s'); fast('__L7')
    check('IMPOSIBLE aceptado y reparada', js('__L7.stamped()') and js('__APP.save.repaired[7]'))
    shot('d07-caso')

    print('Nivel 8 · el corazón')
    enter(8, '__L8')
    key('r'); fast('__L8')
    check('×4: homomorfismo con núcleo {0,2}', verdict('__L8') == 'hom-neither')
    key('g'); key('r'); fast('__L8')
    check('×5 (impar): el engranaje no cierra', verdict('__L8') == 'broken')
    for _ in range(5): key('g')
    check('rueda en 2', js('__L8.P.config.k') == 2)
    key('r'); fast('__L8')
    check('×2: homomorfismo inyectivo, faltan visitas', verdict('__L8') == 'hom-nonsurj')
    for j in [1, 3, 5]: key(str(j))
    key('p'); fast('__L8')
    check('probador: {0,2,4,6,7} no cierra', not js('__L8.P.config.tested.ok'))
    key('7'); key('p'); fast('__L8'); key('t'); fast('__L8'); key('r'); fast('__L8')
    check('tras triturar los impares: isomorfismo', verdict('__L8') == 'iso')
    key('b'); fast('__L8')
    check('volver: la fábrica entera reparada', js('__APP.save.repaired[8]') and js('__APP.save.finale'))
    check('las cuatro válvulas del corazón, abiertas', js('__L8.valves().every(v => v === true)'))
    shot('d08-final')

    print('Fábrica, cuaderno y guardado')
    js("__APP.goto('map')"); js('__APP.step(4)')
    check('todas reparadas en el mapa', all(s == 'reparada' for s in js('__APP.scene.debug().states')))
    page.reload(); page.wait_for_timeout(2000); js("__APP.goto('map')")
    check('el progreso sobrevive a la recarga', all(s == 'reparada' for s in js('__APP.scene.debug().states')))
    for n, api in [(2, '__L2'), (3, '__L3'), (4, '__L4'), (6, '__L6'), (8, '__L8')]:
        js(f'__APP.goto({n})'); page.wait_for_timeout(200)
    check('sin errores de consola', not errors, errors[:4])
    b.close()

ok = sum(results); print(f'\n{ok}/{len(results)} comprobaciones superadas'); sys.exit(0 if ok == len(results) else 1)
