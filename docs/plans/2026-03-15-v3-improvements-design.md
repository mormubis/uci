# v3.0.0 Improvements Design

Date: 2026-03-15

## Overview

Four areas of improvement targeting full UCI protocol compliance, a cleaner
public API, and better correctness. Ships as v3.0.0 due to a breaking change in
the `start()` signature.

## Goals

- Add `sbhits` field to `InfoCommand` (spec compliance)
- Add `ucinewgame` support in `reset()`
- Add `GoOptions` for time controls and search parameters
- Refactor constructor to accept `config` for `setoption` parameters
- Add pondering support (`ponder()`, `ponderhit()`)

## Non-Goals

- Redesigning the core event-emitter architecture
- Changing how `Process` or `Options` work internally
- Adding a `search()` API or other higher-level abstractions

---

## Section 1: `sbhits` (patch-level, absorbed into v3.0.0)

### Problem

The UCI spec defines `sbhits` (positions found in the Shredder endgame
databases) as a valid `info` field alongside `tbhits`. It is absent from
`InfoCommand` and the `info` parser.

### Changes

**`src/types.ts`**

Add `sbhits?: number` to `InfoCommand`, sorted alphabetically between `score`
and `stats`.

**`src/parser/info.ts`**

- Add `'sbhits'` to the `extractor` key list (alphabetically after `score`)
- Map `sbhitsString → sbhits: Number(sbhitsString)` in the return object,
  following the same pattern as `tbhits`

### Tests

Add a unit test in `parser.spec.ts`:

```ts
it('parses sbhits', () => {
  expect(info('sbhits 42')).toEqual({ sbhits: 42 });
});
```

---

## Section 2: `ucinewgame` in `reset()`

### Problem

`reset()` currently sets `this.position = 'startpos'` but does not send
`ucinewgame`. The UCI spec requires `ucinewgame` before a `position` command
when starting a fresh game, so engines that track game history may behave
incorrectly.

### Design

`reset()` sends `ucinewgame` followed by `position startpos` in sequence. No new
public method is exposed — `execute()` remains the escape hatch for advanced
users who need `ucinewgame` without a position reset.

```ts
async reset(): Promise<void> {
  await this.ready();
  await this.execute('ucinewgame');
  this.position = 'startpos';
}
```

### Tests

Add a unit test verifying `execute` is called with `'ucinewgame'` before
`'position startpos'` when `reset()` is called.

---

## Section 3: `GoOptions` and constructor `config`

### Problem

`go()` only supports `depth`/`infinite`. Real games require time controls
(`wtime`, `btime`, etc.). The `start()` method currently accepts a
`Record<string, unknown>` for `setoption` parameters mixed with `go` concerns,
which is confusing.

### Design

**New type: `GoOptions`** (exported from `src/types.ts`)

```ts
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

When `depth` is set in `GoOptions`, it takes precedence over `this.#depth`. When
neither is set, the command defaults to `go infinite`.

**Constructor change**

```ts
constructor(
  path: string,
  {
    config,
    timeout,
  }: { config?: Record<string, unknown>; timeout?: number } = {},
)
```

`config` entries are stored as `#config` and applied via `setoption` inside
`start()` after the UCI handshake, before sending `go`. This replaces the
current practice of passing `setoption` overrides to `start()`.

**`start()` signature change (breaking)**

```ts
async start(options?: GoOptions): Promise<void>
```

Previously: `async start(options: Record<string, unknown> = {})`.

The method applies `#config` setoptions (from the constructor) and then calls
`go(options)`.

**`move()` signature change (additive)**

```ts
async move(input: string, options?: GoOptions): Promise<void>
```

`options` is forwarded to `go()`.

**`go()` updated signature (private)**

```ts
private async go(options: GoOptions = {}, ponder = false): Promise<void>
```

Builds the UCI `go` command string from `options`, falling back to `this.#depth`
for depth when `options.depth` is not set. The `ponder` flag appends `ponder` to
the command.

Command string construction:

```
go [ponder] [searchmoves m1 m2 ...] [wtime x] [btime x] [winc x] [binc x]
   [movestogo x] [depth x] [nodes x] [mate x] [movetime x] [infinite]
```

`infinite` is appended only when none of `depth`, `movetime`, `nodes`, or `mate`
are set and we are not in time-control mode (no `wtime`/`btime`).

**`#depth` property**

The `depth` property remains on `UCI` as a per-instance default for when
`GoOptions.depth` is not provided. It continues to work as before.

### Migration from v2

```ts
// v2
const uci = new UCI('/path/to/engine');
await uci.start({ MultiPV: 4, Hash: 128 });

// v3
const uci = new UCI('/path/to/engine', { config: { Hash: 128 } });
uci.lines = 4; // MultiPV is still set via the lines property
await uci.start(); // no setoption args — config applied internally
await uci.start({ movetime: 1000 }); // time-controlled search
```

### Tests

- Unit test for `go` command string with all `GoOptions` combinations
- Unit test verifying `#config` setoptions are sent before `go` in `start()`
- Unit test for `move()` forwarding `GoOptions` to `go()`

---

## Section 4: Pondering

### Problem

Pondering — thinking on the opponent's time — is a standard UCI feature. The
engine signals intent to ponder via `bestmove <m> ponder <pm>`. Currently there
is no way to initiate pondering or respond to `ponderhit`.

### Design

**New private state**

```ts
#pondering = false;
```

**`ponder(options?: GoOptions): Promise<void>`** (new public method)

Sends `position ... moves [current moves] [ponder move]` then
`go ponder [options]`. Sets `#pondering = true`.

The caller is expected to call `ponder()` after receiving a `bestmove` event
with a `ponder` field set. The `ponder` move is passed as an argument:

```ts
async ponder(move: string, options?: GoOptions): Promise<void>
```

This appends `move` to the internal moves list temporarily and sends
`go ponder`.

**`ponderhit(): Promise<void>`** (new public method)

Sends `ponderhit` if `#pondering` is `true`. Clears `#pondering`. If called when
not pondering, emits an error event.

**Interaction with `stop()`**

When `stop()` is called while `#pondering` is true, `#pondering` is cleared.

### Tests

- Unit test: `ponder()` sends `go ponder` command
- Unit test: `ponderhit()` sends `ponderhit` command
- Unit test: `ponderhit()` emits error when not in ponder state
- Unit test: `stop()` clears ponder state

---

## Architecture

No structural changes to `Process`, `Options`, or the parser pipeline. All
changes are confined to:

- `src/types.ts` — new `GoOptions` type, `sbhits` in `InfoCommand`
- `src/parser/info.ts` — `sbhits` parsing
- `src/index.ts` — all behavioral changes

## Error Handling

- `ponder()` and `ponderhit()` propagate errors via
  `this.#emitter.emit('error', ...)`, consistent with the rest of the class
- Invalid state calls (e.g. `ponderhit()` when not pondering) emit an error
  rather than throwing

## Versioning

**v3.0.0** — breaking change to `start()` parameter type.

All four areas ship together in a single version bump with a comprehensive
CHANGELOG entry and migration guide.
