# Local Engine Contract

Initial implementation slice for WP-P1.1. The engine is deterministic, offline-only, and independent of UI, network, authentication, and wall-clock time.

## Commands

- `moveLeft`, `moveRight`, `softDrop`, `hardDrop`
- `rotateCW`, `rotateCCW`, `rotate180`
- `hold`
- `tick(deltaMs)`

## Invariants

- Board dimensions and cell values are validated at construction.
- A locked piece is never mutated after placement.
- Every command produces a deterministic snapshot and ordered events.
- Invalid or impossible commands return a typed error and do not partially mutate state.
- Randomizer state is injectable and serializable.

## Explicit non-goals

- No network or Ribbon protocol.
- No account, matchmaking, Quick Play, Tetra League, or bot automation.
- No proprietary client code, symbols, assets, or branding.
