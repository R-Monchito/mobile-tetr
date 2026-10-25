import type {
  EngineCommand,
  SnapshotContract,
  EngineResult,
  EngineError,
  EngineCapabilities,
} from "tetrio-mobile-core";

import init, { 
  create_initial_snapshot,
  engine_session_new,
  engine_session_free,
  engine_session_capabilities,
  engine_session_apply_command,
  golden_replay_checksum
} from "tetrio-mobile-core";

let wasmInitialized = false;

async function ensureWasmInitialized(): Promise<void> {
  if (!wasmInitialized) {
    await init();
    wasmInitialized = true;
  }
}

/**
 * Web-specific engine wrapper with TypeScript-friendly API
 * Handles WASM module loading and provides reactive state
 */
export class TetrioEngine {
  private sessionId: number | null = null;
  private snapshot: SnapshotContract | null = null;
  private animationFrameId: number | null = null;
  private lastFrameTime: number = 0;
  private running: boolean = false;

  // Reactive state for UI
  public onSnapshotUpdate: ((snapshot: SnapshotContract) => void) | null = null;
  public onGameOver: (() => void) | null = null;
  public onError: ((error: EngineError) => void) | null = null;

  /**
   * Initialize the engine with the WASM module
   */
  async initialize(): Promise<void> {
    await ensureWasmInitialized();

    // Create initial snapshot from WASM
    const initialSnapshot = create_initial_snapshot() as unknown as SnapshotContract;
    
    // Create session
    this.sessionId = engine_session_new(initialSnapshot as any);
    this.snapshot = initialSnapshot;
    this.notifySnapshotUpdate();
  }

  /**
   * Start the game loop using requestAnimationFrame
   */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastFrameTime = performance.now();
    this.gameLoop();
  }

  /**
   * Stop the game loop
   */
  stop(): void {
    this.running = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Main game loop at ~60fps
   */
  private gameLoop = (): void => {
    if (!this.running || this.sessionId === null) return;

    const now = performance.now();
    const deltaMs = Math.min(now - this.lastFrameTime, 100); // Cap delta
    this.lastFrameTime = now;

    const tickCommand: EngineCommand = {
      kind: "tick",
      deltaMs: Math.round(deltaMs),
    };

    const result = this.applyCommand(tickCommand);
    if (!result) return;
    
    this.snapshot = result.snapshot;
    this.notifySnapshotUpdate();

    if (result.error) {
      this.onError?.(result.error);
    }

    if (result.snapshot.gameOver) {
      this.onGameOver?.();
      this.stop();
      return;
    }

    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  };

  /**
   * Apply a command to the engine
   */
  applyCommand(command: EngineCommand): EngineResult | null {
    if (this.sessionId === null) return null;
    
    const result = engine_session_apply_command(this.sessionId, command as any) as unknown as EngineResult;
    this.snapshot = result.snapshot;
    this.notifySnapshotUpdate();
    return result;
  }

  // Command helpers
  moveLeft(): void { this.applyCommand({ kind: "moveLeft", deltaMs: 0 }); }
  moveRight(): void { this.applyCommand({ kind: "moveRight", deltaMs: 0 }); }
  softDrop(): void { this.applyCommand({ kind: "softDrop", deltaMs: 0 }); }
  hardDrop(): void { this.applyCommand({ kind: "hardDrop", deltaMs: 0 }); }
  rotateCW(): void { this.applyCommand({ kind: "rotateCW", deltaMs: 0 }); }
  rotateCCW(): void { this.applyCommand({ kind: "rotateCCW", deltaMs: 0 }); }
  rotate180(): void { this.applyCommand({ kind: "rotate180", deltaMs: 0 }); }
  hold(): void { this.applyCommand({ kind: "hold", deltaMs: 0 }); }

  /**
   * Get current snapshot
   */
  getSnapshot(): SnapshotContract | null {
    return this.snapshot;
  }

  /**
   * Get engine capabilities
   */
  getCapabilities(): EngineCapabilities | null {
    if (this.sessionId === null) return null;
    return engine_session_capabilities() as unknown as EngineCapabilities;
  }

  /**
   * Get golden replay checksum for verification
   */
  static getGoldenReplayChecksum(): string {
    return golden_replay_checksum();
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.stop();
    if (this.sessionId !== null) {
      engine_session_free(this.sessionId);
      this.sessionId = null;
    }
  }

  private notifySnapshotUpdate(): void {
    if (this.snapshot && this.onSnapshotUpdate) {
      this.onSnapshotUpdate(this.snapshot);
    }
  }
}

/**
 * Touch input adapter for web (mirrors TypeScript input-adapter.ts)
 */
export class TouchInputAdapter {
  public static readonly DEFAULT_SETTINGS = {
    dasMs: 133,
    arrMs: 33,
    softDropFactor: 20,
    tapThresholdMs: 180,
    tapMaxDistancePx: 12,
  } as const;

  public settings = { ...TouchInputAdapter.DEFAULT_SETTINGS };

  private engine: TetrioEngine | null = null;

  // Touch state
  private touchStart: { x: number; y: number } = { x: 0, y: 0 };
  private touchCurrent: { x: number; y: number } = { x: 0, y: 0 };
  private touchStartTime: number = 0;
  private touchActive: boolean = false;

  // DAS/ARR state
  private horizontalDirection: number = 0;
  private dasTimer: number = 0;
  private arrTimer: number = 0;
  private hasDasFired: boolean = false;
  private dasStartTime: number = 0;

  // Soft drop state
  private softDropActive: boolean = false;

  // Hold state
  private holdUsedForCurrentPiece: boolean = false;

  constructor(engine: TetrioEngine) {
    this.engine = engine;
  }

  configure(engine: TetrioEngine): void {
    this.engine = engine;
  }

  onTouchStart(x: number, y: number, _fingerCount: number = 1): void {
    this.touchStart = { x, y };
    this.touchCurrent = { x, y };
    this.touchStartTime = performance.now();
    this.touchActive = true;
  }

  onTouchMove(x: number, y: number, _fingerCount: number = 1): void {
    if (!this.touchActive || !this.engine) return;

    const dx = x - this.touchCurrent.x;
    const dy = y - this.touchCurrent.y;
    this.touchCurrent = { x, y };
    const dt = performance.now() - this.touchStartTime;

    if (_fingerCount === 1) {
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (absDx > absDy && absDx > this.settings.tapMaxDistancePx) {
        // Horizontal drag
        const newDirection = dx > 0 ? 1 : -1;
        const wasMoving = this.horizontalDirection !== 0;
        if (this.horizontalDirection !== newDirection) {
          this.resetHorizontal();
          this.horizontalDirection = newDirection;
          this.dasStartTime = this.touchStartTime;
          this.engine[newDirection === 1 ? "moveRight" : "moveLeft"]();
        } else if (wasMoving) {
          this.dasTimer = performance.now() - this.dasStartTime;
          this.arrTimer += dt;

          if (!this.hasDasFired && this.dasTimer >= this.settings.dasMs) {
            this.hasDasFired = true;
            this.arrTimer = 0;
            this.engine[this.horizontalDirection === 1 ? "moveRight" : "moveLeft"]();
          } else if (this.hasDasFired && this.arrTimer >= this.settings.arrMs) {
            const repeats = Math.floor(this.arrTimer / this.settings.arrMs);
            this.arrTimer -= repeats * this.settings.arrMs;
            for (let i = 0; i < repeats; i++) {
              this.engine[this.horizontalDirection === 1 ? "moveRight" : "moveLeft"]();
            }
          }
        }
      } else if (absDy > this.settings.tapMaxDistancePx && dy > 0) {
        // Downward drag - soft drop
        if (!this.softDropActive) {
          this.softDropActive = true;
        }
        this.engine.softDrop();
      }
    } else if (_fingerCount >= 2) {
      // Two fingers - cancel horizontal and soft drop
      this.resetHorizontal();
      this.softDropActive = false;
    }
  }

  onTouchEnd(_fingerCount: number = 1): void {
    if (!this.touchActive || !this.engine) return;

    const dt = performance.now() - this.touchStartTime;
    const dx = this.touchCurrent.x - this.touchStart.x;
    const dy = this.touchCurrent.y - this.touchStart.y;
    const distance = Math.hypot(dx, dy);

    this.touchActive = false;
    this.resetHorizontal();
    this.softDropActive = false;

    if (_fingerCount === 1 && dt <= this.settings.tapThresholdMs && distance <= this.settings.tapMaxDistancePx) {
      // Tap -> rotate CW
      this.engine.rotateCW();
    } else if (_fingerCount >= 2 && dt <= this.settings.tapThresholdMs && distance <= this.settings.tapMaxDistancePx) {
      // Two-finger tap -> rotate CCW
      this.engine.rotateCCW();
    }
  }

  onHoldPress(): void {
    if (this.holdUsedForCurrentPiece || !this.engine) return;
    this.holdUsedForCurrentPiece = true;
    this.engine.hold();
  }

  onPieceSpawn(): void {
    this.holdUsedForCurrentPiece = false;
  }

  private resetHorizontal(): void {
    this.horizontalDirection = 0;
    this.dasTimer = 0;
    this.arrTimer = 0;
    this.hasDasFired = false;
    this.dasStartTime = 0;
  }
}