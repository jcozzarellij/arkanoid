# SPEC 03 — Efectos de sonido y sistema de niveles progresivo

> **Status:** aprobado
> **Depends on:** SPEC 01, SPEC 02
> **Date:** 2026-07-07
> **Objective:** Agregar los sonidos de rebote y rotura de bloques, y un sistema de 3 niveles progresivos (mismo grid con distinto patrón de colores y +15% de velocidad de bola por nivel) que se completan en secuencia con overlays de transición.

---

## Scope

**In:**

- Sonido `ball-bounce.mp3` reproducido en cada rebote contra paredes laterales, pared superior y la pala (no en bloques).
- Sonido `break-sound.mp3` reproducido en cada bloque roto; si se rompen varios bloques casi al mismo tiempo, los sonidos se superponen (una instancia de audio por bloque).
- Volumen fijo para ambos sonidos, sin control de mute/volumen en UI.
- El audio se desbloquea reusando el gesto existente de click/espacio que ya lanza la bola; no se agrega ningún paso adicional.
- Sistema de 3 niveles, definidos como una lista fija hardcodeada.
- Los 3 niveles reutilizan el mismo grid de 10x6 bloques, cada uno con un patrón de colores distinto.
- La velocidad de la bola aumenta un 15% en cada nivel respecto al anterior (nivel 1 = velocidad base del MVP `vx/vy=3`; nivel 2 ≈ `3.45`; nivel 3 ≈ `3.97`).
- Al romper todos los bloques de los niveles 1 y 2, se muestra un overlay de transición con botón "Siguiente nivel" (espera a que terminen las animaciones de explosión pendientes, igual que el overlay de Victoria del spec 02).
- Al pasar de nivel, la pala y la bola vuelven a su posición inicial (igual que tras perder una vida): pala centrada, bola reposando sobre la pala esperando click/espacio.
- Las vidas y el score se mantienen a través de los 3 niveles de la partida (no se resetean al cambiar de nivel).
- Al romper todos los bloques del nivel 3 (el último), se muestra un overlay distinto de "Juego completado", con botón "Reintentar" que reinicia toda la partida (nivel=1, vidas=3, score=0).
- El HUD muestra el nivel actual junto a score y vidas (ej. "Nivel 2/3").
- Game Over (perder las 3 vidas, en cualquier nivel) reinicia siempre desde el nivel 1 (nivel=1, vidas=3, score=0, bloques regenerados).

**Out of scope (for future specs):**

- Control de volumen o mute en la UI.
- Persistencia de nivel/score/progreso entre sesiones (localStorage); al recargar la página el juego siempre arranca en el nivel 1.
- Generación procedural de niveles.
- Layouts con huecos o formas variables entre bloques (los 3 niveles usan el grid completo 10x6, solo cambia el patrón de color).
- Más de 3 niveles.
- Power-ups.
- Cambios a la física de rebote más allá del incremento de magnitud de velocidad (sigue siendo reflexión especular simple, sin variación de ángulo).
- Pausa del juego.

---

## Data model

```js
// Estado global (extiende el de SPEC 01/02)
const state = {
  screen: 'playing', // 'playing' | 'levelComplete' | 'gameComplete' | 'gameover'
  level: 1, // 1..LEVELS.length
  score: 0,
  lives: 3,
  // ...resto de campos existentes (ballLaunched, paddle, ball, blocks, explosions)
};

const BASE_BALL_SPEED = 3; // magnitud de vx/vy en el nivel 1, igual que el MVP
const LEVEL_SPEED_MULTIPLIER = 1.15;

// Velocidad de la bola para un nivel dado (magnitud, el signo lo define el lanzamiento)
// speed = BASE_BALL_SPEED * (LEVEL_SPEED_MULTIPLIER ** (level - 1))

const LEVELS = [
  { colorFor: (row, col) => COLORS[(row * COLS + col) % COLORS.length] }, // nivel 1: patrón diagonal del MVP
  { colorFor: (row, col) => COLORS[row % COLORS.length] },                // nivel 2: franjas horizontales por fila
  { colorFor: (row, col) => COLORS[(row + col) % COLORS.length] },        // nivel 3: patrón tipo tablero
];

const SOUNDS = {
  bounce: 'assets/sounds/ball-bounce.mp3',
  break: 'assets/sounds/break-sound.mp3',
};
// playSound crea un `new Audio(SOUNDS[name])` y lo reproduce en cada llamada
// (en vez de reusar un único elemento Audio), para permitir reproducciones superpuestas.
```

Convenciones:

- `LEVELS` es una lista fija de 3 entradas; `state.level` indexa sobre ella como `LEVELS[state.level - 1]`.
- La generación del grid (`COLS`, `ROWS`, `BLOCK_WIDTH`, etc.) no cambia respecto al SPEC 01; solo el color de cada bloque pasa de la fórmula fija a `LEVELS[state.level - 1].colorFor(row, col)`.
- La velocidad de la bola se recalcula cada vez que se (re)lanza (inicio de partida, tras perder una vida, o al empezar un nivel nuevo), usando la fórmula de `BASE_BALL_SPEED` según `state.level`.
- `playSound('bounce' | 'break')` no se guarda en `state` — es un efecto de disparo único (fire-and-forget), no un dato persistente del juego.

---

## Implementation plan

1. Agregar `SOUNDS` y la función `playSound(name)` a `game.js` (crea un `new Audio(...)` y lo reproduce en cada llamada). Conectar `playSound('bounce')` en las colisiones existentes contra paredes laterales, pared superior y la pala. Test manual: jugar y confirmar que se escucha el sonido de rebote al chocar contra paredes/pala, y que todavía no suena nada al romper bloques.
2. Conectar `playSound('break')` en el punto donde ya se marca `block.alive = false` (mismo lugar donde se empuja a `state.explosions` según SPEC 02). Test manual: romper bloques y escuchar el sonido de rotura en cada uno; romper dos bloques casi a la vez y confirmar que los sonidos se superponen sin cortarse.
3. Agregar las constantes `LEVELS`, `BASE_BALL_SPEED` y `LEVEL_SPEED_MULTIPLIER`, y el campo `level: 1` a `createInitialState()`/`resetGame()`. Cambiar la generación del grid para usar `LEVELS[state.level - 1].colorFor(row, col)` en vez de la fórmula fija. Test manual: el juego se ve y se comporta exactamente igual que antes (nivel 1 replica el patrón original), sin errores en consola.
4. Cambiar el cálculo de velocidad de la bola al lanzarla (inicio de partida, tras perder una vida) para usar `BASE_BALL_SPEED * (LEVEL_SPEED_MULTIPLIER ** (state.level - 1))`. Test manual: en nivel 1 la velocidad es idéntica a antes (multiplicador = 1); no hay forma de ver el cambio todavía porque no se puede subir de nivel, pero no se rompe nada.
5. Implementar la detección de fin de nivel: cuando todos los bloques están `alive = false` y `state.explosions.length === 0`, si `state.level < LEVELS.length` pasar `screen` a `'levelComplete'`; si `state.level === LEVELS.length`, pasar `screen` a `'gameComplete'` (en vez de usar siempre `'victory'`). Test manual: jugar el nivel 1 completo y ver en consola/debugger que `screen` pasa a `'levelComplete'` (todavía sin overlay visual).
6. Crear el overlay de `'levelComplete'` con mensaje y botón "Siguiente nivel": al presionar, incrementa `state.level`, regenera `state.blocks` con el `colorFor` del nuevo nivel, resetea pala/bola a posición inicial (`ballLaunched = false`), recalcula la velocidad de lanzamiento según el nuevo nivel, y vuelve `screen` a `'playing'`. Crear el overlay de `'gameComplete'` con botón "Reintentar" que reinicia toda la partida (`level = 1`, `score = 0`, `lives = 3`, bloques regenerados). Test manual: completar el nivel 1, ver el overlay "Siguiente nivel", presionarlo y confirmar que el nivel 2 carga con su patrón de colores y la bola se siente más rápida; completar los 3 niveles y ver el overlay "Juego completado".
7. Actualizar el reset de Game Over para volver siempre a `level = 1` (además de `score = 0`, `lives = 3`, bloques regenerados). Actualizar el HUD para mostrar "Nivel X/3" junto a score y vidas. Test manual: perder las 3 vidas estando en el nivel 2 o 3, confirmar que la partida reinicia desde el nivel 1 con su patrón y velocidad originales; confirmar que el HUD muestra el nivel correcto en todo momento.
8. Pasada final de verificación manual: partida completa de punta a punta pasando por los 3 niveles (rompiendo todos los bloques de cada uno, viendo los overlays de transición y el de "Juego completado"), y por separado una partida donde se pierde en el nivel 2 y se confirma el reinicio a nivel 1; confirmar que los sonidos de rebote y rotura se escuchan correctamente (incluyendo superposición al romper varios bloques a la vez) y que no hay errores en consola.

---

## Acceptance criteria

- [ ] Se escucha `ball-bounce.mp3` al rebotar contra las paredes laterales, la pared superior y la pala.
- [ ] No se escucha `ball-bounce.mp3` al chocar contra un bloque (solo suena `break-sound.mp3`).
- [ ] Se escucha `break-sound.mp3` cada vez que se rompe un bloque.
- [ ] Al romper dos o más bloques casi al mismo tiempo, los sonidos de rotura se superponen (se escuchan todos, sin cortarse entre sí).
- [ ] El primer click/espacio que lanza la bola es suficiente para que el audio funcione, sin pasos adicionales.
- [ ] El juego arranca en el nivel 1, con el mismo patrón de colores y velocidad de bola que tenía el MVP (SPEC 01).
- [ ] Al romper todos los bloques del nivel 1 (y de la explosión pendiente terminar), se muestra el overlay "Siguiente nivel" en vez del overlay de Victoria del MVP.
- [ ] Al presionar "Siguiente nivel", el nivel 2 carga con su propio patrón de colores, la pala/bola quedan en posición inicial, y la velocidad de la bola es ~15% mayor que en el nivel 1.
- [ ] Completar el nivel 2 muestra de nuevo el overlay "Siguiente nivel"; al continuar, el nivel 3 carga con su patrón propio y velocidad ~15% mayor que el nivel 2 (~32% mayor que el nivel 1).
- [ ] Al romper todos los bloques del nivel 3, se muestra el overlay "Juego completado" (distinto del overlay "Siguiente nivel").
- [ ] El botón "Reintentar" del overlay "Juego completado" reinicia la partida completa: nivel 1, vidas = 3, score = 0, bloques regenerados con el patrón del nivel 1 y velocidad base.
- [ ] El score y las vidas se mantienen acumulados entre niveles (no se resetean al pasar de nivel).
- [ ] El HUD muestra el nivel actual (ej. "Nivel 2/3") junto al score y las vidas, actualizado en todo momento.
- [ ] Perder las 3 vidas en cualquier nivel (1, 2 o 3) muestra el overlay de "Game Over" y, al presionar "Reintentar", la partida reinicia siempre desde el nivel 1 (vidas = 3, score = 0, patrón y velocidad del nivel 1).
- [ ] Al recargar la página, el juego siempre arranca desde el nivel 1 (sin persistencia de nivel, score ni progreso).
- [ ] El juego no muestra errores en consola durante una partida completa que atraviesa los 3 niveles, ni durante una partida que termina en Game Over.

---

## Decisions

- **Yes:** una sola spec cubre sonidos y sistema de niveles progresivo, en vez de dos specs separadas. Razón: decisión explícita del usuario al arrancar el flujo, pese a que son dominios técnicos distintos (audio vs. data model de niveles); se documenta acá para que quede claro que fue una elección consciente y no un descuido del alcance.
- **Yes:** `ball-bounce.mp3` suena solo en paredes/pala, no en bloques. Razón: el bloque ya tiene su propio `break-sound.mp3`; sonar ambos a la vez en la misma colisión sería redundante.
- **Yes:** `break-sound.mp3` se reproduce superpuesto (una instancia de `Audio` por bloque roto) en vez de limitarse a una reproducción por frame. Razón: consistente con que la animación de explosiones (SPEC 02) ya soporta múltiples explosiones simultáneas independientes; limitar el sonido rompería esa sensación.
- **No:** control de volumen/mute en la UI. Razón: no fue pedido; se mantiene el alcance mínimo, se puede agregar en un spec futuro.
- **Yes:** reusar el click/espacio de lanzamiento como gesto que desbloquea el audio del navegador, sin pantalla adicional. Razón: el juego ya requiere esa interacción para arrancar; agregar un paso extra sería fricción innecesaria.
- **Yes:** 3 niveles definidos como lista fija hardcodeada (`LEVELS`), no generación procedural. Razón: pedido explícito del usuario, consistente con el enfoque "zero dependencies" y con la filosofía de layouts a mano ya usada en el MVP.
- **Yes:** los 3 niveles reutilizan el mismo grid 10x6, cambia solo el patrón de color. Razón: decisión explícita del usuario; simplifica la implementación y evita definir huecos/formas por nivel.
- **Yes:** la velocidad de la bola aumenta 15% por nivel. Razón: el spec 01 había dejado la dificultad progresiva fuera de alcance; ahora el usuario la pidió explícitamente como parte del "sistema de niveles progresivo", con un incremento moderado (no el 25% agresivo que se descartó).
- **No:** incremento de velocidad del 25% por nivel. Razón: el usuario prefirió la progresión más suave del 15%.
- **Yes:** overlay intermedio con botón "Siguiente nivel" entre niveles (no transición automática). Razón: consistente con el patrón de overlays ya establecido en SPEC 01/02 (Victoria/Game Over), le da al jugador control sobre el ritmo.
- **Yes:** overlay distinto "Juego completado" al terminar el nivel 3, separado del overlay "Siguiente nivel". Razón: comunica claramente que se terminó toda la progresión, no solo un nivel más.
- **Yes:** vidas y score se mantienen a través de los 3 niveles (no se resetean al cambiar de nivel). Razón: refleja el progreso real de una partida completa; resetear en cada nivel le quitaría sentido a acumular score.
- **Yes:** Game Over reinicia siempre desde el nivel 1. Razón: mantiene el reinicio simple, consistente con el "Reintentar" ya definido en SPEC 01, sin agregar el concepto de "checkpoint por nivel".
- **Yes:** pala y bola vuelven a posición inicial al pasar de nivel. Razón: mismo comportamiento ya usado tras perder una vida; consistencia y simplicidad de implementación.
- **No:** persistencia de nivel/score en localStorage. Razón: se mantiene la decisión del SPEC 01 de no persistir nada entre sesiones; no fue solicitado un cambio de eso en esta spec.
- **Yes:** mostrar el nivel actual en el HUD ("Nivel X/3"). Razón: da feedback claro de progreso, pedido explícito del usuario.

---

## Risks

| Riesgo                                                                                   | Mitigación                                                                                                                    |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Política de autoplay del navegador bloquea el audio si `.play()` no se llama de forma síncrona dentro del gesto del usuario | Llamar `playSound` directamente dentro del handler de click/keydown que lanza la bola, no en un callback asíncrono posterior. |
| Crear un `new Audio()` por cada bloque roto puede generar muchas instancias si se rompen varios bloques de golpe | Aceptado para este alcance (grid de 60 bloques); si se vuelve un problema de performance, se optimiza en un spec futuro.       |
| Recalcular la velocidad de la bola por nivel podría invertir accidentalmente su dirección si no se preserva el signo de `vx`/`vy` | El nuevo módulo de velocidad se aplica manteniendo el signo que ya define la lógica de lanzamiento existente del SPEC 01.      |

---

## What is **not** in this spec

- Control de volumen o mute en la UI.
- Persistencia de nivel/score/progreso entre sesiones (localStorage).
- Generación procedural de niveles.
- Layouts con huecos o formas variables entre bloques (los 3 niveles usan el grid completo 10x6).
- Más de 3 niveles.
- Power-ups.
- Cambios a la física de rebote más allá del incremento de magnitud de velocidad.
- Pausa del juego.

Cada uno de estos, si se implementa, va en su propio spec.
