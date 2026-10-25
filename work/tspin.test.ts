import { createEmptyBoard } from "./engine.ts";
import { classifyTSpin } from "./tspin.ts";

const board = createEmptyBoard(10, 40);
const cells = [...board.cells] as (0 | 1)[];
// T at x=3,y=20 => pivot (4,21); occupy three corners.
for (const [x, y] of [[3,20], [5,20], [3,22]] as const) cells[y * 10 + x] = 1;
const setup = { ...board, cells };
const piece = { type: "T" as const, x: 3, y: 20, rotation: 0 as const };

if (classifyTSpin({ board: setup, piece, lastAction: "move" }) !== "none") throw new Error("movement must not qualify");
if (classifyTSpin({ board: setup, piece, lastAction: "rotate" }) !== "mini") throw new Error("three corners should classify under mini policy");
if (classifyTSpin({ board: setup, piece, lastAction: "rotate", policy: { miniByRotation: { 0: false, 1: false, 2: false, 3: false }, requireRotationAsLastAction: true } }) !== "full") throw new Error("policy should classify full");
console.log("t-spin invariants: ok");
