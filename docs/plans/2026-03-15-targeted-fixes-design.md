# Design: Targeted Fixes (Option A)

**Date:** 2026-03-15 **Status:** Approved

## Overview

Three focused improvements to the `@echecs/uci` library targeting API ergonomics
and internal type safety. No breaking changes. No new runtime dependencies.

---

## Fix 1: `position` setter — error propagation

**File:** `src/index.ts`

### Problem

The `position` setter calls `ready().then(() => execute(...))` with no
`.catch()`. If `ready()` or `execute()` rejects (e.g. the engine process has
exited), the error is silently swallowed.

### Solution

Attach a `.catch()` to route errors to the `error` event, consistent with all
other error-handling paths in `index.ts`.

```ts
set position(input: string) {
  this.#position = input;
  this.#moves = [];
  this.ready()
    .then(() => this.execute(`position ${input}`))
    .catch((error: unknown) => {
      void this.#emitter.emit(
        'error',
        error instanceof Error ? error : new Error(String(error)),
      );
    });
}
```

### Constraints

- Non-breaking: setter signature is unchanged.
- Errors surface on the `error` event, consistent with existing patterns.

### Tests

Add a unit test in `src/__tests__/index.spec.ts` asserting that assigning
`engine.position` when the engine process has already exited emits an `error`
event.

---

## Fix 2: `debug()` — documentation and tests

**Files:** `src/index.ts`, `src/__tests__/index.spec.ts`, `README.md`

### Problem

`debug(on: boolean): Promise<void>` is implemented but absent from the README
and has no test coverage.

### Solution

**Tests:** Add two unit tests to `src/__tests__/index.spec.ts` following the
existing `execute` spy pattern:

- `debug(true)` calls `execute('debug on')`
- `debug(false)` calls `execute('debug off')`

**Documentation:** Add a `debug()` entry to the README under the "Stopping and
resetting" section:

```ts
await engine.debug(true); // sends "debug on"
await engine.debug(false); // sends "debug off"
```

### Constraints

- No behaviour changes.
- No source code changes to `index.ts`.

---

## Fix 3: `ingest()` — typed dispatcher

**Files:** `src/parser/index.ts`, `src/index.ts`

### Problem

`ingest()` uses an unsafe `any` cast to call parser functions by key, requiring
an `eslint-disable` comment:

```ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any, import-x/namespace
const payload = (parser[command] as (v: string) => any)(value);
```

### Solution

Define a typed record in `src/parser/index.ts` that explicitly maps each key to
its typed parser function. Export this record alongside existing named exports.

```ts
// src/parser/index.ts
export const parsers = {
  bestmove,
  copyprotection,
  id,
  info,
  option,
  // ...
} satisfies Record<string, (value: string) => unknown>;
```

In `src/index.ts`, replace the namespace import with the named `parsers` record.
TypeScript can then narrow the return type per key, removing the `any` cast and
the eslint suppression comment.

### Constraints

- No behaviour changes.
- The existing named re-exports from `src/parser/index.ts` remain unchanged.
- The eslint-disable comment is removed (not suppressed with a different rule).

---

## Summary

| Fix                                 | Files changed                                 | Breaking? |
| ----------------------------------- | --------------------------------------------- | --------- |
| `position` setter error propagation | `src/index.ts`, `src/__tests__/index.spec.ts` | No        |
| `debug()` docs + tests              | `README.md`, `src/__tests__/index.spec.ts`    | No        |
| `ingest()` typed dispatcher         | `src/parser/index.ts`, `src/index.ts`         | No        |
