# v4.0 Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to
> implement this plan task-by-task.

**Goal:** Fix correctness bugs in Process stderr typing and ready() permanent
error state, convert position setter to an async method, and fill test coverage
gaps across Process, go() options, and edge cases.

**Architecture:** Three targeted changes to existing modules (process.ts,
index.ts) plus new test cases. No new files, no new dependencies. The position
setter becomes a method, ready() drops its error cache, and Process wraps stderr
in Error objects.

**Tech Stack:** TypeScript, Vitest, Emittery, Zod

---

### Task 1: Fix stderr Buffer typing in Process

**Files:**

- Modify: `src/process.ts:33`
- Test: `src/__tests__/process.spec.ts` (create)

**Step 1: Create the test file with a failing test**

```typescript
import { describe, expect, it, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import { Writable } from 'node:stream';

import Process from '../process.js';

// Helper: create a Process with a mocked child process
function createMockProcess(): {
  proc: Process;
  stdout: EventEmitter;
  stderr: EventEmitter;
  stdin: Writable;
  child: EventEmitter;
} {
  const stdout = new EventEmitter();
  const stderr = new EventEmitter();
  const stdin = new Writable({
    write(_chunk, _enc, cb) {
      cb();
    },
  });
  const child = new EventEmitter();
  Object.assign(child, { stdout, stderr, stdin });

  // Mock child_process.spawn to return our fake child
  vi.spyOn(await import('node:child_process'), 'spawn').mockReturnValue(
    child as never,
  );

  const proc = new Process('/fake/path');
  return { child, proc, stderr, stdin, stdout };
}

describe('Process', () => {
  it('wraps stderr data in an Error object', async () => {
    const { proc, stderr } = await createMockProcess();
    const errors: Error[] = [];
    proc.on('error', (error) => {
      errors.push(error);
    });

    stderr.emit('data', Buffer.from('engine warning message'));

    await new Promise<void>((resolve) => setTimeout(resolve, 10));

    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(Error);
    expect(errors[0]?.message).toBe('engine warning message');
  });
});
```

Note: The mock approach above may need adjustment depending on how vitest
handles ESM mocking of `node:child_process`. An alternative is to test via
integration by using a script that writes to stderr. The implementer should
choose the approach that works with the existing test infrastructure.

**Step 2: Run test to verify it fails**

Run: `pnpm test src/__tests__/process.spec.ts -v`

Expected: FAIL — stderr currently emits raw Buffer, not Error

**Step 3: Fix the stderr handler**

In `src/process.ts`, change line 33 from:

```typescript
this.child.stderr.on('data', (data) => this.emit('error', data));
```

To:

```typescript
this.child.stderr.on('data', (data: Buffer) =>
  this.emit('error', new Error(data.toString().trim())),
);
```

**Step 4: Run test to verify it passes**

Run: `pnpm test src/__tests__/process.spec.ts -v`

Expected: PASS

**Step 5: Run all tests and lint**

Run: `pnpm lint && pnpm test`

Expected: All pass, no regressions

**Step 6: Commit**

```bash
git add src/process.ts src/__tests__/process.spec.ts
git commit -m "fix: wrap stderr Buffer in Error before emitting"
```

---

### Task 2: Add Process test coverage for stdout buffering

**Files:**

- Modify: `src/__tests__/process.spec.ts`

Uses the same mock infrastructure from Task 1.

**Step 1: Write failing tests for buffering edge cases**

Add to the Process describe block:

```typescript
it('emits complete lines and buffers partial data', async () => {
  const { proc, stdout } = await createMockProcess();
  const lines: string[] = [];
  proc.on('line', (line) => {
    lines.push(line);
  });

  // Send partial line
  stdout.emit('data', Buffer.from('readyo'));
  await new Promise<void>((resolve) => setTimeout(resolve, 10));
  expect(lines).toHaveLength(0);

  // Complete the line
  stdout.emit('data', Buffer.from('k\n'));
  await new Promise<void>((resolve) => setTimeout(resolve, 10));
  expect(lines).toEqual(['readyok']);
});

it('emits multiple lines from a single data chunk', async () => {
  const { proc, stdout } = await createMockProcess();
  const lines: string[] = [];
  proc.on('line', (line) => {
    lines.push(line);
  });

  stdout.emit('data', Buffer.from('id name Stockfish\nid author T. Romstad\n'));
  await new Promise<void>((resolve) => setTimeout(resolve, 10));

  expect(lines).toEqual(['id name Stockfish', 'id author T. Romstad']);
});

it('handles empty lines in output', async () => {
  const { proc, stdout } = await createMockProcess();
  const lines: string[] = [];
  proc.on('line', (line) => {
    lines.push(line);
  });

  stdout.emit('data', Buffer.from('line1\n\nline2\n'));
  await new Promise<void>((resolve) => setTimeout(resolve, 10));

  expect(lines).toEqual(['line1', '', 'line2']);
});
```

**Step 2: Run tests**

Run: `pnpm test src/__tests__/process.spec.ts -v`

Expected: PASS (these test existing behavior, should pass immediately)

**Step 3: Commit**

```bash
git add src/__tests__/process.spec.ts
git commit -m "test: add Process stdout buffering coverage"
```

---

### Task 3: Add Process test coverage for write errors and lifecycle

**Files:**

- Modify: `src/__tests__/process.spec.ts`

**Step 1: Write tests for write error path and exit forwarding**

```typescript
it('write() rejects when stdin write fails', async () => {
  const { proc, stdin } = await createMockProcess();

  // Replace stdin with one that errors
  const errorStdin = new Writable({
    write(_chunk, _enc, cb) {
      cb(new Error('stdin broken'));
    },
  });
  Object.defineProperty(
    (proc as unknown as { child: { stdin: Writable } }).child,
    'stdin',
    { value: errorStdin },
  );

  await expect(proc.write('test\n')).rejects.toThrow('stdin broken');
});

it('forwards process exit code', async () => {
  const { child, proc } = await createMockProcess();
  const exits: number[] = [];
  proc.on('exit', (code) => {
    exits.push(code);
  });

  child.emit('exit', 1);
  await new Promise<void>((resolve) => setTimeout(resolve, 10));

  expect(exits).toEqual([1]);
});

it('forwards exit code 0 when code is null', async () => {
  const { child, proc } = await createMockProcess();
  const exits: number[] = [];
  proc.on('exit', (code) => {
    exits.push(code);
  });

  child.emit('exit', null);
  await new Promise<void>((resolve) => setTimeout(resolve, 10));

  expect(exits).toEqual([0]);
});
```

**Step 2: Run tests**

Run: `pnpm test src/__tests__/process.spec.ts -v`

Expected: PASS

**Step 3: Commit**

```bash
git add src/__tests__/process.spec.ts
git commit -m "test: add Process write error and lifecycle coverage"
```

---

### Task 4: Remove permanent error state from ready()

**Files:**

- Modify: `src/index.ts:54` (remove `#errored` field)
- Modify: `src/index.ts:412-451` (remove error caching in `ready()`)
- Modify: `src/__tests__/index.spec.ts:474-496` (update/remove short-circuit
  test)

**Step 1: Update the test for ready() recovery**

Replace the "short-circuits on subsequent ready() calls" test (line 474) with a
test that verifies ready() retries:

```typescript
it('ready() retries after a previous timeout instead of permanently failing', async () => {
  const uci = new UCI('/invalid/path', { timeout: 20 });
  const errors: Error[] = [];
  uci.on('error', (error) => {
    errors.push(error);
  });

  // First ready() times out
  void (uci as unknown as { ready: () => Promise<void> }).ready();
  await new Promise<void>((resolve) => setTimeout(resolve, 150));

  const timeoutErrors = errors.filter((e) => e.message.includes('timeout'));
  expect(timeoutErrors.length).toBeGreaterThan(0);

  const beforeCount = errors.length;

  // Second ready() should attempt a fresh handshake (send isready again),
  // not short-circuit with cached error
  const executeSpy = vi.spyOn(
    uci as unknown as { execute: (cmd: string) => Promise<void> },
    'execute',
  );

  void (uci as unknown as { ready: () => Promise<void> }).ready();

  // Verify isready was sent again
  await new Promise<void>((resolve) => setTimeout(resolve, 50));
  const isreadyCalls = executeSpy.mock.calls.filter(
    ([cmd]) => cmd === 'isready',
  );
  expect(isreadyCalls.length).toBeGreaterThan(0);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test src/__tests__/index.spec.ts -t "retries" -v`

Expected: FAIL — ready() currently short-circuits with cached `#errored`

**Step 3: Remove `#errored` field and caching logic**

In `src/index.ts`:

1. Delete the `#errored` field declaration (lines 49-54)
2. In `ready()`, remove lines 413-416 (the early return on `#errored`)
3. In the catch block (line 444-446), change from caching+emitting to just
   emitting:

```typescript
    try {
      await Promise.race([readyok, exit, timeout]);
    } catch (error: unknown) {
      void this.#emitter.emit(
        'error',
        error instanceof Error ? error : new Error(String(error)),
      );
    } finally {
```

**Step 4: Run tests**

Run: `pnpm test -v`

Expected: All pass

**Step 5: Commit**

```bash
git add src/index.ts src/__tests__/index.spec.ts
git commit -m "fix: remove permanent error state from ready() to allow recovery"
```

---

### Task 5: Convert position setter to position() method

**Files:**

- Modify: `src/index.ts:161-170` (replace setter with method)
- Modify: `src/index.ts:281` (update reset() to call method)
- Modify: `src/__tests__/index.spec.ts:156-174` (update reset test)
- Modify: `src/__tests__/integration.spec.ts` (if position is used)

**Step 1: Write a test for the new position() method**

Add to `src/__tests__/index.spec.ts`:

```typescript
it('position() sends position command after ready', async () => {
  const uci = new UCI('/invalid/path');
  const calls: string[] = [];
  vi.spyOn(
    uci as unknown as { execute: (cmd: string) => Promise<void> },
    'execute',
  ).mockImplementation(async (cmd) => {
    calls.push(cmd);
  });
  vi.spyOn(
    uci as unknown as { ready: () => Promise<void> },
    'ready',
  ).mockResolvedValue();

  await uci.position(
    'fen rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  );

  expect(calls).toContain(
    'position fen rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  );
});

it('position() resets move history', async () => {
  const uci = new UCI('/invalid/path');
  const calls: string[] = [];
  vi.spyOn(
    uci as unknown as { execute: (cmd: string) => Promise<void> },
    'execute',
  ).mockImplementation(async (cmd) => {
    calls.push(cmd);
  });
  vi.spyOn(
    uci as unknown as { ready: () => Promise<void> },
    'ready',
  ).mockResolvedValue();

  // Make a move to populate history
  await uci.move('e2e4');
  calls.length = 0;

  // Setting position should reset moves
  await uci.position('startpos');
  await uci.move('d2d4');

  const positionCall = calls.find(
    (c) => c.startsWith('position') && c.includes('moves'),
  );
  // Should only have d2d4, not e2e4
  expect(positionCall).toContain('moves d2d4');
  expect(positionCall).not.toContain('e2e4');
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm test src/__tests__/index.spec.ts -t "position()" -v`

Expected: FAIL — position is currently a setter, not a method

**Step 3: Convert the setter to a method**

In `src/index.ts`, replace lines 161-170:

```typescript
  get position(): string {
    return this.#position;
  }

  set position(input: string) {
    this.#position = input;
    this.#moves = [];

    this.ready().then(() => this.execute(`position ${input}`));
  }
```

With:

```typescript
  async position(input: string): Promise<void> {
    this.#position = input;
    this.#moves = [];

    await this.ready();
    await this.execute(`position ${input}`);
  }
```

Note: This removes the getter. If a getter is still needed for reading the
current position string, add a separate `get currentPosition(): string` accessor
or expose position as a readonly property through a different name.

**Step 4: Update reset() to await the new method**

In `src/index.ts`, change line 281 from:

```typescript
this.position = 'startpos';
```

To:

```typescript
await this.position('startpos');
```

**Step 5: Update the reset test**

The existing test at line 156 checks for `calls[1] === 'position startpos'`.
With the new method, reset() now awaits position() which calls ready() then
execute(). Update the mock and assertions accordingly — the test should verify
that `position startpos` is sent as part of the reset sequence.

**Step 6: Run all tests and lint**

Run: `pnpm lint && pnpm test`

Expected: All pass. The type checker will catch any remaining call sites using
the old setter syntax.

**Step 7: Commit**

```bash
git add src/index.ts src/__tests__/index.spec.ts
git commit -m "feat!: convert position setter to async position() method

BREAKING CHANGE: engine.position = 'startpos' is now await engine.position('startpos')"
```

---

### Task 6: Add go() option coverage tests

**Files:**

- Modify: `src/__tests__/index.spec.ts`

**Step 1: Write tests for untested go() options**

```typescript
it('start() sends go with depth option', async () => {
  const uci = new UCI('/invalid/path');
  const calls: string[] = [];
  const ingest = (line: string) =>
    (uci as unknown as { ingest: (l: string) => Promise<void> }).ingest(line);
  vi.spyOn(
    uci as unknown as { execute: (cmd: string) => Promise<void> },
    'execute',
  ).mockImplementation(async (cmd) => {
    calls.push(cmd);
    if (cmd === 'isready') {
      void ingest('readyok');
    }
  });
  vi.spyOn(
    (uci as unknown as { options: { set: () => void } }).options,
    'set',
  ).mockReturnValue();

  void ingest('uciok');
  await Promise.resolve();

  await uci.start({ depth: 20 });

  const goCall = calls.find((c) => c.startsWith('go'))!;
  expect(goCall).toContain('depth 20');
  expect(goCall).not.toContain('infinite');
});

it('start() sends go with nodes option', async () => {
  // Same setup pattern as above
  // Assert goCall contains 'nodes 1000000'
});

it('start() sends go with mate option', async () => {
  // Assert goCall contains 'mate 3'
});

it('start() sends go with searchmoves option', async () => {
  // Assert goCall contains 'searchmoves e2e4 d2d4'
});

it('start() sends go with movestogo option', async () => {
  // Assert goCall contains 'movestogo 30'
});

it('start() uses instance depth when GoOptions.depth is not set', async () => {
  // Set uci.depth = 15, call start() with no depth option
  // Assert goCall contains 'depth 15'
});

it('GoOptions.depth overrides instance depth', async () => {
  // Set uci.depth = 15, call start({ depth: 20 })
  // Assert goCall contains 'depth 20' not 'depth 15'
});
```

Follow the same mock setup pattern established in the existing tests (lines
176-204 of index.spec.ts). Each test should create a UCI instance, mock execute
and ingest, simulate uciok, then call start() with the relevant option.

**Step 2: Run tests**

Run: `pnpm test src/__tests__/index.spec.ts -v`

Expected: All PASS (these test existing behavior)

**Step 3: Commit**

```bash
git add src/__tests__/index.spec.ts
git commit -m "test: add coverage for go() option combinations"
```

---

### Task 7: Add edge case tests for parser and ingest

**Files:**

- Modify: `src/__tests__/index.spec.ts` (ingest edge cases)
- Modify: `src/__tests__/parser.spec.ts` (malformed input edge cases)

**Step 1: Write ingest edge case tests**

```typescript
it('ingest routes unknown commands to the output event', async () => {
  const uci = new UCI('/invalid/path');
  const outputs: string[] = [];
  uci.on('output', (data) => {
    outputs.push(data);
  });

  await (uci as unknown as { ingest: (line: string) => Promise<void> }).ingest(
    'customcommand some data here',
  );

  expect(outputs).toEqual(['customcommand some data here']);
});

it('ingest handles empty string input', async () => {
  const uci = new UCI('/invalid/path');
  const outputs: string[] = [];
  uci.on('output', (data) => {
    outputs.push(data);
  });

  // Should not throw
  await (uci as unknown as { ingest: (line: string) => Promise<void> }).ingest(
    '',
  );

  expect(outputs).toHaveLength(0);
});
```

**Step 2: Write parser edge case tests**

```typescript
// In parser.spec.ts, add to the info describe block:

it('returns empty object for empty input', () => {
  expect(info('')).toEqual({});
});

it('handles info string with arbitrary text', () => {
  const result = info('string engine is thinking...');
  expect(result).toMatchObject({ info: 'engine is thinking...' });
});
```

**Step 3: Run tests**

Run: `pnpm test -v`

Expected: All PASS

**Step 4: Commit**

```bash
git add src/__tests__/index.spec.ts src/__tests__/parser.spec.ts
git commit -m "test: add edge case coverage for ingest and parser"
```

---

### Task 8: Update integration tests for position method

**Files:**

- Modify: `src/__tests__/integration.spec.ts`

**Step 1: Check if integration tests use position setter**

The current integration tests do not directly set position (they rely on
start()/move()). If any usage of `engine.position = ...` exists, update to
`await engine.position(...)`.

**Step 2: Run full test suite and lint**

Run: `pnpm lint && pnpm test && pnpm build`

Expected: All pass, build succeeds

**Step 3: Commit if changes were needed**

```bash
git add src/__tests__/integration.spec.ts
git commit -m "test: update integration tests for position() method"
```

---

### Task 9: Update README and CHANGELOG for v4.0

**Files:**

- Modify: `README.md` — update position API examples
- Modify: `CHANGELOG.md` — add v4.0.0 entry
- Modify: `AGENTS.md` — remove or update the error-absorbing limitation note
  regarding `#errored` caching

**Step 1: Update README examples**

Change any `engine.position = 'startpos'` to
`await engine.position('startpos')`.

**Step 2: Add CHANGELOG entry**

```markdown
## [4.0.0] - 2026-03-18

### Breaking Changes

- `position` is now an async method instead of a setter. Use
  `await engine.position('startpos')` instead of `engine.position = 'startpos'`.

### Fixed

- Process stderr now emits proper `Error` objects instead of raw `Buffer`.
- `ready()` no longer permanently caches errors — subsequent calls retry the
  `isready` handshake.

### Tests

- Added Process class unit tests (stdout buffering, stderr, write errors,
  lifecycle).
- Added go() option combination tests (depth, nodes, mate, searchmoves,
  movestogo).
- Added edge case tests for parser and ingest (empty input, unknown commands).
```

**Step 3: Update AGENTS.md**

Remove or update the section about `ready()` error caching and the `#errored`
field since it no longer exists.

**Step 4: Commit**

```bash
git add README.md CHANGELOG.md AGENTS.md
git commit -m "docs: update documentation for v4.0.0"
```

---

### Task 10: Version bump and final verification

**Step 1: Bump version**

In `package.json`, change `"version"` from `"3.0.2"` to `"4.0.0"`.

**Step 2: Full verification**

Run: `pnpm lint && pnpm test && pnpm build`

Expected: All pass

**Step 3: Commit**

```bash
git add package.json
git commit -m "chore: bump version to 4.0.0"
```
