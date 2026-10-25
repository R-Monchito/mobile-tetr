# Phase 1 Status

## Implemented

- Deterministic engine snapshot with serializable randomizer state.
- Replay document with format/ruleset/engine versions, command stream, JSON round-trip and checksum.
- Separate configurable scoring policy with combo, B2B, perfect-clear and drop components.
- Review document with SRS/T-spin/scoring fixtures and acceptance criteria.

## Verified by available evidence

- Hermes previously reported `tsc --noEmit` and `tsx engine.test.ts` passing before the latest replay/randomizer hardening.
- Replay and scoring tests are present and deterministic by construction.
- No network, authentication, Ribbon, restricted endpoint, proprietary client code or asset is used.

## Not yet verified

- Re-run the full TypeScript compiler and all tests after the latest edits; local `tsc` and `tsx` executables are unavailable.
- SRS tables need executable boundary fixtures.
- Lock delay is not yet modeled as accumulated logical time.
- T-spin metadata/classification is not yet integrated into EngineSnapshot/events.
- Scoring policy is separate but not yet wired into `applyCommand`.
- RNG algorithm remains a draft and must not be claimed equivalent to tetr.io without permitted evidence.

## Blockers

- Main-game API and live protocol remain out of scope without bot-account authorization and legal approval.
- Any rule marked unverified must remain configurable and labeled as draft/observed/inferred.

## Latest additions

- `tspin.ts` provides an isolated, policy-driven geometric classifier.
- `tspin.test.ts` verifies last-action gating, three-corner detection, and mini/full policy selection.
- This classifier is intentionally not wired into scoring until EngineSnapshot carries last-action and kick metadata.


## Latest integration

- EngineSnapshot now carries `lastAction`, optional rotation transition and `kickIndex`.
- Movement/drop/hold clear rotation metadata; successful rotation records transition and kick index.
- T-spin classifier can now consume engine action metadata, but scoring integration and lock-time classification remain pending.


## Verification update (2026-10-24)

Node v26.7.0 with `--experimental-strip-types` runs all current local suites successfully:

- `engine.test.ts`: engine invariants: ok
- `replay.test.ts`: replay invariants: ok
- `scoring.test.ts`: scoring invariants: ok
- `tspin.test.ts`: t-spin invariants: ok

The runner required explicit `.ts` import extensions because the workspace has no local `tsc`/ `tsx` binaries.


## Lock-delay integration scaffold

- Added `lock-delay.ts` with logical-time accumulation, grounded reset behavior, reset cap and terminal lock state.
- Added `lock-delay.test.ts`; 1000 ms and 10x100 ms produce equivalent results.
- Full local suite now passes: lock-delay, engine, replay, scoring and T-spin invariants.
- The controller is not yet wired into `engine.applyCommand`; wiring remains the next integration step.


## Lock delay wired

- `applyCommand({type:"tick"})` now advances logical lock delay using grounded state.
- Lock occurs at the configured delay threshold; hard drop remains immediate.
- Added a grounded-piece threshold test to `engine.test.ts`.
- Full suite remains green under Node `--experimental-strip-types`.


## Scoring metadata

- EngineSnapshot now carries `combo`, `backToBack` and `rulesVersion` initialized from `guideline-draft-v1`.
- Scoring calculation is still isolated in `scoring.ts`; lock events have not yet been switched to `scoreLock`.
- All local suites pass after the metadata change.


## Fixtures

Added work/fixtures/README.md as the provenance and schema catalog for offline golden fixtures. Executable fixture coverage remains in engine/replay/scoring/T-spin/lock-delay tests.


## Reproducible test command

Added package.json with no external dependencies. `npm test` now runs all five local suites under Node 26 native TypeScript stripping; latest run passed engine, replay, scoring, T-spin and lock-delay invariants.


The npm test gate now includes engine-scoring.test.ts; latest run passed all six suites.


## Scoring lock integration

Engine lock paths now calculate line/drop score through scoreLock via scoreAfterLock. Combo/back-to-back state propagation is still pending because the current spawn snapshot construction only replaces score; no T-spin kind is inferred yet. npm test remains green.


## Scoring propagation

Lock paths now pass a scored EngineSnapshot into spawnNext, so score, combo and backToBack state propagate through hard drop and timed lock. T-spin classification is still not selected; locks currently use line-based kind only. npm test passes all six suites after propagation.


## T-spin scoring integration

scoreAfterLock now classifies T-spin from the pre-lock snapshot using active T piece and lastAction, then maps full/mini plus line count to scoring categories. All six suites pass. The mini orientation policy remains explicitly draft/configurable.


## Fixture validation

Added fixtures.test.ts and two JSON fixtures. npm test now validates fixture metadata/provenance alongside engine, replay, scoring, T-spin and lock-delay suites; all seven suites pass.


Added replay-seed-sequence-001.json with seed, command stream, provenance and deterministic/checksum expectations. Final npm test gate: all seven suites passed.


## Soft-drop scoring

EngineSnapshot now tracks softDropCells, resets the counter after spawn, and scoreLock receives soft-drop distance so soft and hard drop points are counted once. The engine-scoring adapter test covers 3 soft-drop cells plus 5 hard-drop cells. npm test passes all seven suites.


## SRS fixture manifest

Added srs-transition-matrix-001.json covering JLSTZ/I eight-transition sets and O cycle. The fixture catalog validates five kick candidates and atomic rejection metadata; status remains unverified until executable board-level cases are added.


## Executable SRS matrix

Added kickCandidates() as a pure engine query and srs-matrix.test.ts. The gate now verifies all 8 JLSTZ transitions, all 8 I transitions and the 4 O cycle transitions; board-obstacle boundary fixtures remain pending.


## SRS boundary selection

Added srs.ts and srs-boundary.test.ts. The first-free, third-free and all-blocked rejection cases are executable; full board-obstacle collision fixtures remain pending.



## Latest autonomous pass

- Added collision-predicate SRS kick selection and boundary coverage; all prototype suites pass.
- Added the native ABI contract, UDL mapping, and a read-only structural validator for the TypeScript-to-Rust boundary.
- Corrected the command shape so `tick(deltaMs)` retains its payload and expanded the snapshot/event/error contract.
- Rust/UniFFI compilation remains unverified because `cargo`, `rustc`, and `uniffi-bindgen` are unavailable in the environment.
- Added enchmark.ts and 
pm run benchmark:engine; 6000 command frames measured 0.00205 ms/frame on this host (target 60fps gate passed). This is a host throughput signal, not a low-end mobile guarantee.

- Added phase2-mobile-ui-contract.md defining the offline UI/engine boundary, touch mapping, frame budget, persistence and verification gates.
