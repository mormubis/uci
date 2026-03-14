# Testing Design — `@echecs/uci`

**Date:** 2026-03-12 **Status:** Approved

---

## Goal

Add meaningful test coverage to the UCI library at two layers:

1. **Parser unit tests** — verify each parser function produces output compliant
   with the UCI protocol spec (`uci.md`).
2. **Integration tests** — verify the full `UCI` class works end-to-end against
   a real chess engine binary.

---

## File layout

```
src/__tests__/
  index.spec.ts          # existing — UCI class error path (keep as-is)
  parser.spec.ts         # NEW: unit tests for all parser functions
  integration.spec.ts    # NEW: real-engine tests, skipped without UCI_ENGINE_PATH
```

---

## Section 1 — Parser unit tests (`parser.spec.ts`)

All tests are **synchronous**. No process spawning, no async. Each parser
function gets its own `describe` block. Inputs are the exact raw strings a UCI
engine sends; outputs are the typed objects the library emits.

### `bestmove`

Spec: `bestmove <move1> [ ponder <move2> ]`

| Input                | Expected output                    |
| -------------------- | ---------------------------------- |
| `"e2e4"`             | `{ move: 'e2e4' }`                 |
| `"g1f3 ponder d8f6"` | `{ move: 'g1f3', ponder: 'd8f6' }` |
| `"0000"`             | `{ move: '0000' }` (null move)     |

### `id`

Spec: `id name <x>` / `id author <x>` — name and author can contain spaces. The
`id` command line arrives without the leading `id` token (already stripped by
`ingest`), so the parser receives e.g. `"name Shredder X.Y"`.

| Input                 | Expected output            |
| --------------------- | -------------------------- |
| `"name Shredder X.Y"` | `{ name: 'Shredder X.Y' }` |
| `"author Stefan MK"`  | `{ author: 'Stefan MK' }`  |

### `option`

Spec: token order is `name … type … default … min … max … var …`. Option names
can contain spaces. `var` can appear multiple times (combo type).

| Input                                                                   | Expected output                                                           |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `"name Nullmove type check default true"`                               | `{ name: 'Nullmove', type: 'check', default: 'true' }`                    |
| `"name Selectivity type spin default 2 min 0 max 4"`                    | `{ name: 'Selectivity', type: 'spin', default: '2', min: '0', max: '4' }` |
| `"name Style type combo default Normal var Solid var Normal var Risky"` | `{ name: 'Style', type: 'combo', default: 'Normal', var: '...' }`         |
| `"name NalimovPath type string default c:\\"`                           | `{ name: 'NalimovPath', type: 'string', default: 'c:\\' }`                |
| `"name Clear Hash type button"`                                         | `{ name: 'Clear Hash', type: 'button' }`                                  |

> **Note:** multi-word option names (e.g. `Clear Hash`) and repeated `var`
> tokens are mandated by the spec. If the current `extract`-based parser does
> not handle them, the failing tests document the gap and the parser must be
> fixed as part of implementation.

### `info`

Spec: multiple space-separated tokens in a single string; order is not
guaranteed. Numeric fields (`depth`, `nps`, `currmovenumber`, `multipv`,
`tbhits`) must be returned as `number`, not `string`.

| Input                                                                     | Expected output (partial)                                    |
| ------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `"depth 12 nodes 123456 nps 100000"`                                      | `{ depth: 12 }`                                              |
| `"depth 2 score cp 214 time 1242 nodes 2124 nps 34928 pv e2e4 e7e5 g1f3"` | `{ depth: 2, score: 2.14, moves: ['e2e4', 'e7e5', 'g1f3'] }` |
| `"currmove e2e4 currmovenumber 1"`                                        | `{ current: { move: 'e2e4', number: 1 } }`                   |
| `"multipv 2"`                                                             | `{ line: 2 }`                                                |
| `"nps 34928"`                                                             | `{ stats: { nps: '34928' } }`                                |

### `identity`

Used for `copyprotection`, `registration`, and `error`. Returns the input string
unchanged.

| Input        | Expected output |
| ------------ | --------------- |
| `"checking"` | `"checking"`    |
| `"ok"`       | `"ok"`          |
| `"error"`    | `"error"`       |

### `noop`

Used for `readyok` and `uciok`. Always returns `undefined`.

| Input        | Expected output |
| ------------ | --------------- |
| `""`         | `undefined`     |
| `"anything"` | `undefined`     |

---

## Section 2 — Integration tests (`integration.spec.ts`)

Integration tests require a real UCI-compliant engine binary. The path is
supplied via the `UCI_ENGINE_PATH` environment variable. If the variable is not
set, the entire suite is **skipped** (not failed) using `describe.skipIf(...)`.

### Setup / teardown

- `beforeEach`: create a fresh `UCI` instance pointing at `UCI_ENGINE_PATH`.
- `afterEach`: call `stop()` to terminate the engine process cleanly.

### Test cases

| Test                          | What it asserts                                          |
| ----------------------------- | -------------------------------------------------------- |
| Engine initialises            | `uciok` event fires within the default timeout           |
| Engine identifies itself      | `id` event carries non-empty `name` and `author` strings |
| Engine exposes options        | at least one `option` event fires during init            |
| `start()` triggers a search   | at least one `info` event is received                    |
| `move()` produces a best move | `bestmove` event fires with a non-empty `move` string    |
| `stop()` shuts down cleanly   | no `error` event fires after `stop()`                    |
| Invalid path emits error      | `error` event fires when the binary path does not exist  |

### CI guidance

Set `UCI_ENGINE_PATH` in the CI environment to enable the integration suite.
Example with Stockfish on Ubuntu:

```yaml
- run: apt-get install -y stockfish
- run: UCI_ENGINE_PATH=$(which stockfish) pnpm test
```

---

## Out of scope

- Mock-engine tests (middle layer between parser and real engine) — YAGNI.
- Pondering, time controls, `ucinewgame` — separate features, separate designs.
