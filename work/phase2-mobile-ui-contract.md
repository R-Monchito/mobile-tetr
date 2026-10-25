# Phase 2 Mobile UI ↔ Engine Contract

This document defines the offline-first boundary for SwiftUI/Compose or a future Rust FFI layer. It contains no network or authentication behavior.

## Command boundary

The UI emits typed commands only:

- `moveLeft`, `moveRight`
- `softDrop`, `hardDrop`
- `rotateCW`, `rotateCCW`, `rotate180`
- `hold`
- `tick(deltaMs)` from the game loop

Commands are serialized through one engine session. The UI never mutates board cells, RNG state, score, lock timing, or replay state directly.

## Snapshot boundary

Each accepted command returns an immutable snapshot and ordered events. The renderer consumes:

- board cells and active piece;
- next queue and held piece;
- score, lines, combo and back-to-back state;
- lock-delay state and last action metadata;
- game-over state and ruleset version.

A rejected command must preserve the previous snapshot byte-for-byte except for an optional diagnostic event.

## 60 fps frame budget

The UI loop targets a 16.667 ms frame budget. `tick` advances logical engine time; wall-clock time is owned by the platform loop. Rendering must be incremental where possible and must not run scoring, RNG or collision logic independently.

The current TypeScript host benchmark is a throughput signal only. Device acceptance still requires profiling on an A14/Snapdragon-778G-class device.

## Touch mapping

Touch gestures are translated into commands before reaching the engine:

- horizontal drag: discrete move commands with repeat throttling;
- sustained downward touch: soft-drop commands plus `tick`;
- tap rotate: clockwise rotation;
- two-finger or dedicated control: counter-clockwise/180 rotation;
- hold button: `hold` once per piece.

DAS/ARR timing belongs to the input adapter, not the rules engine, and must be persisted as settings separately from replay state.

## Persistence

Persist settings and local records only. Do not persist credentials or network session data in this offline core. Settings must include a schema version so future migrations are explicit.

## Verification checklist

- [ ] UI command adapter has one-to-one command coverage.
- [ ] Snapshot renderer is read-only.
- [ ] Input-to-render latency is measured on target devices.
- [ ] Replay output is independent of frame partitioning.
- [ ] Settings migration tests exist.
- [ ] No networking dependency enters the local engine module.