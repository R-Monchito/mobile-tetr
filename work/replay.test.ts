import { applyCommand, createEmptyBoard, createRandomizer, initialSnapshot } from "./engine.ts";
import { checksumSnapshot, createReplay, deserializeReplay, replayAndChecksum, serializeReplay } from "./replay.ts";

const initial = initialSnapshot(createEmptyBoard(), createRandomizer(424242));
const commands = [{ type: "moveLeft" as const }, { type: "rotateCW" as const }, { type: "hardDrop" as const }];
const replay = createReplay(initial, commands);
const roundTrip = deserializeReplay(serializeReplay(replay));
if (checksumSnapshot(initial) !== checksumSnapshot(roundTrip.initial)) throw new Error("replay initial state changed");
const a = replayAndChecksum(roundTrip, applyCommand);
const b = replayAndChecksum(createReplay(initial, commands), applyCommand);
if (a !== b) throw new Error("replay checksum is not deterministic");
console.log("replay invariants: ok");


let longA = initialSnapshot(createEmptyBoard(), createRandomizer(7));
let longB = initialSnapshot(createEmptyBoard(), createRandomizer(7));
for (let i = 0; i < 14 && !longA.gameOver; i++) {
  longA = applyCommand(longA, { type: "hardDrop" }).snapshot;
  longB = applyCommand(longB, { type: "hardDrop" }).snapshot;
}
if (checksumSnapshot(longA) !== checksumSnapshot(longB)) throw new Error("multi-bag replay diverged");
