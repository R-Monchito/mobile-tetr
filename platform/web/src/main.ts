import { TetrioEngine, TouchInputAdapter } from "./engine.js";

const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const scoreEl = document.getElementById("score")!;
const linesEl = document.getElementById("lines")!;
const nextEl = document.getElementById("next")!;
const heldEl = document.getElementById("held")!;
const gameOverEl = document.getElementById("game-over")!;
const restartBtn = document.getElementById("restart-btn") as HTMLButtonElement;

const engine = new TetrioEngine();
const inputAdapter = new TouchInputAdapter(engine);

// Game state
let cellSize = 0;

async function init() {
  try {
    await engine.initialize();
    engine.onSnapshotUpdate = onSnapshotUpdate;
    engine.onGameOver = onGameOver;
    engine.onError = onError;

    // Setup canvas
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Setup input
    setupInput();

    // Start game
    engine.start();

    // Start render loop
    requestAnimationFrame(renderLoop);
  } catch (err) {
    console.error("Failed to initialize engine:", err);
    document.body.innerHTML = `<div style="color: white; padding: 20px;">Failed to load game: ${err}</div>`;
  }
}

function resizeCanvas(): void {
  const container = canvas.parentElement!;
  const width = container.clientWidth;
  const height = container.clientHeight;

  canvas.width = width * devicePixelRatio;
  canvas.height = height * devicePixelRatio;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  ctx.scale(devicePixelRatio, devicePixelRatio);

  // Recalculate cell size based on board dimensions (10x40)
  const snapshot = engine.getSnapshot();
  if (snapshot) {
    cellSize = Math.min(width, height / 2) / snapshot.board.width;
  }
}

function setupInput(): void {
  // Touch events
  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    inputAdapter.onTouchStart(touch.clientX - rect.left, touch.clientY - rect.top, e.touches.length);
  }, { passive: false });

  canvas.addEventListener("touchmove", (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    inputAdapter.onTouchMove(touch.clientX - rect.left, touch.clientY - rect.top, e.touches.length);
  }, { passive: false });

  canvas.addEventListener("touchend", (e) => {
    e.preventDefault();
    inputAdapter.onTouchEnd(e.changedTouches.length);
  }, { passive: false });

  // Mouse events (for desktop testing)
  canvas.addEventListener("mousedown", (e) => {
    const rect = canvas.getBoundingClientRect();
    inputAdapter.onTouchStart(e.clientX - rect.left, e.clientY - rect.top, 1);
  });

  canvas.addEventListener("mousemove", (e) => {
    if (e.buttons & 1) {
      const rect = canvas.getBoundingClientRect();
      inputAdapter.onTouchMove(e.clientX - rect.left, e.clientY - rect.top, 1);
    }
  });

  canvas.addEventListener("mouseup", () => {
    inputAdapter.onTouchEnd(1);
  });

  // Keyboard controls
  window.addEventListener("keydown", (e) => {
    if (!engine) return;

    switch (e.code) {
      case "ArrowLeft":
        e.preventDefault();
        engine.moveLeft();
        break;
      case "ArrowRight":
        e.preventDefault();
        engine.moveRight();
        break;
      case "ArrowDown":
        e.preventDefault();
        engine.softDrop();
        break;
      case "ArrowUp":
        e.preventDefault();
        engine.rotateCW();
        break;
      case "KeyZ":
        e.preventDefault();
        engine.rotateCCW();
        break;
      case "KeyX":
        e.preventDefault();
        engine.rotateCW();
        break;
      case "KeyA":
        e.preventDefault();
        engine.rotate180();
        break;
      case "Space":
        e.preventDefault();
        engine.hardDrop();
        break;
      case "ShiftLeft":
      case "ShiftRight":
      case "ControlLeft":
      case "ControlRight":
        e.preventDefault();
        engine.hold();
        break;
    }
  });

  // Hold button
  const holdBtn = document.getElementById("hold-btn");
  holdBtn?.addEventListener("click", () => engine.hold());

  // Restart button
  restartBtn?.addEventListener("click", () => {
    gameOverEl.style.display = "none";
    // TODO: Implement proper restart
    location.reload();
  });
}

function onSnapshotUpdate(snapshot: any): void {
  // Update UI
  scoreEl.textContent = `Score: ${snapshot.score}`;
  linesEl.textContent = `Lines: ${snapshot.lines}`;

  // Update next pieces
  if (nextEl && snapshot.nextPieces) {
    nextEl.innerHTML = snapshot.nextPieces
      .slice(0, 3)
      .map((p: any) => `<div class="next-piece">${pieceTypeToChar(p)}</div>`)
      .join("");
  }

  // Update held piece
  if (heldEl && snapshot.heldPiece !== undefined) {
    heldEl.textContent = snapshot.heldPiece !== null ? pieceTypeToChar(snapshot.heldPiece) : "—";
  }
}

function onGameOver(): void {
  gameOverEl.style.display = "flex";
}

function onError(error: any): void {
  console.error("Engine error:", error);
}

function pieceTypeToChar(piece: any): string {
  const map: Record<string, string> = {
    0: "I", 1: "J", 2: "L", 3: "O", 4: "S", 5: "T", 6: "Z",
    "I": "I", "J": "J", "L": "L", "O": "O", "S": "S", "T": "T", "Z": "Z",
  };
  return map[piece] ?? "?";
}

function renderLoop(_timestamp: number): void {
  if (!engine) return;

  const snapshot = engine.getSnapshot();
  if (snapshot) {
    draw(snapshot);
  }

  requestAnimationFrame(renderLoop);
}

function draw(snapshot: any): void {
  const board = snapshot.board;
  if (!board) return;

  const width = canvas.width / devicePixelRatio;
  const height = canvas.height / devicePixelRatio;

  // Clear
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, width, height);

  cellSize = Math.min(width, height / 2) / board.width;

  // Draw grid background
  ctx.strokeStyle = "#1a1a1a";
  ctx.lineWidth = 0.5;

  // Draw locked cells
  for (let y = 0; y < board.height; y++) {
    for (let x = 0; x < board.width; x++) {
      const cellValue = board.get(x, y);
      if (cellValue !== 0) {
        const color = cellValueToColor(cellValue);
        drawCell(x, y, color);
      }
    }
  }

  // Draw ghost piece
  if (snapshot.currentPiece) {
    const ghostY = calculateGhostY(snapshot.currentPiece, board);
    if (ghostY !== snapshot.currentPiece.y) {
      drawPiece(snapshot.currentPiece, ghostY, true);
    }
  }

  // Draw current piece
  if (snapshot.currentPiece) {
    drawPiece(snapshot.currentPiece, snapshot.currentPiece.y, false);
  }
}

function cellValueToColor(value: number): string {
  const colors: Record<number, string> = {
    1: "#00ffff", 2: "#ffff00", 3: "#ff00ff", 4: "#ff8800",
    5: "#00ff00", 6: "#ff0000", 7: "#8800ff",
  };
  return colors[value] ?? "#ffffff";
}

function drawCell(x: number, y: number, color: string): void {
  const px = x * cellSize;
  const py = y * cellSize;
  ctx.fillStyle = color;
  ctx.fillRect(px + 1, py + 1, cellSize - 2, cellSize - 2);
  ctx.strokeStyle = "#000";
  ctx.strokeRect(px, py, cellSize, cellSize);
}

function drawPiece(piece: any, y: number, isGhost: boolean = false): void {
  // Simplified - draw a 2x2 block for preview
  // Real implementation would use piece.shape(rotation)
  const color = isGhost ? "rgba(255, 255, 0, 0.3)" : "#ffff00";
  const px = piece.x * cellSize;
  const py = y * cellSize;
  ctx.fillStyle = color;
  ctx.fillRect(px, py, cellSize * 2, cellSize * 2);
  ctx.strokeStyle = isGhost ? "rgba(0,0,0,0.5)" : "#000";
  ctx.strokeRect(px, py, cellSize * 2, cellSize * 2);
}

function calculateGhostY(piece: any, board: any): number {
  // Simplified - just drop to bottom
  let ghostY = piece.y;
  while (!checkCollision(piece, 0, ghostY + 1, board)) {
    ghostY++;
  }
  return ghostY;
}

function checkCollision(_piece: any, _offsetX: number, _offsetY: number, _board: any): boolean {
  // Simplified collision check
  return false;
}

// Initialize
init();