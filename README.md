# TETRIO Mobile Port — Local Engine Prototype

## Scope

This workspace contains the offline-first TypeScript prototype for the local game engine. It does not implement Ribbon, authentication, multiplayer, Quick Play automation, Tetra League automation, or any restricted API access.

## Run verification

Requires Node 26 or newer. Run:

```text
npm test
```

The gate executes engine, replay, scoring, engine-scoring, fixture-catalog, T-spin, and lock-delay suites.

## Current modules

- engine.ts — board, pieces, movement, rotation, hold, drops, lock and deterministic randomizer state.
- replay.ts — versioned replay serialization and snapshot checksum.
- scoring.ts — configurable draft scoring profile.
- tspin.ts — policy-driven geometric T-spin classifier.
- lock-delay.ts — logical-time lock delay controller.
- rules-review.md — SRS, T-spin, scoring and fixture requirements.
- fixtures/ — provenance-aware JSON fixture catalog.

## Known limitations

- The randomizer is a deterministic draft and is not evidence of tetr.io equivalence.
- SRS tables and T-spin mini/full policy need more executable boundary fixtures.
- Lock delay is wired to tick, but gravity/level curves and reset semantics need fuller ruleset integration.
- Online features are intentionally out of scope until legal/ToS approval and an authorized bot account exist.
- No proprietary client code, modified tetrio.js, credentials, tokens, branding or assets are included.
