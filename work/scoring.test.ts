import { guidelineDraft, scoreLock } from "./scoring.ts";

let state = { score: 0, combo: -1, backToBack: false };
let result = scoreLock(guidelineDraft, state, { kind: "single", lines: 1 });
if (result.base !== 100 || result.state.score !== 100 || result.state.combo !== 0) throw new Error("single scoring failed");
state = result.state;
result = scoreLock(guidelineDraft, state, { kind: "tetris", lines: 4 });
if (result.base !== 800 || result.state.backToBack !== true) throw new Error("tetris scoring failed");
state = result.state;
result = scoreLock(guidelineDraft, state, { kind: "tetris", lines: 4, hardDropCells: 3 });
if (result.b2bBonus <= 0 || result.dropScore !== 6) throw new Error("b2b/drop scoring failed");
result = scoreLock(guidelineDraft, result.state, { kind: "none", lines: 0 });
if (result.state.combo !== -1) throw new Error("no-line lock must reset combo");
console.log("scoring invariants: ok");
