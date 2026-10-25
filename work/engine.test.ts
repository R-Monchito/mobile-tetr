import { applyCommand, createEmptyBoard, initialSnapshot, createRandomizer } from "./engine.ts";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

function assertEqual<T>(a: T, b: T, msg: string) {
  if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${msg}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}

const board = createEmptyBoard(10, 40);
let snap = initialSnapshot(board);

assert(!snap.gameOver, "initial snapshot should not be game over");
assert(snap.currentPiece !== undefined, "should have current piece");
assert(snap.nextPieces.length === 3, "should have 3 next pieces");
assert(snap.heldPiece === undefined, "held piece should be undefined initially");
assert(snap.canHold === true, "should be able to hold initially");
assert(snap.score === 0 && snap.lines === 0, "initial score/lines should be 0");

// Test moveLeft
let r = applyCommand(snap, { type: "moveLeft" });
assert(!r.error, "moveLeft should not error");
assert(r.events[0]?.type === "moved" && r.events[0].dx === -1, "moveLeft should emit moved -1");
snap = r.snapshot;

// Test moveRight
r = applyCommand(snap, { type: "moveRight" });
assert(!r.error, "moveRight should not error");
assert(r.events[0]?.type === "moved" && r.events[0].dx === 1, "moveRight should emit moved 1");
snap = r.snapshot;

// Test rotateCW
r = applyCommand(snap, { type: "rotateCW" });
assert(!r.error, "rotateCW should not error");
assert(r.events[0]?.type === "rotated", "rotateCW should emit rotated");
snap = r.snapshot;

// Test rotateCCW
r = applyCommand(snap, { type: "rotateCCW" });
assert(!r.error, "rotateCCW should not error");
assert(r.events[0]?.type === "rotated", "rotateCCW should emit rotated");
snap = r.snapshot;

// Test rotate180
r = applyCommand(snap, { type: "rotate180" });
assert(!r.error, "rotate180 should not error");
assert(r.events[0]?.type === "rotated", "rotate180 should emit rotated");
snap = r.snapshot;

// Test softDrop
r = applyCommand(snap, { type: "softDrop" });
assert(!r.error, "softDrop should not error");
assert(r.events[0]?.type === "softDropped", "softDrop should emit softDropped");
assert(typeof r.events[0].cells === "number" && r.events[0].cells >= 0, "softDropped cells should be number");
snap = r.snapshot;

// Test hardDrop (locks piece and spawns next)
r = applyCommand(snap, { type: "hardDrop" });
assert(!r.error, "hardDrop should not error");
assert(r.events.some(e => e.type === "hardDropped"), "hardDrop should emit hardDropped");
assert(r.events.some(e => e.type === "locked"), "hardDrop should emit locked");
assert(r.snapshot.currentPiece !== undefined || r.snapshot.gameOver, "should have next piece or game over");
snap = r.snapshot;

// Test hold
if (!snap.gameOver && snap.currentPiece) {
  r = applyCommand(snap, { type: "hold" });
  assert(!r.error, "hold should not error");
  assert(r.events[0]?.type === "held", "hold should emit held");
  assert(r.snapshot.heldPiece !== undefined, "held piece should be set");
  assert(r.snapshot.canHold === false, "canHold should be false after hold");
  snap = r.snapshot;
}

// Test tick (gravity lock)
if (!snap.gameOver) {
  r = applyCommand(snap, { type: "tick", deltaMs: 1000 });
  assert(!r.error, "tick should not error");
  snap = r.snapshot;
}

// Test invalid tick
r = applyCommand(snap, { type: "tick", deltaMs: -1 });
assert(r.error === "invalid-command", "negative tick should return invalid-command");

// Test game over error propagation
const gameOverSnap = { ...snap, gameOver: true };
r = applyCommand(gameOverSnap, { type: "moveLeft" });
assert(r.error === "game-over", "commands on game over should return game-over");

// Test invalid board construction
try {
  createEmptyBoard(0, 40);
  throw new Error("should have thrown");
} catch (e: unknown) {
  assert((e as Error).message === "invalid-board", "invalid width should throw invalid-board");
}

try {
  createEmptyBoard(10, -1);
  throw new Error("should have thrown");
} catch (e: unknown) {
  assert((e as Error).message === "invalid-board", "invalid height should throw invalid-board");
}

// Test deterministic randomizer
const r1 = createRandomizer(12345);
const r2 = createRandomizer(12345);
assertEqual(r1.bag, r2.bag, "same seed should produce same bag");
assert(r1.index === r2.index, "same seed should produce same index");

// Test full game flow: piece spawns, moves, rotates, hard drops, next piece spawns
let testSnap = initialSnapshot(createEmptyBoard(10, 40));
assert(testSnap.currentPiece !== undefined, "piece should spawn");
const pieceType = testSnap.currentPiece.type;
testSnap = applyCommand(testSnap, { type: "hardDrop" }).snapshot;
assert(testSnap.currentPiece !== undefined || testSnap.gameOver, "next piece should spawn after lock");
assert(testSnap.lines >= 0, "lines should be non-negative");
assert(testSnap.score >= 0, "score should be non-negative");

// Test line clear scoring: fill a row manually then lock a piece to clear it
const lineBoard = createEmptyBoard(10, 40);
const cells = [...lineBoard.cells] as (0|1)[];
// Fill bottom row (y=39) completely
for (let x = 0; x < 10; x++) cells[39 * 10 + x] = 1;
const fullRowBoard = { ...lineBoard, cells };
testSnap = initialSnapshot(fullRowBoard);
// Hard drop current piece - it will lock above and clear the full row
const beforeScore = testSnap.score;
testSnap = applyCommand(testSnap, { type: "hardDrop" }).snapshot;
assert(testSnap.lines === 1, "should clear 1 line");
assert(testSnap.score > beforeScore, "score should increase after line clear");

console.log("engine invariants: ok");

// Same seed and command stream must preserve the same piece sequence/state.
const replayA = initialSnapshot(createEmptyBoard(10, 40), createRandomizer(424242));
const replayB = initialSnapshot(createEmptyBoard(10, 40), createRandomizer(424242));
assertEqual(replayA, replayB, "same seed should produce identical initial snapshots");
const replayA1 = applyCommand(replayA, { type: "hardDrop" }).snapshot;
const replayB1 = applyCommand(replayB, { type: "hardDrop" }).snapshot;
assertEqual(replayA1, replayB1, "same seed and command should produce identical snapshots");


// Grounded piece locks only after the logical delay, not on the first tick.
const grounded = { ...initialSnapshot(createEmptyBoard(), createRandomizer(99)), currentPiece: { type: "O" as const, x: 4, y: 38, rotation: 0 as const } };
const beforeLock = applyCommand(grounded, { type: "tick", deltaMs: 499 });
if (beforeLock.snapshot.gameOver || beforeLock.events.some(e => e.type === "locked")) throw new Error("piece locked before delay elapsed");
const afterLock = applyCommand(beforeLock.snapshot, { type: "tick", deltaMs: 1 });
if (!afterLock.events.some(e => e.type === "locked")) throw new Error("grounded piece did not lock at delay threshold");
