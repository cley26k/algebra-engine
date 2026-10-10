# Auditoría de repetición (iteración 2 → 3)

Causa raíz: niveles 2, 3, 4, 6, 7 y 8 se generaban con **una sola escena parametrizada** (`workbench.js`).
Todos compartían: orden fija arriba a la izquierda, isla de origen a la izquierda, máquina con centralita en el centro,
isla de destino a la derecha, balanza arriba a la derecha y cinta de 16 pares abajo a la derecha. Cambiaban grupos,
colores y un aparato anexo. La única acción real era *tender cables y tirar de la palanca*, de ahí la sensación de
"probar combinaciones hasta que el juego acepte".

| Nivel | Composición actual | Mecánica real | Concepto | Se repite | Nueva puesta en escena | Nueva interacción principal |
|---|---|---|---|---|---|---|
| 1 | traductora central | bloques de reglas + cables + balanza | homomorfismo | — (es el original) | se conserva | se conserva; la comprobación se detiene en la primera divergencia |
| 2 | banco genérico + garra anexa | cables Z4→Z4 | núcleo, mono | todo el banco | **taller de inspección horizontal con cámara móvil**: cinta, estampadora, bandejas, riel con garra gigante | girar **una** rueda (¿a dónde va el 1?) acoplada por engranajes; investigar el núcleo con la garra y la **lupa comparadora** (a − b cae en el neutro) |
| 3 | banco + trituradora anexa | marcar destinos y triturar | imagen, epi | todo el banco | **planta de clasificación a pantalla completa**: tolva, rampas, compuertas, contenedores con contadores de visitas | **periscopio de preimágenes**, etiquetas de triturado y **probador de cierre** físico antes de triturar |
| 4 | banco + espejo de bolsillo | cables Z4→espejo | f(e) = e | todo el banco | **sala de espejos**: horizonte, mundo reflejado boca abajo, pasarela, balanza colgante | **girar espejos** y **pasear parejas** por la pasarela; los reflejos se deforman si la identidad no se conserva |
| 5 | tabla de 3 filas | herramientas + parte | inj/sobre por separado | formato de tabla | **línea de producción en movimiento** con dos mecanismos físicos (choques / farola de vacíos) | enviar cada copiadora al taller correcto |
| 6 | banco + ensamblador anexo | cables Z4→U(5) | isomorfismo | todo el banco | **torre vertical de ascensores** con poleas y contrapesos | elegir el piso de cada ascensor; **subir** y **bajar**; el regreso sólo encaja si es biyectivo |
| 7 | banco + tiovivo | biyecciones al azar + sello | órdenes | todo el banco; invitaba a probar 24 biyecciones | **laboratorio con dos terrarios** que se exploran por separado, tablón de pruebas | **combinar criaturas** a mano, repetidor de órdenes, **puente de prueba** f(1)=x y argumento de tres piezas |
| 8 | banco con todo | cables + garra + trituradora | síntesis | todo el banco | **nave de varias zonas** que se recorre con la cámara | acciones coordinadas en cuatro zonas |

Sistemas nuevos compartidos (`src/kit.js`): bus de eventos, secuenciador interrumpible, director de diálogos sin repeticiones,
pistas graduadas deterministas (observación → propiedad → ejemplo parcial), marcas de reacción, cámara, comprobador portátil
de rutas que se detiene en la divergencia, etiqueta de veredicto que distingue los cinco casos, tabla de Cayley portátil
con filas y columnas resaltadas, y familias de sonido con variación.

## Pruebas de experiencia (verificadas en `test/campaign_test.py` y `test/lab.test.js`)

| Pregunta | Cómo se comprueba |
|---|---|
| ¿Cada error aporta información? | Todo fallo de operación abre el comprobador de rutas con el par divergente (niveles 1, 2, 4, 5, 6, 8); los no inyectivos señalan la pareja que choca y el testigo en el neutro; los no sobreyectivos, el destino vacío; las funciones incompletas, quién no tiene imagen. |
| ¿Se distingue homomorfismo válido de isomorfismo? | El cartel de veredicto separa cinco casos; las pruebas exigen `hom-neither`, `hom-nonsurj` o `iso` donde corresponde (niveles 2, 3, 4, 6, 8). |
| ¿Se resuelve sin búsqueda aleatoria? | `lab.test.js` resuelve los niveles 2, 4, 6 y 8 sólo con lo que el juego muestra (contraejemplo → reparar el par; testigo del núcleo → elegir otro destino para el 1), en ≤ 6 ejecuciones. El nivel 7 ya no admite probar biyecciones: exige una demostración. |
| ¿Los personajes ayudan sin resolver? | Pistas en tres grados por regla determinista (observación → propiedad → ejemplo parcial); la prueba comprueba que son tres textos distintos. |
| ¿Se puede deshacer y experimentar? | Deshacer/reiniciar en todos los niveles; las secuencias se pueden acelerar o saltar (botón ⏩, tecla X). |
| ¿Hay una mecánica distinta por nivel? | Ver la tabla de arriba: ninguna escena reutiliza la composición de otra. |
| ¿La animación refleja el estado real? | Cada secuencia se genera a partir de `AlgebraGroups.diagnose()` antes de animar; la celebración sólo se lanza tras `evaluate().done`. |
