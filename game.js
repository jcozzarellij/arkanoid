const canvas = document.getElementById( 'game' );
const ctx = canvas.getContext( '2d' );

const overlayLevelComplete = document.getElementById( 'overlay-levelcomplete' );
const overlayGameComplete = document.getElementById( 'overlay-gamecomplete' );
const overlayGameover = document.getElementById( 'overlay-gameover' );
const overlayPause = document.getElementById( 'overlay-pause' );
const levelSelectButtonsEl = document.getElementById( 'level-select-buttons' );
const hudLevelEl = document.getElementById( 'hud-level' );
const hudScoreEl = document.getElementById( 'hud-score' );
const hudLivesEl = document.getElementById( 'hud-lives' );

const COLS = 10;
const ROWS = 6;
const BLOCK_WIDTH = 80;
const BLOCK_HEIGHT = 30;
const BLOCK_TOP_OFFSET = 0;
const COLORS = [ 'gray', 'red', 'yellow', 'cyan', 'magenta', 'hotpink', 'green' ];
const MAX_LIVES = 3;

const PADDLE_KEY_SPEED = 8;
const BALL_REST_GAP = 14; // distancia entre el centro de la bola y el borde superior de la pala en reposo

const SOUNDS = {
  bounce: 'assets/sounds/ball-bounce.mp3',
  break: 'assets/sounds/break-sound.mp3',
};

function playSound( name ) {
  new Audio( SOUNDS[ name ] ).play();
}

function createBlocks( level ) {
  const colorFor = LEVELS[ level - 1 ].colorFor;
  const blocks = [];
  for ( let row = 0; row < ROWS; row++ ) {
    for ( let col = 0; col < COLS; col++ ) {
      blocks.push( {
        x: col * BLOCK_WIDTH,
        y: row * BLOCK_HEIGHT + BLOCK_TOP_OFFSET,
        width: BLOCK_WIDTH,
        height: BLOCK_HEIGHT,
        color: colorFor( row, col ),
        alive: true,
      } );
    }
  }
  return blocks;
}

function createInitialState() {
  const level = 1;
  const speed = getBallSpeed( level );

  return {
    screen: 'playing', // 'playing' | 'paused' | 'levelComplete' | 'gameComplete' | 'gameover'
    level,
    score: 0,
    lives: 3,
    ballLaunched: false,

    paddle: {
      x: 340, y: 570, width: 120, height: 14,
    },

    ball: {
      x: 400, y: 556, radius: 8,
      vx: speed, vy: -speed,
    },

    blocks: createBlocks( level ),

    explosions: [],
  };
}

let state = createInitialState();

const keys = { left: false, right: false };

function restBallOnPaddle() {
  state.ball.x = state.paddle.x + state.paddle.width / 2;
  state.ball.y = state.paddle.y - BALL_REST_GAP;
}

function resetGame() {
  state = createInitialState();
  overlayLevelComplete.classList.add( 'hidden' );
  overlayGameComplete.classList.add( 'hidden' );
  overlayGameover.classList.add( 'hidden' );
  overlayPause.classList.add( 'hidden' );
  updateHud();
}

function nextLevel() {
  state.level += 1;
  state.blocks = createBlocks( state.level );
  state.explosions = [];
  state.ballLaunched = false;
  restBallOnPaddle();

  const speed = getBallSpeed( state.level );
  state.ball.vx = speed;
  state.ball.vy = -speed;

  state.screen = 'playing';
  overlayLevelComplete.classList.add( 'hidden' );
  updateHud();
}

function togglePause() {
  if ( state.screen === 'playing' ) {
    state.screen = 'paused';
    overlayPause.classList.remove( 'hidden' );
  } else if ( state.screen === 'paused' ) {
    state.screen = 'playing';
    overlayPause.classList.add( 'hidden' );
  }
}

function selectLevel( level ) {
  state.level = level;
  state.blocks = createBlocks( level );
  state.explosions = [];
  state.ballLaunched = false;
  restBallOnPaddle();

  const speed = getBallSpeed( level );
  state.ball.vx = speed;
  state.ball.vy = -speed;

  state.screen = 'playing';
  overlayPause.classList.add( 'hidden' );
  updateHud();
}

function launchBall() {
  if ( state.screen !== 'playing' || state.ballLaunched ) return;
  state.ballLaunched = true;
}

// --- Input: teclado ---
window.addEventListener( 'keydown', ( e ) => {
  if ( e.code === 'ArrowLeft' || e.code === 'KeyA' ) keys.left = true;
  if ( e.code === 'ArrowRight' || e.code === 'KeyD' ) keys.right = true;
  if ( e.code === 'Space' ) {
    e.preventDefault();
    launchBall();
  }
  if ( e.code === 'Escape' ) {
    e.preventDefault();
    togglePause();
  }
} );

window.addEventListener( 'keyup', ( e ) => {
  if ( e.code === 'ArrowLeft' || e.code === 'KeyA' ) keys.left = false;
  if ( e.code === 'ArrowRight' || e.code === 'KeyD' ) keys.right = false;
} );

// --- Input: mouse ---
canvas.addEventListener( 'mousemove', ( e ) => {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  state.paddle.x = clamp( mouseX - state.paddle.width / 2, 0, canvas.width - state.paddle.width );
} );

canvas.addEventListener( 'click', () => {
  launchBall();
} );

// --- Retry buttons ---
document.querySelectorAll( '.btn-retry' ).forEach( ( btn ) => {
  btn.addEventListener( 'click', resetGame );
} );

// --- Next level button ---
document.querySelectorAll( '.btn-next-level' ).forEach( ( btn ) => {
  btn.addEventListener( 'click', nextLevel );
} );

// --- Pause: botón "Continuar" y selección de nivel ---
document.querySelectorAll( '.btn-resume' ).forEach( ( btn ) => {
  btn.addEventListener( 'click', togglePause );
} );

LEVELS.forEach( ( _, index ) => {
  const level = index + 1;
  const btn = document.createElement( 'button' );
  btn.className = 'btn-select-level';
  btn.textContent = `Nivel ${ level }`;
  btn.addEventListener( 'click', () => selectLevel( level ) );
  levelSelectButtonsEl.appendChild( btn );
} );

function clamp( value, min, max ) {
  return Math.min( Math.max( value, min ), max );
}

function updatePaddle() {
  if ( keys.left ) state.paddle.x -= PADDLE_KEY_SPEED;
  if ( keys.right ) state.paddle.x += PADDLE_KEY_SPEED;
  state.paddle.x = clamp( state.paddle.x, 0, canvas.width - state.paddle.width );
}

function updateBall( timestamp ) {
  const ball = state.ball;

  if ( !state.ballLaunched ) {
    restBallOnPaddle();
    return;
  }

  ball.x += ball.vx;
  ball.y += ball.vy;

  // Paredes laterales
  if ( ball.x - ball.radius <= 0 ) {
    ball.x = ball.radius;
    ball.vx = Math.abs( ball.vx );
    playSound( 'bounce' );
  } else if ( ball.x + ball.radius >= canvas.width ) {
    ball.x = canvas.width - ball.radius;
    ball.vx = -Math.abs( ball.vx );
    playSound( 'bounce' );
  }

  // Pared superior
  if ( ball.y - ball.radius <= 0 ) {
    ball.y = ball.radius;
    ball.vy = Math.abs( ball.vy );
    playSound( 'bounce' );
  }

  // Colisión con la pala
  const paddle = state.paddle;
  if (
    ball.vy > 0 &&
    ball.x + ball.radius >= paddle.x &&
    ball.x - ball.radius <= paddle.x + paddle.width &&
    ball.y + ball.radius >= paddle.y &&
    ball.y - ball.radius <= paddle.y + paddle.height
  ) {
    ball.vy = -Math.abs( ball.vy );
    ball.y = paddle.y - ball.radius;
    playSound( 'bounce' );
  }

  // Colisión con bloques
  for ( const block of state.blocks ) {
    if ( !block.alive ) continue;

    if (
      ball.x + ball.radius >= block.x &&
      ball.x - ball.radius <= block.x + block.width &&
      ball.y + ball.radius >= block.y &&
      ball.y - ball.radius <= block.y + block.height
    ) {
      block.alive = false;
      state.score += 10;
      playSound( 'break' );
      state.explosions.push( {
        x: block.x, y: block.y, width: block.width, height: block.height,
        color: block.color, startTime: timestamp,
      } );

      const dx = ball.x - ( block.x + block.width / 2 );
      const dy = ball.y - ( block.y + block.height / 2 );
      const overlapX = ( ball.radius + block.width / 2 ) - Math.abs( dx );
      const overlapY = ( ball.radius + block.height / 2 ) - Math.abs( dy );

      if ( overlapX < overlapY ) {
        ball.vx = dx > 0 ? Math.abs( ball.vx ) : -Math.abs( ball.vx );
      } else {
        ball.vy = dy > 0 ? Math.abs( ball.vy ) : -Math.abs( ball.vy );
      }

      break;
    }
  }

  // Bola cae por debajo de la pala
  if ( ball.y - ball.radius > canvas.height ) {
    state.lives -= 1;
    state.ballLaunched = false;
    restBallOnPaddle();

    const speed = getBallSpeed( state.level );
    ball.vx = speed;
    ball.vy = -speed;

    if ( state.lives <= 0 ) {
      state.screen = 'gameover';
    }
  }
}

function getExplosionFrame( explosion, timestamp ) {
  return Math.floor( ( timestamp - explosion.startTime ) / EXPLOSION_DURATION );
}

function updateExplosions( timestamp ) {
  state.explosions = state.explosions.filter( ( explosion ) => {
    return getExplosionFrame( explosion, timestamp ) < EXPLOSION_FRAMES[ explosion.color ].length;
  } );
}

function update( timestamp ) {
  updatePaddle();
  updateBall( timestamp );
  updateExplosions( timestamp );
  updateHud();

  // Fin de nivel: sólo si seguimos en 'playing' (evita pisar un Game Over
  // recién fijado este mismo tick) y ya no quedan explosiones pendientes.
  if ( state.screen === 'playing' && state.blocks.every( ( b ) => !b.alive ) && state.explosions.length === 0 ) {
    state.screen = state.level < LEVELS.length ? 'levelComplete' : 'gameComplete';
  }

  if ( state.screen === 'gameover' ) {
    overlayGameover.classList.remove( 'hidden' );
  } else if ( state.screen === 'levelComplete' ) {
    overlayLevelComplete.classList.remove( 'hidden' );
  } else if ( state.screen === 'gameComplete' ) {
    overlayGameComplete.classList.remove( 'hidden' );
  }
}

function updateHud() {
  hudLevelEl.textContent = `Nivel ${ state.level }/${ LEVELS.length }`;
  hudScoreEl.textContent = `Score: ${ state.score }`;

  hudLivesEl.innerHTML = '';
  for ( let i = 0; i < MAX_LIVES; i++ ) {
    const heart = document.createElement( 'span' );
    const filled = i < state.lives;
    heart.className = filled ? 'heart' : 'heart empty';
    heart.textContent = filled ? '❤' : '♡';
    hudLivesEl.appendChild( heart );
  }
}

function drawBlocks() {
  for ( const block of state.blocks ) {
    if ( !block.alive ) continue;
    drawSprite( ctx, `block_${ block.color }`, block.x, block.y, block.width, block.height );
  }
}

function drawPaddle() {
  drawSprite( ctx, 'paddle', state.paddle.x, state.paddle.y, state.paddle.width, state.paddle.height );
}

function drawBall() {
  const ball = state.ball;
  drawSprite( ctx, 'ball', ball.x - ball.radius, ball.y - ball.radius, ball.radius * 2, ball.radius * 2 );
}

function drawExplosions( timestamp ) {
  for ( const explosion of state.explosions ) {
    const frame = getExplosionFrame( explosion, timestamp );
    const frames = EXPLOSION_FRAMES[ explosion.color ];
    if ( frame >= frames.length ) continue;
    drawFrame( ctx, frames[ frame ], explosion.x, explosion.y, explosion.width, explosion.height );
  }
}

function render( timestamp ) {
  ctx.clearRect( 0, 0, canvas.width, canvas.height );
  drawBlocks();
  drawExplosions( timestamp );
  drawPaddle();
  drawBall();
}

function loop( timestamp ) {
  if ( state.screen === 'playing' ) {
    update( timestamp );
  }
  render( timestamp );
  requestAnimationFrame( loop );
}

loadSpritesheet( () => {
  requestAnimationFrame( loop );
} );
