const canvas = document.getElementById( 'game' );
const ctx = canvas.getContext( '2d' );

const overlayVictory = document.getElementById( 'overlay-victory' );
const overlayGameover = document.getElementById( 'overlay-gameover' );
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

function createBlocks() {
  const blocks = [];
  for ( let row = 0; row < ROWS; row++ ) {
    for ( let col = 0; col < COLS; col++ ) {
      blocks.push( {
        x: col * BLOCK_WIDTH,
        y: row * BLOCK_HEIGHT + BLOCK_TOP_OFFSET,
        width: BLOCK_WIDTH,
        height: BLOCK_HEIGHT,
        color: COLORS[ ( row * COLS + col ) % COLORS.length ],
        alive: true,
      } );
    }
  }
  return blocks;
}

function createInitialState() {
  return {
    screen: 'playing', // 'playing' | 'victory' | 'gameover'
    score: 0,
    lives: 3,
    ballLaunched: false,

    paddle: {
      x: 340, y: 570, width: 120, height: 14,
    },

    ball: {
      x: 400, y: 556, radius: 8,
      vx: 3, vy: -3,
    },

    blocks: createBlocks(),
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
  overlayVictory.classList.add( 'hidden' );
  overlayGameover.classList.add( 'hidden' );
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

function clamp( value, min, max ) {
  return Math.min( Math.max( value, min ), max );
}

function updatePaddle() {
  if ( keys.left ) state.paddle.x -= PADDLE_KEY_SPEED;
  if ( keys.right ) state.paddle.x += PADDLE_KEY_SPEED;
  state.paddle.x = clamp( state.paddle.x, 0, canvas.width - state.paddle.width );
}

function updateBall() {
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
  } else if ( ball.x + ball.radius >= canvas.width ) {
    ball.x = canvas.width - ball.radius;
    ball.vx = -Math.abs( ball.vx );
  }

  // Pared superior
  if ( ball.y - ball.radius <= 0 ) {
    ball.y = ball.radius;
    ball.vy = Math.abs( ball.vy );
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
    ball.vx = 3;
    ball.vy = -3;

    if ( state.lives <= 0 ) {
      state.screen = 'gameover';
    }
  }

  // Victoria
  if ( state.blocks.every( ( b ) => !b.alive ) ) {
    state.screen = 'victory';
  }
}

function update() {
  updatePaddle();
  updateBall();
  updateHud();

  if ( state.screen === 'gameover' ) {
    overlayGameover.classList.remove( 'hidden' );
  } else if ( state.screen === 'victory' ) {
    overlayVictory.classList.remove( 'hidden' );
  }
}

function updateHud() {
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

function render() {
  ctx.clearRect( 0, 0, canvas.width, canvas.height );
  drawBlocks();
  drawPaddle();
  drawBall();
}

function loop() {
  if ( state.screen === 'playing' ) {
    update();
  }
  render();
  requestAnimationFrame( loop );
}

loadSpritesheet( () => {
  requestAnimationFrame( loop );
} );
