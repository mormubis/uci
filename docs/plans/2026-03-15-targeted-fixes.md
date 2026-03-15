# Targeted Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to
> implement this plan task-by-task.

**Goal:** Fix three ergonomic/type-safety issues: `position` setter swallows
errors silently, `debug()` is undocumented, and `ingest()` uses an unsafe `any`
cast.

**Architecture:** All changes are non-breaking. Fix 1 adds a `.catch()` to the
existing fire-and-forget chain. Fix 2 adds README documentation only (tests
already exist). Fix 3 introduces a typed `parsers` record in
`src/parser/index.ts` and updates the namespace import in `src/index.ts`.

**Tech Stack:** TypeScript (strict), Vitest, ESLint (unicorn + typescript-eslint
recommended), Prettier, pnpm.

---

## Fix 1: `position` setter — propagate errors to `error` event

### Task 1: Write a failing test

**File:** `src/__tests__/index.spec.ts`

Add the following test inside the existing `describe('UCI', ...)` block. A good
place is after the existing `reset()` test (around line 175). The test assigns
`engine.position` after the engine process has already exited (invalid path
means it exits immediately) and asserts an `error` event is emitted.

```ts
it('position setter emits an error when execute fails', async () => {
  const uci = new UCI('/invalid/path');
  const errors: Error[] = [];
  uci.on('error', (error) => {
    errors.push(error);
  });

  // Wait for initial process error to settle
  await new Promise<void>((resolve) => setTimeout(resolve, 50));

  const before = errors.length;

  // Assigning position triggers ready() then execute() — both will fail
  uci.position = 'startpos';

  await new Promise<void>((resolve) => setTimeout(resolve, 100));

  expect(errors.length).toBeGreaterThan(before);
});
```

**Step 1: Run the test to verify it fails**

```bash
pnpm test -- --reporter=verbose -t "position setter emits"
```

Expected: FAIL — the test will time out waiting for an error that never arrives
because the current setter swallows the rejection.

---

### Task 2: Fix the `position` setter

**File:** `src/index.ts`, lines 165–169

Replace:

```ts
set position(input: string) {
  this.#position = input;
  this.#moves = [];

  this.ready().then(() => this.execute(`position ${input}`));
}
```

With:

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

**Step 2: Run the test to verify it passes**

```bash
pnpm test -- --reporter=verbose -t "position setter emits"
```

Expected: PASS.

**Step 3: Run the full test suite**

```bash
pnpm test
```

Expected: all previously passing tests still pass (79 passed, 6 skipped).

**Step 4: Lint**

```bash
pnpm lint
```

Expected: no errors, no warnings.

**Step 5: Commit**

```bash
git add src/index.ts src/__tests__/index.spec.ts
git commit -m "fix: emit error from position setter on failure"
```

---

## Fix 2: `debug()` — README documentation

Note: unit tests for `debug()` already exist at
`src/__tests__/index.spec.ts:103–125`. This task adds only documentation.

### Task 3: Add `debug()` to the README

**File:** `README.md`

In the "Stopping and resetting" section (around line 212), find this block:

````markdown
```typescript
await engine.stop(): Promise<void>   // halts the current search (engine stays alive)
await engine.reset(): Promise<void>  // sends ucinewgame + resets to startpos
await engine[Symbol.dispose](): Promise<void> // sends quit + kills the process
```
````

````

Add `debug()` to the same code block:

```markdown
```typescript
await engine.stop(): Promise<void>   // halts the current search (engine stays alive)
await engine.reset(): Promise<void>  // sends ucinewgame + resets to startpos
await engine[Symbol.dispose](): Promise<void> // sends quit + kills the process
await engine.debug(true): Promise<void>   // sends "debug on"
await engine.debug(false): Promise<void>  // sends "debug off"
````

````

**Step 1: Verify tests still pass**

```bash
pnpm test -- --reporter=verbose -t "debug"
````

Expected: 2 tests pass (`debug(true)` and `debug(false)`).

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: document debug() method in README"
```

---

## Fix 3: `ingest()` — typed dispatcher

### Task 4: Export a typed `parsers` record from `src/parser/index.ts`

**File:** `src/parser/index.ts`

Current content:

```ts
import extract from './extract.js';
import identity from './identity.js';
import noop from './noop.js';

const copyprotection = identity;
const error = identity;
const id = extract(['author', 'name']);
const option = extract(['default', 'max', 'min', 'name', 'type', 'var']);
const readyok = noop;
const registration = identity;
const uciok = noop;

export { default as bestmove } from './bestmove.js';
export { default as info } from './info.js';
export { copyprotection, error, id, option, readyok, registration, uciok };
```

Add a named `parsers` export after the existing exports. Import `bestmove` and
`info` locally so they can be included in the record. The record uses
`satisfies` to preserve individual return types while enforcing the shape:

```ts
import bestmove from './bestmove.js';
import extract from './extract.js';
import identity from './identity.js';
import info from './info.js';
import noop from './noop.js';

import type { Events } from '../types.js';

const copyprotection = identity;
const error = identity;
const id = extract(['author', 'name']);
const option = extract(['default', 'max', 'min', 'name', 'type', 'var']);
const readyok = noop;
const registration = identity;
const uciok = noop;

export type Parsers = {
  [K in keyof Events]: (value: string) => Events[K];
};

export const parsers = {
  bestmove,
  copyprotection,
  error,
  id,
  info,
  option,
  readyok,
  registration,
  uciok,
} satisfies Parsers;

export {
  bestmove,
  info,
  copyprotection,
  error,
  id,
  option,
  readyok,
  registration,
  uciok,
};
```

> **Note on `satisfies`:** `Parsers` maps each key to
> `(value: string) => Events[K]`. Some of the mapped types
> (`readyok: undefined`, `uciok: undefined`) mean the noop parser return type
> must be compatible. Check the noop implementation — if `noop` returns
> `undefined`, this will work. If TypeScript complains, scope `Parsers` only to
> the keys that have parsers (omit `error` since it is not in the engine
> output).
>
> **Alternative if `satisfies` is too strict:** Use
> `Record<string, (value: string) => unknown>` as the satisfies target. This is
> less precise but removes the `any` cast equally well.

**Step 1: Run lint and types**

```bash
pnpm lint:types
```

Expected: no errors. Resolve any type errors before proceeding.

---

### Task 5: Update `ingest()` to use the typed `parsers` record

**File:** `src/index.ts`

**Step 1: Update the import**

Replace:

```ts
import * as parser from './parser/index.js';
```

With:

```ts
import { parsers } from './parser/index.js';
```

**Step 2: Update `ingest()`**

Find the `ingest` method (around line 393). Replace:

```ts
private async ingest(input: string): Promise<void> {
  const [key, ...argv] = input.split(' ');
  const value = argv.join(' ');

  if (key === undefined) {
    return;
  }

  if (!(key in parser)) {
    // If the command is not in the parser, emit it as output
    await this.#emitter.emit('output', input);
    return;
  }

  const command = key as keyof typeof parser;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, import-x/namespace
  const payload = (parser[command] as (v: string) => any)(value);

  await this.#emitter.emit(command as keyof Events, payload);
}
```

With:

```ts
private async ingest(input: string): Promise<void> {
  const [key, ...argv] = input.split(' ');
  const value = argv.join(' ');

  if (key === undefined) {
    return;
  }

  if (!(key in parsers)) {
    await this.#emitter.emit('output', input);
    return;
  }

  const command = key as keyof typeof parsers;
  const payload = parsers[command](value);

  await this.#emitter.emit(command as keyof Events, payload);
}
```

The `eslint-disable` comment is removed entirely.

**Step 3: Run the full test suite**

```bash
pnpm test
```

Expected: all 79 tests pass, 6 skipped.

**Step 4: Run lint**

```bash
pnpm lint
```

Expected: no errors, no warnings, no eslint-disable comments in `ingest()`.

**Step 5: Commit**

```bash
git add src/parser/index.ts src/index.ts
git commit -m "refactor: replace any cast in ingest() with typed parsers record"
```

---

## Final Verification

```bash
pnpm lint && pnpm test && pnpm build
```

Expected: lint clean, 79 tests pass (6 skipped), build succeeds with no
TypeScript errors.
