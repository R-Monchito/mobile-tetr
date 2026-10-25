export interface LockDelayState {
  readonly elapsedMs: number;
  readonly resets: number;
  readonly locked: boolean;
}

export interface LockDelayPolicy {
  readonly delayMs: number;
  readonly maxResets: number;
}

export const defaultLockDelay: LockDelayPolicy = { delayMs: 500, maxResets: 15 };

export function createLockDelay(): LockDelayState {
  return { elapsedMs: 0, resets: 0, locked: false };
}

export function advanceLockDelay(state: LockDelayState, deltaMs: number, grounded: boolean, policy = defaultLockDelay): LockDelayState {
  if (state.locked || !Number.isFinite(deltaMs) || deltaMs < 0) return state;
  if (!grounded) return { elapsedMs: 0, resets: state.resets, locked: false };
  const elapsedMs = Math.min(state.elapsedMs + deltaMs, policy.delayMs);
  return { elapsedMs, resets: state.resets, locked: elapsedMs >= policy.delayMs };
}

export function resetLockDelay(state: LockDelayState, grounded: boolean, policy = defaultLockDelay): LockDelayState {
  if (!grounded || state.locked || state.resets >= policy.maxResets) return state;
  return { elapsedMs: 0, resets: state.resets + 1, locked: false };
}

