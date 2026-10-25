# FFI Binding Strategy — `tetrio_mobile_core`

**Version:** 0.1.0-draft
**Status:** Planning — no code generated yet

This document defines the FFI boundary strategy for the native Tetris engine. It is the single source of truth for code generation targets, ownership, thread safety, error handling, build integration, and verification.

---

## 1. UniFFI Code Generation Targets

| Target | Language | Package Manager | Output Location | Notes |
|--------|----------|-----------------|-----------------|-------|
| **Kotlin** | Kotlin/JVM + Android | Gradle (Maven local / JitPack) | `bindings/kotlin/` | `android` and `jvm` targets; `suspend` not used — sync API |
| **Swift** | Swift 5.9+ | SPM + CocoaPods | `bindings/swift/` | Module name `TetrioMobileCore`; `Sendable` conformance on snapshot |
| **TypeScript** | TS 5.5+ | npm (workspace) | `bindings/typescript/` | WASM target (`cdylib` → `wasm32-unknown-unknown`); Node + browser ESM |

### Generation Command

```bash
uniffi-bindgen generate tetrio_mobile.udl \
  --language kotlin --out-dir bindings/kotlin \
  --language swift  --out-dir bindings/swift \
  --language typescript --out-dir bindings/typescript
```

### UDL Annotations for Target-Specific Behavior

```udl
namespace tetrio_mobile_core {
  // Kotlin: generates @JvmName for enum variants
  // Swift:  generates @_cdecl for C interop, Sendable on snapshot
  // TS:     generates ES modules with BigInt for u64
};
```

> **Note:** UniFFI 0.28+ handles casing automatically (snake_case UDL → PascalCase Rust → camelCase Kotlin/Swift/TS). Do not hand-edit generated files.

---

## 2. Memory Ownership Model

### Core Principle

> **One owned `EngineSession` per game instance.** The session is the single source of mutable state.

### Ownership Rules

| Layer | Ownership |
|-------|-----------|
| **Rust (native)** | `EngineSession` is `struct EngineSession { inner: Arc<Mutex<EngineInner>> }` — `Arc` for shared ownership across FFI calls, `Mutex` for serialized mutation |
| **Kotlin** | `EngineSession` is a `class` holding a `Long` handle; `close()` drops the Arc; `use { }` extension for scoped lifetime |
| **Swift** | `EngineSession` is a `final class` wrapping `OpaquePointer`; `deinit` calls `tetrio_mobile_core_engine_session_free`; `@MainActor` not required — thread-safe by design |
| **TypeScript (WASM)** | `EngineSession` is a `final class` with `free()`; `using` declaration (TS 5.2+) or `try/finally` for deterministic cleanup |

### Snapshot Immutability Convention

- `snapshot()` returns a **deep copy** of all game state (board, pieces, RNG, scores).
- The returned snapshot is **frozen/immutable by convention**:
  - Rust: `SnapshotContract` derives `Clone` but not `Mut` — no `&mut` methods exposed via UDL
  - Kotlin: `data class SnapshotContract(...)` — all fields `val`
  - Swift: `struct SnapshotContract: Sendable` — value type, implicit copy-on-write
  - TypeScript: `interface SnapshotContract { readonly ... }` — `readonly` fields, `Object.freeze()` on construction
- UI **must not** mutate snapshot fields. Mutations go through `apply_command()`.

### Rationale

- Single writer (engine) eliminates data races.
- Snapshots are cheap to clone (board ≤ 200 cells, queue ≤ 5 pieces, RNG state small).
- Enables trivial replay: record command stream, replay into fresh session, compare final snapshot hash.

---

## 3. Thread Safety

### Serialization Guarantee

All mutable operations on `EngineSession` are serialized by the internal `Mutex<EngineInner>`:

```rust
pub fn apply_command(&self, cmd: EngineCommand) -> EngineResult {
    let mut inner = self.inner.lock().expect("engine mutex poisoned");
    inner.apply_command(cmd)
}
```

### Cross-Platform Implications

| Platform | Thread Model | Integration Pattern |
|----------|--------------|---------------------|
| **Android (Kotlin)** | UI thread + background coroutines | Call `apply_command()` from any thread; `Mutex` serializes. Prefer `withContext(Dispatchers.Default)` for tick loop. |
| **iOS (Swift)** | Main thread + GCD queues | `EngineSession` is `Sendable`; call from any queue. No `@MainActor` needed. |
| **WASM (TS)** | Single-threaded (JS) + Web Workers | **WASM has no threads** — `Mutex` becomes a no-op (spinlock or `RefCell`). All calls must be from the same JS context. For worker offloading, use `postMessage` with command serialization. |

### Tick Loop Placement

- **Android:** `while (running) { session.apply_command(tick(deltaMs)); render(snapshot); delay(frameBudget) }` on `Dispatchers.Default`
- **iOS:** `CADisplayLink` or `Timer` on background queue → `session.apply_command(tick(...))` → `DispatchQueue.main.async { render(snapshot) }`
- **WASM:** `requestAnimationFrame` loop on main thread; `tick` advances logical time.

> **Rule:** Never call `apply_command()` concurrently from multiple threads without external synchronization — the `Mutex` serializes, but command ordering across threads is undefined.

---

## 4. Snapshot Immutability Convention (Detailed)

### Rust Definition

```rust
#[derive(Clone, Debug, uniffi::Record)]
pub struct SnapshotContract {
    pub board: BoardState,
    pub score: u64,
    pub lines: u32,
    pub game_over: bool,
    pub current_piece: Option<PieceState>,
    pub next_pieces: Vec<PieceType>,
    pub held_piece: Option<PieceType>,
    pub can_hold: bool,
    pub randomizer: RandomizerState,
    pub last_action: LastAction,
    pub last_rotation_transition: Option<String>,
    pub kick_index: Option<u8>,
    pub lock_delay: LockDelayState,
    pub combo: i32,
    pub back_to_back: bool,
    pub ruleset_version: String,
    pub soft_drop_cells: u32,
}
```

- No `&mut self` methods.
- `BoardState.cells: Vec<u8>` — flat row-major array, `width * height` length.
- `RandomizerState.bag: Vec<PieceType>` — owned, cloned on snapshot.

### Kotlin Mapping

```kotlin
data class SnapshotContract(
    val board: BoardState,
    val score: Long,
    val lines: Int,
    val gameOver: Boolean,
    val currentPiece: PieceState?,
    val nextPieces: List<PieceType>,
    val heldPiece: PieceType?,
    val canHold: Boolean,
    val randomizer: RandomizerState,
    val lastAction: LastAction,
    val lastRotationTransition: String?,
    val kickIndex: Byte?,
    val lockDelay: LockDelayState,
    val combo: Int,
    val backToBack: Boolean,
    val rulesetVersion: String,
    val softDropCells: Int
)
```

### Swift Mapping

```swift
public struct SnapshotContract: Sendable {
    public let board: BoardState
    public let score: UInt64
    public let lines: UInt32
    public let gameOver: Bool
    public let currentPiece: PieceState?
    public let nextPieces: [PieceType]
    public let heldPiece: PieceType?
    public let canHold: Bool
    public let randomizer: RandomizerState
    public let lastAction: LastAction
    public let lastRotationTransition: String?
    public let kickIndex: UInt8?
    public let lockDelay: LockDelayState
    public let combo: Int32
    public let backToBack: Bool
    public let rulesetVersion: String
    public let softDropCells: UInt32
}
```

### TypeScript Mapping

```typescript
export interface SnapshotContract {
  readonly board: BoardState;
  readonly score: bigint;           // u64 → BigInt
  readonly lines: number;           // u32
  readonly gameOver: boolean;
  readonly currentPiece: PieceState | null;
  readonly nextPieces: readonly PieceType[];
  readonly heldPiece: PieceType | null;
  readonly canHold: boolean;
  readonly randomizer: RandomizerState;
  readonly lastAction: LastAction;
  readonly lastRotationTransition: string | null;
  readonly kickIndex: number | null; // u8
  readonly lockDelay: LockDelayState;
  readonly combo: number;           // i32
  readonly backToBack: boolean;
  readonly rulesetVersion: string;
  readonly softDropCells: number;   // u32
}
```

---

## 5. Error Handling at FFI Boundary

### Error Enum (UDL)

```udl
enum EngineError { "invalid_board", "game_over", "invalid_command" };
```

### Return Type

```udl
dictionary EngineResult {
  SnapshotContract snapshot;
  sequence<EngineEvent> events;
  EngineError? error;
};
```

### Semantics

| Error | When | Snapshot | Events |
|-------|------|----------|--------|
| `invalid_board` | Constructor: initial board dimensions mismatch, invalid cells | N/A (constructor fails) | — |
| `game_over` | `apply_command` on already-over session | **Previous snapshot** (unchanged) | Empty |
| `invalid_command` | `tick` with negative `delta_ms`, unknown `CommandKind` | **Previous snapshot** (unchanged) | Empty |

### Platform Handling

| Platform | Pattern |
|----------|---------|
| **Rust** | `Result<EngineResult, UniFFIError>` — `EngineError` variants map to `UniFFIError::Custom` |
| **Kotlin** | `EngineResult.error: EngineError?` — check `if (result.error != null) { handle }` |
| **Swift** | `EngineResult.error: EngineError?` — `if let err = result.error { ... }` |
| **TypeScript** | `result.error: EngineError | null` — narrow with `if (result.error) { ... }` |

### No-Panic Guarantee

- Rust `EngineInner::apply_command` **never panics** — all validation returns `EngineError`.
- `Mutex` poisoning is treated as fatal (process abort) — indicates logic bug, not recoverable error.
- Constructor validates `initial` snapshot; on failure, returns `UniFFIError` with `invalid_board`.

---

## 6. Build Integration

### 6.1 Cargo.toml (Native Spike)

```toml
[package]
name = "tetrio-mobile-core"
version = "0.1.0"
edition = "2021"
description = "Offline-first Tetris engine core for mobile"
license = "MIT OR Apache-2.0"
repository = "https://github.com/..."

[lib]
name = "tetrio_mobile_core"
crate-type = ["cdylib", "staticlib", "rlib"]

[dependencies]
uniffi = { version = "0.28", features = ["extern-c"] }
thiserror = "1.0"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
# Game logic deps (no-std compatible where possible)
rand = { version = "0.8", default-features = false, features = ["std"] }
# Deterministic RNG for replay
rand_chacha = "0.3"

[build-dependencies]
uniffi-build = "0.28"

[features]
default = []
# For WASM target
wasm = ["uniffi/wasm"]
```

### 6.2 Build Script (`build.rs`)

```rust
fn main() {
    uniffi_build::generate_scaffolding("tetrio_mobile.udl")
        .expect("uniffi scaffolding generation failed");
}
```

### 6.3 Kotlin/Gradle Integration

**`bindings/kotlin/build.gradle.kts`**

```kotlin
plugins {
    id("org.jetbrains.kotlin.multiplatform") version "2.0.0"
    id("maven-publish")
}

kotlin {
    android()
    jvm()
    
    sourceSets {
        val commonMain by getting {
            dependencies {
                implementation("org.mozilla.uniffi:uniffi-runtime:0.28.0")
            }
        }
    }
}

publishing {
    publications {
        create<MavenPublication>("maven") {
            groupId = "com.tetrio.mobile"
            artifactId = "tetrio-mobile-core"
            version = "0.1.0"
            from(components["kotlinAndroid"]) // or jvm
        }
    }
}
```

**Android App `build.gradle.kts`**

```kotlin
dependencies {
    implementation("com.tetrio.mobile:tetrio-mobile-core:0.1.0")
    // Or local: implementation(project(":tetrio-mobile-core"))
}
```

### 6.4 Swift/SPM Integration

**`Package.swift`**

```swift
// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "TetrioMobileCore",
    platforms: [.iOS(.v16), .macOS(.v13)],
    products: [
        .library(name: "TetrioMobileCore", targets: ["TetrioMobileCore"])
    ],
    targets: [
        .binaryTarget(
            name: "TetrioMobileCore",
            url: "https://github.com/.../releases/download/v0.1.0/TetrioMobileCore.xcframework.zip",
            checksum: "..."
        )
    ]
)
```

**CocoaPods (`TetrioMobileCore.podspec`)**

```ruby
Pod::Spec.new do |s|
  s.name         = "TetrioMobileCore"
  s.version      = "0.1.0"
  s.summary      = "Offline-first Tetris engine core"
  s.homepage     = "https://github.com/..."
  s.license      = { :type => "MIT", :file => "LICENSE" }
  s.author       = { "..." => "..." }
  s.platform     = :ios, "16.0"
  s.source       = { :http => "https://github.com/.../releases/download/v0.1.0/TetrioMobileCore.xcframework.zip" }
  s.vendored_frameworks = "TetrioMobileCore.xcframework"
  s.requires_arc = true
end
```

### 6.5 TypeScript/WASM Integration

**`bindings/typescript/package.json`**

```json
{
  "name": "@tetrio/mobile-core",
  "version": "0.1.0",
  "type": "module",
  "main": "./index.js",
  "types": "./index.d.ts",
  "files": ["index.js", "index.d.ts", "tetrio_mobile_core_bg.wasm"],
  "scripts": {
    "build": "wasm-pack build --target web --out-dir .",
    "test": "vitest run"
  },
  "dependencies": {
    "uniffi-wasm-runtime": "^0.28.0"
  },
  "devDependencies": {
    "wasm-pack": "^0.12.0",
    "vitest": "^2.0.0"
  }
}
```

**WASM Build (CI)**

```bash
# Native (for Kotlin/Swift)
cargo build --release --target aarch64-linux-android
cargo build --release --target aarch64-apple-ios
cargo lipo --release --output universal.a

# WASM (for TypeScript)
cargo build --release --target wasm32-unknown-unknown --features wasm
wasm-bindgen --target web --out-dir bindings/typescript \
  target/wasm32-unknown-unknown/release/tetrio_mobile_core.wasm
```

---

## 7. Golden Replay Verification

### Goal

Every binding target must reproduce the **exact same final snapshot hash** (`aca04ded`) when replaying the canonical command sequence from the frozen TypeScript reference.

### Canonical Replay Fixture

```json
{
  "formatVersion": 1,
  "engineVersion": "0.2.0-draft",
  "rulesetVersion": "tetrio-v1",
  "initial": { /* SnapshotContract */ },
  "commands": [ /* EngineCommand[] */ ],
  "finalChecksum": "aca04ded"
}
```

### Verification Procedure (Per Target)

```bash
# 1. Generate bindings
uniffi-bindgen generate tetrio_mobile.udl --language <target> --out-dir bindings/<target>

# 2. Build native library
cargo build --release --target <triple>

# 3. Run replay test
<target>-test-runner --fixture golden_replay.json --assert-checksum aca04ded
```

### Test Implementation Sketch

**Rust (native)**

```rust
#[test]
fn golden_replay() {
    let fixture = include_str!("../fixtures/golden_replay.json");
    let replay: ReplayFixture = serde_json::from_str(fixture).unwrap();
    
    let mut session = EngineSession::new(replay.initial).unwrap();
    for cmd in replay.commands {
        let result = session.apply_command(cmd);
        assert!(result.error.is_none(), "unexpected error: {:?}", result.error);
    }
    let final_snapshot = session.snapshot();
    let checksum = compute_checksum(&final_snapshot);
    assert_eq!(checksum, "aca04ded");
}
```

**Kotlin**

```kotlin
@Test
fun goldenReplay() {
    val fixture = Json.decodeFromString<ReplayFixture>(goldenReplayJson)
    val session = EngineSession(fixture.initial)
    fixture.commands.forEach { cmd ->
        val result = session.applyCommand(cmd)
        assertNull(result.error)
    }
    val checksum = computeChecksum(session.snapshot())
    assertEquals("aca04ded", checksum)
    session.close()
}
```

**Swift**

```swift
func testGoldenReplay() throws {
    let fixture = try JSONDecoder().decode(ReplayFixture.self, from: goldenReplayData)
    let session = EngineSession(initial: fixture.initial)
    for cmd in fixture.commands {
        let result = session.applyCommand(cmd)
        XCTAssertNil(result.error)
    }
    let checksum = computeChecksum(session.snapshot())
    XCTAssertEqual(checksum, "aca04ded")
}
```

**TypeScript**

```typescript
test("golden replay", () => {
  const fixture = JSON.parse(goldenReplayJson) as ReplayFixture;
  const session = new EngineSession(fixture.initial);
  for (const cmd of fixture.commands) {
    const result = session.applyCommand(cmd);
    expect(result.error).toBeNull();
  }
  const checksum = computeChecksum(session.snapshot());
  expect(checksum).toBe("aca04ded");
  session.free();
});
```

### Checksum Algorithm

```rust
fn compute_checksum(snapshot: &SnapshotContract) -> String {
    use sha2::{Digest, Sha256};
    let mut hasher = Sha256::new();
    // Deterministic serialization: board cells, score, lines, game_over, 
    // current_piece, next_pieces, held_piece, can_hold, randomizer, 
    // last_action, last_rotation_transition, kick_index, lock_delay, 
    // combo, back_to_back, ruleset_version, soft_drop_cells
    hasher.update(&snapshot.board.cells);
    hasher.update(snapshot.score.to_le_bytes());
    hasher.update(snapshot.lines.to_le_bytes());
    hasher.update([snapshot.game_over as u8]);
    // ... all fields in fixed order
    format!("{:x}", hasher.finalize())[..8].to_string() // first 8 hex chars
}
```

> **Critical:** The checksum must use **identical serialization order and encoding** across all targets. Define a canonical binary format in a shared test fixture.

---

## 8. Platform Integration Checklist

### Pre-Generation

- [ ] `tetrio_mobile.udl` is complete and matches `abi.md` mapping
- [ ] `verify-toolchain.ps1` passes (cargo, rustc, uniffi-bindgen, fmt, test, clippy)
- [ ] Rust engine implementation compiles and passes unit tests

### Code Generation

- [ ] `uniffi-bindgen generate` succeeds for all three targets (Kotlin, Swift, TypeScript)
- [ ] Generated files are committed to `bindings/<target>/` (or generated in CI)
- [ ] No hand-edits to generated files — casing/naming via UDL only

### Kotlin/Android

- [ ] `bindings/kotlin` publishes to Maven local / CI artifact repository
- [ ] Android sample app compiles and runs `EngineSession` smoke test
- [ ] `tick` loop on `Dispatchers.Default` maintains 60 fps on Pixel 7 / Galaxy S23
- [ ] ProGuard/R8 rules keep `tetrio_mobile_core` classes

### Swift/iOS

- [ ] `TetrioMobileCore.xcframework` builds for `ios-arm64`, `ios-simulator-arm64`
- [ ] SPM package resolves and compiles in Xcode 15+
- [ ] CocoaPods podspec lints (`pod lib lint`)
- [ ] `Sendable` conformance verified — no `@MainActor` leakage
- [ ] Memory graph shows no leaks after 1000 `apply_command` cycles

### TypeScript/WASM

- [ ] `@tetrio/mobile-core` publishes to npm (or workspace)
- [ ] WASM module loads in V8 (Chrome/Node) and JavaScriptCore (Safari)
- [ ] `tick` loop via `requestAnimationFrame` maintains 60 fps on iPhone 15 / Pixel 8
- [ ] `BigInt` handling for `u64` score verified (no precision loss)
- [ ] Bundle size < 500 KB gzipped (WASM + JS glue)

### Cross-Target Verification

- [ ] Golden replay test passes on **all three targets** with checksum `aca04ded`
- [ ] Snapshot equality: Rust ↔ Kotlin ↔ Swift ↔ TS field-by-field comparison
- [ ] Error cases: `invalid_board` (constructor), `game_over` (post-over command), `invalid_command` (negative tick) — all return correct `EngineResult.error`
- [ ] Fuzzing: 10,000 random command sequences produce identical state across targets

### CI/CD

- [ ] GitHub Actions matrix: `ubuntu-latest` (Kotlin, WASM), `macos-latest` (Swift, iOS)
- [ ] `cargo test` + `cargo clippy` + `cargo fmt --check` on every PR
- [ ] Binding generation runs in CI; generated artifacts uploaded as build artifacts
- [ ] Golden replay test runs on every target in CI
- [ ] Release workflow: tag → build all targets → publish artifacts

---

## 9. Non-Goals / Out of Scope

- Networking, authentication, leaderboards, Tetra League
- WebSocket / Ribbon protocol
- Custom RNG seeding beyond `RandomizerState.seed`
- Hot-reload of rulesets (ruleset version is snapshot metadata only)
- Audio, particles, visual effects — purely rendering concerns

---

## 10. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| UniFFI version drift breaks generated bindings | Medium | High | Pin `uniffi = "0.28"` in Cargo.toml; CI tests generation |
| WASM `Mutex` no-op allows accidental reentrancy | High | Medium | Document single-threaded constraint; lint for nested `apply_command` |
| `u64` score → `BigInt` interop inconsistency | Low | High | Golden replay includes score > 2^53 test case |
| Snapshot clone cost spikes on low-end devices | Low | Medium | Profile `snapshot()` — current ~2 KB, negligible |
| Frame partitioning diverges replay checksum | High | High | Normalize `tick` to fixed 16 ms in replay runner (design decision) |

---

## Appendix: File Layout

```
native-spike/
├── Cargo.toml
├── build.rs
├── tetrio_mobile.udl
├── src/
│   ├── lib.rs           // uniffi::include_scaffolding!("tetrio_mobile")
│   ├── engine.rs        // EngineInner, EngineSession impl
│   ├── types.rs         // All UDL-mapped structs/enums
│   ├── replay.rs        // Golden replay runner + checksum
│   └── error.rs         // EngineError, UniFFI mapping
├── tests/
│   └── golden_replay.rs
├── fixtures/
│   └── golden_replay.json
├── bindings/
│   ├── kotlin/
│   ├── swift/
│   └── typescript/
└── verify-toolchain.ps1
```

---

*End of FFI Binding Strategy. Next step: implement `native-spike/src/` per this spec, then run `verify-toolchain.ps1`.*