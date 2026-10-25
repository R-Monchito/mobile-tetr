# Phase 1 Evidence Audit

This audit distinguishes executable evidence from draft assumptions and environmental gaps.

| Requirement | Evidence | Status |
|---|---|---|
| Engine/replay determinism | `npm test`, engine/replay suites, `replay-golden-001.json` | Verified |
| SRS transition families | `srs-matrix.test.ts`, `srs-transition-matrix-001.json` | Verified as draft ruleset |
| Collision-based kick selection | `srs-boundary.test.ts`, `selectFirstFreeKickByCollision` | Verified |
| T-spin action and corner policy | `tspin.test.ts`, `tspin-policy-001.json` | Verified as configurable draft policy |
| Soft-drop scoring | `engine-scoring.test.ts`, `soft-drop-scoring-001.json` | Verified against draft profile |
| Lock-delay partition equivalence | `lock-delay.test.ts`, threshold fixture | Verified |
| RNG reproducibility | `randomizer-sequence-001.json`, fixture validator | Verified for current draft implementation |
| Native ABI shape | `native-abi.test.ts`, `native-spike/validate-abi.mjs`, `native-spike/abi.md`, Rust types, `native-spike/tetrio_mobile.udl` | TypeScript and structural UDL/Rust mapping verified; native compile pending |
| Rust/UniFFI build | `native-spike/verify-toolchain.ps1` (`cargo fmt`, `cargo test`, `cargo clippy`, `uniffi-bindgen`) | Not verified: `cargo`, `rustc`, and `uniffi-bindgen` unavailable |
| tetr.io equivalence | No permitted authoritative fixture/provenance in workspace | Not claimed |
| Multiplayer/network | Intentionally out of scope | Not implemented |

## Exit decision

Phase 1 executable prototype gates pass through `npm test`. The ruleset remains explicitly draft where provenance is absent. The Rust spike is contract-ready but not build-verified until a Rust toolchain is available. No restricted game API, modified proprietary client, or multiplayer implementation is included.