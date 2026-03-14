# Wrap Emittery Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to
> implement this plan task-by-task.

**Goal:** Stop extending `Emittery` in the `UCI` class; wrap it as a private
field instead, exposing only `on`/`off`/`once` publicly, and add a `debug`
method now that the naming collision is resolved.

**Architecture:** Remove `extends Emittery<Events>` and the `super()` call. Add
a `readonly #emitter = new Emittery<Events>()` private field. Add three explicit
public methods (`on`, `off`, `once`) that delegate to `#emitter`. Update every
internal `this.emit/on/once` call to `this.#emitter.emit/on/once`. Add
`debug(on: boolean)` as a new public method.

**Tech Stack:** TypeScript (strict), Vitest, Emittery, pnpm.

---

### Task 1: Replace `extends Emittery` with `#emitter` field

**Files:**

- Modify: `src/index.ts`
- Test: `src/__tests__/index.spec.ts`

**Background:** This is the core refactor. It touches every internal emitter
call in the file. After this task the class should compile, lint clean, and all
existing tests should pass.

**Step 1: Write a canary test that will fail if `on` breaks**

The existing test `'emits an error when instantiated with an invalid path'`
already uses `uci.on('error', ...)` — it will catch regressions. No new test
needed yet. Just run the suite after implementation to confirm.

**Step 2: Implement the refactor**

Make these changes to `src/index.ts`:

**a) Change the import** — `Emittery` is now used as a field type, not a base
class. The import stays but the usage changes:

```typescript
import Emittery from 'emittery';
```

(unchanged — still needed for `new Emittery<Events>()`)

**b) Remove `extends Emmittery<Events>`** from the class declaration:

```typescript
// Before
class UCI extends Emmittery<Events> {

// After
class UCI {
```

**c) Add the `#emitter` field** — place it first among private fields
(alphabetical: before `#depth`):

```typescript
/**
 * Internal event emitter.
 * @private
 */
readonly #emitter = new Emittery<Events>();
```

**d) Remove `super()`** from the constructor (no longer extends anything).

**e) Add the three public event methods** — place them in alphabetical order
among public methods (after `[Symbol.dispose]`, before `execute`):

```typescript
debug(on: boolean): Promise<void> {
  return this.execute(`debug ${on ? 'on' : 'off'}`);
}

off<K extends keyof Events>(
  event: K,
  listener: (data: Events[K]) => void | Promise<void>,
): void {
  this.#emitter.off(event, listener);
}

on<K extends keyof Events>(
  event: K,
  listener: (data: Events[K]) => void | Promise<void>,
): () => void {
  return this.#emitter.on(event, listener);
}

once<K extends keyof Events>(event: K): Promise<Events[K]> {
  return this.#emitter.once(event);
}
```

**f) Update all internal emitter calls** — replace every `this.emit`, `this.on`,
`this.once` (that refers to the Emittery instance, not `this.process`) with
`this.#emitter.emit`, `this.#emitter.on`, `this.#emitter.once`:

Locations to update (line numbers approximate — verify in file):

- Constructor line ~94: `this.emit('error', value)` →
  `this.#emitter.emit('error', value)`
- Constructor line ~97: `this.on('id', ...)` → `this.#emitter.on('id', ...)`
- Constructor line ~101: `this.on('option', ...)` →
  `this.#emitter.on('option', ...)`
- Constructor line ~107: `this.on('uciok', ...)` →
  `this.#emitter.on('uciok', ...)`
- `execute()`: `this.emit('error', ...)` → `this.#emitter.emit('error', ...)`
- `start()`: `this.emit('error', ...)` → `this.#emitter.emit('error', ...)`
- `ingest()`: `this.emit('output', ...)` → `this.#emitter.emit('output', ...)`
- `ingest()`: `this.emit(command, ...)` → `this.#emitter.emit(command, ...)`
- `ready()`: `this.on('readyok', ...)` → `this.#emitter.on('readyok', ...)`
- `ready()` short-circuit: `this.emit('error', ...)` →
  `this.#emitter.emit('error', ...)`
- `ready()` catch: `this.emit('error', ...)` →
  `this.#emitter.emit('error', ...)`

**Important:** `this.process.on(...)` calls are NOT changed — those are on the
`Process` emitter.

**Step 3: Run lint and tests**

```bash
pnpm lint && pnpm test
```

Expected: lint clean, all 38 tests pass, 6 skipped.

**Step 4: Commit**

```bash
git add src/index.ts
git commit -m "refactor: wrap Emittery as #emitter field instead of extending it"
```

---

### Task 2: Add tests for `debug`, `on`, `off`, `once`

**Files:**

- Test: `src/__tests__/index.spec.ts`

**Background:** The new public methods need test coverage. `on`/`off`/`once` are
already implicitly tested through all existing tests, but `debug` is new and the
delegation of `off` and `once` should have explicit coverage.

**Step 1: Write the tests**

Add to `src/__tests__/index.spec.ts` inside `describe('UCI', ...)`:

```typescript
it('debug(true) sends "debug on"', async () => {
  const uci = new UCI('/invalid/path');
  const spy = vi.spyOn(
    uci as unknown as { execute: (cmd: string) => Promise<void> },
    'execute',
  );

  await uci.debug(true).catch(vi.fn());

  expect(spy).toHaveBeenCalledWith('debug on');
});

it('debug(false) sends "debug off"', async () => {
  const uci = new UCI('/invalid/path');
  const spy = vi.spyOn(
    uci as unknown as { execute: (cmd: string) => Promise<void> },
    'execute',
  );

  await uci.debug(false).catch(vi.fn());

  expect(spy).toHaveBeenCalledWith('debug off');
});

it('off() unsubscribes a listener', async () => {
  const uci = new UCI('/invalid/path');
  const handler = vi.fn();

  uci.on('output', handler);
  uci.off('output', handler);

  // Emit output directly via internal emitter
  await (uci as unknown as { ingest: (line: string) => Promise<void> }).ingest(
    'unknown command',
  );

  expect(handler).not.toHaveBeenCalled();
});

it('once() resolves on the next event', async () => {
  const uci = new UCI('/invalid/path');

  const promise = uci.once('output');

  // Trigger an output event via ingest
  void (uci as unknown as { ingest: (line: string) => Promise<void> }).ingest(
    'unknown command',
  );

  const result = await promise;
  expect(result).toBe('unknown command');
});
```

**Step 2: Run tests to verify they pass**

```bash
pnpm test src/__tests__/index.spec.ts
```

Expected: all tests pass including the 4 new ones.

**Step 3: Commit**

```bash
git add src/__tests__/index.spec.ts
git commit -m "test: add coverage for debug(), off(), and once() methods"
```

---

### Task 3: Final verification

**Step 1: Run lint, tests, and build**

```bash
pnpm lint && pnpm test && pnpm build
```

Expected: lint clean, all tests pass (6 integration skipped), build succeeds.

**Step 2: Commit if any lint auto-fixes were applied**

```bash
git status
# If modified:
git add -u && git commit -m "chore: lint auto-fixes"
```
