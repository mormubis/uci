# Info Parser Improvement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to
> implement this plan task-by-task.

**Goal:** Make `src/parser/info.ts` fully spec-compliant by fixing the `score`
field (discriminated union), surfacing all dropped numeric fields, and
correcting type mismatches.

**Architecture:** Three isolated changes — update the `UCI.InfoCommand` type in
`@types/uci.d.ts`, rewrite the mapping logic in `src/parser/info.ts`, and
update/extend the tests in `src/__tests__/parser.spec.ts`. Each task is
independently testable and committed separately.

**Tech Stack:** TypeScript 5, Vitest 4, no new dependencies.

---

## Task 1: Add `Score` type and update `InfoCommand` in `@types/uci.d.ts`

**Files:**

- Modify: `@types/uci.d.ts`

**Step 1: Write the failing type test**

No runtime test yet — this is a type-only change. The existing test
`score: 2.14` in `parser.spec.ts` will become a type error once `score` is typed
correctly, which we'll fix in Task 3. For now just update the types.

**Step 2: Update `@types/uci.d.ts`**

Replace:

```typescript
score?: unknown; // ?
```

With:

```typescript
score?: Score;
```

And add the `Score` type and missing fields directly above `InfoCommand`:

```typescript
type Score =
  | { bound: 'lower'; type: 'cp'; value: number }
  | { bound: 'upper'; type: 'cp'; value: number }
  | { bound?: never; type: 'cp'; value: number }
  | { bound?: never; type: 'mate'; value: number };
```

Also update these fields in `InfoCommand`:

```typescript
// Change:
stats?: { nps?: string }; // engine statistics
// To:
stats?: { nps?: number }; // engine statistics

// Add after `line?`:
nodes?: number; // x nodes searched
time?: number;  // the time searched in ms  (already present, keep as-is)

// Add after `// hashfull?: unknown; // boolean?`:
hashfull?: number; // hash is x permill full

// Change:
cpu?: number; // load of the cpu
// To:
cpuload?: number; // cpu usage in permill
```

The final `InfoCommand` should look like:

```typescript
export type InfoCommand = {
  comment?: string;

  cpuload?: number; // cpu usage in permill

  current?: { line?: string; move?: string; number?: number };

  depth?: number | { selective: number; total: number };

  hashfull?: number; // hash is x permill full

  info?: string; // free-form string from engine

  line?: number; // multipv line number

  moves?: string[]; // pv moves

  nodes?: number; // nodes searched

  refutation?: string;

  score?: Score;

  stats?: { nps?: number }; // engine statistics

  tbhits?: number; // positions found in endgame tablebases

  time?: number; // time searched in ms
};
```

Note: remove the `cpu?` field (it was a renamed duplicate of `cpuload` that was
never populated by the parser). Keep field names sorted alphabetically.

**Step 3: Run type check**

```bash
pnpm lint:types
```

Expected: errors in `src/parser/info.ts` because the parser still returns the
old shape — that's correct, we'll fix it in Task 2. The `@types` file itself
should be clean.

**Step 4: Commit**

```bash
git add @types/uci.d.ts
git commit -m "feat: add Score type and update InfoCommand fields"
```

---

## Task 2: Rewrite the mapping logic in `src/parser/info.ts`

**Files:**

- Modify: `src/parser/info.ts`

**Step 1: Write the new `info` function**

Replace the body of `src/parser/info.ts` with:

```typescript
import extract from './extract.js';

const extractor = extract([
  'cpuload',
  'currline',
  'currmove',
  'currmovenumber',
  'depth',
  'hashfull',
  'lowerbound',
  'multipv',
  'nodes',
  'nps',
  'pv',
  'refutation',
  'seldepth',
  'score',
  'string',
  'tbhits',
  'time',
  'upperbound',
]);

function parseScore(raw: string): UCI.Score | undefined {
  const tokens = raw.trim().split(' ');
  const kind = tokens[0];

  if (kind !== 'cp' && kind !== 'mate') {
    return undefined;
  }

  const raw_value = tokens[1];
  if (raw_value === undefined) {
    return undefined;
  }

  const numeric = Number(raw_value);
  const value = kind === 'cp' ? numeric / 100 : numeric;

  const hasLower = tokens.includes('lowerbound');
  const hasUpper = tokens.includes('upperbound');

  if (hasLower) {
    return { bound: 'lower', type: 'cp', value };
  }

  if (hasUpper) {
    return { bound: 'upper', type: 'cp', value };
  }

  return { type: kind, value };
}

function info(value: string): UCI.InfoCommand {
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
    score,
    seldepth,
    string,
    tbhits,
    time,
  } = extractor(value);

  const parsedScore = score === undefined ? undefined : parseScore(score);

  return {
    ...((currline || currmove || currmovenumber) && {
      current: {
        line: currline,
        move: currmove,
        number:
          currmovenumber === undefined ? undefined : Number(currmovenumber),
      },
    }),
    ...(cpuload !== undefined && { cpuload: Number(cpuload) }),
    ...(depth !== undefined && seldepth !== undefined
      ? { depth: { selective: Number(seldepth), total: Number(depth) } }
      : depth !== undefined
        ? { depth: Number(depth) }
        : {}),
    ...(hashfull !== undefined && { hashfull: Number(hashfull) }),
    ...(string !== undefined && { info: string }),
    ...(multipv !== undefined && { line: Number(multipv) }),
    ...(pv !== undefined && { moves: pv.split(' ') }),
    ...(nodes !== undefined && { nodes: Number(nodes) }),
    ...(nps !== undefined && { stats: { nps: Number(nps) } }),
    ...(refutation !== undefined && { refutation }),
    ...(parsedScore !== undefined && { score: parsedScore }),
    ...(tbhits !== undefined && { tbhits: Number(tbhits) }),
    ...(time !== undefined && { time: Number(time) }),
  };
}

export default info;
```

**Step 2: Run type check**

```bash
pnpm lint:types
```

Expected: 0 errors. The new `info` return shape should satisfy `InfoCommand`.

**Step 3: Run existing tests (expect some failures)**

```bash
pnpm test src/__tests__/parser.spec.ts
```

Expected failures:

- `'parses score (centipawns) and pv moves'` — asserts `score: 2.14` (number),
  now returns `{ type: 'cp', value: 2.14 }`
- `'parses nps as a stat'` — asserts `{ nps: '34928' }` (string), now returns
  `{ nps: 34928 }` (number)

These are the known breaking changes. We'll fix them in Task 3.

**Step 4: Commit**

```bash
git add src/parser/info.ts
git commit -m "feat: rewrite info parser for full UCI spec compliance"
```

---

## Task 3: Update and extend tests in `src/__tests__/parser.spec.ts`

**Files:**

- Modify: `src/__tests__/parser.spec.ts`

**Step 1: Fix the two breaking test cases**

In the existing `describe('info', ...)` block, update:

```typescript
// OLD (line 92–102):
it('parses score (centipawns) and pv moves', () => {
  expect(
    info(
      'depth 2 score cp 214 time 1242 nodes 2124 nps 34928 pv e2e4 e7e5 g1f3',
    ),
  ).toMatchObject({
    depth: 2,
    score: 2.14,
    moves: ['e2e4', 'e7e5', 'g1f3'],
  });
});

// NEW:
it('parses score (centipawns) and pv moves', () => {
  expect(
    info(
      'depth 2 score cp 214 time 1242 nodes 2124 nps 34928 pv e2e4 e7e5 g1f3',
    ),
  ).toMatchObject({
    depth: 2,
    score: { type: 'cp', value: 2.14 },
    moves: ['e2e4', 'e7e5', 'g1f3'],
  });
});
```

```typescript
// OLD (line 114–116):
it('parses nps as a stat', () => {
  expect(info('nps 34928')).toMatchObject({ stats: { nps: '34928' } });
});

// NEW:
it('parses nps as a stat', () => {
  expect(info('nps 34928')).toMatchObject({ stats: { nps: 34928 } });
});
```

**Step 2: Add new test cases**

Append to the `describe('info', ...)` block (after the `tbhits` test):

```typescript
it('parses a cp score', () => {
  expect(info('score cp 214')).toMatchObject({
    score: { type: 'cp', value: 2.14 },
  });
});

it('parses a mate score', () => {
  expect(info('score mate 3')).toMatchObject({
    score: { type: 'mate', value: 3 },
  });
});

it('parses a negative mate score (engine getting mated)', () => {
  expect(info('score mate -2')).toMatchObject({
    score: { type: 'mate', value: -2 },
  });
});

it('parses a lowerbound score', () => {
  expect(info('score cp -30 lowerbound')).toMatchObject({
    score: { bound: 'lower', type: 'cp', value: -0.3 },
  });
});

it('parses an upperbound score', () => {
  expect(info('score cp 50 upperbound')).toMatchObject({
    score: { bound: 'upper', type: 'cp', value: 0.5 },
  });
});

it('parses depth with seldepth as an object', () => {
  expect(info('depth 12 seldepth 18')).toMatchObject({
    depth: { selective: 18, total: 12 },
  });
});

it('parses time in milliseconds', () => {
  expect(info('time 1242')).toMatchObject({ time: 1242 });
});

it('parses nodes as a number', () => {
  expect(info('nodes 123456')).toMatchObject({ nodes: 123_456 });
});

it('parses hashfull as a number', () => {
  expect(info('hashfull 512')).toMatchObject({ hashfull: 512 });
});

it('parses cpuload as a number', () => {
  expect(info('cpuload 750')).toMatchObject({ cpuload: 750 });
});
```

**Step 3: Run all tests**

```bash
pnpm test src/__tests__/parser.spec.ts
```

Expected: all 26 tests pass (16 existing + 10 new).

**Step 4: Run full test suite**

```bash
pnpm test
```

Expected: all tests pass (integration skipped without `UCI_ENGINE_PATH`).

**Step 5: Run lint**

```bash
pnpm lint
```

Expected: 0 errors.

**Step 6: Commit**

```bash
git add src/__tests__/parser.spec.ts
git commit -m "test: update and extend info parser tests for full spec compliance"
```

---

## Task 4: Final verification

**Step 1: Run the full pipeline**

```bash
pnpm lint && pnpm test && pnpm build
```

Expected: 0 lint errors, all tests pass, build succeeds.

**Step 2: Run integration tests if stockfish is available**

```bash
UCI_ENGINE_PATH=$(which stockfish) pnpm test src/__tests__/integration.spec.ts
```

Expected: all 6 integration tests pass.

**Step 3: Commit any lint auto-fixes if needed**

```bash
git add -A && git commit -m "chore: lint fixes after info parser implementation"
```

Only commit if there are actual changes. If the working tree is clean, skip.
