# `ready()` Timeout + Process Exit Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to
> implement this plan task-by-task.

**Goal:** Make the private `ready()` method fail fast (via `emit('error', ...)`)
when the engine process exits or stops responding, instead of hanging
indefinitely.

**Architecture:** Add two private fields to `UCI` —
`#errored: Error | undefined` (set once on first failure, short-circuits all
future `ready()` calls) and `#timeout: number` (stores constructor timeout for
reuse). Rewrite `ready()` to race three promises: `readyok` event, process
`exit` event, and a `setTimeout`. Errors are emitted, not thrown — consistent
with the existing fire-and-emit model.

**Tech Stack:** TypeScript (strict), Vitest, Emittery (`this.process.once`),
pnpm.

---

### Task 1: Store `#timeout` and add `#errored` field

**Files:**

- Modify: `src/index.ts`
- Test: none (pure refactor, no behaviour change)

**Background:** The constructor currently inlines `timeout ?? TIMEOUT` inside
the `#ready` promise. We need it accessible as an instance field for use in
`ready()`. We also introduce `#errored` to track failure state.

**Step 1: Add the two new fields**

In `src/index.ts`, add after the existing `#position` field (maintain
alphabetical order within the private fields group):

```typescript
/**
 * Stores the first error that caused ready() to fail.
 * Once set, all subsequent ready() calls short-circuit.
 * @private
 */
#errored: Error | undefined;

/**
 * Timeout in ms for UCI handshake and isready responses.
 * @private
 */
readonly #timeout: number;
```

**Step 2: Store the timeout in the constructor**

In `src/index.ts`, update the constructor to store the timeout before creating
`#ready`:

```typescript
constructor(path: string, { timeout }: { timeout?: number } = {}) {
  super();

  this.#timeout = timeout ?? TIMEOUT;
  this.process = new Process(path);
  // ... rest unchanged
```

And replace the inline `timeout ?? TIMEOUT` in `#ready` with `this.#timeout`:

```typescript
setTimeout(ko, this.#timeout);
```

**Step 3: Run lint and tests — no behaviour change expected**

```bash
pnpm lint && pnpm test
```

Expected: all 35 tests pass, 6 skipped, lint clean.

**Step 4: Commit**

```bash
git add src/index.ts
git commit -m "refactor: store timeout as #timeout field, add #errored field"
```

---

### Task 2: Rewrite `ready()` with three-way race

**Files:**

- Modify: `src/index.ts` (private `ready()` method, lines ~233–239)
- Test: `src/__tests__/index.spec.ts`

**Background:** The current `ready()` hangs if the engine never sends `readyok`.
The new version races:

1. `this.once('readyok')` — success
2. `this.process.once('exit')` — engine crashed or exited
3. `setTimeout(this.#timeout)` — engine frozen

On failure: set `#errored`, emit `'error'`, clean up the other two pending
promises, return without rejecting.

On success: cancel the timeout and ignore the exit listener.

**Step 1: Write the failing tests**

Add to `src/__tests__/index.spec.ts` inside `describe('UCI', ...)`:

```typescript
it('emits an error when the engine exits while waiting for readyok', async () => {
  const uci = new UCI('/invalid/path');
  const errors: Error[] = [];
  uci.on('error', (e) => errors.push(e));

  // Wait for the initial error (process spawn fails) to settle
  await new Promise<void>((resolve) => setTimeout(resolve, 50));
  const before = errors.length;

  // Manually trigger ready() via go() — it will wait for readyok
  // then the process exit should surface as an error
  // Since the process is already dead, any new ready() call should
  // short-circuit with #errored immediately after the first failure
  expect(errors.length).toBeGreaterThan(0);
});
```

Wait — this approach won't work well with an invalid path since the process
never properly starts. Instead, test the three behaviours via unit tests that
control the process events directly by spying on `this.process`.

Replace the above with these three focused tests:

```typescript
it('emits an error on ready() timeout', async () => {
  // Use a very short timeout so the test does not take 5s
  const uci = new UCI('/invalid/path', { timeout: 10 });
  const errors: Error[] = [];
  uci.on('error', (e) => errors.push(e));

  // Wait long enough for the timeout to fire
  await new Promise<void>((resolve) => setTimeout(resolve, 100));

  const timeoutErrors = errors.filter((e) => e.message.includes('timeout'));
  expect(timeoutErrors.length).toBeGreaterThan(0);
});

it('emits an error when process exits while waiting for readyok', async () => {
  const uci = new UCI('/invalid/path', { timeout: 5000 });
  const errors: Error[] = [];
  uci.on('error', (e) => errors.push(e));

  // Simulate process exit by emitting the exit event on the internal process
  (uci as unknown as { process: Process }).process.emit('exit', 1);

  await new Promise<void>((resolve) => setTimeout(resolve, 50));

  const exitErrors = errors.filter((e) => e.message.includes('exited'));
  expect(exitErrors.length).toBeGreaterThan(0);
});

it('emits the same error on subsequent ready() calls after failure', async () => {
  const uci = new UCI('/invalid/path', { timeout: 10 });
  const errors: Error[] = [];
  uci.on('error', (e) => errors.push(e));

  // Wait for the first timeout to fire and set #errored
  await new Promise<void>((resolve) => setTimeout(resolve, 100));

  const countAfterFirst = errors.length;

  // Calling stop() triggers execute() which does NOT call ready(),
  // so call go() indirectly via start() — but start() awaits #ready first.
  // Instead access ready() directly via the private method:
  await (uci as unknown as { ready: () => Promise<void> }).ready();

  await new Promise<void>((resolve) => setTimeout(resolve, 50));

  // A new error should have been emitted from the short-circuit path
  expect(errors.length).toBeGreaterThan(countAfterFirst);
});
```

Note: `Process` is imported in tests — add the import if needed:

```typescript
import Process from '../process.js';
```

**Step 2: Run tests to verify they fail**

```bash
pnpm test src/__tests__/index.spec.ts
```

Expected: the three new tests FAIL (timeout test may pass incidentally from
spawn error, but exit test should fail).

**Step 3: Rewrite `ready()`**

Replace the current `ready()` implementation in `src/index.ts`:

```typescript
private async ready(): Promise<void> {
  if (this.#errored) {
    void this.emit('error', this.#errored);
    return;
  }

  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const readyok = this.once('readyok');

  const exit = new Promise<never>((_, ko) => {
    void this.process.once('exit').then(() => {
      ko(new Error('Engine process exited'));
    });
  });

  const timeout = new Promise<never>((_, ko) => {
    timeoutId = setTimeout(() => {
      ko(new Error('Engine ready timeout'));
    }, this.#timeout);
  });

  await this.execute('isready');

  try {
    await Promise.race([readyok, exit, timeout]);
  } catch (error: unknown) {
    this.#errored =
      error instanceof Error ? error : new Error(String(error));
    void this.emit('error', this.#errored);
  } finally {
    clearTimeout(timeoutId);
  }
}
```

Note on cleanup: `Emittery.once()` returns a promise that resolves on the next
event. There is no built-in cancel — once registered, the listener stays until
the event fires. This is acceptable: the `readyok` and `exit` listeners will
fire at most once and resolve/reject harmlessly after the race is decided. The
`setTimeout` is explicitly cleared in `finally`.

**Step 4: Run all tests**

```bash
pnpm test
```

Expected: all tests pass, 6 integration tests skipped.

**Step 5: Commit**

```bash
git add src/index.ts src/__tests__/index.spec.ts
git commit -m "fix: ready() fails fast on process exit or timeout"
```

---

### Task 3: Final verification

**Step 1: Run lint, tests, and build**

```bash
pnpm lint && pnpm test && pnpm build
```

Expected: lint clean, all tests pass (6 skipped), build succeeds.

**Step 2: Commit lint auto-fixes if any**

```bash
git status
# If modified:
git add -u && git commit -m "chore: lint auto-fixes"
```
