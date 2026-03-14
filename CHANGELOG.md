# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-03-13

Initial public release.

### Added

- `UCI` class — wraps a UCI chess engine process with a typed event-emitter API
- Full UCI handshake (`uci`, `isready`, `uciok`, `readyok`)
- `start(options?)` — applies `setoption` overrides and sends `go`
- `move(move)` — sends a move in long algebraic notation and restarts search
- `stop()` — sends `quit` and terminates the engine process
- `reset()` — resets position to `startpos`
- `execute(command)` — sends an arbitrary UCI command string
- `depth` and `lines` properties for controlling search parameters
- `position` setter for FEN or `startpos`
- Typed `info` events: depth, selective depth, score (`cp`/`mate` with
  `lowerbound`/`upperbound`), PV moves, nodes, NPS, time, hashfull, CPU load
- Typed `bestmove`, `id`, `option`, `copyprotection`, `registration`, `error`,
  `output`, `readyok`, `uciok` events
- Engine option validation via Zod schemas
