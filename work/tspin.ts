import type { BoardState, LastAction, PieceState, Rotation } from "./engine.ts";

export type TSpinKind = "none" | "mini" | "full";

export interface TSpinPolicy {
  readonly miniByRotation: Readonly<Record<Rotation, boolean>>;
  readonly requireRotationAsLastAction: boolean;
}

export const defaultTSpinPolicy: TSpinPolicy = {
  miniByRotation: { 0: true, 1: true, 2: true, 3: true },
  requireRotationAsLastAction: true,
};

export interface TSpinInput {
  readonly board: BoardState;
  readonly piece: PieceState;
  readonly lastAction: LastAction;
  readonly policy?: TSpinPolicy;
}

function occupied(board: BoardState, x: number, y: number): boolean {
  if (x < 0 || x >= board.width || y < 0 || y >= board.height) return true;
  return board.cells[y * board.width + x] === 1;
}

export function classifyTSpin(input: TSpinInput): TSpinKind {
  const { board, piece, lastAction, policy = defaultTSpinPolicy } = input;
  if (piece.type !== "T") return "none";
  if (policy.requireRotationAsLastAction && lastAction !== "rotate") return "none";
  const pivotX = piece.x + 1;
  const pivotY = piece.y + 1;
  const corners = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
  const occupiedCorners = corners.filter(([dx, dy]) => occupied(board, pivotX + dx, pivotY + dy)).length;
  if (occupiedCorners < 3) return "none";
  return policy.miniByRotation[piece.rotation] ? "mini" : "full";
}

