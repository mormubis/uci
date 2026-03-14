# Bug Fixes Design

**Date:** 2026-03-14

## Overview

Four correctness bugs identified in `@echecs/uci` v1.0.0. All fixes are
self-contained with no API additions except `[Symbol.dispose]()`.

---

## Bug 1 — `stop()` sends `quit` instead of `stop`

**File:** `src/index.ts`

`stop()` currently sends `quit`, which terminates the engine process. This
conflicts with `move()`, which internally sends `stop` and then continues using
the engine. `stop()` should be the counterpart to `start()`: halt the current
search, keep the engine alive.

**Fix:**

- `stop()`: change `execute('quit')` to `execute('stop')`.
- Add `[Symbol.dispose]()`: sends `quit` then calls `this.process.kill()`. This
  is the correct way to terminate the engine, symmetric with the constructor
  starting it. Works with the TC39 Explicit Resource Management `using` keyword
  (Node.js >= 18.20 / 20.4).

No changes needed to `Process` — it already exposes `kill()`.

---

## Bug 2 — `combo` `var` parsing produces a string instead of an array

**Files:** `src/parser/extract.ts`, `src/types.ts`

The `extract` utility accumulates all token values for a given key into a single
space-joined string. For `combo` options, `var` appears multiple times (once per
variant), so `extract` produces `"Solid Normal Risky"` instead of
`["Solid", "Normal", "Risky"]`. `Options.define` then passes this string to
`z.enum`, which expects an array — a runtime failure.

**Fix:**

- Extend `extract` to detect repeated keys: the first occurrence produces a
  `string`, subsequent occurrences convert the value to `string[]` and append.
  Return type becomes `Partial<Record<K | 'default', string | string[]>>`.
- Update `Combo` in `src/types.ts`: `var: string[]` is already correct — no
  change needed there.
- Call sites for single-occurrence keys (`id`, `bestmove`, `info`) are
  unaffected.

---

## Bug 3 — `lowerbound`/`upperbound` flags parsed as named fields

**File:** `src/parser/info.ts`

`lowerbound` and `upperbound` are standalone flags in the UCI `score` token
sequence (e.g. `score cp 50 upperbound`). The current implementation lists them
as `extract` keys, which treats them as named fields that accumulate subsequent
tokens as values. This is order-dependent and semantically wrong.

**Fix:**

- Remove `lowerbound` and `upperbound` from the `extractor` field list.
- In `parseScore`, scan the raw token sequence of the `score` field value for
  the strings `"lowerbound"` and `"upperbound"` as flags.
- Simplify the `parseScore` signature: remove the `lowerbound` and `upperbound`
  parameters; the function receives only the raw `score` string.

---

## Bug 4 — `position` setter silently drops write errors

**File:** `src/index.ts`

The `position` setter calls `this.execute(...)` via `.then()` with no
`.catch()`, silently swallowing any write failures.

**Fix:**

Add
`.catch((error: unknown) => { void this.emit('error', error instanceof Error ? error : new Error(String(error))) })`
— identical to the error-handling pattern already used in `execute()`.

---

## Testing

Each fix should have corresponding test coverage:

- **Bug 1:** test that `stop()` does not terminate the process (engine can still
  receive commands after `stop()`); test that `[Symbol.dispose]()` terminates
  the process.
- **Bug 2:** add a parser test asserting
  `option('name Style type combo default Normal var Solid var Normal var Risky').var`
  equals `['Solid', 'Normal', 'Risky']` (array, not string).
- **Bug 3:** add parser tests for `score cp 50 upperbound` and
  `score cp -30 lowerbound` — these already exist and pass, but the fix should
  ensure order independence. Add a test for `score upperbound cp 50` if the spec
  permits it.
- **Bug 4:** unit test that an error emitted from a failed `position` write
  surfaces on the `error` event.
