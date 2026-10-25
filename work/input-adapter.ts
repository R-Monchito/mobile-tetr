import type { EngineCommand } from "./engine.ts";

export interface InputSettings {
  dasMs: number;
  arrMs: number;
  softDropFactor: number;
  tapThresholdMs: number;
  tapMaxDistancePx: number;
}

export const DEFAULT_SETTINGS: InputSettings = {
  dasMs: 133,
  arrMs: 33,
  softDropFactor: 20,
  tapThresholdMs: 180,
  tapMaxDistancePx: 12,
};

export interface TouchState {
  x: number;
  y: number;
  startX: number;
  startY: number;
  startTime: number;
  active: boolean;
  fingerCount: number;
}

export interface AdapterState {
  horizontal: {
    direction: -1 | 0 | 1;
    dasTimer: number;
    arrTimer: number;
    hasDasFired: boolean;
    dasStartTime: number;
    lastUpdateTime?: number;
  };
  softDrop: {
    active: boolean;
    lastUpdateTime?: number;
  };
  hold: {
    usedForCurrentPiece: boolean;
  };
  touch: TouchState | null;
}

export function createAdapterState(): AdapterState {
  return {
    horizontal: { direction: 0, dasTimer: 0, arrTimer: 0, hasDasFired: false, dasStartTime: 0 },
    softDrop: { active: false },
    hold: { usedForCurrentPiece: false },
    touch: null,
  };
}

export function createInputAdapter(settings: Partial<InputSettings> = {}) {
  const s = { ...DEFAULT_SETTINGS, ...settings };
  let state = createAdapterState();

  function resetHorizontal() {
    state.horizontal = { direction: 0, dasTimer: 0, arrTimer: 0, hasDasFired: false, dasStartTime: 0 };
  }

  function resetSoftDrop() {
    state.softDrop.active = false;
  }

  function onPieceSpawn() {
    state.hold.usedForCurrentPiece = false;
  }

  function onTouchStart(x: number, y: number, fingerCount: number, timeMs: number) {
    state.touch = {
      x,
      y,
      startX: x,
      startY: y,
      startTime: timeMs,
      active: true,
      fingerCount,
    };
    return [];
  }

  function onTouchMove(x: number, y: number, fingerCount: number, timeMs: number): EngineCommand[] {
    if (!state.touch || !state.touch.active) return [];
    const t = state.touch;
    const dx = x - t.x;
    const dy = y - t.y;
    t.x = x;
    t.y = y;
    t.fingerCount = fingerCount;

    const commands: EngineCommand[] = [];

    if (fingerCount === 1) {
      const absDx = Math.abs(x - t.startX);
      const absDy = Math.abs(y - t.startY);
      const dt = timeMs - t.startTime;

      if (absDx > absDy && absDx > s.tapMaxDistancePx) {
        const newDir = x > t.startX ? 1 : -1;
        if (state.horizontal.direction !== newDir) {
          resetHorizontal();
          state.horizontal.direction = newDir;
          state.horizontal.dasStartTime = t.startTime;
          commands.push(newDir === 1 ? { type: "moveRight" } : { type: "moveLeft" });
        } else if (state.horizontal.direction !== 0) {
          state.horizontal.dasTimer = timeMs - state.horizontal.dasStartTime;
          state.horizontal.arrTimer += dt;

          if (!state.horizontal.hasDasFired && state.horizontal.dasTimer >= s.dasMs) {
            state.horizontal.hasDasFired = true;
            state.horizontal.arrTimer = 0;
            commands.push(state.horizontal.direction === 1 ? { type: "moveRight" } : { type: "moveLeft" });
          } else if (state.horizontal.hasDasFired && state.horizontal.arrTimer >= s.arrMs) {
            const repeats = Math.floor(state.horizontal.arrTimer / s.arrMs);
            state.horizontal.arrTimer -= repeats * s.arrMs;
            for (let i = 0; i < repeats; i++) {
              commands.push(state.horizontal.direction === 1 ? { type: "moveRight" } : { type: "moveLeft" });
            }
          }
        }
      } else if (absDy > s.tapMaxDistancePx && dy > 0) {
        if (!state.softDrop.active) {
          state.softDrop.active = true;
          state.softDrop.lastUpdateTime = timeMs;
        }
        commands.push({ type: "softDrop" });
        commands.push({ type: "tick", deltaMs: dt });
      }
    } else if (fingerCount >= 2) {
      resetHorizontal();
      resetSoftDrop();
    }

    return commands;
  }

  function onTouchEnd(fingerCount: number, timeMs: number): EngineCommand[] {
    if (!state.touch || !state.touch.active) return [];
    const t = state.touch;
    const dt = timeMs - t.startTime;
    const dx = t.x - t.startX;
    const dy = t.y - t.startY;
    const dist = Math.hypot(dx, dy);

    state.touch.active = false;
    resetHorizontal();
    resetSoftDrop();

    const commands: EngineCommand[] = [];

    if (fingerCount === 1 && dt <= s.tapThresholdMs && dist <= s.tapMaxDistancePx) {
      commands.push({ type: "rotateCW" });
    } else if (fingerCount >= 2 && dt <= s.tapThresholdMs && dist <= s.tapMaxDistancePx) {
      commands.push({ type: "rotateCCW" });
    }

    return commands;
  }

  function onHoldPress(): EngineCommand[] {
    if (state.hold.usedForCurrentPiece) return [];
    state.hold.usedForCurrentPiece = true;
    return [{ type: "hold" }];
  }

  function onHoldRelease() {
  }

  function update(currentTimeMs: number): EngineCommand[] {
    const commands: EngineCommand[] = [];

    if (state.horizontal.direction !== 0) {
      if (!state.horizontal.hasDasFired) {
        state.horizontal.dasTimer = currentTimeMs - state.horizontal.dasStartTime;
        if (state.horizontal.dasTimer >= s.dasMs) {
          state.horizontal.hasDasFired = true;
          state.horizontal.arrTimer = 0;
          commands.push(state.horizontal.direction === 1 ? { type: "moveRight" } : { type: "moveLeft" });
        }
      } else {
        state.horizontal.arrTimer += currentTimeMs - (state.horizontal.lastUpdateTime ?? currentTimeMs);
        const repeats = Math.floor(state.horizontal.arrTimer / s.arrMs);
        if (repeats > 0) {
          state.horizontal.arrTimer -= repeats * s.arrMs;
          for (let i = 0; i < repeats; i++) {
            commands.push(state.horizontal.direction === 1 ? { type: "moveRight" } : { type: "moveLeft" });
          }
        }
      }
      state.horizontal.lastUpdateTime = currentTimeMs;
    } else {
      state.horizontal.lastUpdateTime = undefined;
    }

    if (state.softDrop.active) {
      commands.push({ type: "tick", deltaMs: currentTimeMs - (state.softDrop.lastUpdateTime ?? currentTimeMs) });
      state.softDrop.lastUpdateTime = currentTimeMs;
    } else {
      state.softDrop.lastUpdateTime = undefined;
    }

    return commands;
  }

  function getSettings(): InputSettings {
    return { ...s };
  }

  function getState(): Readonly<AdapterState> {
    return state;
  }

  function setSettings(newSettings: Partial<InputSettings>) {
    Object.assign(s, newSettings);
  }

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onHoldPress,
    onHoldRelease,
    update,
    onPieceSpawn,
    getSettings,
    setSettings,
    getState,
  };
}

export type InputAdapter = ReturnType<typeof createInputAdapter>;