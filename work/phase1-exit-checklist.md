# Phase 1 Exit Checklist

- [x] Deterministic engine/replay tests run through npm test.
- [x] Lock delay uses logical time and has partition-equivalence coverage.
- [x] Scoring profile covers line clears, combo/B2B, drops and T-spin categories.
- [x] Soft-drop cells are tracked and scored once.
- [x] Fixture catalog and JSON metadata validator exist.
- [x] T-spin action gating and policy-based geometry are tested.
- [x] Complete executable SRS boundary matrix for JLSTZ, I and O, including collision-based first-free selection.
- [ ] Validate mini/full T-spin orientation tables against permitted evidence.
- [ ] Replace draft RNG with a ruleset-backed algorithm only when provenance is available.
- [ ] Add native Rust toolchain verification and cross-language golden replay runner.

## Gate decision

Phase 1 prototype is functionally advanced but not fully closed. Phase 2 may begin as an ABI spike only; production porting waits for the unchecked ruleset and cross-language fixtures.
