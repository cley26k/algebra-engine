"""Prueba funcional en Chromium: juega el nivel con ratón y teclado y comprueba
estado lógico + estado visual.  Uso:
    PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers python3 test/browser_test.py [carpeta_capturas]
"""
import sys, json, pathlib
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
    results.append((name, bool(cond)))
    print(('  ✓ ' if cond else '  ✗ ') + name + (('  — ' + str(extra)) if (extra and not cond) else ''))

with sync_playwright() as p:
    b = p.chromium.launch()
    page = b.new_page(viewport={'width': 1600, 'height': 900})
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('console', lambda m: errors.append(m.text) if m.type == 'error' and 'fonts' not in m.text and 'ERR_' not in m.text else None)
    page.goto(URL)
    page.evaluate('__APP.reset()'); page.reload(); page.wait_for_timeout(1800)
    page.evaluate('__APP.testMode()')
    mouse = SceneMouse(page)
    page.evaluate('__APP.goto(1)'); page.wait_for_timeout(300)
    page.evaluate('__AE.skipIntro()'); page.wait_for_timeout(2200)
    page.screenshot(path=str(SHOTS / '01-inicio.png'))

    js = lambda s: page.evaluate(s)
    vis = lambda: js('__AE.visual()')
    cfg = lambda: js('JSON.parse(JSON.stringify(__AE.L.config))')
    ff = lambda: js('__AE.fastForward()')
    def drag(x1, y1, x2, y2):
        mouse.move(x1, y1); mouse.down()
        for i in range(1, 13): mouse.move(x1 + (x2 - x1) * i / 12, y1 + (y2 - y1) * i / 12)
        mouse.up(); page.wait_for_timeout(500)

    print('Arranque')
    check('máquina dormida al empezar', not vis()['awake'])
    page.keyboard.press('r'); page.wait_for_timeout(300)
    check('la palanca no ejecuta sin ARRANCA', not js('__AE.Run.active'))
    check('el capataz ronca', any('zzz' in t for t in vis()['bubbles']), vis()['bubbles'])

    print('Reglas como objetos (arrastrar y soltar)')
    bx, by = vis()['blocksAt']['ARRANCA']
    drag(bx, by, 582 + 112 * 3 + 50, 509)          # ranura LEY: forma equivocada
    check('bloque en ranura equivocada es rechazado', cfg()['slots']['ley'] == 'CONSERVA' and 'ARRANCA' in cfg()['tray'])
    bx, by = vis()['blocksAt']['ARRANCA']
    drag(bx, by, 632, 509)                        # ranura MOTOR
    check('ARRANCA encaja en MOTOR', cfg()['slots']['motor'] == 'ARRANCA')
    page.wait_for_timeout(400)
    v = vis()
    check('la lámpara de MOTOR se enciende y la máquina despierta', v['lamps']['motor'] and v['awake'])
    check('el bloque se mueve físicamente al riel', abs(v['blocksAt']['ARRANCA'][0] - 632) < 8, v['blocksAt']['ARRANCA'])

    print('Cables (teclado y ratón)')
    page.keyboard.press('0'); page.keyboard.press('0')
    check('teclado: 0 → nido 0', cfg()['map'][0] == 0)
    page.keyboard.press('2'); page.keyboard.press('0')
    check('EXCLUSIVO rechaza compartir nido', cfg()['map'][2] is None)
    check('el rechazo se anuncia en una burbuja', len(vis()['bubbles']) > 0)
    bx, by = vis()['blocksAt']['COMPARTIDO']
    drag(bx, by, 582 + 224 + 50, 509)
    check('COMPARTIDO sustituye a EXCLUSIVO', cfg()['slots']['puerta'] == 'COMPARTIDO' and 'EXCLUSIVO' in cfg()['tray'])
    page.wait_for_timeout(500)
    check('la puerta visual se abre', vis()['gate'] < 0.2, vis()['gate'])
    drag(300, 560, 1330, 340)                      # arrastrar la criatura 2 al nido 0
    check('ratón: arrastrar criatura 2 al nido 0', cfg()['map'][2] == 0)
    page.keyboard.press('1'); page.keyboard.press('1')
    page.keyboard.press('3'); page.keyboard.press('1')
    check('mapa x mod 2 tendido', cfg()['map'] == [0, 1, 0, 1])
    page.screenshot(path=str(SHOTS / '02-cables.png'))

    print('Ejecución con la ficha 4 (debe fallar)')
    page.keyboard.press('r'); page.wait_for_timeout(200)
    check('la máquina se ejecuta', js('__AE.Run.active'))
    js('__AE.step(4.2)'); page.wait_for_timeout(60)
    page.screenshot(path=str(SHOTS / '03-ejecucion.png'))
    js('__AE.step(3.4)')
    page.screenshot(path=str(SHOTS / '04-rutas.png'))
    ff()
    lr = js('__AE.progress.lastRun')
    check('veredicto: roto (no homomorfismo)', lr['verdict'] == 'broken', lr['verdict'])
    cx = lr['check']['counterexample']
    check('contraejemplo 1+1 se escapa (2 no existe allá)', cx['a'] == 1 and cx['b'] == 1 and cx['status'] == 'escape', cx)
    led = vis()['ledger']
    check('la cinta tiene los 16 pares sellados', all(s for s in led) and len(led) == 16, led)
    check('orden NO cumplida', not js('__AE.order.done'))
    page.screenshot(path=str(SHOTS / '05-fallo.png'))

    print('Ficha desde la barriga (espacio anidado)')
    mouse.click(988 - 18, 176 + 22); page.wait_for_timeout(900)
    check('ficha 2 sacada de la ventanilla al cartel', cfg()['chip'] == 2 and 4 in cfg()['belly'], cfg()['chip'])
    js('__AE.step(1)')
    check('la máquina se come el 4 (visible en la barriga)', vis()['chipInBelly']['4'])

    print('Ejecución correcta')
    page.keyboard.press('r'); js('__AE.step(9)')
    page.screenshot(path=str(SHOTS / '06-comprobando.png'))
    ff()
    lr = js('__AE.progress.lastRun')
    check('veredicto: homomorfismo', lr['verdict'] == 'homomorphism')
    check('NO es isomorfismo', lr['check']['isIsomorphism'] is False and lr['check']['injective'] is False)
    check('16/16 pares coinciden en la cinta', vis()['ledger'] == ['ok'] * 16)
    check('orden de trabajo completa + sello FUNCIONA', js('__AE.order.done') and js('__AE.marks.funciona'))
    rs = vis()['residents']
    check('dos visitantes distintos (0 y 2) en el nido 0', sorted(r['hat'] for r in rs if r['v'] == 0) == [0, 2], rs)
    js('__AE.step(1)')
    check('aparece DESANDAR e INFORME', js('__AE.machine.reverseOut') > .9 and js('__AE.machine.ticketOut') > .9)
    page.screenshot(path=str(SHOTS / '07-exito.png'))

    print('Investigar la no inyectividad')
    page.keyboard.press('b'); js('__AE.step(2.2)')
    page.screenshot(path=str(SHOTS / '08-desandar.png'))
    ff()
    check('desandar muestra que no hay origen único', any('No hay forma de saberlo' in t for t in vis()['bubbles']), vis()['bubbles'])
    check('sello INVESTIGA', js('__AE.marks.investiga'))
    mouse.click(1196 + 36 + 16, 738 + 36 + 16)   # casilla 1+1
    js('__AE.step(1)')
    check('repetir un par concreto → sello COMPRENDE', js('__AE.marks.comprende'))
    ff()
    page.keyboard.press('i'); js('__AE.step(1)')
    page.screenshot(path=str(SHOTS / '09-informe.png'))
    check('«¿Qué pasó?» se abre', js('__APP.overlay && __APP.overlay.kind') == 'report')
    page.keyboard.press('Escape'); js('__AE.step(1)')
    check('y se cierra', not js('__APP.overlay'))

    print('Cambiar reglas cambia el mundo')
    good = cfg()
    js("__AE.clickBlock('EXCLUSIVO')"); js('__AE.step(1)')
    c = cfg(); v = vis()
    check('EXCLUSIVO expulsa a los segundos en llegar', c['map'] == [0, 1, None, None], c['map'])
    check('y los cables desaparecen de la centralita', len(v['cords']) == 2)
    check('los barrotes aparecen en los nidos', v['gate'] > .9)
    page.keyboard.press('r'); ff()
    check('con EXCLUSIVO tras resolver: incompleto + la máquina no sabe volver atrás', js('__AE.progress.lastRun.verdict') == 'incomplete'
          and any('volver atrás' in t for t in vis()['bubbles']), vis()['bubbles'])
    page.keyboard.press('z'); js('__AE.step(1)')
    check('deshacer restaura el mapa', cfg() == good)
    js("__AE.clickBlock('CONSERVA')"); js('__AE.step(1)')
    check('sin CONSERVA la balanza se tapa', vis()['cloth'] > .9 and not vis()['lamps']['ley'])
    page.keyboard.press('r'); ff()
    check('sin CONSERVA: traduce sin comprobar', js('__AE.progress.lastRun.verdict') == 'unchecked')
    page.keyboard.press('z'); js('__AE.step(1)')

    print('Cambio de regla con la máquina en marcha')
    page.keyboard.press('r'); js('__AE.step(3)')
    check('en marcha', js('__AE.Run.active'))
    js("__AE.clickBlock('TODO')"); js('__AE.step(.3)')
    check('la máquina se atasca y se detiene', not js('__AE.Run.active') and js('__AE.machine.shake') > 0)
    page.screenshot(path=str(SHOTS / '10-atasco.png'))
    js('__AE.step(1.5)')
    check('sin TODO, aparecen agujeros (no hay sin-cable aún, mapa intacto)', cfg()['slots']['total'] is None)
    page.keyboard.press('z'); js('__AE.step(1)')

    print('Pausa, reinicio y coherencia')
    page.keyboard.press('r'); js('__AE.step(2)')
    page.keyboard.press('p'); before = js('__AE.tokens().map(t=>[t.x,t.y])'); js('__AE.step(2)'); after = js('__AE.tokens().map(t=>[t.x,t.y])')
    check('pausa congela la ejecución', before == after and js('__AE.Run.paused'))
    page.keyboard.press('p'); ff()
    check('se reanuda y termina igual', js('__AE.progress.lastRun.verdict') == 'homomorphism')
    page.keyboard.press('n'); js('__AE.step(1)')
    check('reiniciar vuelve al estado inicial', cfg()['map'] == [None] * 4 and cfg()['slots']['motor'] is None and cfg()['chip'] == 4)
    js('__AE.step(1)')
    check('reiniciar duerme la máquina y la ficha 4 vuelve al cartel', not vis()['awake'] and not vis()['chipInBelly']['4'] and vis()['chipInBelly']['2'])
    page.keyboard.press('z'); js('__AE.step(1)')
    check('deshacer el reinicio recupera el experimento', cfg() == good)
    page.keyboard.press('r'); ff()
    check('re-ejecutar tras deshacer da el mismo resultado', js('__AE.progress.lastRun.verdict') == 'homomorphism' and vis()['ledger'] == ['ok'] * 16)

    print('Teclado: Tab + Enter + pista')
    page.keyboard.press('Tab'); page.keyboard.press('Tab')
    check('Tab mueve el foco', js("document.getElementById('live').textContent.length") > 0)
    page.keyboard.press('h'); js('__AE.step(.3)')
    check('la pista habla', len(vis()['bubbles']) > 0)

    print('Movimiento reducido y sonido')
    page.keyboard.press('l'); page.keyboard.press('m')
    page.wait_for_timeout(300)
    page.screenshot(path=str(SHOTS / '11-final.png'))

    check('sin errores de consola', not errors, errors[:5])
    # tamaño de móvil apaisado: el canvas se adapta
    page.set_viewport_size({'width': 844, 'height': 390}); page.wait_for_timeout(500)
    page.screenshot(path=str(SHOTS / '12-movil.png'))
    b.close()

ok = sum(1 for _, c in results if c)
print(f'\n{ok}/{len(results)} comprobaciones superadas')
sys.exit(0 if ok == len(results) else 1)
