import type { EngineSnapshot } from "./engine.ts";
import { guidelineDraft, scoreLock, type ClearKind } from "./scoring.ts";

export function scoreSnapshotLock(snapshot: EngineSnapshot, lines: number, hardDropCells = 0, kind?: ClearKind, softDropCells = 0): EngineSnapshot {
  const clearKind = kind ?? (lines === 4 ? "tetris" : lines === 3 ? "triple" : lines === 2 ? "double" : lines === 1 ? "single" : "none");
  const scored = scoreLock(guidelineDraft, {
    score: snapshot.score,
    combo: snapshot.combo,
    backToBack: snapshot.backToBack,
  }, { kind: clearKind, lines, softDropCells, hardDropCells });
  return { ...snapshot, score: scored.state.score, combo: scored.state.combo, backToBack: scored.state.backToBack };
}
