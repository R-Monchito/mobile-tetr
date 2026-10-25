# Rules Review — SRS, T-Spins, Scoring y Fixtures

Documento accionable para `C1-ENGINE` y `C1-REPLAY`. Offline-only; no usa red, cuentas, `tetrio.js`, código propietario ni assets.

## Estado observado

`work/engine.ts` ya expone piezas `I/J/L/O/S/T/Z`, rotación `CW/CCW/180`, kicks, drops, hold, eventos y snapshots serializables. C1 aún necesita validar SRS, modelar lock delay, clasificar T-spin, parametrizar scoring y conservar metadatos de lock. La continuidad del randomizer debe verificarse en cada spawn/lock.

`C1-ENGINE` consume estas reglas y devuelve snapshot/eventos. `C1-REPLAY` registra `seed + snapshot inicial + comandos + resultado esperado`, sin reloj ni UI.

## 1. Casos oficiales de SRS / wall-kick

### 1.1 Contrato de prueba

Cada caso debe construir un tablero 10x40, colocar una pieza en `(x,y,fromRotation)`, aplicar obstáculos y rotar. Verificar aceptación/rechazo, rotación final, desplazamiento exacto del primer kick libre, celdas finales y atomicidad del rechazo. Un rechazo no puede cambiar posición, rotación, score, lock counter ni randomizer.

La API usa `y` creciente hacia abajo. Si la tabla normativa usa Y creciente hacia arriba, convertir el signo una sola vez en el adaptador y probar esa conversión.

### 1.2 Tablas de kicks

Para `J/L/S/T/Z`, las cinco pruebas, en orden, son:

| Transición | Kicks `(dx,dy)` SRS |
|---|---|
| `0->R` | `(0,0),(-1,0),(-1,+1),(0,-2),(-1,-2)` |
| `R->0` | `(0,0),(+1,0),(+1,-1),(0,+2),(+1,+2)` |
| `R->2` | `(0,0),(+1,0),(+1,-1),(0,+2),(+1,+2)` |
| `2->R` | `(0,0),(-1,0),(-1,+1),(0,-2),(-1,-2)` |
| `2->L` | `(0,0),(+1,0),(+1,+1),(0,-2),(+1,-2)` |
| `L->2` | `(0,0),(-1,0),(-1,-1),(0,+2),(-1,+2)` |
| `L->0` | `(0,0),(-1,0),(-1,+1),(0,-2),(-1,-2)` |
| `0->L` | `(0,0),(+1,0),(+1,+1),(0,+2),(+1,+2)` |

Para `I` usar una tabla independiente:

| Transición | Kicks `(dx,dy)` SRS |
|---|---|
| `0->R` | `(0,0),(-2,0),(+1,0),(-2,-1),(+1,+2)` |
| `R->0` | `(0,0),(+2,0),(-1,0),(+2,+1),(-1,-2)` |
| `R->2` | `(0,0),(-1,0),(+2,0),(-1,+2),(+2,-1)` |
| `2->R` | `(0,0),(+1,0),(-2,0),(+1,-2),(-2,+1)` |
| `2->L` | `(0,0),(+2,0),(-1,0),(+2,+1),(-1,-2)` |
| `L->2` | `(0,0),(-2,0),(+1,0),(-2,-1),(+1,+2)` |
| `L->0` | `(0,0),(+1,0),(-2,0),(+1,-2),(-2,+1)` |
| `0->L` | `(0,0),(-1,0),(+2,0),(-1,+2),(+2,-1)` |

`O` usa `(0,0)` en las cuatro transiciones y conserva ocupación/posición lógica. La suite debe cubrir 8x5 casos para cada familia (`JLSTZ` e `I`), las cuatro rotaciones de `O`, rechazos y bordes.

### 1.3 Fixtures mínimos

Usar `boardRows` de abajo hacia arriba (`#` ocupado, `.` vacío), pieza, posición inicial, comando y resultado:

| ID | Setup y esperado |
|---|---|
| `SRS-J-0R-open` | `J@0`, tablero vacío; `CW` acepta `(0,0)`. |
| `SRS-T-0R-kick-1` | Bloquear solo el candidato 0; termina en el primer kick lateral libre. |
| `SRS-T-0R-kick-3` | Bloquear candidatos 0-2; termina en el tercer candidato libre. |
| `SRS-T-0R-reject` | Bloquear cinco candidatos; snapshot y eventos no cambian. |
| `SRS-I-0R-wall` | `I` junto a pared; posición exacta del primer kick libre. |
| `SRS-I-2L-floor` | `I 2->L` junto al suelo; valida signo Y. |
| `SRS-O-cycle` | Cuatro `CW`; geometría equivalente al inicio. |
| `SRS-180-explicit` | Fijar si 180 es dos 90 o tabla propia; no inferirlo. |

## 2. Criterios geométricos de T-spin mini/full

### 2.1 Metadatos requeridos

Al bloquear, `C1-ENGINE` debe conservar en snapshot o evento normalizado: `pieceType`, rotación, posición final, `lastAction`, `lastRotationTransition`, `kickIndex`, `linesCleared` y `lockWasForced`. El tablero posterior no basta para detectar T-spin.

`lastAction` debe marcarse como no-rotación después de movimiento horizontal, soft drop continuo o spawn, según una política elegida y serializable. Un kick final debe conservar su índice.

### 2.2 Detección geométrica

Para un `T` bloqueado, usar el pivote SRS en la rotación final y contar las cuatro celdas diagonales del cuadrado 3x3. Fuera del tablero cuenta como ocupado; una celda ocupada por el tablero cuenta como ocupada.

- **Candidato:** la última acción válida fue una rotación y al menos 3 de 4 esquinas están ocupadas.
- **Full:** candidato con clasificación de mini no aplicable.
- **Mini:** candidato cuya orientación/ocupación corresponde a una entrada lateral de mini según una tabla explícita por rotación; el perfil debe definir cómo un kick finisher cambia la clasificación.

No codificar “mini = cualquier 3 esquinas” ni decidir solo por líneas. Probar las orientaciones `0/R/2/L` y hacer la variante configurable.

### 2.3 Casos obligatorios

| ID | Resultado |
|---|---|
| `TSPIN-none-3corners-no-rotation` | 3 esquinas pero último input no es rotación: no T-spin. |
| `TSPIN-mini-0/R/2/L` | Una fixture mini por orientación. |
| `TSPIN-full-0/R/2/L` | Una fixture full por orientación. |
| `TSPIN-kick-finisher` | Solo entra con kick final; verifica `kickIndex` y perfil. |
| `TSPIN-0/1/2-line` | Mini/full con 0, 1 y 2 líneas; la geometría no cambia. |
| `TSPIN-fourth-corner-boundary` | Esquina fuera del tablero cuenta como ocupada. |

## 3. Scoring Guideline configurable

### 3.1 Perfil de reglas

No fijar valores dentro de `applyCommand`. `C1-ENGINE` debe recibir un `ScoringProfile` inmutable y versionado, por ejemplo `guideline-v1`, con:

```text
single, double, triple, tetris
tSpinZero, tSpinMiniZero, tSpinMiniSingle
tSpinSingle, tSpinDouble, tSpinTriple
backToBackMultiplier
comboBase, comboStep
softDropPerCell, hardDropPerCell
perfectClearByLines
```

El perfil declara si T-spin zero y mini single cuentan para B2B, y si el combo inicia en `0` o `-1`. Guardar `rulesVersion` en cada replay.

### 3.2 Orden de cálculo

En cada lock: (1) determinar `clearKind` por líneas + T-spin; (2) calcular base; (3) aplicar B2B; (4) aplicar combo si hubo líneas; (5) aplicar perfect clear; (6) sumar soft/hard drop; (7) actualizar `combo`, `backToBack`, `lines` y `score` atómicamente.

Un lock sin líneas rompe combo. La política de B2B debe venir del perfil, no del texto de eventos. Registrar las celdas realmente recorridas para no contar dos veces un drop.

### 3.3 Fixtures de scoring

| ID | Inputs | Estado esperado |
|---|---|---|
| `SCORE-single` | Lock de 1 línea sin B2B | Base y contadores según perfil. |
| `SCORE-tetris-b2b` | Dos tetris consecutivos | Segundo aplica multiplicador B2B. |
| `SCORE-b2b-break` | Tetris seguido de single | Single rompe B2B si el perfil lo exige. |
| `SCORE-combo-3` | Tres locks consecutivos con líneas | Bonos de combo deterministas. |
| `SCORE-no-line-breaks-combo` | Clear, lock sin líneas, clear | Segundo clear no hereda combo. |
| `SCORE-tspin-mini/full` | Misma geometría, clasificación distinta | Usa entradas distintas del perfil. |
| `SCORE-soft-hard-drop` | Soft N + hard M | `N*softDropPerCell + M*hardDropPerCell`, sin doble conteo. |
| `SCORE-perfect-clear` | Lock deja board vacío | Bonificación según líneas y perfil. |

## 4. Fixtures deterministas para C1-REPLAY

### 4.1 Formato común

```json
{
  "id": "SRS-T-0R-kick-1",
  "rulesVersion": "guideline-v1",
  "seed": 424242,
  "initialBoardRows": [".........."],
  "initialSnapshotOverrides": {"piece": "T", "rotation": 0, "x": 3, "y": 20},
  "commands": ["rotateCW", "hardDrop"],
  "expected": {
    "events": [],
    "boardRows": [],
    "score": 0,
    "lines": 0,
    "piece": null,
    "randomizerDigest": "..."
  }
}
```

El formato real puede ser TypeScript, pero debe conservar estos campos. `initialSnapshotOverrides` debe pasar por un constructor que valide dimensiones y colisiones. Comparar eventos ordenados y snapshot completo: randomizer, combo/B2B, lock state y metadatos de última acción incluidos.

### 4.2 Lote inicial

- `REPLAY-seed-sequence-001`: 100 hard drops desde seed fija; comparar pieza, cola y digest del randomizer por lock.
- `REPLAY-command-mix-001`: movimientos, CW/CCW/180, soft drop, hold y hard drop; repetir y exigir snapshots equivalentes.
- `REPLAY-srs-boundaries-001`: fixtures de pared, suelo y rechazo.
- `REPLAY-tspin-classification-001`: mini/full/none en las cuatro orientaciones.
- `REPLAY-scoring-chain-001`: single -> tetris -> tetris -> no-line -> clear, verificando score por componentes.
- `REPLAY-invalid-atomic-001`: comandos inválidos, rotaciones rechazadas y game over sin mutación.

`C1-REPLAY` debe operar sin reloj, UI, red o estado global y reportar el primer índice divergente con diff de snapshot.

## 5. Riesgos de divergencia

| Riesgo | Señal | Mitigación |
|---|---|---|
| Signo Y invertido | Kick sube/baja incorrectamente | Conversión única y fixtures por transición. |
| Pivot/offset incorrecto | O/T giran alrededor de otra celda | Golden cells y cuatro ciclos. |
| Tabla I mezclada | Fallos solo con I | Suites separadas, cobertura 8x5 por familia. |
| 180 ambiguo | Replays divergen | Contrato explícito y fixture dedicado. |
| Lock delay depende de FPS | Cambia al partir `tick` | Tiempo acumulado en snapshot; particiones equivalentes. |
| T-spin post hoc | Falsos positivos tras mover | `lastAction`, transición y `kickIndex`. |
| Mini/full inconsistente | Mismo tablero, clase distinta | Perfil versionado y golden fixtures. |
| Combo/B2B fuera de orden | Cadenas dan score incorrecto | Score por componentes y cadenas de 3+ locks. |
| Drop doble | Hard suma soft otra vez | Distancia por comando y reset al lock. |
| Randomizer reiniciado | Secuencia cambia en ciertos locks | Un único `RandomizerState` y digest por lock. |
| Hold consume semilla incorrectamente | Cola cambia tras hold | Fixtures de primer hold, hold bloqueado y swap. |
| Fixture imposible | Test pasa por estado inválido | Constructor valida board, pieza y colisión. |
| Confundir estándar con tetr.io | Equivalencia sin evidencia | Etiquetar `standard`, `observed` o `unverified`; sin APIs restringidas. |

## Criterio de aceptación para C1

`C1-ENGINE` está listo cuando expone perfil versionado, lock metadata, T-spin classification, combo/B2B y resultados atómicos; pasa las fixtures SRS/scoring; y conserva randomizer en snapshot.

`C1-REPLAY` está listo cuando reproduce el lote con la misma semilla/comandos, detecta la primera divergencia, incluye `rulesVersion` y pasa particiones equivalentes de `tick`.
