# THE ALGEBRA ENGINE — la fábrica de estructuras

Campaña de puzles de 8 máquinas sobre homomorfismos de grupos. Eres el técnico de mantenimiento algebraico del turno de noche.

## Ejecutar

Sin instalación: abre `dist/index.html` en un navegador moderno. El progreso se guarda en `localStorage`.

Reconstruir y probar (Node 18+; las pruebas de navegador usan Playwright para Python):

```
node build.js                      # genera dist/index.html y dist/the-algebra-engine.html
node test/core.test.js             # 20 pruebas: núcleo del nivel 1
node test/groups.test.js           # 23 pruebas: grupos genéricos
node test/lab.test.js              # 19 pruebas: diagnóstico, niveles rediseñados, jugador informado
PLAYWRIGHT_BROWSERS_PATH=… python3 test/browser_test.py    # 51 comprobaciones jugando el nivel 1
PLAYWRIGHT_BROWSERS_PATH=… python3 test/campaign_test.py   # 63 comprobaciones: inicio, cómic, ficha, riel y la campaña entera
```

## Iteración 6: dos máquinas rehechas y un cómic por máquina

- **Máquina 7 · el caso de los gemelos**: un expediente en tres pasos siempre visibles. 1) Medir vueltas: clic en cada habitante y la noria cuenta cuántos pasos tarda en volver a casa; la tabla de HUELLAS se rellena sola y marca lo que no coincide (dos del reloj tardan 4; ningún gemelo). 2) Puente: suponer f(1) = cada gemelo y ver el choque f(2) = f(0) (los cuatro). 3) Informe de cuatro líneas que sigue el razonamiento; cada hueco se comprueba con lo medido y explica por qué falla («cierto pero no sirve», «eso no es lo que midió la noria»…). Ya no hay tarjetas que colocar a ciegas.
- **Máquina 8 · el corazón**: una sola sala sin cámara. El corazón tiene cuatro válvulas, cada una unida con una línea de color a su estación y etiquetada con la máquina de la que viene (engranaje · máq. 1 y 2; garra · máq. 2; probador y trituradora · máq. 3; vuelta · máq. 6). El corazón late más fuerte con cada válvula abierta.
- **Un cómic por máquina** (`src/comics.js`): 3 viñetas animadas que presentan el problema con sus personajes; se ven la primera vez que entras y se pueden repetir desde la orden de trabajo del mapa o desde la pausa.

## Iteración 5: más vida

- **Portada nueva**: cartel colgante con marquesina de bombillas que se encienden en secuencia y engranajes girando; mundos flotantes unidos por cables; fábricas con humo suave (sin parpadeos), ventanas con siluetas, lucernarios; patio nocturno con farolas, polillas, cinta transportadora y la máquina traductora; el operario apretando una farola; panel de control con pilotos y contador de máquinas reparadas.
- **Cómic rehecho** («El turno de noche»): portada + 4 páginas con maquetación distinta, 13 viñetas animadas, globos anclados a los personajes, onomatopeyas, tramas, rayos y líneas de velocidad, sonido al revelar cada viñeta, paso de página animado y botón ATRÁS.
- **Detalles en todo el juego**: lámparas de techo con su cono de luz, carteles con humor (y pistas), relojes, suelos de tablones, papel pintado, motas de polvo y viñeteado en los niveles; en el mapa, arbustos, pájaros, sombras de nubes, rosa de los vientos, manchas de café, una nota adhesiva con el progreso y vapor en la vagoneta.
- `src/deco.js` — piezas de ambiente compartidas (humo, luces, carteles, tuberías, relojes, polvo).

## Iteración 4: presentación y claridad

- **Pantalla de inicio** (noche, fábricas, criaturas que cruzan una máquina): CONTINUAR / NUEVA PARTIDA (con confirmación) / VER EL CÓMIC.
- **Cómic de introducción** (3 páginas, 9 viñetas que se revelan una a una): qué es una estructura, qué hace una máquina sana (▲ = ●), cómo se rompen, quién eres. Se puede saltar y volver a ver.
- **Música generativa** (Web Audio, sin archivos): bajo, marimba, armonio, escobilla y clarinete; un ánimo para inicio, cómic, mapa, niveles (cada máquina en su tonalidad) y final. Volumen propio (botón MÚSICA, tecla U), independiente de los efectos.
- **Ficha de la máquina** al entrar por primera vez en cada nivel (y siempre con FICHA / F1): los mundos con su operación explicada en palabras **y** su tabla de operar, qué hace cada control y el objetivo.
- **Riel de herramientas** a la derecha con etiquetas: **MENÚ** (rojo, explícito), FICHA, PISTA, TABLAS, CUADERNO, SALTAR; abajo efectos, música y movimiento. Al pasar el ratón cada botón dice qué hace (y la tecla).
- **Sin márgenes**: el lienzo ocupa toda la ventana; el escenario de cada nivel se prolonga hasta los bordes; el riel y la orden plegada viven en los márgenes laterales, así ya no tapan el juego. Los objetos de cada escena muestran su función al dejar el ratón encima.
- **Mapa rediseñado**: una vía de tren recorre las ocho estaciones (oxidada, rota o reluciente según el estado), una vagoneta con dos criaturas viaja hasta la siguiente avería, andenes, postes con medallón numerado, carteles bajo la vía y leyenda de estados.

## Campaña (iteración 3: cada nivel tiene su propio espacio)

| # | Escenario | Interacción principal | Se repara cuando |
|---|---|---|---|
| 1 | La traductora (se conserva) | bloques de reglas, cables, balanza ▲/● | x mod 2 conserva la suma |
| 2 | Taller de inspección (cámara horizontal) | rueda «¿a dónde va el 1?» con tren de engranajes, garra, lupa comparadora | núcleo = {0} (rueda en 1 o 3, o diales manuales válidos) |
| 3 | Planta de clasificación | producir, periscopio, etiquetas, probador de cierre, trituradora en grúa | destino {0,2}: epimorfismo |
| 4 | Sala de espejos | girar espejos, pasear parejas, examinar neutros, desfile de 16 | f(e)=e, homomorfismo sobreyectivo |
| 5 | Línea de copias | producir; clasificador de choques; farolero de vacíos; enviar a taller | cuatro copiadoras en su taller |
| 6 | Torre de ascensores (cámara vertical) | poleas, SUBIR, BAJAR | isomorfismo Z4 ≅ U(5) y la vuelta conserva |
| 7 | Laboratorio de dos terrarios | combinar criaturas, repetidor de órdenes, puente de prueba, argumento de tres piezas | demostración aceptada: no existe isomorfismo |
| 8 | Nave del corazón (cuatro zonas) | engranaje de 8, garra, trituradora, estación de vuelta | x ↦ 2x sobre {0,2,4,6}, ida y vuelta |

Análisis de repetición y pruebas de experiencia: `docs/AUDITORIA.md`.

## Controles

Ratón/táctil: arrastrar criaturas a destinos, clic en cables para quitarlos, arrastrar destinos a la cinta/espejo/tiovivo.
Globales: Esc menú (en el mapa: volver al inicio), F1 o ? ficha de la máquina, H pista, K tablas, X saltar secuencia, C cuaderno, O plegar la orden, U música. Teclado: Tab/flechas recorren, Enter actúa; R ejecutar; Z deshacer; N reiniciar; I «¿Qué pasó?»; M sonido; L movimiento. Nivel 1: números para tender cables, F fórmula. Nivel 2: G gira la rueda, A/D recorren el taller. Nivel 3: P probador, T triturar. Nivel 4: 0–3 suben a la pasarela, D desfile. Nivel 5: 1–4 bajan copiadoras. Nivel 6: U subir, B bajar, W/S mover la cámara. Nivel 7: S sellar. Nivel 8: G rueda, 0–7 marcar, P, T, B volver, A/D cámara.

## Arquitectura

- `src/core.js` — nivel 1 (Z4 → Z2, gramática de bloques, deshacer).
- `src/groups.js` — grupos finitos por tabla de Cayley, identidad real, subgrupos con testigo, órdenes, verificador de homomorfismos (todos los pares), núcleo, imagen, mono/epi/iso, inversa; estado y objetivos de los niveles 2–8.
- `src/gfx.js`, `critters.js`, `chars.js` — dibujo a mano, interpolaciones, sonido Web Audio, criaturas y personajes.
- `src/kit.js` — eventos, secuenciador interrumpible, diálogos sin repetición, pistas graduadas, reacciones, cámara, comprobador de rutas, veredicto, tabla de Cayley, familias de sonido.
- `src/level1.js`, `scene2.js` … `scene8.js` — una escena por nivel. `src/app.js` — vista a pantalla completa, riel de herramientas, mapa, transiciones, pausa, ficha, cuaderno, informes, tabla portátil, guardado.
- `src/music.js` — música generativa. `src/title.js` — pantalla de inicio y cómic. `src/briefs.js` — fichas de cada máquina (operaciones y controles).
