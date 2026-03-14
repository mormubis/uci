# `ready()` Timeout + Process Exit Design

**Date:** 2026-03-14

## Problem

The private `ready()` method sends `isready` and waits for `readyok`. If the
engine crashes or freezes after the initial UCI handshake, `ready()` hangs
indefinitely — it has no timeout and no awareness of process exit. Any call to
`move()`, `go()`, or the `position` setter will silently stall.

The constructor's `timeout` only covers the initial `uci` handshake (`#ready`);
it does not protect subsequent `ready()` calls.

---

## Solution

`ready()` races three promises:

1. `this.once('readyok')` — engine responds normally
2. `this.process.once('exit')` — engine process exits (crash or clean exit)
3. A `setTimeout` for `this.#timeout` ms — engine is alive but frozen

Whichever fires first wins. On success (path 1), `ready()` resolves normally. On
failure (paths 2 or 3), `ready()` sets `#errored`, emits the error, and returns
without rejecting — consistent with the fire-and-emit error model used
throughout the class.

Any exit code is treated as a failure. A clean exit while mid-operation means
the engine is gone regardless.

---

## New State

### `#errored: Error | undefined`

Starts `undefined`. Set once on the first `ready()` failure, never changed
after. Holds the `Error` object so subsequent calls can re-emit the same error.

### `#timeout: number`

Stores `timeout ?? TIMEOUT` from the constructor. Replaces the inline expression
in `#ready`; now also used by `ready()`.

---

## `ready()` — Updated Logic

```
if #errored is set:
  emit('error', #errored)
  return

send 'isready'

winner = await Promise.race([
  this.once('readyok'),
  this.process.once('exit').then(() => { throw new Error('Engine process exited') }),
  new Promise((_, ko) => setTimeout(() => ko(new Error('Engine ready timeout')), this.#timeout)),
])

if winner threw:
  this.#errored = error
  void this.emit('error', this.#errored)
```

The race is wrapped in try/catch. On success, the timeout and exit listeners are
cleaned up (cancel the timeout, remove the exit listener) to avoid leaks.

---

## Changes Required

| File           | Change                                                           |
| -------------- | ---------------------------------------------------------------- |
| `src/index.ts` | Add `#errored: Error \| undefined` and `#timeout: number` fields |
| `src/index.ts` | Store `timeout ?? TIMEOUT` into `#timeout` in constructor        |
| `src/index.ts` | Rewrite private `ready()` with three-way race                    |

No changes to `Process`, public API, or error model.

---

## Testing

- `ready()` emits `'error'` after timeout when engine never sends `readyok`
- `ready()` emits `'error'` immediately when the process exits while waiting
- A second call to `ready()` after failure emits the same error immediately
  (does not start a new race)
- Normal operation (engine responds with `readyok`) is unaffected
