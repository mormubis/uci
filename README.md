# UCI

[![npm](https://img.shields.io/npm/v/@echecs/uci)](https://www.npmjs.com/package/@echecs/uci)
[![Test](https://github.com/mormubis/uci/actions/workflows/test.yml/badge.svg)](https://github.com/mormubis/uci/actions/workflows/test.yml)
[![Coverage](https://codecov.io/gh/mormubis/uci/branch/main/graph/badge.svg)](https://codecov.io/gh/mormubis/uci)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**UCI** is a TypeScript wrapper for the
[Universal Chess Interface](https://www.wbec-ridderkerk.nl/html/UCIProtocol.html)
protocol — the standard way for chess GUIs to communicate with chess engines
such as Stockfish, Leela Chess Zero, and Komodo.

It spawns and manages the engine process, handles the full UCI handshake, and
surfaces engine output as typed events. Zero configuration required.

## Why this library?

Working with UCI engines directly means parsing a line-oriented text protocol,
managing process lifecycle, and coordinating asynchronous handshakes. This
library handles all of that:

- **Full protocol compliance** — implements the complete UCI spec: `uci`,
  `isready`, `position`, `go`, `stop`, `setoption`, and `register`. Engine
  output (`id`, `option`, `info`, `bestmove`) is parsed into typed objects.
- **Typed `info` events** — search information is fully parsed: depth, selective
  depth, score (centipawns or mate distance with bound flags), PV moves, nodes,
  NPS, time, hashfull, and CPU load.
- **Typed `score`** — scores are a discriminated union (`cp` or `mate`, with
  optional `lowerbound`/`upperbound`), not a raw string or plain number.
- **Engine options** — options advertised by the engine are validated before
  being sent via `setoption`.
- **Event-based** — built on
  [Emittery](https://github.com/sindresorhus/emittery) for fully-typed async
  events.

## Installation

```bash
npm install @echecs/uci
```

## Quick Start

```typescript
import UCI from '@echecs/uci';

const engine = new UCI('/usr/bin/stockfish');

engine.on('bestmove', ({ move }) => {
  console.log(`Best move: ${move}`); // e.g. "e2e4"
});

await engine.start();
```

## Usage

### Creating an engine

```typescript
new UCI(path: string, options?: { timeout?: number })
```

`path` is the path to the UCI engine binary. `timeout` (default 5000 ms) is how
long to wait for the engine to respond to the initial `uci` command before
emitting an error.

```typescript
const engine = new UCI('/usr/bin/stockfish');
const engine = new UCI('./engines/lc0', { timeout: 10_000 });
```

### Starting a search

```typescript
await engine.start(options?: Record<string, unknown>): Promise<void>
```

Waits for the engine to be ready, applies any `setoption` overrides, then sends
`go`. Listen for `info` events during the search and `bestmove` when it
finishes.

```typescript
engine.on('info', (info) => {
  if (info.score?.type === 'cp') {
    console.log(`Score: ${info.score.value} pawns at depth ${info.depth}`);
  }
  if (info.score?.type === 'mate') {
    console.log(`Mate in ${info.score.value}`);
  }
});

engine.on('bestmove', ({ move, ponder }) => {
  console.log(`Best: ${move}, ponder: ${ponder}`);
});

await engine.start({ Threads: 4, Hash: 256 });
```

### Sending moves

```typescript
await engine.move(move: string): Promise<void>
```

Sends a move in long algebraic notation and restarts the search from the new
position. Moves accumulate — call `reset()` to start a new game.

```typescript
await engine.move('e2e4');
await engine.move('e7e5');
await engine.move('e7e8q'); // promotion
```

### Setting position

```typescript
engine.position = 'startpos'; // initial position (default)
engine.position = 'fen <fenstring>'; // custom position
```

Assigning `position` resets the move list and sends `position` to the engine.

### Configuring search

```typescript
engine.depth = 10; // search to depth 10 (default: 'infinite')
engine.lines = 3; // return top 3 lines via MultiPV (default: 1)
```

### Stopping and resetting

```typescript
await engine.stop(): Promise<void>   // sends 'quit', terminates the process
await engine.reset(): Promise<void>  // resets to startpos
```

### Low-level access

```typescript
await engine.execute(command: string): Promise<void>
```

Sends an arbitrary UCI command string to the engine. Useful for engine-specific
extensions (e.g. `d` for board display in Stockfish).

## Events

```typescript
engine.on('bestmove',      ({ move, ponder }) => void)
engine.on('copyprotection', (status: string) => void)
engine.on('error',          (error: Error)   => void)
engine.on('id',             ({ name, author }) => void)
engine.on('info',           (info: InfoCommand) => void)
engine.on('option',         (option: Option) => void)
engine.on('output',         (line: string)   => void)
engine.on('readyok',        () => void)
engine.on('registration',   (status: string) => void)
engine.on('uciok',          () => void)
```

### `InfoCommand`

```typescript
{
  cpuload?:    number,                          // cpu usage in permill
  current?:    { line?: string[], move?: string, number?: number },
  depth?:      number | { selective: number, total: number },
  hashfull?:   number,                          // hash usage in permill
  info?:       string,                          // free-form engine string
  line?:       number,                          // multipv line number
  moves?:      string[],                        // pv move list
  nodes?:      number,
  refutation?: string[],
  score?:      Score,
  stats?:      { nps?: number },
  tbhits?:     number,
  time?:       number,                          // ms
}
```

### `Score`

```typescript
| { type: 'cp';   value: number }                        // centipawns ÷ 100
| { type: 'mate'; value: number }                        // moves to mate (negative = being mated)
| { type: 'cp';   value: number; bound: 'lower' }
| { type: 'cp';   value: number; bound: 'upper' }
```

### `Option`

```typescript
{ name: string } & (
  | { type: 'button' }
  | { type: 'check',  default: boolean }
  | { type: 'combo',  default: string, var: string[] }
  | { type: 'spin',   default: number, min?: number, max?: number }
  | { type: 'string', default: string }
)
```

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) for
guidelines on how to submit issues and pull requests.
