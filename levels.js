// Definición de niveles: patrón de color por bloque y progresión de velocidad de la bola.
// Depende de las constantes de grilla (COLORS, COLS) definidas en game.js; sus colorFor
// solo se invocan en tiempo de juego, para entonces game.js ya las ha definido.

const BASE_BALL_SPEED = 3; // magnitud de vx/vy en el nivel 1, igual que el MVP
const LEVEL_SPEED_MULTIPLIER = 1.15;

const LEVELS = [
  { colorFor: ( row, col ) => COLORS[ ( row * COLS + col ) % COLORS.length ] }, // nivel 1: patrón diagonal del MVP
  { colorFor: ( row, col ) => COLORS[ row % COLORS.length ] },                  // nivel 2: franjas horizontales por fila
  { colorFor: ( row, col ) => COLORS[ ( row + col ) % COLORS.length ] },        // nivel 3: patrón tipo tablero
];

function getBallSpeed( level ) {
  return BASE_BALL_SPEED * ( LEVEL_SPEED_MULTIPLIER ** ( level - 1 ) );
}
