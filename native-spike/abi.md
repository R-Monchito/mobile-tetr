# Native Core ABI Contract

Version: 0.2.0-draft

This is an offline-first boundary proposal. It is not a generated binding and it does not claim compatibility with tetr.io.

## Type mapping: TypeScript -> UDL -> Rust

| TypeScript prototype | UDL surface | Rust spike | Notes |
|---|---|---|---|
| `EngineCommand` union | `EngineCommand { kind, delta_ms }` | `EngineCommand { kind, delta_ms }` | `tick` keeps its `deltaMs` payload; non-tick commands use `0`. |
| command `type` strings | `CommandKind` enum | `CommandKind` enum | camelCase TS names map to snake_case UDL values and PascalCase Rust variants. |
| `PieceType` | `PieceType` enum | `PieceType` enum | The seven piece symbols are preserved. |
| `BoardState.width/height/cells` | `BoardState.width/height/cells` | `BoardState.width/height/cells` | TS `Cell` values (`0 | 1`) cross the boundary as `u8`; the native side validates dimensions and cell count. |
| `PieceState.type/x/y/rotation` | `PieceState.piece_type/x/y/rotation` | `PieceState.piece_type/x/y/rotation` | `type` is renamed to avoid a reserved-looking field at the native boundary. |
| `RandomizerState` | `RandomizerState` | `RandomizerState` | `bag` is a sequence; `index` and `seed` are unsigned 32-bit values. The current RNG remains draft. |
| optional TS fields | nullable UDL fields (`?`) | `Option<T>` | `undefined` maps to `null`/`None`. |
| `LockDelayState` | `LockDelayState` | `LockDelayState` | Milliseconds and reset count are `u32`; logical-time semantics remain defined by the TS tests. |
| `EngineEvent` union | `EngineEvent { kind, value, piece }` | `EngineEvent { kind, value, piece }` | `value` is the numeric payload for movement/drop/line events; unused fields use `0`/`null`. |
| `EngineError` | `EngineError` enum | `EngineError` enum | No exception or panic is part of the proposed boundary. |
| `EngineResult` | `EngineResult` | `EngineResult` | `snapshot`, event list, and nullable error are returned together. |
| `SnapshotContract.lastRotationTransition` | `SnapshotContract.last_rotation_transition` | `SnapshotContract.last_rotation_transition` | Optional string `"from->to"` rotation transition (e.g., `"0->1"`); `None` if last action was not a rotation. |
| `SnapshotContract.kickIndex` | `SnapshotContract.kick_index` | `SnapshotContract.kick_index` | Optional `u8` index of successful SRS wall kick; `None` if no kick applied. |
| `SnapshotContract.softDropCells` | `SnapshotContract.soft_drop_cells` | `SnapshotContract.soft_drop_cells` | Cumulative soft-drop cells for scoring guideline. |
| `SnapshotContract.rulesVersion` | `SnapshotContract.ruleset_version` | `SnapshotContract.ruleset_version` | Ruleset identifier string; TS uses camelCase, UDL/Rust use snake_case. |

Numeric conversions must be range-checked before crossing FFI. The TypeScript prototype uses JavaScript `number`; the UDL deliberately narrows fields to `u8`, `u16`, `u32`, `u64`, `i32` where the current model has an explicit invariant.

## Naming conventions at the FFI boundary

- **TypeScript (camelCase)**: `deltaMs`, `rulesVersion`, `lastRotationTransition`, `kickIndex`, `softDropCells`, `moveLeft`, `rotateCW`, `rotateCCW`, `rotate180`
- **UDL (snake_case)**: `delta_ms`, `ruleset_version`, `last_rotation_transition`, `kick_index`, `soft_drop_cells`, `move_left`, `rotate_cw`, `rotate_ccw`, `rotate_180`
- **Rust (PascalCase for types/variants, snake_case for fields)**: `Rotate180`, `delta_ms`, `ruleset_version`, `last_rotation_transition`, `kick_index`, `soft_drop_cells`

The UniFFI code generator applies these transformations automatically. Do not hand-edit generated bindings to change casing.

## Commands

The native core accepts: move left/right, soft drop, hard drop, rotate clockwise/counter-clockwise/180 degrees, hold, and `tick(deltaMs)`. The command object is intentionally not an enum-only payload so `tick` cannot lose its elapsed-time argument.

**`tick` command**: `delta_ms` is mandatory in every `EngineCommand`. For `tick`, it carries the elapsed milliseconds since the last frame. For all other commands (`move_left`, `move_right`, `soft_drop`, `hard_drop`, `rotate_cw`, `rotate_ccw`, `rotate_180`, `hold`), `delta_ms` must be `0`. The engine validates `delta_ms >= 0` for `tick` and returns `EngineError::InvalidCommand` on negative values.

**`hold` command**: The engine validates `can_hold` internally. If `can_hold` is `false`, the command is accepted but produces no state change and no `held` event (the snapshot is returned unchanged except for `last_action` remaining as the previous action). This is not an error — the UI should track `can_hold` from the snapshot to avoid redundant hold presses.

## Snapshot boundary

The UI receives an immutable-by-convention snapshot containing board cells, active piece, next queue, hold, score, lines, game-over state, RNG state, last action, rotation metadata (`last_rotation_transition`, `kick_index`), lock delay, combo, back-to-back state, ruleset version (`ruleset_version`), and soft-drop count (`soft_drop_cells`). The UI does not mutate board rules, RNG, scoring, or lock timing.

## Replay compatibility

The JSON replay document remains the canonical interchange fixture for now: `formatVersion`, `engineVersion`, `rulesetVersion`, `initial`, `commands`, and optional `finalChecksum`. The UDL session API carries the command/snapshot portion; a native replay runner still must be implemented and must reproduce the frozen TypeScript checksum `aca04ded` before claiming cross-language equivalence.

**Replay vs frame partitioning**: The replay format records discrete `EngineCommand` objects including `tick` with its `delta_ms` payload. If the UI partitions frames differently (e.g., two 8 ms ticks vs one 16 ms tick), the command sequence diverges and the replay checksum will differ. For deterministic cross-language replay equivalence, the replay runner must either (a) normalize `tick` commands to a fixed timestep during recording, or (b) record the exact `deltaMs` sequence produced by the reference engine. This remains a design decision for the replay runner implementation.

## Errors and ownership

Errors are typed and non-panicking at the FFI boundary: invalid-board, game-over, and invalid-command. Expose one owned engine session per game; serialize mutable command execution and return copied/immutable snapshots to UI threads.

## Non-goals

No WebSocket, Ribbon, authentication, telemetry, Quick Play, Tetra League automation, proprietary client dependency, or modified `tetrio.js` belongs in this ABI.