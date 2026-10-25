import { applyCommand, createEmptyBoard, createRandomizer, initialSnapshot } from "./engine.ts";

const frames = Number(process.env.BENCH_FRAMES ?? 6000);
let snapshot = initialSnapshot(createEmptyBoard(), createRandomizer(424242));
const commands = [
  { type: "moveLeft" as const }, { type: "moveRight" as const },
  { type: "rotateCW" as const }, { type: "softDrop" as const },
  { type: "tick" as const, deltaMs: 16 },
];
const start = performance.now();
for (let i = 0; i < frames; i++) snapshot = applyCommand(snapshot, commands[i % commands.length]).snapshot;
const elapsedMs = performance.now() - start;
const framesPerSecond = frames / (elapsedMs / 1000);
const msPerFrame = elapsedMs / frames;
console.log(JSON.stringify({ frames, elapsedMs: Number(elapsedMs.toFixed(3)), framesPerSecond: Number(framesPerSecond.toFixed(1)), msPerFrame: Number(msPerFrame.toFixed(5)), target60fps: msPerFrame < 16.667, finalScore: snapshot.score }));
if (!Number.isFinite(elapsedMs) || msPerFrame >= 16.667) process.exitCode = 1;