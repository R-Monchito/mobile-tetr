import { createEmptyBoard, createRandomizer, initialSnapshot } from "./engine.ts";
import { scoreSnapshotLock } from "./engine-scoring.ts";

let snapshot = initialSnapshot(createEmptyBoard(), createRandomizer(1));
snapshot = scoreSnapshotLock(snapshot, 4, 5, undefined, 3);
if (snapshot.score !== 813 || snapshot.combo !== 0 || !snapshot.backToBack) throw new Error("tetris score adapter failed");
snapshot = scoreSnapshotLock(snapshot, 4);
if (snapshot.score <= 810 || !snapshot.backToBack) throw new Error("back-to-back score adapter failed");
snapshot = scoreSnapshotLock(snapshot, 0);
if (snapshot.combo !== -1) throw new Error("combo reset adapter failed");
console.log("engine-scoring adapter: ok");
