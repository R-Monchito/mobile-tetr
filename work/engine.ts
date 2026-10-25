import { advanceLockDelay, createLockDelay } from "./lock-delay.ts";
import { guidelineDraft, scoreLock } from "./scoring.ts";
import { classifyTSpin } from "./tspin.ts";
export type Cell = 0 | 1;

export interface BoardState {
  readonly width: number;
  readonly height: number;
  readonly cells: readonly Cell[];
}

export interface PieceState {
  readonly type: PieceType;
  readonly x: number;
  readonly y: number;
  readonly rotation: Rotation;
}

export type PieceType = "I" | "J" | "L" | "O" | "S" | "T" | "Z";
export type Rotation = 0 | 1 | 2 | 3;

export type LastAction = "spawn" | "move" | "rotate" | "drop" | "hold" | "lock";

export interface EngineSnapshot {
  readonly board: BoardState;
  readonly score: number;
  readonly lines: number;
  readonly gameOver: boolean;
  readonly currentPiece?: PieceState;
  readonly nextPieces: readonly PieceType[];
  readonly heldPiece?: PieceType;
  readonly canHold: boolean;
  readonly randomizer: RandomizerState;
  readonly lastAction: LastAction;
  readonly lastRotationTransition?: `${Rotation}->${Rotation}`;
  readonly kickIndex?: number;
  readonly lockDelay: import("./lock-delay.ts").LockDelayState;
  readonly combo: number;
  readonly backToBack: boolean;
  readonly rulesVersion: string;
  readonly softDropCells: number;
}

export type EngineEvent =
  | { readonly type: "spawned"; readonly piece: PieceType }
  | { readonly type: "moved"; readonly dx: -1 | 1 }
  | { readonly type: "rotated"; readonly rotation: Rotation }
  | { readonly type: "softDropped"; readonly cells: number }
  | { readonly type: "hardDropped"; readonly cells: number }
  | { readonly type: "locked" }
  | { readonly type: "linesCleared"; readonly count: number }
  | { readonly type: "held"; readonly piece: PieceType }
  | { readonly type: "gameOver" };

export type EngineError = "invalid-board" | "game-over" | "invalid-command";

export type EngineCommand =
  | { readonly type: "moveLeft" }
  | { readonly type: "moveRight" }
  | { readonly type: "softDrop" }
  | { readonly type: "hardDrop" }
  | { readonly type: "rotateCW" }
  | { readonly type: "rotateCCW" }
  | { readonly type: "rotate180" }
  | { readonly type: "hold" }
  | { readonly type: "tick"; readonly deltaMs: number };

export interface EngineResult {
  readonly snapshot: EngineSnapshot;
  readonly events: readonly EngineEvent[];
  readonly error?: EngineError;
}

export interface RandomizerState {
  readonly bag: readonly PieceType[];
  readonly index: number;
  readonly seed: number;
}

export function createEmptyBoard(width = 10, height = 40): BoardState {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new Error("invalid-board");
  }
  return { width, height, cells: Array<Cell>(width * height).fill(0) };
}

export function createRandomizer(seed?: number): RandomizerState {
  const normalizedSeed = (seed ?? 0x12345678) >>> 0;
  const bag = shuffle7(normalizedSeed);
  return { bag, index: 0, seed: normalizedSeed };
}

function nextSeed(seed: number): number {
  return (Math.imul(seed, 1664525) + 1013904223) >>> 0;
}

function shuffle7(seed?: number): readonly PieceType[] {
  const pieces: PieceType[] = ["I", "J", "L", "O", "S", "T", "Z"];
  let rng = seed ?? Date.now();
  for (let i = pieces.length - 1; i > 0; i--) {
    rng = (rng * 1664525 + 1013904223) >>> 0;
    const j = rng % (i + 1);
    [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
  }
  return pieces;
}

function nextPiece(randomizer: RandomizerState): { piece: PieceType; state: RandomizerState } {
  if (randomizer.index >= randomizer.bag.length) {
    const seed = nextSeed(randomizer.seed);
    const newBag = shuffle7(seed);
    return { piece: newBag[0], state: { bag: newBag, index: 1, seed } };
  }
  return { piece: randomizer.index < randomizer.bag.length ? randomizer.bag[randomizer.index] : "T", state: { ...randomizer, index: randomizer.index + 1 } };
}

const PIECE_SHAPES: Record<PieceType, readonly (readonly number[])[]> = {
  I: [[0,0,0,0], [1,1,1,1], [0,0,0,0], [0,0,0,0]],
  J: [[1,0,0], [1,1,1], [0,0,0]],
  L: [[0,0,1], [1,1,1], [0,0,0]],
  O: [[1,1], [1,1]],
  S: [[0,1,1], [1,1,0], [0,0,0]],
  T: [[0,1,0], [1,1,1], [0,0,0]],
  Z: [[1,1,0], [0,1,1], [0,0,0]],
};

const SPAWN_POSITIONS: Record<PieceType, { x: number; y: number }> = {
  I: { x: 3, y: 21 },
  J: { x: 3, y: 22 },
  L: { x: 3, y: 22 },
  O: { x: 4, y: 22 },
  S: { x: 3, y: 22 },
  T: { x: 3, y: 22 },
  Z: { x: 3, y: 22 },
};

const WALL_KICKS: Record<PieceType, Record<string, readonly (readonly number[])[]>> = {
  I: {
    "0->1": [[0,0], [-2,0], [1,0], [-2,-1], [1,2]],
    "1->0": [[0,0], [2,0], [-1,0], [2,1], [-1,-2]],
    "1->2": [[0,0], [-1,0], [2,0], [-1,2], [2,-1]],
    "2->1": [[0,0], [1,0], [-2,0], [1,-2], [-2,1]],
    "2->3": [[0,0], [2,0], [-1,0], [2,1], [-1,-2]],
    "3->2": [[0,0], [-2,0], [1,0], [-2,-1], [1,2]],
    "3->0": [[0,0], [1,0], [-2,0], [1,-2], [-2,1]],
    "0->3": [[0,0], [-1,0], [2,0], [-1,2], [2,-1]],
  },
  J: {
    "0->1": [[0,0], [1,0], [1,-1], [0,2], [1,2]],
    "1->0": [[0,0], [-1,0], [-1,1], [0,-2], [-1,-2]],
    "1->2": [[0,0], [1,0], [1,1], [0,-2], [1,-2]],
    "2->1": [[0,0], [-1,0], [-1,-1], [0,2], [-1,2]],
    "2->3": [[0,0], [-1,0], [-1,-1], [0,2], [-1,2]],
    "3->2": [[0,0], [1,0], [1,1], [0,-2], [1,-2]],
    "3->0": [[0,0], [-1,0], [-1,1], [0,-2], [-1,-2]],
    "0->3": [[0,0], [1,0], [1,-1], [0,2], [1,2]],
  },
  L: {
    "0->1": [[0,0], [1,0], [1,-1], [0,2], [1,2]],
    "1->0": [[0,0], [-1,0], [-1,1], [0,-2], [-1,-2]],
    "1->2": [[0,0], [1,0], [1,1], [0,-2], [1,-2]],
    "2->1": [[0,0], [-1,0], [-1,-1], [0,2], [-1,2]],
    "2->3": [[0,0], [-1,0], [-1,-1], [0,2], [-1,2]],
    "3->2": [[0,0], [1,0], [1,1], [0,-2], [1,-2]],
    "3->0": [[0,0], [-1,0], [-1,1], [0,-2], [-1,-2]],
    "0->3": [[0,0], [1,0], [1,-1], [0,2], [1,2]],
  },
  O: {
    "0->1": [[0,0]], "1->0": [[0,0]], "1->2": [[0,0]], "2->1": [[0,0]],
    "2->3": [[0,0]], "3->2": [[0,0]], "3->0": [[0,0]], "0->3": [[0,0]],
  },
  S: {
    "0->1": [[0,0], [1,0], [1,-1], [0,2], [1,2]],
    "1->0": [[0,0], [-1,0], [-1,1], [0,-2], [-1,-2]],
    "1->2": [[0,0], [1,0], [1,1], [0,-2], [1,-2]],
    "2->1": [[0,0], [-1,0], [-1,-1], [0,2], [-1,2]],
    "2->3": [[0,0], [-1,0], [-1,-1], [0,2], [-1,2]],
    "3->2": [[0,0], [1,0], [1,1], [0,-2], [1,-2]],
    "3->0": [[0,0], [-1,0], [-1,1], [0,-2], [-1,-2]],
    "0->3": [[0,0], [1,0], [1,-1], [0,2], [1,2]],
  },
  T: {
    "0->1": [[0,0], [1,0], [1,-1], [0,2], [1,2]],
    "1->0": [[0,0], [-1,0], [-1,1], [0,-2], [-1,-2]],
    "1->2": [[0,0], [1,0], [1,1], [0,-2], [1,-2]],
    "2->1": [[0,0], [-1,0], [-1,-1], [0,2], [-1,2]],
    "2->3": [[0,0], [-1,0], [-1,-1], [0,2], [-1,2]],
    "3->2": [[0,0], [1,0], [1,1], [0,-2], [1,-2]],
    "3->0": [[0,0], [-1,0], [-1,1], [0,-2], [-1,-2]],
    "0->3": [[0,0], [1,0], [1,-1], [0,2], [1,2]],
  },
  Z: {
    "0->1": [[0,0], [1,0], [1,-1], [0,2], [1,2]],
    "1->0": [[0,0], [-1,0], [-1,1], [0,-2], [-1,-2]],
    "1->2": [[0,0], [1,0], [1,1], [0,-2], [1,-2]],
    "2->1": [[0,0], [-1,0], [-1,-1], [0,2], [-1,2]],
    "2->3": [[0,0], [-1,0], [-1,-1], [0,2], [-1,2]],
    "3->2": [[0,0], [1,0], [1,1], [0,-2], [1,-2]],
    "3->0": [[0,0], [-1,0], [-1,1], [0,-2], [-1,-2]],
    "0->3": [[0,0], [1,0], [1,-1], [0,2], [1,2]],
  },
};

export function kickCandidates(piece: PieceType, from: Rotation, to: Rotation): readonly (readonly number[])[] {
  return WALL_KICKS[piece][`${from}->${to}`] ?? [];
}

function getShape(piece: PieceType, rotation: Rotation): readonly (readonly number[])[] {
  const base = PIECE_SHAPES[piece];
  let shape = base;
  for (let r = 0; r < rotation; r++) {
    shape = rotateMatrix(shape);
  }
  return shape;
}

function rotateMatrix(matrix: readonly (readonly number[])[]): number[][] {
  const n = matrix.length;
  const m = matrix[0].length;
  const result: number[][] = Array.from({ length: m }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      result[j][n - 1 - i] = matrix[i][j];
    }
  }
  return result;
}

function checkCollision(board: BoardState, piece: PieceState, offsetX = 0, offsetY = 0): boolean {
  const shape = getShape(piece.type, piece.rotation);
  for (let py = 0; py < shape.length; py++) {
    for (let px = 0; px < shape[py].length; px++) {
      if (shape[py][px]) {
        const x = piece.x + px + offsetX;
        const y = piece.y + py + offsetY;
        if (x < 0 || x >= board.width || y < 0 || y >= board.height) return true;
        if (board.cells[y * board.width + x] === 1) return true;
      }
    }
  }
  return false;
}

function lockPiece(board: BoardState, piece: PieceState): BoardState {
  const shape = getShape(piece.type, piece.rotation);
  const cells = [...board.cells] as Cell[];
  for (let py = 0; py < shape.length; py++) {
    for (let px = 0; px < shape[py].length; px++) {
      if (shape[py][px]) {
        const x = piece.x + px;
        const y = piece.y + py;
        if (x >= 0 && x < board.width && y >= 0 && y < board.height) {
          cells[y * board.width + x] = 1;
        }
      }
    }
  }
  return { ...board, cells };
}

function clearLines(board: BoardState): { board: BoardState; linesCleared: number } {
  const { width, height, cells } = board;
  const newCells: Cell[] = [];
  let linesCleared = 0;
  for (let y = height - 1; y >= 0; y--) {
    let full = true;
    for (let x = 0; x < width; x++) {
      if (cells[y * width + x] === 0) { full = false; break; }
    }
    if (full) {
      linesCleared++;
    } else {
      for (let x = 0; x < width; x++) {
        newCells.unshift(cells[y * width + x]);
      }
    }
  }
  while (newCells.length < width * height) newCells.unshift(0);
  return { board: { width, height, cells: newCells }, linesCleared };
}

function isGameOver(board: BoardState, piece: PieceState): boolean {
  return checkCollision(board, piece, 0, 0);
}

export function initialSnapshot(board = createEmptyBoard(), randomizer = createRandomizer()): EngineSnapshot {
  const { piece, state: r1 } = nextPiece(randomizer);
  const { piece: next1, state: r2 } = nextPiece(r1);
  const { piece: next2, state: r3 } = nextPiece(r2);
  const { piece: next3, state: r4 } = nextPiece(r3);
  const spawnPos = SPAWN_POSITIONS[piece];
  const currentPiece: PieceState = { type: piece, x: spawnPos.x, y: spawnPos.y, rotation: 0 };
  const gameOver = isGameOver(board, currentPiece);
  return {
    board,
    score: 0,
    lines: 0,
    gameOver,
    currentPiece: gameOver ? undefined : currentPiece,
    nextPieces: [next1, next2, next3],
    heldPiece: undefined,
    canHold: true,
    randomizer: r4,
    lastAction: "spawn",
    lockDelay: createLockDelay(),
    combo: -1,
    backToBack: false,
    rulesVersion: guidelineDraft.id,
    softDropCells: 0,
  };
}

function spawnNext(snapshot: EngineSnapshot, randomizer: RandomizerState): EngineSnapshot {
  const { piece, state: r1 } = nextPiece(randomizer);
  const { piece: next1, state: r2 } = nextPiece(r1);
  const { piece: next2, state: r3 } = nextPiece(r2);
  const { piece: next3, state: r4 } = nextPiece(r3);
  const spawnPos = SPAWN_POSITIONS[piece];
  const currentPiece: PieceState = { type: piece, x: spawnPos.x, y: spawnPos.y, rotation: 0 };
  const gameOver = isGameOver(snapshot.board, currentPiece);
  return {
    ...snapshot,
    currentPiece: gameOver ? undefined : currentPiece,
    nextPieces: [next1, next2, next3],
    canHold: true,
    gameOver,
    randomizer: r4,
    lastAction: "spawn",
  };
}

function tryMove(snapshot: EngineSnapshot, dx: -1 | 1): EngineResult {
  const piece = snapshot.currentPiece;
  if (!piece) return { snapshot, events: [], error: "game-over" };
  if (checkCollision(snapshot.board, piece, dx, 0)) {
    return { snapshot, events: [] };
  }
  const newPiece: PieceState = { ...piece, x: piece.x + dx };
  return {
    snapshot: { ...snapshot, currentPiece: newPiece, lastAction: "move", lastRotationTransition: undefined, kickIndex: undefined },
    events: [{ type: "moved", dx }],
  };
}

function tryRotate(snapshot: EngineSnapshot, rotationDelta: 1 | -1 | 2): EngineResult {
  const piece = snapshot.currentPiece;
  if (!piece) return { snapshot, events: [], error: "game-over" };
  const currentRot = piece.rotation;
  const targetRot = ((currentRot + rotationDelta + 4) % 4) as Rotation;
  const key = `${currentRot}->${targetRot}`;
  const kicks = WALL_KICKS[piece.type][key] ?? [[0,0]];
  for (const [[kx, ky], kickIndex] of kicks.map((kick, index) => [kick, index] as const)) {
    if (!checkCollision(snapshot.board, piece, kx, ky)) {
      const newPiece: PieceState = { ...piece, x: piece.x + kx, y: piece.y + ky, rotation: targetRot };
      return { snapshot: { ...snapshot, currentPiece: newPiece, lastAction: "rotate", lastRotationTransition: `${currentRot}->${targetRot}`, kickIndex }, events: [{ type: "rotated", rotation: targetRot }] };
    }
  }
  return { snapshot, events: [] };
}

function trySoftDrop(snapshot: EngineSnapshot): EngineResult {
  const piece = snapshot.currentPiece;
  if (!piece) return { snapshot, events: [], error: "game-over" };
  let drop = 0;
  while (!checkCollision(snapshot.board, piece, 0, drop + 1)) drop++;
  if (drop === 0) return { snapshot, events: [] };
  const newPiece: PieceState = { ...piece, y: piece.y + drop };
  return { snapshot: { ...snapshot, currentPiece: newPiece, lastAction: "drop", lastRotationTransition: undefined, kickIndex: undefined }, events: [{ type: "softDropped", cells: drop }] };
}

function tryHardDrop(snapshot: EngineSnapshot): EngineResult {
  const piece = snapshot.currentPiece;
  if (!piece) return { snapshot, events: [], error: "game-over" };
  let drop = 0;
  while (!checkCollision(snapshot.board, piece, 0, drop + 1)) drop++;
  if (drop === 0) {
    const locked = lockPiece(snapshot.board, piece);
    const { board, linesCleared } = clearLines(locked);
    const newSnapshot = spawnNext(scoreAfterLock({ ...snapshot, board, lines: snapshot.lines + linesCleared }, linesCleared), snapshot.randomizer);
    const events: EngineEvent[] = [{ type: "hardDropped", cells: 0 }, { type: "locked" }];
    if (linesCleared > 0) events.push({ type: "linesCleared", count: linesCleared });
    return { snapshot: newSnapshot, events };
  }
  const newPiece: PieceState = { ...piece, y: piece.y + drop };
  const locked = lockPiece(snapshot.board, newPiece);
  const { board, linesCleared } = clearLines(locked);
  const newSnapshot = spawnNext(scoreAfterLock({ ...snapshot, board, lines: snapshot.lines + linesCleared }, linesCleared, drop), snapshot.randomizer);
  const events: EngineEvent[] = [{ type: "hardDropped", cells: drop }, { type: "locked" }];
  if (linesCleared > 0) events.push({ type: "linesCleared", count: linesCleared });
  if (newSnapshot.gameOver) events.push({ type: "gameOver" });
  return { snapshot: newSnapshot, events };
}

function tryHold(snapshot: EngineSnapshot): EngineResult {
  if (!snapshot.canHold || !snapshot.currentPiece) return { snapshot, events: [] };
  const held = snapshot.heldPiece;
  const current = snapshot.currentPiece.type;
  let newSnapshot: EngineSnapshot;
  if (held === undefined) {
    const { piece, state: r1 } = nextPiece(snapshot.randomizer);
    const { piece: next1, state: r2 } = nextPiece(r1);
    const { piece: next2, state: r3 } = nextPiece(r2);
    const { piece: next3, state: r4 } = nextPiece(r3);
    const spawnPos = SPAWN_POSITIONS[piece];
    const newPiece: PieceState = { type: piece, x: spawnPos.x, y: spawnPos.y, rotation: 0 };
    const gameOver = isGameOver(snapshot.board, newPiece);
    newSnapshot = { ...snapshot, currentPiece: gameOver ? undefined : newPiece, nextPieces: [next1, next2, next3], heldPiece: current, canHold: false, gameOver, randomizer: r4, lastAction: "hold", lastRotationTransition: undefined, kickIndex: undefined };
  } else {
    const spawnPos = SPAWN_POSITIONS[held];
    const newPiece: PieceState = { type: held, x: spawnPos.x, y: spawnPos.y, rotation: 0 };
    const gameOver = isGameOver(snapshot.board, newPiece);
    newSnapshot = { ...snapshot, currentPiece: gameOver ? undefined : newPiece, heldPiece: current, canHold: false, gameOver, randomizer: snapshot.randomizer, lastAction: "hold", lastRotationTransition: undefined, kickIndex: undefined };
  }
  if (newSnapshot.gameOver) {
    return { snapshot: newSnapshot, events: [{ type: "held", piece: held ?? current }, { type: "gameOver" }] };
  }
  return { snapshot: newSnapshot, events: [{ type: "held", piece: held ?? current }] };
}

function tryTick(snapshot: EngineSnapshot, deltaMs: number): EngineResult {
  const piece = snapshot.currentPiece;
  if (!piece) return { snapshot, events: [], error: "game-over" };
  const grounded = checkCollision(snapshot.board, piece, 0, 1);
  const nextDelay = advanceLockDelay(snapshot.lockDelay, deltaMs, grounded);
  if (nextDelay.locked) return tryLock({ ...snapshot, lockDelay: nextDelay });
  return { snapshot: { ...snapshot, lockDelay: nextDelay }, events: [] };
}

function tryLock(snapshot: EngineSnapshot): EngineResult {
  const piece = snapshot.currentPiece;
  if (!piece) return { snapshot, events: [], error: "game-over" };
  if (checkCollision(snapshot.board, piece, 0, 1)) {
    const locked = lockPiece(snapshot.board, piece);
    const { board, linesCleared } = clearLines(locked);
    const newSnapshot = spawnNext(scoreAfterLock({ ...snapshot, board, lines: snapshot.lines + linesCleared }, linesCleared), snapshot.randomizer);
    const events: EngineEvent[] = [{ type: "locked" }];
    if (linesCleared > 0) events.push({ type: "linesCleared", count: linesCleared });
    if (newSnapshot.gameOver) events.push({ type: "gameOver" });
    return { snapshot: newSnapshot, events };
  }
  return { snapshot, events: [] };
}

export function applyCommand(snapshot: EngineSnapshot, command: EngineCommand): EngineResult {
  if (snapshot.gameOver) return { snapshot, events: [], error: "game-over" };
  if (command.type === "tick" && (!Number.isFinite(command.deltaMs) || command.deltaMs < 0)) {
    return { snapshot, events: [], error: "invalid-command" };
  }
  switch (command.type) {
    case "moveLeft": return tryMove(snapshot, -1);
    case "moveRight": return tryMove(snapshot, 1);
    case "rotateCW": return tryRotate(snapshot, 1);
    case "rotateCCW": return tryRotate(snapshot, -1);
    case "rotate180": return tryRotate(snapshot, 2);
    case "softDrop": return trySoftDrop(snapshot);
    case "hardDrop": return tryHardDrop(snapshot);
    case "hold": return tryHold(snapshot);
    case "tick": return tryTick(snapshot, command.deltaMs);
  }
}











function scoreAfterLock(snapshot: EngineSnapshot, lines: number, hardDropCells = 0): EngineSnapshot {
  const tSpin = snapshot.currentPiece ? classifyTSpin({ board: snapshot.board, piece: snapshot.currentPiece, lastAction: snapshot.lastAction }) : "none";
  const kind = tSpin === "full" ? (lines === 3 ? "tSpinTriple" : lines === 2 ? "tSpinDouble" : lines === 1 ? "tSpinSingle" : "tSpinZero") : tSpin === "mini" ? (lines === 1 ? "tSpinMiniSingle" : "tSpinMiniZero") : (lines === 4 ? "tetris" : lines === 3 ? "triple" : lines === 2 ? "double" : lines === 1 ? "single" : "none");
  const result = scoreLock(guidelineDraft, { score: snapshot.score, combo: snapshot.combo, backToBack: snapshot.backToBack }, { kind, lines, softDropCells: snapshot.softDropCells, hardDropCells });
  return { ...snapshot, ...result.state };
}