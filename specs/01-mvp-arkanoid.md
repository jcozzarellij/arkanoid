# SPEC 01 — MVP jugable de Arkanoid

> **Status:** Implementado
> **Depends on:** —
> **Date:** 2026-07-06
> **Objective:** Implementar un MVP jugable de Arkanoid de un solo nivel con controles de mouse/teclado, sistema de vidas y puntaje, y pantallas de victoria/derrota.

---

## Scope

**In:**

- Un único nivel con un grid fijo de bloques de 10 columnas x 6 filas.
- Canvas de 800x600 píxeles.
- Bloques usando los 7 colores del spritesheet (`gray`, `red`, `yellow`, `cyan`, `magenta`, `hotpink`, `green`), distribuidos en el grid.
- Control de la pala simultáneo por mouse (seguir al cursor) y teclado (flechas o A/D).
- Lanzamiento de la bola por click o tecla espacio, tanto al inicio de la partida como después de perder una vida.
- Física de rebote simple y predecible, con velocidad de la bola fija durante toda la partida.
- Sistema de 3 vidas.
- Puntaje plano: 10 puntos por bloque destruido, sin importar el color.
- Al destruir un bloque, este desaparece inmediatamente (sin animación ni sonido).
- Overlay de "Victoria" al destruir todos los bloques.
- Overlay de "Game Over" al quedarse sin vidas.
- Botón "Reintentar" en ambos overlays que reinicia toda la partida (vidas=3, score=0, grid de bloques completo).
- Reutilización de `assets/spritesheet.js` para dibujar la pala, la bola y los bloques.
- Estructura en 3 archivos: `index.html`, `style.css`, `game.js`.

**Out of scope (for future specs):**

- Sonidos (`ball-bounce.mp3`, `break-sound.mp3`).
- Animación de explosión al romper un bloque (`EXPLOSION_FRAMES`).
- Múltiples niveles o progresión de niveles.
- Persistencia de score o progreso entre sesiones (localStorage / high scores).
- Incremento progresivo de la velocidad de la bola / dificultad escalable.
- Pausa del juego.
- Power-ups.
- Controles táctiles / mobile.

---

## Data model

```js
// Estado global del juego
const state = {
  screen: 'playing', // 'playing' | 'victory' | 'gameover'
  score: 0,
  lives: 3,
  ballLaunched: false, // false = bola reposando sobre la pala, espera click/espacio

  paddle: {
    x: 340, y: 570, width: 120, height: 14, // origen top-left
  },

  ball: {
    x: 400, y: 556, radius: 8,
    vx: 3, vy: -3, // velocidad fija en píxeles/frame, magnitud constante toda la partida
  },

  blocks: [
    // { x, y, width, height, color, alive }
  ],
};

// Generación del grid: 10 columnas x 6 filas, bloques de 80x30px, sin gaps,
// empezando en (0, 40).
const COLS = 10;
const ROWS = 6;
const BLOCK_WIDTH = 80;
const BLOCK_HEIGHT = 30;
const BLOCK_TOP_OFFSET = 40;
const COLORS = ['gray', 'red', 'yellow', 'cyan', 'magenta', 'hotpink', 'green'];

// Color de cada bloque: se cicla sobre COLORS por índice lineal del bloque,
// así se garantiza que los 7 colores aparecen distribuidos en el grid.
// color = COLORS[(row * COLS + col) % COLORS.length]
```

Convenciones:

- Coordenadas: origen arriba a la izquierda (top-left), igual que el canvas 2D.
- Velocidades en píxeles/frame (no depende de delta time para mantener la física simple y predecible).
- Física de rebote: reflexión simple — la componente `vy` se invierte al chocar contra el techo, la pala o un bloque (por su cara superior/inferior); la componente `vx` se invierte al chocar contra las paredes laterales o un bloque (por su cara lateral). No hay variación de ángulo según el punto de impacto en la pala.

---

## Implementation plan

1. Crear el esqueleto del proyecto: `index.html` (canvas de 800x600, incluye `assets/spritesheet.js` y `game.js`), `style.css` (centrado básico del canvas, fondo), `game.js` (carga el spritesheet y loguea "loaded"). Test manual: abrir `index.html`, ver el canvas vacío sin errores en consola.
2. Dibujar la escena estática: pala, bola y el grid completo de bloques con sus 7 colores, usando `drawSprite`, sin movimiento todavía. Test manual: recargar y ver pala/bola/bloques en las posiciones del modelo de datos.
3. Implementar el movimiento de la pala por mouse (`mousemove` fija `paddle.x`, clamp a los límites del canvas) y por teclado (flechas o A/D, mueve `paddle.x` a velocidad fija por frame). Test manual: mover el mouse y presionar las flechas, la pala responde a ambos y no sale del canvas.
4. Implementar el estado de lanzamiento: con `ballLaunched=false` la bola reposa centrada sobre la pala y se mueve junto con ella; click o espacio pone `ballLaunched=true` y activa `vx`/`vy`. Test manual: antes del click la bola sigue a la pala; tras el click, la bola viaja en línea recta (todavía sin colisiones, se sale del canvas — esperado en este paso).
5. Implementar colisión con paredes y pala: las paredes laterales/superior invierten `vx`/`vy` según corresponda, tocar la pala invierte `vy`; si la bola cae por debajo de la pala se resta una vida, se reposiciona la bola (`ballLaunched=false`) y si las vidas llegan a 0 se pasa `screen` a `'gameover'`. Test manual: rebotar contra paredes/pala repetidamente, dejar caer la bola a propósito y ver que se resta una vida y se resetea, y agotar las vidas para confirmar el cambio de `screen`.
6. Implementar colisión con bloques: detección AABB contra bloques con `alive=true`, al impactar se marca `alive=false`, se invierte la componente de velocidad correspondiente y se suman 10 puntos; los bloques con `alive=false` dejan de dibujarse. Cuando todos los bloques están `alive=false`, `screen` pasa a `'victory'`. Test manual: romper bloques y ver el score subir, romperlos todos y confirmar el cambio de `screen`.
7. Implementar el HUD: dibujar score y vidas en el canvas, actualizados cada frame. Test manual: el score y las vidas se ven y se actualizan durante la partida.
8. Implementar los overlays de Game Over y Victoria, cada uno con su mensaje y un botón "Reintentar" que resetea el estado completo (vidas=3, score=0, bloques regenerados, `ballLaunched=false`, pala/bola reposicionadas) y vuelve `screen` a `'playing'`; mientras un overlay está visible, el loop del juego deja de actualizar. Test manual: provocar Game Over y Victoria, ver el overlay correspondiente, presionar Reintentar y confirmar que la partida se reinicia por completo.
9. Pasada final de verificación manual: partida completa de punta a punta (lanzar, romper todos los bloques y ganar; y perder las 3 vidas y perder), sin errores en consola, cumpliendo los criterios de aceptación.

---

## Acceptance criteria

- [ ] El juego carga en `index.html` sin errores en la consola.
- [ ] El canvas mide 800x600 píxeles.
- [ ] Se renderizan 60 bloques (10 columnas x 6 filas) usando los 7 colores del spritesheet.
- [ ] La pala se mueve siguiendo al mouse.
- [ ] La pala se mueve con las flechas del teclado (o A/D).
- [ ] Al iniciar, la bola reposa sobre la pala hasta que se presiona click o espacio.
- [ ] Tras perder una vida (sin ser game over), la bola vuelve a reposar sobre la pala hasta el próximo click o espacio.
- [ ] La bola rebota correctamente contra las paredes laterales, la pared superior y la pala.
- [ ] Al romper un bloque, este desaparece inmediatamente y suma 10 puntos al score.
- [ ] El score y las vidas restantes se muestran en pantalla y se actualizan en tiempo real.
- [ ] Si la bola cae por debajo de la pala, se resta una vida.
- [ ] Al llegar a 0 vidas, se muestra el overlay de "Game Over".
- [ ] Al destruir los 60 bloques, se muestra el overlay de "Victoria".
- [ ] El botón "Reintentar" de ambos overlays reinicia vidas a 3, score a 0 y regenera los 60 bloques.
- [ ] Mientras un overlay está visible, la pala y la bola no se mueven.
- [ ] Al recargar la página, el juego siempre empieza desde cero (sin persistencia de score ni progreso).

---

## Decisions

- **Yes:** control de pala simultáneo por mouse y teclado. Razón: pedido explícito del usuario para mayor flexibilidad de juego.
- **Yes:** velocidad de la bola fija durante toda la partida. Razón: el usuario pidió física simple y predecible; evita balancear dificultad progresiva en el MVP.
- **No:** variación de ángulo de rebote según el punto de impacto en la pala (mecánica clásica de Arkanoid). Razón: contradice la física simple y predecible pedida; se opta por reflexión especular.
- **Yes:** reflexión especular simple (invertir `vx`/`vy` según la superficie) para todas las colisiones. Razón: consistente con "rebote simple y física predecible".
- **Yes:** color de cada bloque asignado por índice lineal cíclico sobre las 7 colores. Razón: garantiza que los 7 colores del spritesheet aparecen distribuidos en el grid sin definir un patrón manual arbitrario.
- **No:** animación de explosión (`EXPLOSION_FRAMES`) al romper un bloque. Razón: el usuario pidió que el bloque simplemente desaparezca en el MVP; se difiere a un spec futuro.
- **No:** sonidos (`ball-bounce.mp3`, `break-sound.mp3`). Razón: mismo motivo que la animación, fuera del alcance del MVP.
- **No:** persistencia de score o progreso (localStorage). Razón: el usuario confirmó que no se guarda nada entre sesiones; siempre se empieza de cero.
- **No:** múltiples niveles. Razón: el MVP se limita a un único nivel con layout fijo de 10x6.
- **No:** pausa del juego. Razón: no fue solicitada; se mantiene el alcance mínimo jugable.
- **Yes:** estructura en 3 archivos (`index.html`, `style.css`, `game.js`). Razón: mejora la legibilidad sin agregar complejidad de build, consistente con el enfoque "zero dependencies" del proyecto.
- **Yes:** reutilizar `assets/spritesheet.js` para dibujar pala, bola y bloques. Razón: evita reinventar el sistema de sprites ya existente en el repo.

---

## Risks

| Riesgo                                                                 | Mitigación                                                                                     |
| ----------------------------------------------------------------------| ------------------------------------------------------------------------------------------------|
| Velocidad basada en píxeles/frame varía según el refresh rate del monitor | Aceptado para el MVP; se documenta como limitación conocida, no bloquea la jugabilidad básica. |
| Rebote perfectamente horizontal (`vy` llega a 0) deja la bola en loop sin tocar la pala | Al generar el lanzamiento inicial, usar siempre una componente `vy` mínima distinta de cero. |
| Conflicto entre mouse y teclado moviendo la pala a la vez              | El último input que se procese en el frame gana; no se requiere resolución especial para el MVP. |

---

## What is **not** in this spec

- Sonidos (`ball-bounce.mp3`, `break-sound.mp3`).
- Animación de explosión al romper un bloque (`EXPLOSION_FRAMES`).
- Múltiples niveles o progresión de niveles.
- Persistencia de score o progreso entre sesiones (localStorage / high scores).
- Incremento progresivo de la velocidad de la bola / dificultad escalable.
- Pausa del juego.
- Power-ups.
- Controles táctiles / mobile.

Cada uno de estos, si se implementa, va en su propio spec.
