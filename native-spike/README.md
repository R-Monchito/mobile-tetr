# Native Core Spike

This is the Phase 2 Rust + UniFFI preparation scaffold. It intentionally contains no game implementation and no network dependencies.

## ABI goals

- Commands and snapshots remain versioned and replay-compatible with the TypeScript prototype.
- UI layers receive immutable snapshots/events and send typed commands.
- The future core owns board rules, RNG, scoring, replay and lock timing.
- Network and authentication stay outside the offline core.
- UniFFI bindings are added only after the Rust toolchain is available and the TypeScript golden fixtures are frozen.

## Files

- `tetrio_mobile.udl` — draft UniFFI definition for the typed command/snapshot/event boundary.
- `src/lib.rs` — dependency-free Rust type-shape spike and offline-only contract tests; the object implementation remains intentionally deferred.
- `abi.md` — field-by-field TypeScript ↔ UDL ↔ Rust mapping and conversion rules.
- `validate-abi.mjs` — read-only structural contract check; it is not a replacement for `uniffi-bindgen`.
- `verify-toolchain.ps1` — runs the real Rust checks when `cargo`, `rustc`, and `uniffi-bindgen` exist.

## Local verification

From the repository root:

```text
npm run test:abi-contract
powershell -ExecutionPolicy Bypass -File native-spike/verify-toolchain.ps1
```

The ABI check is expected to pass without Rust. The toolchain gate exits with code `2` when a required executable is missing. It does not modify project sources.

When Rust is available, the expected native gate is:

- `cargo fmt --manifest-path native-spike/Cargo.toml -- --check`
- `cargo test --manifest-path native-spike/Cargo.toml`
- `cargo clippy --manifest-path native-spike/Cargo.toml -- -D warnings`
- `uniffi-bindgen generate native-spike/tetrio_mobile.udl --language kotlin --out-dir <temporary-output>`

Generated bindings and temporary outputs are intentionally not committed by this spike.

## Status

The UDL and Rust type shape are contract preparation only. They are not evidence of a compiled native engine, generated bindings, or tetr.io equivalence. The network capability remains explicitly `false`.