export type ClearKind =
  | "none" | "single" | "double" | "triple" | "tetris"
  | "tSpinZero" | "tSpinMiniZero" | "tSpinMiniSingle"
  | "tSpinSingle" | "tSpinDouble" | "tSpinTriple";

export interface ScoringProfile {
  readonly id: string;
  readonly single: number;
  readonly double: number;
  readonly triple: number;
  readonly tetris: number;
  readonly tSpinZero: number;
  readonly tSpinMiniZero: number;
  readonly tSpinMiniSingle: number;
  readonly tSpinSingle: number;
  readonly tSpinDouble: number;
  readonly tSpinTriple: number;
  readonly backToBackMultiplier: number;
  readonly comboBase: number;
  readonly comboStep: number;
  readonly softDropPerCell: number;
  readonly hardDropPerCell: number;
  readonly perfectClearByLines: Readonly<Record<number, number>>;
}

export const guidelineDraft: ScoringProfile = {
  id: "guideline-draft-v1",
  single: 100, double: 300, triple: 500, tetris: 800,
  tSpinZero: 400, tSpinMiniZero: 100, tSpinMiniSingle: 200,
  tSpinSingle: 800, tSpinDouble: 1200, tSpinTriple: 1600,
  backToBackMultiplier: 1.5, comboBase: 0, comboStep: 50,
  softDropPerCell: 1, hardDropPerCell: 2,
  perfectClearByLines: { 1: 800, 2: 1200, 3: 1800, 4: 2000 },
};

export interface ScoreState {
  readonly score: number;
  readonly combo: number;
  readonly backToBack: boolean;
}

export interface ScoreInput {
  readonly kind: ClearKind;
  readonly lines: number;
  readonly softDropCells?: number;
  readonly hardDropCells?: number;
  readonly perfectClear?: boolean;
}

export interface ScoreResult {
  readonly state: ScoreState;
  readonly base: number;
  readonly b2bBonus: number;
  readonly comboBonus: number;
  readonly dropScore: number;
  readonly perfectClearBonus: number;
}

function baseFor(profile: ScoringProfile, kind: ClearKind): number {
  const values: Record<ClearKind, number> = {
    none: 0, single: profile.single, double: profile.double, triple: profile.triple, tetris: profile.tetris,
    tSpinZero: profile.tSpinZero, tSpinMiniZero: profile.tSpinMiniZero,
    tSpinMiniSingle: profile.tSpinMiniSingle, tSpinSingle: profile.tSpinSingle,
    tSpinDouble: profile.tSpinDouble, tSpinTriple: profile.tSpinTriple,
  };
  return values[kind];
}

function qualifiesForBackToBack(kind: ClearKind): boolean {
  return kind === "tetris" || kind === "tSpinSingle" || kind === "tSpinDouble" ||
    kind === "tSpinTriple" || kind === "tSpinMiniSingle";
}

export function scoreLock(profile: ScoringProfile, previous: ScoreState, input: ScoreInput): ScoreResult {
  const base = input.lines > 0 || input.kind !== "none" ? baseFor(profile, input.kind) : 0;
  const qualifies = input.lines > 0 && qualifiesForBackToBack(input.kind);
  const b2bBonus = qualifies && previous.backToBack ? Math.floor(base * (profile.backToBackMultiplier - 1)) : 0;
  const combo = input.lines > 0 ? previous.combo + 1 : -1;
  const comboBonus = input.lines > 0 && combo > 0 ? profile.comboBase + combo * profile.comboStep : 0;
  const dropScore = (input.softDropCells ?? 0) * profile.softDropPerCell +
    (input.hardDropCells ?? 0) * profile.hardDropPerCell;
  const perfectClearBonus = input.perfectClear ? (profile.perfectClearByLines[input.lines] ?? 0) : 0;
  return {
    state: {
      score: previous.score + base + b2bBonus + comboBonus + dropScore + perfectClearBonus,
      combo,
      backToBack: input.lines > 0 ? (qualifies || previous.backToBack && qualifies) : previous.backToBack,
    },
    base, b2bBonus, comboBonus, dropScore, perfectClearBonus,
  };
}

