// Minimal-yet-complete Tetris implementation with p5.js.
// The code keeps the logic self-contained so the sketch works in the browser without extra tooling.

const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;
const SIDE_PANEL_WIDTH = 180;
const DROP_INTERVAL_INITIAL = 650;

const COLOR_MAP = {
  I: "#00f0f0",
  J: "#0040f0",
  L: "#f0a000",
  O: "#f0f000",
  S: "#00d000",
  T: "#a000f0",
  Z: "#f00040",
};

const TETROMINOES = {
  I: [
    [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    [
      [0, 0, 1, 0],
      [0, 0, 1, 0],
      [0, 0, 1, 0],
      [0, 0, 1, 0],
    ],
  ],
  J: [
    [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    [
      [0, 1, 1],
      [0, 1, 0],
      [0, 1, 0],
    ],
    [
      [0, 0, 0],
      [1, 1, 1],
      [0, 0, 1],
    ],
    [
      [0, 1, 0],
      [0, 1, 0],
      [1, 1, 0],
    ],
  ],
  L: [
    [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0],
    ],
    [
      [0, 1, 0],
      [0, 1, 0],
      [0, 1, 1],
    ],
    [
      [0, 0, 0],
      [1, 1, 1],
      [1, 0, 0],
    ],
    [
      [1, 1, 0],
      [0, 1, 0],
      [0, 1, 0],
    ],
  ],
  O: [
    [
      [1, 1],
      [1, 1],
    ],
  ],
  S: [
    [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0],
    ],
    [
      [0, 1, 0],
      [0, 1, 1],
      [0, 0, 1],
    ],
  ],
  T: [
    [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    [
      [0, 1, 0],
      [0, 1, 1],
      [0, 1, 0],
    ],
    [
      [0, 0, 0],
      [1, 1, 1],
      [0, 1, 0],
    ],
    [
      [0, 1, 0],
      [1, 1, 0],
      [0, 1, 0],
    ],
  ],
  Z: [
    [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0],
    ],
    [
      [0, 0, 1],
      [0, 1, 1],
      [0, 1, 0],
    ],
  ],
};

let board;
let currentPiece;
let nextPiece;
let lastDropTime = 0;
let dropInterval = DROP_INTERVAL_INITIAL;
let score = 0;
let clearedLines = 0;
let level = 1;
let gameState = "playing"; // playing | paused | over

function setup() {
  const canvas = createCanvas(
    COLS * BLOCK_SIZE + SIDE_PANEL_WIDTH,
    ROWS * BLOCK_SIZE + 40
  );
  canvas.parent("game-container");
  textFont("monospace");
  initGame();
}

function initGame() {
  board = createEmptyBoard();
  score = 0;
  clearedLines = 0;
  level = 1;
  dropInterval = DROP_INTERVAL_INITIAL;
  gameState = "playing";
  nextPiece = createRandomPiece();
  spawnPiece();
  lastDropTime = millis();
}

function draw() {
  background("#0b0f16");

  if (gameState === "playing" && millis() - lastDropTime >= dropInterval) {
    stepDown(false);
    lastDropTime = millis();
  }

  push();
  translate(20, 20);
  drawWell();
  drawBoard();
  if (currentPiece) {
    drawPiece(currentPiece);
    drawGhost(currentPiece);
  }
  pop();

  drawSidePanel();
  drawStateLabel();
}

function keyPressed() {
  if (key === "r" || key === "R") {
    initGame();
    return;
  }
  if (gameState === "over") {
    return;
  }
  if (key === "p" || key === "P") {
    togglePause();
    return;
  }
  if (gameState !== "playing") {
    return;
  }
  switch (keyCode) {
    case LEFT_ARROW:
      tryMove(-1, 0);
      break;
    case RIGHT_ARROW:
      tryMove(1, 0);
      break;
    case DOWN_ARROW:
      stepDown(true);
      lastDropTime = millis();
      break;
    case UP_ARROW:
      rotatePiece();
      break;
    case 32: // Space
      hardDrop();
      lastDropTime = millis();
      break;
    default:
      break;
  }
}

function togglePause() {
  if (gameState === "paused") {
    gameState = "playing";
    lastDropTime = millis();
  } else if (gameState === "playing") {
    gameState = "paused";
  }
}

function createEmptyBoard() {
  const grid = [];
  for (let y = 0; y < ROWS; y++) {
    const row = new Array(COLS).fill(null);
    grid.push(row);
  }
  return grid;
}

function createRandomPiece() {
  const types = Object.keys(TETROMINOES);
  const type = random(types);
  return {
    type,
    color: COLOR_MAP[type],
    rotations: TETROMINOES[type],
    rotationIndex: 0,
    x: 0,
    y: 0,
  };
}

function spawnPiece() {
  const spawnX = Math.floor(COLS / 2) - 2;
  const spawnY = -2;
  const incoming = nextPiece || createRandomPiece();
  currentPiece = {
    type: incoming.type,
    color: incoming.color,
    rotations: incoming.rotations,
    rotationIndex: 0,
    x: spawnX,
    y: spawnY,
  };
  nextPiece = createRandomPiece();
  if (collides(currentPiece, 0, 0)) {
    gameState = "over";
  }
}

function tryMove(dx, dy) {
  if (!currentPiece) {
    return false;
  }
  if (collides(currentPiece, dx, dy)) {
    return false;
  }
  currentPiece.x += dx;
  currentPiece.y += dy;
  return true;
}

function stepDown(manual) {
  if (tryMove(0, 1)) {
    if (manual) {
      score += 1;
    }
    return;
  }
  settlePiece(manual ? "soft" : "auto");
}

function hardDrop() {
  if (!currentPiece) {
    return;
  }
  let steps = 0;
  while (tryMove(0, 1)) {
    steps += 1;
  }
  score += steps * 2;
  settlePiece("hard");
}

function settlePiece(trigger) {
  lockPiece();
  const lines = clearFullLines();
  applyLineScore(lines);
  updateLevel();
  spawnPiece();
  if (trigger === "hard") {
    score += lines ? 0 : 0; // placeholder for future tweaks
  }
}

function lockPiece() {
  const matrix = currentPiece.rotations[currentPiece.rotationIndex];
  for (let row = 0; row < matrix.length; row++) {
    for (let col = 0; col < matrix[row].length; col++) {
      if (!matrix[row][col]) {
        continue;
      }
      const x = currentPiece.x + col;
      const y = currentPiece.y + row;
      if (y < 0) {
        gameState = "over";
        return;
      }
      board[y][x] = currentPiece.color;
    }
  }
}

function clearFullLines() {
  let linesCleared = 0;
  for (let y = ROWS - 1; y >= 0; y--) {
    if (board[y].every((cell) => cell)) {
      board.splice(y, 1);
      board.unshift(new Array(COLS).fill(null));
      linesCleared += 1;
      y += 1; // re-check same row index after unshift
    }
  }
  return linesCleared;
}

function applyLineScore(lines) {
  if (!lines) {
    return;
  }
  const lineScores = [0, 100, 300, 500, 800];
  score += lineScores[lines] * level;
  clearedLines += lines;
}

function updateLevel() {
  level = 1 + Math.floor(clearedLines / 10);
  dropInterval = max(120, DROP_INTERVAL_INITIAL - (level - 1) * 45);
}

function rotatePiece() {
  if (!currentPiece) {
    return;
  }
  const nextRotation =
    (currentPiece.rotationIndex + 1) % currentPiece.rotations.length;
  if (!collides(currentPiece, 0, 0, nextRotation)) {
    currentPiece.rotationIndex = nextRotation;
    return;
  }
  const tests = [-1, 1, -2, 2];
  for (const offset of tests) {
    if (!collides(currentPiece, offset, 0, nextRotation)) {
      currentPiece.x += offset;
      currentPiece.rotationIndex = nextRotation;
      return;
    }
  }
}

function collides(piece, offsetX, offsetY, rotationIndex = piece.rotationIndex) {
  const matrix = piece.rotations[rotationIndex];
  for (let row = 0; row < matrix.length; row++) {
    for (let col = 0; col < matrix[row].length; col++) {
      if (!matrix[row][col]) {
        continue;
      }
      const x = piece.x + offsetX + col;
      const y = piece.y + offsetY + row;
      if (x < 0 || x >= COLS || y >= ROWS) {
        return true;
      }
      if (y >= 0 && board[y][x]) {
        return true;
      }
    }
  }
  return false;
}

function drawWell() {
  noStroke();
  fill("#111824");
  rect(0, 0, COLS * BLOCK_SIZE, ROWS * BLOCK_SIZE, 8);
}

function drawBoard() {
  stroke("#1f2940");
  strokeWeight(1);
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const cell = board[y][x];
      if (cell) {
        fill(cell);
      } else {
        fill("#152033");
      }
      rect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    }
  }
}

function drawPiece(piece) {
  const matrix = piece.rotations[piece.rotationIndex];
  noStroke();
  for (let row = 0; row < matrix.length; row++) {
    for (let col = 0; col < matrix[row].length; col++) {
      if (!matrix[row][col]) {
        continue;
      }
      const x = (piece.x + col) * BLOCK_SIZE;
      const y = (piece.y + row) * BLOCK_SIZE;
      fill(piece.color);
      rect(x, y, BLOCK_SIZE, BLOCK_SIZE);
      fill(255, 255, 255, 40);
      rect(x + 4, y + 4, BLOCK_SIZE - 8, BLOCK_SIZE - 8, 4);
    }
  }
}

function drawGhost(piece) {
  const ghost = { ...piece };
  while (!collides(ghost, 0, 1)) {
    ghost.y += 1;
  }
  const matrix = ghost.rotations[ghost.rotationIndex];
  stroke(piece.color + "55");
  strokeWeight(2);
  noFill();
  for (let row = 0; row < matrix.length; row++) {
    for (let col = 0; col < matrix[row].length; col++) {
      if (!matrix[row][col]) {
        continue;
      }
      const x = (ghost.x + col) * BLOCK_SIZE;
      const y = (ghost.y + row) * BLOCK_SIZE;
      rect(x + 2, y + 2, BLOCK_SIZE - 4, BLOCK_SIZE - 4, 6);
    }
  }
  noStroke();
}

function drawSidePanel() {
  const offsetX = COLS * BLOCK_SIZE + 40;
  fill("#f0f4ff");
  textSize(20);
  textAlign(LEFT, TOP);
  text(`SCORE\n${score}`, offsetX, 20);
  text(`LEVEL\n${level}`, offsetX, 100);
  text(`LINES\n${clearedLines}`, offsetX, 180);

  textSize(18);
  text("NEXT", offsetX, 260);
  drawNextPreview(offsetX, 290);

  textSize(12);
  fill("#8ea0c8");
  text(
    "Controls:\n←/→ : move\n↑ : rotate\n↓ : soft drop\nSpace : hard drop\nP : pause\nR : restart",
    offsetX,
    430
  );
}

function drawNextPreview(x, y) {
  const previewSize = 24;
  const piece = nextPiece;
  if (!piece) {
    return;
  }
  const matrix = piece.rotations[0];
  const pieceWidth = matrix[0].length;
  const pieceHeight = matrix.length;
  const startX = x + (SIDE_PANEL_WIDTH - pieceWidth * previewSize) / 2;
  const startY = y + (120 - pieceHeight * previewSize) / 2;
  fill("#161f2e");
  rect(x - 10, y - 10, SIDE_PANEL_WIDTH - 40, 120, 10);
  noStroke();
  for (let row = 0; row < matrix.length; row++) {
    for (let col = 0; col < matrix[row].length; col++) {
      if (!matrix[row][col]) {
        continue;
      }
      fill(piece.color);
      rect(
        startX + col * previewSize,
        startY + row * previewSize,
        previewSize,
        previewSize,
        6
      );
    }
  }
}

function drawStateLabel() {
  if (gameState === "playing") {
    return;
  }
  fill(0, 0, 0, 150);
  rect(20, 20, COLS * BLOCK_SIZE, ROWS * BLOCK_SIZE, 8);

  fill("#e3ecff");
  textAlign(CENTER, CENTER);
  textSize(36);
  const centerX = 20 + (COLS * BLOCK_SIZE) / 2;
  const centerY = 20 + (ROWS * BLOCK_SIZE) / 2;
  if (gameState === "paused") {
    text("PAUSED", centerX, centerY);
  } else if (gameState === "over") {
    text("GAME OVER", centerX, centerY - 30);
    textSize(18);
    text("Press R to restart", centerX, centerY + 10);
  }
}
