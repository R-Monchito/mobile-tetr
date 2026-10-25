import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { guidelineDraft, scoreLock } from "./scoring.ts";
import { classifyTSpin } from "./tspin.ts";
import { applyCommand, createRandomizer, initialSnapshot } from "./engine.ts";
import { createEmptyBoard } from "./engine.ts";
import { checksumSnapshot } from "./replay.ts";
const dir = join(process.cwd(), "work", "fixtures");
for (const name of readdirSync(dir).filter(file => file.endsWith(".json"))) {
  const value = JSON.parse(readFileSync(join(dir, name), "utf8")) as Record<string, unknown>;
  for (const key of ["id", "rulesVersion", "provenance", "expected"]) {
    if (!(key in value)) throw new Error(name + " missing " + key);
  }
  if (typeof value.id !== "string" || typeof value.rulesVersion !== "string" || typeof value.provenance !== "string") throw new Error(name + " has invalid metadata");
  if (name.startsWith("srs-") && value.expected && (value.expected as Record<string, unknown>).kickCandidates !== 5) throw new Error(name + " has incomplete SRS matrix");
  if (name === "soft-drop-scoring-001.json") {
    const result = scoreLock(guidelineDraft, { score: 0, combo: -1, backToBack: false }, value.input as never);
    const expected = value.expected as Record<string, number>;
    if (result.base !== expected.base || result.dropScore !== expected.dropScore || result.state.score !== expected.totalDelta || result.state.combo !== expected.combo) throw new Error(name + " scoring vector mismatch");
  }
  if (name === "randomizer-sequence-001.json") {
    const input = value as any;
    let randomizer = createRandomizer(input.seed);
    const pieces: string[] = [];
    for (let i = 0; i < input.expected.pieces.length; i++) {
      const snapshot = initialSnapshot(createEmptyBoard(), randomizer);
      pieces.push(snapshot.currentPiece.type);
      randomizer = snapshot.randomizer;
    }
    if (JSON.stringify(pieces) !== JSON.stringify(input.expected.pieces)) throw new Error(name + " randomizer vector mismatch");
  }
  if (name === "replay-golden-001.json") {
    const input = value as any;
    let snapshot = initialSnapshot(createEmptyBoard(), createRandomizer(input.seed));
    for (const type of input.commands) snapshot = applyCommand(snapshot, { type }).snapshot;
    if (checksumSnapshot(snapshot) !== input.expected.checksum) throw new Error(name + " checksum mismatch");
  }
  if (name === "tspin-policy-001.json") {
    const board = createEmptyBoard(10, 40);
    const cells = [...board.cells] as (0 | 1)[];
    for (const [x, y] of [[3,20], [5,20], [3,22]] as const) cells[y * 10 + x] = 1;
    const setup = { ...board, cells };
    const input = value.input as any;
    const piece = { ...input.piece, type: "T" as const };
    const expected = value.expected as Record<string, string>;
    const policy = { miniByRotation: { 0: false, 1: false, 2: false, 3: false }, requireRotationAsLastAction: true };
    if (classifyTSpin({ board: setup, piece, lastAction: input.lastAction }) !== expected.default || classifyTSpin({ board: setup, piece, lastAction: "move" }) !== expected.movementAction || classifyTSpin({ board: setup, piece, lastAction: input.lastAction, policy }) !== expected.fullPolicy) throw new Error(name + " T-spin vector mismatch");
  }
}
console.log("fixture catalog: ok");

