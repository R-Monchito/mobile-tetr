/**
 * TypeScript bindings for tetrio_mobile_core
 * Generated from tetrio_mobile.udl
 * This is a manual binding for the web platform (WASM)
 */

// ============================================
// Primitive types
// ============================================

type u8 = number;
type u16 = number;
type u32 = number;
type u64 = number | bigint;
type i32 = number;
type boolean = boolean;
type string = string;

// ============================================
// Enums
// ============================================

type CommandKind = 
  | "move_left" | "move_right" | "soft_drop" | "hard_drop"
  | "rotate_cw" | "rotate_ccw" | "rotate_180" | "hold" | "tick";

type PieceType = "I" | "J" | "L" | "O" | "S" | "T" | "Z";

type LastAction = "spawn" | "move" | "rotate" | "drop" | "hold" | "lock";

type EngineEventKind = 
  | "spawned" | "moved" | "rotated" | "soft_dropped" | "hard_dropped"
  | "locked" | "lines_cleared" | "held" | "game_over";

type EngineError = "invalid_board" | "game_over" | "invalid_command";

// ============================================
// Records (Dictionaries)
// ============================================

interface BoardSize {
  width: u16;
  height: u16;
}

interface EngineCapabilities {
  replay: boolean;
  deterministic_rng: boolean;
  network: boolean;
}

interface EngineCommand {
  kind: CommandKind;
  delta_ms: u32;
}

interface BoardState {
  width: u16;
  height: u16;
  cells: Uint8Array; // sequence<u8>
}

interface PieceState {
  piece_type: PieceType;
  x: i32;
  y: i32;
  rotation: u8;
}

interface RandomizerState {
  bag: PieceType[];
  index: u32;
  seed: u32;
}

interface LockDelayState {
  elapsed_ms: u32;
  resets: u32;
  locked: boolean;
}

interface SnapshotContract {
  board: BoardState;
  score: u64;
  lines: u32;
  game_over: boolean;
  current_piece: PieceState | null;
  next_pieces: PieceType[];
  held_piece: PieceType | null;
  can_hold: boolean;
  randomizer: RandomizerState;
  last_action: LastAction;
  last_rotation_transition: string | null;
  kick_index: u8 | null;
  lock_delay: LockDelayState;
  combo: i32;
  back_to_back: boolean;
  ruleset_version: string;
  soft_drop_cells: u32;
}

interface EngineCapabilities {
  replay: boolean;
  deterministic_rng: boolean;
  network: boolean;
}

interface EngineEvent {
  kind: EngineEventKind;
  value: u32;
  piece: PieceType | null;
}

interface EngineResult {
  snapshot: SnapshotContract;
  events: EngineEvent[];
  error: EngineError | null;
}

// ============================================
// EngineSession Interface
// ============================================

interface EngineSession {
  new(initial: SnapshotContract): EngineSession;
  capabilities(): EngineCapabilities;
  snapshot(): SnapshotContract;
  apply_command(command: EngineCommand): EngineResult;
}

// ============================================
// FFI Module Interface (for WASM)
// ============================================

interface TetrioMobileCoreModule {
  // Memory management
  RustBuffer: {
    alloc(size: number): RustBuffer;
    free(buf: RustBuffer): void;
    create(capacity: number, len: number, data: number): RustBuffer;
  };
  
  // FFI functions
  ffi_tetrio_mobile_core_engine_session_new(
    initial: SnapshotContract
  ): number; // returns handle (pointer)
  
  ffi_tetrio_mobile_core_engine_session_free(handle: number): void;
  
  ffi_tetrio_mobile_core_engine_session_capabilities(handle: number): EngineCapabilities;
  
  ffi_tetrio_mobile_core_engine_session_snapshot(handle: number): SnapshotContract;
  
  ffi_tetrio_mobile_core_engine_session_apply_command(
    handle: number,
    command: EngineCommand
  ): EngineResult;

  // Buffer functions
  ffi_tetrio_mobile_core_rustbuffer_alloc(size: number): RustBuffer;
  ffi_tetrio_mobile_core_rustbuffer_free(buf: RustBuffer): void;
  ffi_tetrio_mobile_core_rustbuffer_from_bytes(bytes: Uint8Array): RustBuffer;
}

// ============================================
// RustBuffer helper
// ============================================

interface RustBuffer {
  capacity: number;
  len: number;
  data: number; // pointer
  asByteBuffer(): Uint8Array;
}

// ============================================
// Engine Wrapper Class
// ============================================

class TetrioEngine {
  private handle: number;
  private module: TetrioMobileCoreModule;
  private snapshot: SnapshotContract | null = null;
  
  private onSnapshotUpdate: ((snapshot: SnapshotContract) => void) | null = null;
  private onGameOver: (() => void) | null = null;
  private onError: ((error: EngineError) => void) | null = null;
  
  private running: boolean = false;
  private lastFrameTime: number = 0;
  private animationFrameId: number | null = null;
  
  constructor(module: TetrioMobileCoreModule, initialSnapshot: SnapshotContract) {
    this.module = module;
    this.handle = module.ffi_tetrio_mobile_core_engine_session_new(initialSnapshot);
    this.snapshot = initialSnapshot;
  }
  
  static async initialize(module: TetrioMobileCoreModule): Promise<TetrioEngine> {
    // Create initial snapshot matching Rust's initial_snapshot()
    const { createInitialSnapshot } = await import('./snapshot');
    const initialSnapshot = createInitialSnapshot();
    return new TetrioEngine(module, initialSnapshot);
  }
  
  capabilities(): EngineCapabilities {
    return this.module.ffi_tetrio_mobile_core_engine_session_capabilities(this.handle);
  }
  
  getSnapshot(): SnapshotContract {
    this.snapshot = this.module.ffi_tetrio_mobile_core_engine_session_snapshot(this.handle);
    return this.snapshot;
  }
  
  applyCommand(command: EngineCommand): EngineResult {
    const result = this.module.ffi_tetrio_mobile_core_engine_session_apply_command(this.handle, command);
    this.snapshot = result.snapshot;
    return result;
  }
  
  // Command helpers
  moveLeft(): void { this.applyCommand({ kind: "move_left", delta_ms: 0 }); }
  moveRight(): void { this.applyCommand({ kind: "move_right", delta_ms: 0 }); }
  softDrop(): void { this.applyCommand({ kind: "soft_drop", delta_ms: 0 }); }
  hardDrop(): void { this.applyCommand({ kind: "hard_drop", delta_ms: 0 }); }
  rotateCW(): void { this.applyCommand({ kind: "rotate_cw", delta_ms: 0 }); }
  rotateCCW(): void { this.applyCommand({ kind: "rotate_ccw", delta_ms: 0 }); }
  rotate180(): void { this.applyCommand({ kind: "rotate_180", delta_ms: 0 }); }
  hold(): void { this.applyCommand({ kind: "hold", delta_ms: 0 }); }
  
  // Game loop
  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastFrameTime = performance.now();
    this.gameLoop();
  }
  
  stop(): void {
    this.running = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
  
  private gameLoop = (): void => {
    if (!this.running) return;
    
    const now = performance.now();
    const deltaMs = Math.min(now - this.lastFrameTime, 100);
    this.lastFrameTime = now;
    
    const result = this.applyCommand({ kind: "tick", delta_ms: Math.round(deltaMs) });
    
    if (this.onSnapshotUpdate) {
      this.onSnapshotUpdate(result.snapshot);
    }
    
    if (result.error) {
      this.onError?.(result.error);
    }
    
    if (result.snapshot.game_over) {
      this.onGameOver?.();
      this.stop();
      return;
    }
    
    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  };
  
  // Event callbacks
  onSnapshotUpdate(callback: (snapshot: SnapshotContract) => void): void {
    this.onSnapshotUpdate = callback;
  }
  
  onGameOver(callback: () => void): void {
    this.onGameOver = callback;
  }
  
  onError(callback: (error: EngineError) => void): void {
    this.onError = callback;
  }
  
  dispose(): void {
    this.stop();
    this.module.ffi_tetrio_mobile_core_engine_session_free(this.handle);
  }
}

// ============================================
// Snapshot creation helper
// ============================================

function createInitialSnapshot(): SnapshotContract {
  // This mirrors the Rust initial_snapshot() function
  const board = new BoardState(10, 40);
  const randomizer = new RandomizerState(424242);
  
  const piece = randomizer.next();
  const [sx, sy] = piece.spawnPos();
  const currentPiece = new PieceState(piece, sx, sy, 0);
  
  const nextPieces: PieceType[] = [];
  for (let i = 0; i < 3; i++) {
    nextPieces.push(randomizer.next());
  }
  
  return {
    board,
    score: 0,
    lines: 0,
    game_over: false,
    current_piece: currentPiece,
    next_pieces: nextPieces,
    held_piece: null,
    can_hold: true,
    randomizer,
    last_action: "spawn",
    last_rotation_transition: null,
    kick_index: null,
    lock_delay: new LockDelayState(),
    combo: -1,
    back_to_back: false,
    ruleset_version: "draft",
    soft_drop_cells: 0,
  };
}

// Helper classes
class BoardState {
  width: u16;
  height: u16;
  cells: Uint8Array;
  
  constructor(width: u16, height: u16) {
    this.width = width;
    this.height = height;
    this.cells = new Uint8Array(width * height);
  }
  
  get(x: i32, y: i32): u8 {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 1;
    return this.cells[y * this.width + x];
  }
  
  set(x: i32, y: i32, v: u8): void {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      this.cells[y * this.width + x] = v;
    }
  }
}

class RandomizerState {
  bag: PieceType[];
  index: u32;
  seed: u32;
  
  constructor(seed: u32) {
    this.seed = seed;
    this.bag = this.shuffleBag(seed);
    this.index = 0;
  }
  
  private shuffleBag(seed: u32): PieceType[] {
    const bag: PieceType[] = ["I", "J", "L", "O", "S", "T", "Z"];
    let rng = seed;
    for (let i = bag.length - 1; i > 0; i--) {
      rng = (rng * 1664525 + 1013904223) >>> 0;
      const j = rng % (i + 1);
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    return bag;
  }
  
  next(): PieceType {
    if (this.index >= this.bag.length) {
      const newSeed = (this.seed + this.index) >>> 0;
      this.bag = this.shuffleBag(newSeed);
      this.index = 0;
      this.seed = newSeed;
    }
    return this.bag[this.index++];
  }
  
  peek(n: number): PieceType[] {
    const result: PieceType[] = [];
    let idx = this.index;
    let bag = [...this.bag];
    let seed = this.seed + this.index;
    
    while (result.length < n) {
      if (idx >= bag.length) {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        bag = this.shuffleBag(seed);
        idx = 0;
      }
      result.push(bag[idx]);
      idx++;
    }
    return result;
  }
}

class LockDelayState {
  elapsed_ms: u32 = 0;
  resets: u32 = 0;
  locked: boolean = false;
  
  advance(delta_ms: u32, grounded: boolean): void {
    if (this.locked || delta_ms === 0) return;
    if (!grounded) {
      this.elapsed_ms = 0;
      this.locked = false;
      return;
    }
    this.elapsed_ms = Math.min(this.elapsed_ms + delta_ms, 500);
    this.locked = this.elapsed_ms >= 500;
  }
  
  reset(grounded: boolean): void {
    if (!grounded || this.locked || this.resets >= 15) return;
    this.elapsed_ms = 0;
    this.resets++;
    this.locked = false;
  }
}

export { TetrioEngine, createInitialSnapshot, EngineCapabilities, EngineCommand, SnapshotContract, BoardState, PieceState, RandomizerState, LockDelayState, EngineResult, EngineEvent, EngineError, CommandKind, PieceType, LastAction, EngineEventKind, RustBuffer, RustBuffer };