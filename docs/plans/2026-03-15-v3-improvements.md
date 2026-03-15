# v3.0.0 Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to
> implement this plan task-by-task.

**Goal:** Ship v3.0.0 of `@echecs/uci` with full UCI protocol compliance:
`sbhits` parsing, `ucinewgame` in `reset()`, typed `GoOptions` for time
controls, constructor `config` for setoptions, and pondering support.

**Architecture:** All changes are confined to `src/types.ts`,
`src/parser/info.ts`, and `src/index.ts`. The parser pipeline, `Process`, and
`Options` classes are unchanged. Tests live in `src/__tests__/`. TDD throughout
— write the failing test first, then implement.

**Tech Stack:** TypeScript (strict), Vitest, Emittery, Zod, pnpm

---

## Task 1: Add `sbhits` to `InfoCommand` and parser

**Files:**

- Modify: `src/types.ts`
- Modify: `src/parser/info.ts`
- Test: `src/__tests__/parser.spec.ts`

**Step 1: Write the failing test**

Open `src/__tests__/parser.spec.ts`. Inside the `describe('info', ...)` block,
add this test:

```ts
it('parses sbhits', () => {
  expect(info('sbhits 42')).toEqual({ sbhits: 42 });
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm test -- --reporter=verbose -t "parses sbhits"
```

Expected: FAIL — `received {}` because `sbhits` is not yet parsed.

**Step 3: Add `sbhits` to the extractor key list**

In `src/parser/info.ts`, the `extractor` is created with this key list (line 5):

```ts
const extractor = extract([
  'cpuload',
  'currline',
  ...
  'score',
  'seldepth',  // ← add 'sbhits' between 'score' and 'seldepth' (alphabetical)
  'string',
  ...
]);
```

Add `'sbhits'` between `'score'` and `'seldepth'`:

```ts
const extractor = extract([
  'cpuload',
  'currline',
  'currmove',
  'currmovenumber',
  'depth',
  'hashfull',
  'multipv',
  'nodes',
  'nps',
  'pv',
  'refutation',
  'sbhits',
  'score',
  'seldepth',
  'string',
  'tbhits',
  'time',
]);
```

**Step 4: Destructure and map `sbhits` in the `info` function**

In `src/parser/info.ts`, the `info` function destructures from
`extractor(value)` (around line 77). Add `sbhits` to the destructuring and map
it in the return object.

Destructuring — add `sbhits` (alphabetically between `refutation` and `score`):

```ts
const {
  cpuload,
  currline,
  currmove,
  currmovenumber,
  depth,
  hashfull,
  multipv,
  nodes,
  nps,
  pv,
  refutation,
  sbhits, // ← add this
  score,
  seldepth,
  string,
  tbhits,
  time,
} = extractor(value);
```

Add the string conversion (after `refutationString`, before `parsedScore`):

```ts
const sbhitsString = asString(sbhits);
```

Add to the return object (after `refutation`, before `score`):

```ts
...(sbhitsString !== undefined && { sbhits: Number(sbhitsString) }),
```

**Step 5: Add `sbhits` to `InfoCommand` in `src/types.ts`**

Find the `InfoCommand` interface. Add `sbhits?: number` alphabetically between
`score` and `stats`:

```ts
export interface InfoCommand {
  cpuload?: number;
  current?: { line?: string[]; move?: string; number?: number };
  depth?: number | { selective: number; total: number };
  hashfull?: number;
  info?: string;
  line?: number;
  moves?: string[];
  nodes?: number;
  refutation?: string[];
  sbhits?: number; // ← add this
  score?: Score;
  stats?: { nps?: number };
  tbhits?: number;
  time?: number;
}
```

**Step 6: Run tests to verify passing**

```bash
pnpm test -- --reporter=verbose -t "parses sbhits"
```

Expected: PASS.

Then run the full suite:

```bash
pnpm test
```

Expected: all previously passing tests still pass, 6 integration tests skipped.

**Step 7: Lint**

```bash
pnpm lint
```

Expected: no errors or warnings.

**Step 8: Commit**

```bash
git add src/types.ts src/parser/info.ts src/__tests__/parser.spec.ts
git commit -m "feat: add sbhits field to InfoCommand and info parser"
```

---

## Task 2: Add `ucinewgame` to `reset()`

**Files:**

- Modify: `src/index.ts`
- Test: `src/__tests__/index.spec.ts`

**Step 1: Write the failing test**

In `src/__tests__/index.spec.ts`, add this test inside the
`describe('UCI', ...)` block:

```ts
it('reset() sends ucinewgame then position startpos', async () => {
  const uci = new UCI('/invalid/path');
  const calls: string[] = [];
  vi.spyOn(
    uci as unknown as { execute: (cmd: string) => Promise<void> },
    'execute',
  ).mockImplementation(async (cmd) => {
    calls.push(cmd);
  });

  await uci.reset();

  expect(calls[0]).toBe('ucinewgame');
  expect(calls[1]).toBe('position startpos');
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm test -- --reporter=verbose -t "reset"
```

Expected: FAIL — `ucinewgame` is not currently sent by `reset()`.

**Step 3: Update `reset()` in `src/index.ts`**

Find the current `reset()` method (around line 206):

```ts
async reset(): Promise<void> {
  this.position = 'startpos';
}
```

Replace with:

```ts
async reset(): Promise<void> {
  await this.ready();
  await this.execute('ucinewgame');
  this.position = 'startpos';
}
```

**Step 4: Run tests**

```bash
pnpm test
```

Expected: all tests pass (6 integration skipped).

**Step 5: Lint**

```bash
pnpm lint
```

**Step 6: Commit**

```bash
git add src/index.ts src/__tests__/index.spec.ts
git commit -m "feat: reset() sends ucinewgame before position startpos"
```

---

## Task 3: Add `GoOptions` type

**Files:**

- Modify: `src/types.ts`

This task has no behavior change — it just adds the type. No test needed (the
type is tested implicitly when the methods that use it are implemented).

**Step 1: Add `GoOptions` to `src/types.ts`**

Add this interface to `src/types.ts` after the `ID` interface (keep exported
types grouped alphabetically by name — `GoOptions` goes between `Events` and
`ID`):

```ts
/** Parameters for the UCI `go` command */
export interface GoOptions {
  binc?: number;
  btime?: number;
  depth?: number;
  mate?: number;
  movestogo?: number;
  movetime?: number;
  nodes?: number;
  searchmoves?: string[];
  winc?: number;
  wtime?: number;
}
```

**Step 2: Lint**

```bash
pnpm lint
```

**Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat: add GoOptions type for go command parameters"
```

---

## Task 4: Refactor constructor to accept `config` and update `go()` / `start()` / `move()`

This is the core breaking change for v3.0.0. Take it carefully.

**Files:**

- Modify: `src/index.ts`
- Modify: `src/types.ts` (import `GoOptions`)
- Test: `src/__tests__/index.spec.ts`

### Step 1: Write failing tests

Add these tests to `src/__tests__/index.spec.ts`:

```ts
it('start() sends go with movetime when GoOptions.movetime is set', async () => {
  const uci = new UCI('/invalid/path');
  const calls: string[] = [];
  vi.spyOn(
    uci as unknown as { execute: (cmd: string) => Promise<void> },
    'execute',
  ).mockImplementation(async (cmd) => {
    calls.push(cmd);
  });

  // skip ready() by mocking it
  vi.spyOn(
    uci as unknown as { ready: () => Promise<void> },
    'ready',
  ).mockResolvedValue(undefined);

  await uci.start({ movetime: 1000 });

  expect(calls.some((c) => c.startsWith('go'))).toBe(true);
  const goCall = calls.find((c) => c.startsWith('go'))!;
  expect(goCall).toContain('movetime 1000');
});

it('start() sends go with wtime/btime when provided', async () => {
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
  ).mockResolvedValue(undefined);

  await uci.start({ wtime: 60_000, btime: 60_000, winc: 1000, binc: 1000 });

  const goCall = calls.find((c) => c.startsWith('go'))!;
  expect(goCall).toContain('wtime 60000');
  expect(goCall).toContain('btime 60000');
  expect(goCall).toContain('winc 1000');
  expect(goCall).toContain('binc 1000');
});

it('constructor config is applied as setoptions before go in start()', async () => {
  const uci = new UCI('/invalid/path', { config: { Hash: 64 } });
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
  ).mockResolvedValue(undefined);

  await uci.start();

  const setoption = calls.find((c) => c.includes('setoption name Hash'));
  const go = calls.find((c) => c.startsWith('go'));
  expect(setoption).toBeDefined();
  expect(go).toBeDefined();
  expect(calls.indexOf(setoption!)).toBeLessThan(calls.indexOf(go!));
});

it('start() sends go infinite when no GoOptions are set', async () => {
  const uci = new UCI('/invalid/path');
  vi.spyOn(
    uci as unknown as { ready: () => Promise<void> },
    'ready',
  ).mockResolvedValue(undefined);
  const executeSpy = vi
    .spyOn(
      uci as unknown as { execute: (cmd: string) => Promise<void> },
      'execute',
    )
    .mockResolvedValue(undefined);

  await uci.start();

  const goCall = executeSpy.mock.calls.find(([cmd]) => cmd.startsWith('go'));
  expect(goCall?.[0]).toBe('go infinite');
});
```

### Step 2: Run tests to verify they fail

```bash
pnpm test -- --reporter=verbose -t "start\(\)"
```

Expected: FAIL — `start()` does not accept `GoOptions` yet and there is no
`config` constructor option.

### Step 3: Add `#config` field to `UCI`

In `src/index.ts`, add the private field after `#errored`:

```ts
/**
 * Engine setoption overrides to apply before the first go command.
 * @private
 */
readonly #config: Record<string, unknown>;
```

### Step 4: Update the constructor signature and body

Change the constructor signature:

```ts
constructor(
  path: string,
  { config = {}, timeout }: { config?: Record<string, unknown>; timeout?: number } = {},
) {
```

Store the config in the constructor body (after
`this.#timeout = timeout ?? TIMEOUT;`):

```ts
this.#config = config;
```

### Step 5: Update `go()` to accept and use `GoOptions`

The current `go()` private method (around line 236):

```ts
private async go(): Promise<void> {
  await this.ready();

  const depth =
    this.#depth === 'infinite' ? 'infinite' : `depth ${this.#depth}`;
  await this.execute(`go ${depth}`);
}
```

Replace entirely with:

```ts
private async go(options: GoOptions = {}, ponder = false): Promise<void> {
  await this.ready();

  const parts: string[] = ['go'];

  if (ponder) {
    parts.push('ponder');
  }

  if (options.searchmoves && options.searchmoves.length > 0) {
    parts.push('searchmoves', ...options.searchmoves);
  }

  if (options.wtime !== undefined) {
    parts.push('wtime', String(options.wtime));
  }

  if (options.btime !== undefined) {
    parts.push('btime', String(options.btime));
  }

  if (options.winc !== undefined) {
    parts.push('winc', String(options.winc));
  }

  if (options.binc !== undefined) {
    parts.push('binc', String(options.binc));
  }

  if (options.movestogo !== undefined) {
    parts.push('movestogo', String(options.movestogo));
  }

  const depth = options.depth ?? (this.#depth !== 'infinite' ? this.#depth : undefined);
  if (depth !== undefined) {
    parts.push('depth', String(depth));
  }

  if (options.nodes !== undefined) {
    parts.push('nodes', String(options.nodes));
  }

  if (options.mate !== undefined) {
    parts.push('mate', String(options.mate));
  }

  if (options.movetime !== undefined) {
    parts.push('movetime', String(options.movetime));
  }

  const hasSearchLimit =
    depth !== undefined ||
    options.movetime !== undefined ||
    options.nodes !== undefined ||
    options.mate !== undefined ||
    options.wtime !== undefined ||
    options.btime !== undefined;

  if (!hasSearchLimit && !ponder) {
    parts.push('infinite');
  }

  await this.execute(parts.join(' '));
}
```

You will also need to import `GoOptions` at the top of `src/index.ts`:

```ts
import type { Events, GoOptions, ID } from './types.js';
```

### Step 6: Update `start()` to use `GoOptions` and apply `#config`

Find `start()` (around line 210) and replace it:

```ts
async start(options: GoOptions = {}): Promise<void> {
  try {
    await this.#ready;
  } catch (error: unknown) {
    void this.#emitter.emit(
      'error',
      error instanceof Error ? error : new Error(String(error)),
    );
    return;
  }

  const config = {
    MultiPV: this.#lines,
    ...this.#config,
  };

  for (const [key, value] of Object.entries(config)) {
    this.options.set(key, value);
    await this.execute(`setoption name ${key} value ${value}`);
  }

  await this.go(options);
}
```

### Step 7: Update `move()` to accept `GoOptions`

Find `move()` (around line 169) and add the parameter:

```ts
async move(input: string, options: GoOptions = {}): Promise<void> {
  this.#moves.push(input);

  const list = this.#moves.join(' ');

  await this.execute('stop');
  await this.execute(`position ${this.#position} moves ${list}`);
  await this.go(options);
}
```

### Step 8: Run tests

```bash
pnpm test
```

Expected: all previously passing tests still pass, plus the new tests pass.

### Step 9: Lint

```bash
pnpm lint
```

### Step 10: Commit

```bash
git add src/index.ts src/types.ts src/__tests__/index.spec.ts
git commit -m "feat!: add GoOptions to go/start/move, constructor config for setoptions"
```

---

## Task 5: Add pondering support

**Files:**

- Modify: `src/index.ts`
- Test: `src/__tests__/index.spec.ts`

### Step 1: Write failing tests

Add to `src/__tests__/index.spec.ts`:

```ts
it('ponder() sends go ponder command', async () => {
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
  ).mockResolvedValue(undefined);

  await uci.ponder('e7e5');

  const goCall = calls.find((c) => c.startsWith('go'));
  expect(goCall).toContain('ponder');
});

it('ponderhit() sends ponderhit command when pondering', async () => {
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
  ).mockResolvedValue(undefined);

  await uci.ponder('e7e5');
  await uci.ponderhit();

  expect(calls).toContain('ponderhit');
});

it('ponderhit() emits an error when not pondering', async () => {
  const uci = new UCI('/invalid/path');
  const errors: Error[] = [];
  uci.on('error', (e) => errors.push(e));

  await uci.ponderhit();

  expect(errors.length).toBeGreaterThan(0);
  expect(errors[0]?.message).toContain('pondering');
});

it('stop() clears pondering state so ponderhit() emits error afterwards', async () => {
  const uci = new UCI('/invalid/path');
  const errors: Error[] = [];
  uci.on('error', (e) => errors.push(e));
  vi.spyOn(
    uci as unknown as { execute: (cmd: string) => Promise<void> },
    'execute',
  ).mockResolvedValue(undefined);
  vi.spyOn(
    uci as unknown as { ready: () => Promise<void> },
    'ready',
  ).mockResolvedValue(undefined);

  await uci.ponder('e7e5');
  await uci.stop();
  await uci.ponderhit();

  expect(errors.some((e) => e.message.includes('pondering'))).toBe(true);
});
```

### Step 2: Run tests to verify they fail

```bash
pnpm test -- --reporter=verbose -t "ponder"
```

Expected: FAIL — `ponder` and `ponderhit` methods do not exist.

### Step 3: Add `#pondering` private field to `UCI`

In `src/index.ts`, add after `#moves`:

```ts
/**
 * Whether the engine is currently in ponder mode.
 * @private
 */
#pondering = false;
```

### Step 4: Add `ponder()` method

Add the `ponder()` public method after `once()`:

```ts
async ponder(move: string, options: GoOptions = {}): Promise<void> {
  this.#moves.push(move);
  const list = this.#moves.join(' ');

  await this.execute(`position ${this.#position} moves ${list}`);
  this.#pondering = true;
  await this.go(options, true);
}
```

### Step 5: Add `ponderhit()` method

Add `ponderhit()` after `ponder()`:

```ts
async ponderhit(): Promise<void> {
  if (!this.#pondering) {
    void this.#emitter.emit(
      'error',
      new Error('ponderhit() called when not pondering'),
    );
    return;
  }

  this.#pondering = false;
  await this.execute('ponderhit');
}
```

### Step 6: Update `stop()` to clear ponder state

Find the current `stop()` method:

```ts
stop(): Promise<void> {
  return this.execute('stop');
}
```

Replace with:

```ts
stop(): Promise<void> {
  this.#pondering = false;
  return this.execute('stop');
}
```

### Step 7: Run tests

```bash
pnpm test
```

Expected: all tests pass (6 integration skipped).

### Step 8: Lint

```bash
pnpm lint
```

### Step 9: Commit

```bash
git add src/index.ts src/__tests__/index.spec.ts
git commit -m "feat: add ponder() and ponderhit() methods for UCI pondering support"
```

---

## Task 6: Version bump and CHANGELOG

**Files:**

- Modify: `package.json`
- Modify: `CHANGELOG.md`

### Step 1: Update version in `package.json`

Change `"version": "2.0.0"` to `"version": "3.0.0"`.

### Step 2: Update `CHANGELOG.md`

Add this section above `## [2.0.0]`:

````markdown
## [3.0.0] - 2026-03-15

### Added

- `GoOptions` interface — typed parameters for `go` command: `wtime`, `btime`,
  `winc`, `binc`, `movestogo`, `movetime`, `nodes`, `mate`, `searchmoves`,
  `depth`
- `start(options?: GoOptions)` — time controls and search limits as typed
  options
- `move(input, options?: GoOptions)` — per-move time controls forwarded to `go`
- Constructor `config` option — `setoption` overrides applied once after UCI
  handshake: `new UCI(path, { config: { Hash: 64 } })`
- `ponder(move, options?)` — sends `go ponder` for pondering on a move
- `ponderhit()` — switches engine from ponder to normal search
- `sbhits` field on `InfoCommand` — Shredder endgame database hits

### Changed

- `start()` parameter changed from `Record<string, unknown>` (setoptions) to
  `GoOptions` (search parameters) — **breaking change**
- `reset()` now sends `ucinewgame` before `position startpos`
- `stop()` now clears pondering state

### Migration from v2

```ts
// v2
const uci = new UCI('/path/to/engine');
await uci.start({ MultiPV: 4, Hash: 128 });

// v3
const uci = new UCI('/path/to/engine', { config: { Hash: 128 } });
uci.lines = 4; // MultiPV is still set via the lines property
await uci.start(); // no args needed for engine config
await uci.start({ movetime: 1000 }); // time-controlled search
```
````

````

### Step 3: Lint

```bash
pnpm lint
````

### Step 4: Run full pre-PR check

```bash
pnpm lint && pnpm test && pnpm build
```

Expected: all tests pass, build succeeds.

### Step 5: Commit

```bash
git add package.json CHANGELOG.md
git commit -m "chore: bump to v3.0.0, update CHANGELOG"
```

---

## Verification Checklist

Before considering this complete:

- [ ] `pnpm lint` passes with zero warnings
- [ ] `pnpm test` passes — 6 integration tests skipped is normal
- [ ] `pnpm build` succeeds
- [ ] `GoOptions` is exported from the package (check `src/types.ts` exports)
- [ ] `CHANGELOG.md` has a v3.0.0 entry with migration guide
- [ ] `package.json` version is `3.0.0`
