/* THE ALGEBRA ENGINE — fichas de máquina: qué hay en cada mundo, cómo se opera y qué hace cada control. */
'use strict';
const BRIEFS = {
  1: {
    goal: 'Conectar cada habitante del reloj de 4 con uno del reloj de 2 de modo que, para TODAS las parejas, sumar aquí y luego traducir (▲) dé lo mismo que traducir y luego sumar allí (●).',
    worlds: [
      { key: 'Z4', name: 'El reloj de 4', rule: 'Se suma y, al llegar a 4, se vuelve a empezar: 3 + 2 = 1, 2 + 2 = 0.' },
      { key: 'Z2', name: 'El reloj de 2', rule: 'Lo mismo con 2 posiciones: 1 + 1 = 0.' },
    ],
    controls: [
      ['Bloques de reglas', 'arrástralos a las ranuras del riel. Una regla encajada está activa (su lámpara se enciende).'],
      ['Criaturas → nidos', 'arrastra una criatura del reloj grande hasta un nido: así decides adónde la lleva la máquina. Clic en un cable lo quita.'],
      ['Ficha del cartel', 'dice con qué número se suma en el mundo pequeño. La máquina guarda fichas en la barriga (ventanilla).'],
      ['Palanca TIRAR', 'pone la máquina en marcha y compara las dos rutas en la balanza.'],
      ['Cinta de pares', 'una casilla por pareja (a, b). Clic en una casilla para volver a verla.'],
    ],
    tip: 'Si la balanza se tuerce, mira qué pareja falla: te dice qué cable revisar.',
  },
  2: {
    goal: 'Que la garra no encuentre en el neutro a nadie salvo al 0, sin que se rompa ninguna suma.',
    worlds: [
      { key: 'Z4', name: 'El reloj de 4 (origen y destino)', rule: 'Se suma módulo 4. El neutro es el 0: sumarlo no cambia nada.' },
    ],
    controls: [
      ['Rueda grande', 'elige adónde va el 1. Los engranajes mueven al resto: f(2) = f(1) + f(1), f(3) = f(2) + f(1).'],
      ['Embrague', 'suelta los diales pequeños para moverlos a mano (entonces las sumas ya no están garantizadas).'],
      ['Palanca ARRANCAR', 'las piezas cruzan la estampadora y caen en su bandeja; luego la garra inspecciona la del neutro.'],
      ['Lupa', 'elige dos piezas de una bandeja: muestra su diferencia y adónde iría.'],
      ['Arrastrar el fondo / A, D', 'recorre el taller, que es más ancho que la pantalla.'],
    ],
    tip: 'Lo que cae en la bandeja del 0 es el núcleo. Si caen dos, la máquina ya no sabe distinguirlos.',
  },
  3: {
    goal: 'Que ningún contenedor se quede sin visitas. El cable está soldado: sólo puedes recortar el conjunto de llegada, y lo que quede tiene que seguir siendo un grupo.',
    worlds: [
      { key: 'SUB2', name: 'La tolva {0, 2}', rule: 'Sólo el 0 y el 2, sumando módulo 4: 2 + 2 = 0.' },
      { key: 'Z4', name: 'Los contenedores (reloj de 4)', rule: 'Se suma módulo 4: 1 + 3 = 0, 2 + 3 = 1.' },
    ],
    controls: [
      ['PRODUCIR', 'suelta piezas por la tolva; los contadores cuentan quién llega a cada contenedor.'],
      ['Clic en un contenedor', 'abre el periscopio (¿quién debería llegar aquí?) y permite MARCAR para triturar.'],
      ['PROBADOR DE CIERRE', 'comprueba, pareja a pareja, que lo que quedaría es un grupo.'],
      ['TRITURAR', 'sólo funciona si el probador dio permiso.'],
    ],
    tip: 'Un conjunto es un grupo si al sumar dos de sus miembros el resultado sigue dentro, y el 0 está.',
  },
  4: {
    goal: 'Elegir el reflejo de cada habitante para que las parejas se reflejen sin grietas y aparezcan los dos reflejos.',
    worlds: [
      { key: 'Z4', name: 'El reloj de 4', rule: 'Se suma módulo 4. Neutro: 0.' },
      { key: 'MIRROR', name: 'El mundo espejo', rule: 'a ⊙ b = «1» si son iguales, «0» si son distintos. Su neutro es «1».' },
    ],
    controls: [
      ['Pomo GIRAR', 'cambia el reflejo que muestra un espejo.'],
      ['Clic en un reflejo', 'lo examina: ¿cambia a alguien al combinarse? Si no, es el neutro.'],
      ['Clic en dos habitantes + PASEAR', 'la pareja suma en el arco (▲) y sus reflejos se combinan en el aire (●). La balanza compara.'],
      ['DESFILE', 'pasan las 16 parejas; se detiene en la primera que no cuadra.'],
    ],
    tip: 'El neutro de aquí tiene que reflejarse en el neutro de allí, aunque no se llamen igual.',
  },
  5: {
    goal: 'Probar cada copiadora en la línea y mandarla al taller de su avería (o a APTO si no tiene ninguna).',
    worlds: [
      { key: 'Z4', name: 'El reloj de 4', rule: 'Suma módulo 4.' },
      { key: 'Z2', name: 'El reloj de 2', rule: 'Suma módulo 2.' },
    ],
    controls: [
      ['Clic en una copiadora', 'la baja a la línea.'],
      ['PRODUCIR', 'la caseta de sumas compara rutas; el clasificador avisa si dos copias caen en el mismo casillero; el farolero planta bandera en los vacíos.'],
      ['Clic en un taller', 'envía allí la copiadora de la línea (clic de nuevo para sacarla).'],
      ['FIRMAR EL PARTE', 'el encargado revisa; si algo no cuadra, te dice qué evidencia lo contradice.'],
    ],
    tip: 'Choques y vacíos son averías distintas: una máquina puede tener una sin la otra.',
  },
  6: {
    goal: 'Que todos suban a un andén distinto, que no quede ningún andén vacío y que el viaje se pueda deshacer bajando.',
    worlds: [
      { key: 'Z4', name: 'Planta baja: el reloj de 4', rule: 'Se SUMA módulo 4. Neutro: 0.' },
      { key: 'U5', name: 'Planta alta: U(5)', rule: 'Se MULTIPLICA módulo 5: 2 × 3 = 6 → 1, 4 × 4 = 16 → 1. Neutro: 1.' },
    ],
    controls: [
      ['Clic en una polea', 'cambia el andén al que lleva su ascensor.'],
      ['SUBIR', 'cada habitante viaja a su andén y se compara la operación.'],
      ['BAJAR', 'intenta deshacer el viaje. Si dos comparten andén, el regreso duda.'],
      ['Arrastrar / W, S', 'sube y baja la cámara por la torre.'],
    ],
    tip: 'Aquí sumar abajo tiene que corresponder a multiplicar arriba: f(a + b) = f(a) × f(b).',
  },
  7: {
    goal: '¿Existe una traducción reversible entre el reloj de 4 y los gemelos de Klein? Sigue el expediente en tres pasos y sella el resultado.',
    worlds: [
      { key: 'Z4', name: 'El reloj de 4', rule: 'Suma módulo 4: el 1 tarda cuatro pasos en volver al 0 (1 → 2 → 3 → 0).' },
      { key: 'V4', name: 'Los gemelos de Klein', rule: 'e es el neutro; cada uno consigo mismo da e (a ∘ a = e); dos distintos dan el tercero (a ∘ b = c).' },
    ],
    controls: [
      ['1 · Clic en un habitante', 'la noria de su mundo lo combina consigo mismo hasta que vuelve a casa y cuenta los pasos. Va a la tabla de HUELLAS.'],
      ['2 · Puente de prueba', 'clic en un gemelo: supone f(1) = ese gemelo y calcula el resto. Pruebe los cuatro.'],
      ['3 · Informe', 'clic en cada hueco para cambiarlo. La marca de la derecha dice si la línea se sostiene con lo medido.'],
      ['SELLAR: IMPOSIBLE (S)', 'sólo funciona con el informe entero correcto.'],
    ],
    tip: 'El orden de los pasos es el del razonamiento: primero las huellas, después la consecuencia, por último la conclusión.',
  },
  8: {
    goal: 'Encender las cuatro válvulas del corazón. Cada válvula se repara con una máquina anterior, en su estación.',
    worlds: [
      { key: 'Z4', name: 'El reloj de 4', rule: 'Suma módulo 4.' },
      { key: 'Z8', name: 'El reloj de 8', rule: 'Suma módulo 8: 5 + 6 = 3. Neutro: 0.' },
    ],
    controls: [
      ['A · Rueda + BOMBEAR', 'válvula 1 (máquinas 1 y 2): el 1 decide el resto; cuatro veces f(1) debe volver al 0.'],
      ['B · Contenedores y garra', 'válvula 2 (máquina 2): al bombear, la garra mira cuántos caen en el neutro.'],
      ['C · Marcar, PROBADOR, TRITURAR', 'válvula 3 (máquina 3): quitar los contenedores vacíos, dejando un grupo.'],
      ['D · VOLVER', 'válvula 4 (máquina 6): el viaje se deshace si nadie comparte contenedor.'],
      ['Clic en una válvula', 'el personaje responsable explica qué mira.'],
    ],
    tip: 'Las líneas de colores unen cada válvula con su estación.',
  },
};
