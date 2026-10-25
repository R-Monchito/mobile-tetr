import { createEmptyBoard, createRandomizer, initialSnapshot } from "./engine.ts";
import { deserializeReplay } from "./replay.ts";
import { readFileSync } from "node:fs";

const snapshot = initialSnapshot(createEmptyBoard(), createRandomizer(424242));
const required = [
  "board", "score", "lines", "combo", "rulesVersion",
  "randomizer", "lastAction", "softDropCells", "lockDelay", "currentPiece", "nextPieces",
  "gameOver", "heldPiece", "canHold", "backToBack",
] as const;
for (const key of required) {
  if (!(key in snapshot)) throw new Error(`ABI snapshot missing ${key}`);
}
const golden = JSON.parse(readFileSync("work/fixtures/replay-golden-001.json", "utf8"));
const replay = deserializeReplay(JSON.stringify({
  formatVersion: 1,
  engineVersion: "0.1.0",
  rulesetVersion: golden.rulesVersion,
  initial: snapshot,
  commands: golden.commands.map((type: string) => ({ type })),
}));
if (replay.commands.length !== golden.commands.length) throw new Error("ABI replay command count mismatch");
console.log("native ABI contract: ok");