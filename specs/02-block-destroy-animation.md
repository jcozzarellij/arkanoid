# SPEC 02 — Animación de explosión al destruir bloques

> **Status:** aprobado
> **Depends on:** SPEC 01
> **Date:** 2026-07-07
> **Objective:** Al romper un bloque, reproducir la animación de explosión de 4 frames del spritesheet en su lugar (con el color del bloque) antes de que el "Victoria" pueda dispararse.

---

## Scope

**In:**

- Al romper un bloque, en vez de desaparecer instantáneamente, se reproduce la animación de explosión de `EXPLOSION_FRAMES[color]` (4 frames) en la posición y tamaño del bloque roto.
- Cada frame se muestra durante `EXPLOSION_DURATION` (150ms), duración total ~600ms por explosión.
- La animación se dibuja estirada al tamaño del bloque (80x30), igual que ya hace `drawSprite` con los bloques vivos.
- El bloque deja de existir para la física (colisión/puntaje) en el mismo instante que hoy — la animación es puramente visual y no bloquea a la bola.
- Se soportan múltiples explosiones simultáneas sin límite (varios bloques rotos casi a la vez, cada uno con su propia animación independiente).
- El overlay de "Victoria" espera a que termine la última animación de explosión pendiente antes de mostrarse (en vez de aparecer instantáneamente al romper el último bloque).
- El loop principal pasa a usar el timestamp de `requestAnimationFrame` para medir el progreso de cada animación.
- Se reutilizan exclusivamente los sprites de explosión ya presentes en `assets/spritesheet.js` (`EXPLOSION_FRAMES`, `EXPLOSION_DURATION`, `drawFrame`); no se generan ni agregan assets nuevos.

**Out of scope (for future specs):**

- Sonido al romper un bloque (`break-sound.mp3`).
- Sonido de rebote de la bola (`ball-bounce.mp3`).
- Cualquier cambio a la física de rebote, puntaje o al Game Over (el overlay de Game Over sigue apareciendo de forma inmediata, sin relación con las explosiones).
- Efectos de partículas adicionales o shake de cámara.

---

## Data model

Se agrega un array `explosions` al estado global, y el estado del bloque roto pasa a marcar cuándo se rompió:

```js
const state = {
  // ...campos existentes (screen, score, lives, ballLaunched, paddle, ball, blocks)

  explosions: [
    // { x, y, width, height, color, startTime }
  ],
};
```

Convenciones:

- `startTime` se guarda con el `timestamp` que entrega `requestAnimationFrame` (no `Date.now()`), para que el progreso de la animación sea consistente con el resto del loop.
- El frame a dibujar se calcula como `Math.floor((timestamp - startTime) / EXPLOSION_DURATION)`, con `EXPLOSION_FRAMES[color].length === 4`.
- Cuando el frame calculado es `>= 4`, la explosión terminó y se elimina de `explosions` (no se vuelve a dibujar).
- `x`, `y`, `width`, `height` se copian de las dimensiones del bloque roto en el momento de la colisión, para que la animación quede fija en su lugar aunque el array de bloques cambie.

---

## Implementation plan

1. Cambiar `loop()` para que reciba el `timestamp` de `requestAnimationFrame` y lo pase a `update(timestamp)`. Agregar `explosions: []` a `createInitialState()` y limpiar el array en `resetGame()`. Test manual: el juego se comporta exactamente igual que antes (sin cambios visibles), sin errores en consola.
2. En la colisión con bloques dentro de `updateBall`, además de `block.alive = false`, agregar un objeto a `state.explosions` con `{ x: block.x, y: block.y, width: block.width, height: block.height, color: block.color, startTime: timestamp }`. Test manual: romper un bloque; sigue desapareciendo igual que antes (todavía no se dibuja la animación), pero se puede confirmar en consola/debugger que `state.explosions` crece en cada rotura.
3. Crear `updateExplosions(timestamp)`: recorre `state.explosions`, calcula el frame de cada una (`Math.floor((timestamp - startTime) / EXPLOSION_DURATION)`) y descarta (filtra) las que ya alcanzaron el frame 4. Llamarla desde `update()`. Test manual: sin cambios visuals todavía, pero el array de explosiones se vacía solo pasados ~600ms de cada rotura.
4. Crear `drawExplosions()`: para cada explosión activa, recalcula su frame actual y llama a `drawFrame(ctx, EXPLOSION_FRAMES[color][frame], x, y, width, height)`. Llamarla desde `render()`, después de `drawBlocks()`. Test manual: romper un bloque y ver la animación de 4 frames reproducirse en su color en el lugar del bloque, incluyendo el caso de romper dos bloques casi a la vez (dos animaciones simultáneas independientes).
5. Cambiar la condición de victoria en `updateBall` de `state.blocks.every(b => !b.alive)` a esa misma condición **más** `state.explosions.length === 0`. Test manual: romper todos los bloques; el overlay de "Victoria" no aparece hasta que termina de reproducirse la última animación de explosión pendiente.
6. Pasada final de verificación manual: partida completa rompiendo bloques (incluyendo rotura simultánea de varios), confirmar que las animaciones se ven con el color correcto, que la física de la bola no se ve afectada por bloques en explosión, que Game Over sigue apareciendo de forma inmediata (no depende de explosiones), y que no hay errores en consola.

---

## Acceptance criteria

- [ ] Al romper un bloque, se reproduce la animación de 4 frames de `EXPLOSION_FRAMES` en el color del bloque roto, en su misma posición y tamaño.
- [ ] La animación dura ~600ms (4 frames x 150ms) y luego desaparece por completo.
- [ ] El bloque deja de bloquear la física de la bola en el mismo instante en que se rompe, sin esperar a que termine la animación.
- [ ] Romper dos o más bloques casi al mismo tiempo muestra sus animaciones de explosión simultáneas e independientes, cada una en su color correcto.
- [ ] El score se sigue sumando en el momento de la rotura, igual que antes (sin cambios de timing en el puntaje).
- [ ] Al romper el último bloque, el overlay de "Victoria" no aparece hasta que termina de reproducirse la última animación de explosión pendiente.
- [ ] El overlay de "Game Over" sigue apareciendo de forma inmediata al quedarse sin vidas, sin relación con animaciones de explosión activas.
- [ ] El juego no muestra errores en consola durante una partida completa (romper bloques, ganar, y por separado perder las 3 vidas).
- [ ] Al presionar "Reintentar" en cualquier overlay, no quedan animaciones de explosión residuales de la partida anterior.

---

## Decisions

- **Yes:** usar `EXPLOSION_DURATION` (150ms/frame) tal cual viene del asset, sin inventar timing propio. Razón: confirmado por el usuario, evita reinventar valores que ya provee `spritesheet.js`.
- **Yes:** la explosión se dibuja estirada al tamaño del bloque (80x30), igual que `drawSprite` ya hace con los bloques vivos. Razón: consistencia visual confirmada por el usuario; evita que la animación se vea desproporcionada respecto al grid.
- **Yes:** el bloque deja de existir para la física apenas se rompe; la animación es puramente visual y no bloquea a la bola. Razón: mantiene la física simple y predecible del spec 01, sin agregar un estado intermedio "rompiéndose pero sólido".
- **Yes:** múltiples explosiones simultáneas sin límite, cada una como una entrada independiente en `state.explosions`. Razón: es el comportamiento natural esperado al romper varios bloques a la vez; no hay motivo para limitarlo en este alcance.
- **Yes:** el overlay de "Victoria" espera a que termine la última animación pendiente (`state.explosions.length === 0`) antes de mostrarse. Razón: confirmado por el usuario, se ve mejor que el overlay tape la última explosión.
- **No:** el overlay de "Game Over" no espera animaciones. Razón: no fue pedido y no aplica — perder una vida no dispara ninguna explosión, así que no hay nada que esperar.
- **No:** sonido de rotura (`break-sound.mp3`) en este spec. Razón: el usuario confirmó que este spec es solo sobre la animación visual; el sonido queda para un spec futuro, igual que ya estaba diferido en el spec 01.
- **Yes:** usar el `timestamp` de `requestAnimationFrame` (en vez de `Date.now()`) para medir el progreso de cada explosión. Razón: es el valor que ya entrega el loop nativo del navegador, evita una llamada extra y mantiene el timing consistente con el resto del render.
- **Yes:** reutilizar exclusivamente `EXPLOSION_FRAMES`/`drawFrame` ya existentes en `assets/spritesheet.js`, sin crear assets nuevos. Razón: pedido explícito del usuario y consistente con la guía del proyecto de reusar los helpers de sprites ya disponibles.

---

## What is **not** in this spec

- Sonido al romper un bloque (`break-sound.mp3`).
- Sonido de rebote de la bola (`ball-bounce.mp3`).
- Cambios a la física de rebote, puntaje o al Game Over.
- Efectos de partículas adicionales o shake de cámara.

Cada uno de estos, si se implementa, va en su propio spec.
