# Specification: Universal Chess Interface (UCI)

Implements the UCI protocol as defined in the
[UCI specification by Stefan Meyer-Kahlen](https://www.shredderchess.com/download/div/uci.zip)
(Shredder Chess, 2004) — the de facto standard for chess engine communication.

---

## Protocol Overview

UCI is a text-based protocol for communication between a chess GUI (or
application) and a chess engine. Communication is over stdin/stdout. Each
message is terminated by a newline.

---

## GUI → Engine Commands

| Command                             | Description                                                                        |
| ----------------------------------- | ---------------------------------------------------------------------------------- |
| `uci`                               | Start UCI mode — engine responds with `id` and `option` lines, then `uciok`        |
| `isready`                           | Synchronise — engine responds `readyok` when ready                                 |
| `setoption name <n> value <v>`      | Set engine option                                                                  |
| `ucinewgame`                        | Signal that a new game is starting                                                 |
| `position startpos [moves <m...>]`  | Set position from start, optionally with move list                                 |
| `position fen <fen> [moves <m...>]` | Set position from FEN string                                                       |
| `go [options]`                      | Start searching; options include `movetime`, `infinite`, `depth`, `wtime`, `btime` |
| `stop`                              | Stop searching                                                                     |
| `quit`                              | Exit                                                                               |

---

## Engine → GUI Responses

| Response                                                     | Description                                              |
| ------------------------------------------------------------ | -------------------------------------------------------- |
| `id name <name>`                                             | Engine name                                              |
| `id author <author>`                                         | Engine author                                            |
| `uciok`                                                      | Confirms UCI mode after `uci` command                    |
| `readyok`                                                    | Confirms engine is ready after `isready`                 |
| `bestmove <move> [ponder <move>]`                            | Best move found (in Long Algebraic Notation)             |
| `info <...>`                                                 | Search information (depth, score, pv, nodes, time, etc.) |
| `option name <n> type <t> [default <d>] [min <m>] [max <x>]` | Declare an engine option                                 |

---

## Move Format (Long Algebraic Notation)

Moves in UCI use Long Algebraic Notation (LAN), not SAN:

```
<from><to>[promotion]
```

Examples: `e2e4`, `e1g1` (castling), `e7e8q` (promotion to queen).

---

## Info Fields

| Field             | Description                     |
| ----------------- | ------------------------------- |
| `depth <n>`       | Search depth in plies           |
| `score cp <n>`    | Score in centipawns             |
| `score mate <n>`  | Mate in N moves                 |
| `nodes <n>`       | Nodes searched                  |
| `time <ms>`       | Time spent in milliseconds      |
| `pv <moves>`      | Principal variation (best line) |
| `currmove <move>` | Currently searching this move   |

---

## Implementation Notes

- Wraps a UCI-compatible engine process (e.g. Stockfish) spawned as a child
  process
- Events are emitted via `emittery` — listeners attach to `'bestmove'`,
  `'info'`, `'ready'`, `'error'`
- `UCI` class is the main entry point: `new UCI(path)`
- `uci.start()` — sends `uci`, waits for `uciok`
- `uci.ready()` — sends `isready`, waits for `readyok`
- `uci.position(fen, moves?)` — sets position
- `uci.go(options)` — starts search, resolves with `bestmove` result
- `uci.stop()` — stops search
- `uci.quit()` — sends `quit` and closes the process
- Errors propagate via the `'error'` event — never thrown directly
- Has runtime dependencies: `emittery` (event emitter) and `zod` (option
  validation)

## Sources

- [UCI Protocol Specification](https://www.shredderchess.com/download/div/uci.zip)
  (Shredder Chess, 2004)
- [UCI Protocol Description — CPW](https://www.chessprogramming.org/UCI)
