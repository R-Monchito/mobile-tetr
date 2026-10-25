# TETRIO Mobile Port — Descomposición multi-agent v2

> Descomposición operativa de TETRIO_MOBILE_PORT_PLAN.md, lista para integrarse en Obsidian.
>
> Alcance: objetivos, entregables, contratos, restricciones, dependencias, aceptación y verificación. No implementa código ni usa APIs restringidas.

## Reglas globales

- Cada WP es una unidad asignable a un agente; no se amplía el alcance sin decisión registrada.
- Clasificar evidencia como documentada, observada, inferida o desconocida.
- No usar tetr.io/api/ sin bot account autorizada, caso documentado, límites de tasa y revisión legal.
- No automatizar Singleplayer, Quick Play, Tetra League, matchmaking, anti-cheat evasion ni acciones que den ventaja no autorizada.
- No distribuir tetrio.js modificado, código decompilado, símbolos, assets propietarios, branding, credenciales o tokens.
- El motor local no depende de red, UI, autenticación ni telemetría. Las verificaciones son offline o mediante mocks salvo autorización separada.

## Contratos transversales

| ID | Productor | Consumidores | Contenido mínimo |
|---|---|---|---|
| C0-SOURCE | P0.1-P0.2 | Todos | Fuente, versión, permiso, confianza y preguntas abiertas |
| C0-LEGAL | P0.5 | P3.*, P4.* | Scope aprobado, exclusiones, cuenta, datos y decisión |
| C0-RULES | P0.3 | P1.*, P2.*, P4.2 | Board, piezas, RNG, timing, scoring, modos y versión |
| C0-RIBBON | P0.4 | P3.2-P3.4 | Frames, schemas, lifecycle, errores, límites y compatibilidad |
| C0-FIXTURES | P0.6 | P1.*, P2.1, P3.2 | Inputs, seed, estados, eventos, checksum y provenance |
| C1-ENGINE | P1.1 | P1.2-P1.6, P2.* | Comandos, snapshots, eventos, errores e invariantes |
| C1-REPLAY | P1.4 | P1.6, P2.1, P4.2 | Ruleset, engine version, seed/state, inputs, checksums |
| C2-CORE | P2.1 | P2.2-P2.4, P3.2 | FFI, tipos, capabilities, errores y threading |
| C3-NET | P3.2 | P3.3-P3.4 | Transporte, sesión, timeouts, límites, redaction y kill switch |
| C4-RELEASE | P4.3 | Todos | Assets, privacidad, ToS, stores, soporte y rollback |

Dependencias: P0.1 → P0.2 → P0.3/P0.4/P0.6 → Phase 1 → Phase 2 → Phase 4. P0.5 habilita Phase 3. Si P0.5 está pendiente, el producto es offline-only.

# Phase 0 — Reconnaissance

**Objetivo:** producir evidencia reproducible y especificaciones versionadas sin modificar ni redistribuir software propietario.

## WP-P0.1 — Fuentes y provenance

- **Objetivo:** catalogar tetrio-bot-docs, Triangle.js/@haelp/teto y artefactos locales permitidos.
- **Entregables:** source-catalog.md; commits/versiones; licencias; fechas; documentos relevantes; ledger de assets; material excluido.
- **Interfaces/contratos:** produce C0-SOURCE para todos los paquetes.
- **Restricciones:** solo lectura; no modificar repositorios; no publicar tetrio.js; licencia incierta = no utilizable.
- **Dependencias:** ninguna.
- **Criterios de aceptación:** cada fuente tiene permiso, versión, fecha y uso permitido; huecos registrados.
- **Verificación:** revisión independiente, hashes/commits reproducibles y secret scan.

## WP-P0.2 — Evidencia y preguntas abiertas

- **Objetivo:** separar hechos, observaciones, inferencias y unknowns.
- **Entregables:** evidence-matrix.md; open-questions.md; nivel de confianza; owner y criterio de cierre por pregunta.
- **Interfaces/contratos:** consume C0-SOURCE y lo mantiene como base de trazabilidad.

- **Restricciones:** no presentar inferencias como compatibilidad; no usar tráfico de terceros ni ingeniería invasiva.
- **Dependencias:** P0.1.
- **Criterios de aceptación:** cada requisito del plan enlaza a evidencia o queda como pendiente explícito.
- **Verificación:** auditoría independiente requisito → evidencia → tarea.

## WP-P0.3 — Reglas del engine, RNG y modos

- **Objetivo:** especificar board, piezas, spawn, gravedad, lock delay, DAS/ARR, SRS, kicks, 180°, T-spins, scoring y 40 Lines/Blitz/Zen/Zenith.
- **Entregables:** rules-spec.md; tablas de piezas/kicks; state machine; randomizer/seed state; tabla confirmado/pendiente.
- **Interfaces/contratos:** consume C0-SOURCE; produce C0-RULES y requisitos de fixtures.
- **Restricciones:** clean-room; no copiar código propietario; no extrapolar versiones; modo no confirmado fuera del MVP.
- **Dependencias:** P0.1, P0.2.
- **Criterios de aceptación:** toda regla tiene fuente, versión, confianza y casos límite.
- **Verificación:** revisión contra documentación permitida/Triangle.js y chequeo de transiciones.

## WP-P0.4 — Ribbon y ciclo de sala

- **Objetivo:** mapear MessagePack/WebSocket, framing, dirección, correlación, errores, heartbeats, versiones, salas y reconexión.
- **Entregables:** ribbon-spec.md; state diagrams; schemas tipados; límites; unknown-field policy.
- **Interfaces/contratos:** consume C0-SOURCE; produce C0-RIBBON para Phase 3.
- **Restricciones:** documentación y fixtures permitidos; no fuzzing contra producción; protocolo no implica permiso de uso.
- **Dependencias:** P0.1, P0.2.
- **Criterios de aceptación:** cada packet type define dirección, schema, versión, errores y compatibilidad.
- **Verificación:** parser/schema review y simulación local de cada transición.

## WP-P0.5 — Gate legal, ToS y alcance online

- **Objetivo:** decidir qué investigación, pruebas y features online están permitidas.
- **Entregables:** legal-gate.md; matriz permitido/no permitido/requiere autorización; bot-account requirements; secrets/logging/rate-limit/retention policy.
- **Interfaces/contratos:** consume C0-SOURCE; produce C0-LEGAL y bloquea online si falta aprobación.
- **Restricciones:** no autorizar por inferencia; ausencia de aprobación = offline-only.
- **Dependencias:** P0.1, P0.2.
- **Criterios de aceptación:** trata main API, Quick Play, Tetra League automation, bots, anti-cheat, branding y datos.
- **Verificación:** revisión humana responsable y prueba de gates en backlog/release checklist.

## WP-P0.6 — Fixtures dorados

- **Objetivo:** crear vectores deterministas de board, RNG, rotación, lock, clear, T-spin, scoring, modos y protocolo.
- **Entregables:** fixtures/README.md; inputs; estado inicial/final; seed; eventos; checksum; provenance.
- **Interfaces/contratos:** consume C0-RULES/C0-RIBBON; produce C0-FIXTURES.
- **Restricciones:** sin dumps, tokens, PII ni tráfico restringido; cada fixture debe tener permiso documentado.
- **Dependencias:** P0.2, P0.3 y P0.4 para Ribbon.
- **Criterios de aceptación:** casos normales, bordes, errores e inputs inválidos reproducibles.
- **Verificación:** validador independiente detecta no determinismo o provenance faltante.

# Phase 1 — Local Engine Prototype

**Objetivo:** definir un motor TypeScript puro, determinista, replayable y sin red/UI.

## WP-P1.1 — API, board y lifecycle de pieza


- **Objetivo:** fijar comandos, snapshots, eventos, errores, colisiones, spawn, clears, garbage, top-out, queue, hold, gravity, drops, lock delay y DAS/ARR.
- **Entregables:** engine-contract.md; board-behavior.md; piece-lifecycle.md; state machines; invariantes.
- **Interfaces/contratos:** consume C0-RULES/C0-FIXTURES; produce C1-ENGINE para P1.2-P1.6 y C2-CORE.
- **Restricciones:** sin red, reloj de pared, UI o mutación observable; garbage explícito; ticks lógicos; no automatización.
- **Dependencias:** P0.3, P0.6.
- **Criterios de aceptación:** mismo stream produce mismo estado; estado imposible falla sin corromper board.
- **Verificación:** edge cases, property-test plan y comparación con fixtures.

## WP-P1.2 — RNG, SRS, T-spin, scoring y modos

- **Objetivo:** aislar randomizer/seed, rotaciones/kicks, T-spin, combo/B2B, timers, level curves, estadísticas y win/lose.
- **Entregables:** randomizer-contract.md; rotation-contract.md; scoring-policy.md; mode-policy.md; golden vectors.
- **Interfaces/contratos:** consume C0-RULES y C1-ENGINE; entrega políticas a replay, core y offline.
- **Restricciones:** algoritmo incierto = capability pendiente; no afirmar equivalencia por parecido; modos inciertos experimentales.
- **Dependencias:** P1.1, P0.3, P0.6.
- **Criterios de aceptación:** seeds capturables; kicks deterministas; scoring separado del board/render.
- **Verificación:** vectors, esquinas/paredes, 180° autorizado, falsos positivos y ejemplos manuales.

## WP-P1.3 — Replay, QA, fuzzing y benchmark

- **Objetivo:** crear replay portable y medir el motor antes de portarlo.
- **Entregables:** replay-format.md; checksum/migration policy; test-plan.md; unit/property/fuzz matrix; benchmark-plan.md.
- **Interfaces/contratos:** consume C1-ENGINE/C0-FIXTURES; produce C1-REPLAY y gate para P2.1.
- **Restricciones:** sin credenciales/PII; timestamp no afecta resultado; no usar main API como oracle; fuzzing local/mock.
- **Dependencias:** P1.1, P1.2.
- **Criterios de aceptación:** import/export conserva estado y checksum; cubre malformed/impossible inputs y update/replay/serialization.
- **Verificación:** round-trip, corrupción, truncation, migración, CI limpia, seeds reproducibles y cold/warm benchmark.

# Phase 2 — Native Mobile Core

**Objetivo:** exponer el mismo motor a iOS/Android mediante un core estable y UI nativa.

## WP-P2.1 — Selección de core, ABI y portabilidad

- **Objetivo:** decidir Rust + UniFFI, Kotlin Multiplatform u otra opción y portar sin duplicar reglas.
- **Entregables:** core-decision.md; matriz FFI/CI/debug/performance; core-abi.md; bindings; golden runner.
- **Interfaces/contratos:** consume C1-ENGINE/C1-REPLAY; produce C2-CORE.
- **Restricciones:** preservar determinismo; spike sin red/secretos/UI; UI no muta reglas; plan de reversión.
- **Dependencias:** P1.3.
- **Criterios de aceptación:** inputs idénticos producen snapshots/events/checksums idénticos en targets.
- **Verificación:** build multi-plataforma y golden suite completa.

## WP-P2.2 — UI, touch y accesibilidad

- **Objetivo:** especificar SwiftUI/Compose, lifecycle, game surface y controles de baja latencia.
- **Entregables:** ios-ui-contract.md; android-ui-contract.md; touch-control-spec.md; layouts; DAS/ARR; accessibility checklist.

- **Interfaces/contratos:** consume C2-CORE; entrega comandos y renderiza snapshots/events; no define scoring/RNG/collision.
- **Restricciones:** no bloquear UI thread; offline sin login; safe areas; 180° solo si C0-RULES lo soporta.
- **Dependencias:** P2.1.
- **Criterios de aceptación:** pause/resume/background, hold/rotate/drop/preview, layouts diestro/zurdo/una mano, reduced motion y color-safe.
- **Verificación:** simulador/dispositivo, hitbox, usability/accessibility, interrupciones e input-to-render.

## WP-P2.3 — Persistencia, efectos y gate nativo

- **Objetivo:** cerrar settings, records, replays, audio, haptics, rendimiento y equivalencia offline.
- **Entregables:** persistence-contract.md; migraciones; secure-storage policy; effects profiles; phase-2-exit-report.md; device/OS matrix.
- **Interfaces/contratos:** consume C1-REPLAY/C2-CORE; produce requisitos de C4-RELEASE y sirve a Phase 4.
- **Restricciones:** UserDefaults/DataStore/MMKV solo para datos apropiados; secretos en secure storage; no bloqueos; no cerrar con divergencias.
- **Dependencias:** P2.1, P2.2.
- **Criterios de aceptación:** 60 fps en Snapdragon 778G/A14-equivalente; replays/settings sobreviven migración; offline sin login.
- **Verificación:** migration, crash-safe, thermal/battery, frame pacing y sign-off QA/arquitectura.

# Phase 3 — Multiplayer (Bot Account Required)

**Objetivo:** habilitar solo el scope aprobado, con bot account autorizada, rate limits, seguridad y kill switch.

## WP-P3.1 — Scope online y transporte Ribbon

- **Objetivo:** convertir C0-LEGAL/C0-RIBBON en una interfaz NetworkTransport testeable.
- **Entregables:** online-scope.md; feature matrix; network-transport.md; codec policy; mock server; limits de tamaño/timeout/backpressure.
- **Interfaces/contratos:** consume C0-LEGAL/C0-RIBBON/C2-CORE; produce C3-NET.
- **Restricciones:** Quick Play/Tetra automation/bots singleplayer/matchmaking abuse/anti-cheat fuera; tests offline/mock; no payloads sensibles en logs.
- **Dependencias:** P0.4, P0.5, P2.1.
- **Criterios de aceptación:** cada acción tiene permiso, rate limit, datos y rollback; codec round-trip; unknown fields preservados.
- **Verificación:** legal review, contract tests, decoder fuzz local y memory-limit review.

## WP-P3.2 — Auth, rooms, sync y resume

- **Objetivo:** definir sesión de bot account, secure storage, create/join/ready/countdown/events/leave y reconexión sin duplicados.
- **Entregables:** auth-session.md; threat model; room-state-machine.md; resume-policy.md; retry/backoff/idempotency.
- **Interfaces/contratos:** consume C0-LEGAL/C0-RIBBON/C3-NET/C2-CORE; nunca entrega secretos al engine offline.
- **Restricciones:** no credenciales hard-coded; no cuentas personales; retries acotados; no acciones restringidas.
- **Dependencias:** P3.1.
- **Criterios de aceptación:** sign-out/revoke claro; eventos duplicate/out-of-order/late no corrompen; transient/terminal distinguibles.
- **Verificación:** secret scan, secure-storage tests, state-machine mocks y pérdida/timeout/reconnect tests.

## WP-P3.3 — Chat, privacy, kill switch y gate

- **Objetivo:** definir chat safety, observabilidad mínima, feature flag, kill switch y criterio de release.
- **Entregables:** chat-safety.md; redaction policy; online-operations.md; incident runbook; phase-3-exit-report.md.

- **Interfaces/contratos:** consume P3.1-P3.2; actualiza C4-RELEASE.
- **Restricciones:** sin logging oculto; no board/input data por defecto; online no es requisito offline; fallo legal/security bloquea solo online.
- **Dependencias:** P3.1, P3.2.
- **Criterios de aceptación:** online se apaga sin reinstalar; mock suite aprobada; cero secretos en build/logs.
- **Verificación:** privacy/redaction/malformed-text, kill-switch chaos, fallback offline y sign-off legal/safety/security/QA.

# Phase 4 — Polish & Distribution

**Objetivo:** producto offline-first, distintivo, accesible, estable y distribuible; online se revisa aparte.

## WP-P4.1 — Identidad, assets y polish

- **Objetivo:** crear piezas, board, UI, fonts, audio, particles, haptics, reduced-motion y battery saver originales.
- **Entregables:** asset-provenance.md; assets; brand guide; polish-spec.md; naming/store-copy proposal.
- **Interfaces/contratos:** consume C0-LEGAL/C2-CORE; produce assets para UI y C4-RELEASE.
- **Restricciones:** sin branding/logos/assets propietarios, nombres confundibles ni tetrio.js modificado; efectos no alteran timing.
- **Dependencias:** P0.5, P2.2, P2.3.
- **Criterios de aceptación:** cada asset tiene autor/licencia; no implica afiliación oficial; feedback reducible.
- **Verificación:** asset audit, trademark review, build scan, frame pacing, thermal/battery y accessibility.

## WP-P4.2 — Offline completeness y QA de compatibilidad

- **Objetivo:** completar records, 40 Lines/Blitz/Zen-style practice aprobado, training drills, replays y seed sharing local; certificar devices/OS.
- **Entregables:** offline-mode-spec.md; release-test-matrix.md; reports de low-memory, interruptions, localization, network loss y accessibility.
- **Interfaces/contratos:** consume C0-RULES/C1-REPLAY/C2-CORE; no consume C3-NET; produce blockers para C4-RELEASE.
- **Restricciones:** no modo incierto presentado como oficial; no auth gate; privacy/legal defect = blocker.
- **Dependencias:** P2.3, P4.1; P3.3 si online entra al build.
- **Criterios de aceptación:** iniciar/jugar/guardar en modo avión; no calls ocultas; criterios del plan con evidencia.
- **Verificación:** airplane-mode, network-deny, replay, migration, device y build-candidate tests.

## WP-P4.3 — Stores, privacidad y operación post-release

- **Objetivo:** preparar TestFlight/Play internal testing, soporte, monitoreo y rollback.
- **Entregables:** distribution-checklist.md; privacy policy; support contact; age/content/data-safety forms; release notes; post-release-runbook.md; retention/deletion/rollback plan.
- **Interfaces/contratos:** consume C0-LEGAL, P3.3 si aplica, P4.1, P4.2; produce C4-RELEASE.
- **Restricciones:** no afiliación oficial; no online sin aprobación; no secretos; datos mínimos y consentidos.
- **Dependencias:** P4.1, P4.2.
- **Criterios de aceptación:** builds instalables; disclosures coinciden con conducta; rollback/kill switch ensayados; cada alerta tiene owner y severidad.
- **Verificación:** store preflight, install/update/uninstall, signed-artifact review y tabletop incident exercise.

# Asignación sugerida

| Rol | Paquetes | Paralelizable con | Bloqueado por |
|---|---|---|---|
| Research/provenance | P0.1-P0.2 | Legal preliminar | Ninguno |
| Rules/mechanics | P0.3, P1.2 | Protocol analyst | C0-SOURCE |
| Protocol analyst | P0.4, P3.1 | Rules/mechanics | C0-SOURCE y legal |

| Legal/safety | P0.5, P3.3 | Phase 0 | Evidencia/jurisdicción |
| Engine/QA | P1.*, P2.3, P4.2 | Core/UI | C0-RULES/fixtures |
| Core/platform | P2.1 | iOS/Android después de ABI | Phase 1 |
| iOS/Android | P2.2 | Entre sí | C2-CORE |
| Network/security | P3.1-P3.3 | Offline Phase 4 | C0-LEGAL/C0-RIBBON |
| Art/UX | P2.2, P4.1 | Core/QA | Provenance/legal |
| Release/operations | P4.2-P4.3 | QA final | Gates previos |

# Definition of Ready / Done

## Ready

- WP-ID, responsable, objetivo, dependencias y contratos definidos.
- Scope legal/ToS claro; si no, estado Blocked.
- Entregables, aceptación y verificación escritos.
- No requiere modificar ni redistribuir código propietario.

## Done

- Entregables versionados y enlazados a evidencia.
- Consumidores pueden usar el contrato sin adivinanzas.
- Aceptación comprobada por verificador independiente.
- Sin secretos, PII innecesaria, endpoints restringidos o assets sin provenance.
- Unknowns restantes tienen owner, impacto y siguiente acción.

# Gates de fase

| Gate | Requisito |
|---|---|
| G0 | C0-SOURCE, C0-RULES, C0-FIXTURES, C0-LEGAL y C0-RIBBON si aplica |
| G1 | C1-ENGINE, C1-REPLAY, tests y benchmark; motor sin red/UI |
| G2 | C2-CORE, replay cross-platform, iOS/Android, persistencia y 60 fps |
| G3 | C3-NET, bot account autorizada, contract/security/privacy tests, rate limits y kill switch |
| G4 | Identidad original, offline completo, QA, privacidad/ToS/store review y rollback |

# Riesgos y controles

| Riesgo | Control |
|---|---|
| Cambios Ribbon | C0-RIBBON versionado, mocks, fixtures y kill switch |
| Main API accidental | Deny-by-default, bot review, rate limits y secret scan |
| Scope de tetrio.js excedido | Detener tarea; clean-room; no publicar artefactos |
| Divergencia cross-platform | Core autoritativo y replay golden vectors |
| Touch lento | Medir en dispositivo; tunear DAS/ARR; layouts configurables |
| Online bloquea offline | Feature flag, módulos separados y airplane tests |
| IP por assets/naming | Provenance ledger, identidad original y legal gate |

# Criterios de éxito

- [ ] 1.000+ seeds/vectores aprobados reproducen las reglas soportadas.
- [ ] Engine pasa unit, property, fuzz, serialización y replay cross-platform tests.
- [ ] 60 fps sostenido en Snapdragon 778G/A14-equivalente bajo efectos normales.
- [ ] Input → render cumple el objetivo documentado, idealmente <16 ms donde el stack lo permita.
- [ ] Offline funciona sin login, red ni APIs restringidas.
- [ ] Settings, récords y replays sobreviven reinicios y migraciones.
- [ ] Multiplayer, si se persigue, queda limitado al scope aprobado y bot account autorizada.
- [ ] Ningún build contiene tetrio.js modificado, assets propietarios, credenciales o automatización restringida.
- [ ] TestFlight/Play internal testing supera gates de privacidad, accesibilidad, crash, thermal, ToS y legal.

# Registro de decisiones

| Fecha | Decisión | Impacto |
|---|---|---|
| 2026-10-23 | Descomponer en work packages, sin implementación automática | Handoffs verificables para multi-agent v2 |
| 2026-10-23 | Offline-first independiente de multiplayer | Phase 4 puede avanzar aunque Phase 3 esté bloqueada |
