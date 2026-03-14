# Info Parser Improvement Design

**Date:** 2026-03-13 **Status:** Approved

---

## Goal

Make `src/parser/info.ts` fully compliant with the UCI protocol spec. The
extractor already captures all raw tokens; the work is in the mapping layer: fix
the `score` field, surface dropped numeric fields, and correct type mismatches.

---

## Score type

`score` changes from `unknown` to a discriminated union in `@types/uci.d.ts`:

```typescript
type Score =
  | { bound: 'lower'; type: 'cp'; value: number }
  | { bound: 'upper'; type: 'cp'; value: number }
  | { bound?: never; type: 'cp'; value: number }
  | { bound?: never; type: 'mate'; value: number };
```

- `cp` values are divided by 100 (centipawns → pawns).
- `mate` values are moves-to-mate; negative = engine is being mated.
- `bound` is only present when `lowerbound` or `upperbound` appears in the same
  `score` token string.

The raw extractor value for `score` arrives as everything after the `score`
keyword up to the next known key, e.g. `"cp 214"`, `"mate -2"`,
`"cp -30 lowerbound"`.

---

## Remaining field corrections

| UCI token      | Current output           | Corrected output                                     |
| -------------- | ------------------------ | ---------------------------------------------------- |
| `seldepth <x>` | dropped                  | combined with `depth` → `{ selective: x, total: d }` |
| `time <x>`     | dropped                  | `time: number` (ms)                                  |
| `nodes <x>`    | dropped                  | `nodes: number`                                      |
| `nps <x>`      | `stats: { nps: string }` | `stats: { nps: number }`                             |
| `hashfull <x>` | raw string               | `hashfull: number` (permill)                         |
| `cpuload <x>`  | raw string               | `cpuload: number` (permill)                          |
| `tbhits <x>`   | already `number`         | no change                                            |

`seldepth` is only meaningful alongside `depth`. When both are present the
output is `depth: { selective: number; total: number }`; when only `depth` is
present it remains a plain `number`. This matches the existing type in
`@types/uci.d.ts`.

`string` (free-form commentary) already maps to `info: string` — no change.

---

## Type changes in `@types/uci.d.ts`

```typescript
export type InfoCommand = {
  // ...existing fields...
  depth?: number | { selective: number; total: number };
  nodes?: number; // was: missing
  time?: number; // was: missing
  score?: Score; // was: unknown
  stats?: { nps?: number }; // was: { nps?: string }
  // ...
};
```

---

## Test changes in `src/__tests__/parser.spec.ts`

### New test cases (append to `describe('info', ...)`)

**Score variants:**

- `"score cp 214"` → `{ score: { type: 'cp', value: 2.14 } }`
- `"score mate 3"` → `{ score: { type: 'mate', value: 3 } }`
- `"score mate -2"` → `{ score: { type: 'mate', value: -2 } }`
- `"score cp -30 lowerbound"` →
  `{ score: { type: 'cp', value: -0.3, bound: 'lower' } }`
- `"score cp 50 upperbound"` →
  `{ score: { type: 'cp', value: 0.5, bound: 'upper' } }`

**Combined depth + seldepth:**

- `"depth 12 seldepth 18"` → `{ depth: { selective: 18, total: 12 } }`

**Numeric fields:**

- `"time 1242"` → `{ time: 1242 }`
- `"nodes 123456"` → `{ nodes: 123456 }`
- `"hashfull 512"` → `{ hashfull: 512 }`
- `"cpuload 750"` → `{ cpuload: 750 }`

### Updated existing test

- `"nps 34928"` → `{ stats: { nps: 34928 } }` (was `'34928'`)

---

## Breaking changes

- `InfoCommand.score` type changes from `unknown` to `Score` — callers that
  previously used `score as number` must update.
- `InfoCommand.stats.nps` changes from `string` to `number`.

---

## Out of scope

- `currline` (multi-CPU line tracking) — rarely used, complex parsing.
- `refutation` improvements — already mapped as raw string, sufficient.
- `ucinewgame`, `position` setter error handling — separate features.
