# v4.0 Improvements Design

Breaking release addressing correctness bugs, API alignment with UCI library
conventions, and test coverage gaps.

## Changes

### 1. Fix stderr Buffer typing in Process

`Process` (src/process.ts:33) emits raw `Buffer` objects on the `error` event,
but the `Events` interface declares `error: Error`. Wrap stderr data in an
`Error` before emitting:

```typescript
this.child.stderr.on('data', (data: Buffer) =>
  this.emit('error', new Error(data.toString().trim())),
);
```

### 2. Remove permanent error state from ready()

`ready()` caches the first error in `#errored` (src/index.ts:445). Every
subsequent call re-emits that cached error and returns immediately
(src/index.ts:413-416), with no recovery path.

Remove the `#errored` field entirely. Each `ready()` call attempts a fresh
`isready`/`readyok` handshake. The existing `exit` and `timeout` races already
handle dead or hung engines. Transient failures (e.g. slow tablebase loading)
become recoverable.

### 3. Convert position setter to position() method

The current setter (src/index.ts:165-170) calls
`ready().then(() => execute(...))` but detaches the promise -- callers cannot
await it or catch write errors.

Replace with an async method:

```typescript
async position(input: string): Promise<void> {
  this.#position = input;
  this.#moves = [];
  await this.ready();
  await this.execute(`position ${input}`);
}
```

This aligns with both node-uci and python-chess, which treat position as an
awaitable operation that resolves after the engine confirms readiness via
`readyok`. The position getter becomes `get currentPosition(): string` or is
dropped.

**Breaking:** `engine.position = 'startpos'` becomes
`await engine.position('startpos')`.

### 4. Fill test coverage gaps

**Process class (58% to 90%+):**

- Stdout buffering: partial lines, multiple lines in one chunk, empty lines
- Stderr emission: verify `Error` objects produced (after fix 1)
- `write()` error path: simulate stdin write failure
- Process exit code forwarding

**go() option combinations:**

- `depth`, `nodes`, `mate`, `movetime` individually
- `searchmoves` array formatting
- `infinite` flag
- Combinations (e.g. `wtime` + `winc` + `movestogo`)

**Edge cases:**

- Unknown UCI output triggers `output` event
- Malformed `info` lines (incomplete score, missing values)
- `ready()` recovery after timeout (enabled by fix 2)

## Non-goals

- Error model rework (execute/ready still absorb errors)
- AbortSignal support
- AsyncDisposable
- Typed unknown command handling
- Engine capability detection
- Changing id() return type (keeps throwing when undefined)
