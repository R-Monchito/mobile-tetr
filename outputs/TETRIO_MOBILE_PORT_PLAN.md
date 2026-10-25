# TETRIO Mobile Port — Action Plan

## Scope and guardrails

This project targets a native, mobile-first falling-block game with locally implemented game logic. It is not a webview wrapper and does not redistribute `tetrio.js`, modified tetr.io assets, or tetr.io branding.

- Treat `tetrio-bot-docs` and `@haelp/teto` / Triangle.js as reference material and compatibility aids.
- Keep reconnaissance read-only. Do not probe or call `tetr.io/api/` without an explicitly authorized bot account and a documented, permitted use case.
- Use the public Tetra Channel API at `ch.tetr.io/api/` only where its terms permit it; isolate that integration from the local engine.
- Do not implement singleplayer bots, Quick Play automation, Tetra League automation, matchmaking abuse, or anti-cheat evasion.
- Obtain current permission and ToS/legal review before shipping any online compatibility feature. If permission is uncertain, ship offline-only functionality.

## Phase 0: Reconnaissance

**Exit condition:** a versioned protocol/engine specification exists, all observations are reproducible, and no restricted endpoint or client modification was used.

- Task 0.1: Clone and catalog `lemoncove/tetrio-bot-docs` and the Triangle.js / `@haelp/teto` source. Record commit hashes, licenses, relevant documents, and known version dates.
- Task 0.2: Build a source-of-truth matrix separating documented behavior, observed behavior, inferred behavior, and unknowns. Do not present inferences as protocol facts.
- Task 0.3: Map Ribbon packet types, direction, framing, MessagePack encoding, request/response correlation, error handling, heartbeats, and version negotiation from permitted documentation and fixtures.
- Task 0.4: Document message schemas with typed fields, optionality, enum values, limits, and forward/backward compatibility rules. Preserve unknown fields when decoding.
- Task 0.5: Map room lifecycle: connection, authentication, room creation/join, ready state, countdown, gameplay events, pause/resume, leave, disconnect, reconnect, and teardown.
- Task 0.6: Document Piece RNG: algorithm, bag/state representation, seed source, shuffle behavior, previews, garbage/randomizer interactions, and whether results are deterministic across versions. Mark unresolved items explicitly.
- Task 0.7: Inspect local, legally obtained client artifacts for source maps or symbol information only. Keep extraction/deobfuscation outputs private, read-only, access-controlled, and excluded from releases. Stop if an action would modify or redistribute proprietary code.
- Task 0.8: Identify engine concepts and compatibility questions: board representation, spawn positions, gravity, lock delay, soft/hard drop, DAS/ARR, SRS kicks, 180-degree rotation, line clears, garbage, T-spin detection, combo/B2B, scoring, and replay state.
- Task 0.9: Inventory documented or publicly described singleplayer rules for 40 Lines, Blitz, Zen, Zenith, and any other target modes. Capture timers, win conditions, scoring, level curves, garbage, and mode-specific restrictions.
- Task 0.10: Create golden fixtures: input stream, initial state/seed, expected state after each frame or action, events, score, and final board. Label fixtures by provenance and permission.
- Task 0.11: Obtain legal review of naming, compatibility claims, account flows, and online use before beginning multiplayer implementation.

## Phase 1: Local Engine Prototype

**Exit condition:** a pure TypeScript engine runs without network or UI dependencies, is replayable, and passes deterministic fixture tests.

- Task 1.1: Define an engine API around immutable or snapshot-friendly state: board, active piece, hold, queue, timers, score, statistics, mode rules, and event stream.
- Task 1.2: Reimplement board operations: collision, placement, line clear, garbage insertion, spawn validation, top-out, and serialization.
- Task 1.3: Implement piece lifecycle: spawn, movement, gravity, soft drop, hard drop, locking, lock delay resets, hold, preview queue, and input repeat policy.
- Task 1.4: Implement the documented RNG behind a replaceable `Randomizer` interface. Add seed injection and state capture so every run can be replayed exactly.
- Task 1.5: Implement SRS rotation and wall-kick tables, including direction transitions and 180-degree behavior if supported by the target rules.
- Task 1.6: Implement T-spin classification from the documented geometry and action history, including mini/full distinctions where applicable.
- Task 1.7: Implement scoring and mode rules as data-driven policies rather than hard-coded UI logic. Keep score calculations separate from board mutation.
- Task 1.8: Add a deterministic replay format containing engine version, ruleset version, seed/randomizer state, timestamp-independent input events, and checksums.
- Task 1.9: Write unit and property tests for collision, rotations, kicks, line clears, lock timing, hold, garbage, RNG sequences, T-spins, top-out, and replay determinism.
- Task 1.10: Compare known permitted fixtures against documented or locally observed outputs. Do not use an unauthorized main-game API as an oracle.
- Task 1.11: Add fuzz tests for malformed inputs, impossible states, repeated actions, and replay truncation. The engine must fail safely without corrupting state.
- Task 1.12: Benchmark update, simulation, serialization, and replay verification on a low-end mobile CPU target. Establish a frame budget before porting.

## Phase 2: Native Mobile Core

**Exit condition:** the same engine behavior is available from iOS and Android UI layers with deterministic tests running on both platforms.

- Task 2.1: Choose the core language after a spike. Prefer Rust with UniFFI when deterministic cross-platform behavior, one engine implementation, and replay tooling outweigh FFI complexity; consider Kotlin Multiplatform or shared Swift/Kotlin only if team expertise and platform integration justify it.
- Task 2.2: Freeze a versioned core interface before porting. Expose commands, snapshots, events, errors, rulesets, replay import/export, and capability flags; avoid exposing internal mutable board structures.
- Task 2.3: Port the engine and golden tests to the selected core. Run identical replay vectors in CI on Windows/macOS/Linux, iOS, and Android where available.
- Task 2.4: iOS UI: SwiftUI shell with a latency-sensitive game surface, input coalescing, haptics, audio scheduling, lifecycle pause/resume, and UserDefaults-backed settings.
- Task 2.5: Android UI: Jetpack Compose shell with a latency-sensitive game surface, lifecycle handling, haptics, audio scheduling, and DataStore-backed settings. Use JNI only at the stable core boundary if Rust is selected.
- Task 2.6: Design touch controls for thumb reach: configurable virtual DAS/ARR, left/right zones, soft/hard drop, hold, rotate buttons, 180-degree rotate, preview visibility, and one-handed layouts.
- Task 2.7: Add calibration and accessibility options: input repeat tuning, button size/opacity, color-blind-safe palettes, reduced effects, vibration/audio toggles, and safe-area handling.
- Task 2.8: Keep rendering and simulation separate. Target a stable 60fps with bounded allocations, predictable frame pacing, and no blocking work on the UI thread.
- Task 2.9: Add crash-safe persistence for settings, local records, replay files, and migration versions. Never store secrets in ordinary settings storage.
- Task 2.10: Profile input-to-render latency, frame pacing, memory, battery, thermal behavior, and resume behavior on a Snapdragon 778G-class Android device and an A14-class iPhone.

## Phase 3: Multiplayer (Bot Account Required)

This phase is optional and should be disabled by default until ToS, account, and service-compatibility review is complete. It must not add automation for restricted gameplay modes.

**Exit condition:** permitted multiplayer features work with a dedicated bot account, are rate-limited, observable, revocable, and isolated from offline gameplay.

- Task 3.1: Define the supported online scope in writing: e.g. private rooms, spectating, chat, and replay retrieval only where permitted. Exclude Quick Play and Tetra League automation.
- Task 3.2: Implement MessagePack and WebSocket transport behind a core `NetworkTransport` interface. Add size limits, schema versioning, timeouts, backpressure, and structured diagnostics.
- Task 3.3: Implement Ribbon authentication/session handling only through an authorized bot account and permitted flow. Never embed credentials, tokens, or user secrets in logs or builds.
- Task 3.4: Implement room create/join, ready/countdown, gameplay event synchronization, spectating, and replay download according to documented schemas. Preserve unknown fields for forward compatibility.
- Task 3.5: Implement reconnect and resume using the documented `Resuming_a_connection.md` behavior. Bound retries, distinguish transient from terminal failures, and prevent duplicate commands after reconnect.
- Task 3.6: Add account/session controls: explicit sign-in/out, token revocation, device-local secure storage, privacy copy, data deletion, and a visible offline-only mode.
- Task 3.7: Add protocol contract tests against recorded permitted fixtures and a mock server. Avoid live-service tests except during controlled, rate-limited validation windows.
- Task 3.8: Add moderation and safety controls for chat: report/mute/block behavior where supported, message size limits, redaction in diagnostics, and no hidden collection.
- Task 3.9: Gate online code behind a feature flag and remote kill switch that can disable it without affecting offline play if the service changes or permission is withdrawn.

## Phase 4: Polish & Distribution

**Exit condition:** an offline-first build is stable, legally distinct, accessible, and ready for controlled distribution; online features are separately reviewed.

- Task 4.1: Build a distinct visual identity: original pieces, board, UI, icons, fonts, sounds, particles, animations, and store artwork. Do not use tetr.io branding, logos, proprietary assets, or modified client files.
- Task 4.2: Add themes, haptics, sound mixing, particles, hit feedback, pause/resume transitions, reduced-motion mode, and battery-conscious effect quality settings.
- Task 4.3: Complete offline mode: local records, 40 Lines-style practice, Blitz-style practice, Zen-style sandbox, configurable training drills, replay save/load, and deterministic seed sharing without network dependency.
- Task 4.4: Add analytics only with consent and data minimization. Prefer local diagnostics; never collect board/input data unless clearly necessary, disclosed, and permitted.
- Task 4.5: Run compatibility, accessibility, localization, battery, thermal, interruption, background/foreground, low-memory, and network-loss test matrices.
- Task 4.6: Create TestFlight and Google Play internal-testing tracks with privacy policy, support contact, age/content declarations, data-safety forms, and release notes that avoid implying official tetr.io affiliation.
- Task 4.7: Complete trademark, copyright, ToS, platform-policy, privacy, and account-security review. Use a product name and store copy describing it as a distinct “Tetris®-style game” only where legally appropriate.
- Task 4.8: Establish post-release monitoring for crashes, frame pacing, protocol compatibility, account failures, and user reports. Keep an emergency path to disable online features.

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Protocol changes break Ribbon client | High | High | Abstract transport and schemas behind interfaces; retain fixtures; monitor permitted documentation; ship an online kill switch. |
| ToS enforcement on unofficial client | Medium | Critical | Obtain legal review; use only an authorized bot account; avoid restricted automation; keep offline mode complete; use distinct branding and assets. |
| Obfuscation prevents engine extraction | Medium | High | Treat extraction as optional; use Triangle.js and published specifications; implement a clean-room engine from behavior and tests; do not redistribute proprietary code. |
| Piece RNG or timing differs by version | Medium | High | Version rulesets/randomizers; capture seeds and state; maintain golden vectors; fail compatibility checks loudly. |
| Main API is accessed without authorization | Low | Critical | Block `tetr.io/api/` in development by default; require explicit environment configuration, bot credentials, rate limits, and review before any permitted use. |
| Native FFI introduces platform divergence | Medium | High | One authoritative core; cross-platform golden replay suite; stable ABI; avoid UI-owned game rules. |
| Touch controls feel inaccurate | High | High | Prototype early; tune DAS/ARR; measure input-to-render latency; support multiple layouts and calibration. |
| Performance or thermals fail on low-end devices | Medium | High | Profile before port completion; bound allocations; cap effects; use fixed-step simulation and device-tiered rendering. |
| Third-party assets or names create IP exposure | Medium | Critical | Commission/create original assets; maintain an asset provenance ledger; legal review before release. |
| Service outage or account revocation affects users | Medium | Medium | Offline-first architecture; clear online status; graceful degradation; no dependency on live service for core play. |

## Success Criteria

- [ ] Deterministic replay matches all approved reference behavior for 1,000+ seeds and documented rulesets.
- [ ] The engine passes unit, property, fuzz, serialization, and cross-platform replay tests.
- [ ] 60fps is sustained on Snapdragon 778G / A14-equivalent hardware under normal effects.
- [ ] Touch controls maintain a measured input-to-render path below 16ms on target devices where the display/input stack permits it.
- [ ] Offline modes are fully playable without login or network access.
- [ ] Settings, records, and replays survive app restarts and schema migrations.
- [ ] Multiplayer works only within the approved scope and with an authorized bot account, if pursued.
- [ ] No released build contains modified `tetrio.js`, proprietary tetr.io assets, credentials, or restricted automation.
- [ ] TestFlight and Play Console internal-testing builds pass privacy, accessibility, crash, thermal, and legal release gates.
