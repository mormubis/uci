# AGENTS.md

Agent guidance for the `@echecs/uci` repository — a TypeScript wrapper around
UCI chess engine processes, providing a typed event-emitter API.

---

## Project Overview

`@echecs/uci` wraps a UCI chess engine subprocess and exposes it as a typed
`Emittery`-based event emitter. The public API is a single default export: the
`UCI` class. Runtime dependencies: `emittery` (event emitter) and `zod` (option
validation).

Key source files:

| File                                | Role                                                      |
| ----------------------------------- | --------------------------------------------------------- |
| `src/index.ts`                      | `UCI` class — public API and engine lifecycle             |
| `src/types.ts`                      | Exported types: `ID`, `InfoCommand`, `Option`, `Score`    |
| `src/options.ts`                    | `Options` class — engine option store with Zod validation |
| `src/process.ts`                    | `Process` class — child process wrapper with line emitter |
| `src/parser/index.ts`               | Parser dispatcher — routes UCI output tokens to handlers  |
| `src/parser/bestmove.ts`            | Parses `bestmove` responses                               |
| `src/parser/info.ts`                | Parses `info` lines into typed `InfoCommand` objects      |
| `src/parser/identity.ts`            | Parses `id` responses                                     |
| `src/parser/extract.ts`             | Utility: extracts named fields from UCI token strings     |
| `src/parser/noop.ts`                | Pass-through for commands with no payload                 |
| `src/__tests__/index.spec.ts`       | Unit tests for the `UCI` class                            |
| `src/__tests__/parser.spec.ts`      | Unit tests for the parser module                          |
| `src/__tests__/integration.spec.ts` | Integration tests (skipped without a real engine binary)  |

---

## Commands

Use **pnpm** exclusively (no npm/yarn).

### Build

```bash
pnpm build              # bundle TypeScript → dist/ via tsdown
```

### Test

```bash
pnpm test               # run all tests once (vitest run)
pnpm test:watch         # watch mode
pnpm test:coverage      # with v8 coverage report

# Run a single test file
pnpm test src/__tests__/parser.spec.ts

# Run tests matching a name substring
pnpm test -- --reporter=verbose -t "bestmove"
```

> **Note:** `integration.spec.ts` tests are skipped when `UCI_ENGINE_PATH` is
> not set. Set it to a UCI engine path to enable them. 6 skipped tests is
> expected and normal in CI.

### Lint & Format

```bash
pnpm lint               # ESLint + tsc type-check (auto-fixes style issues)
pnpm lint:ci            # strict — zero warnings allowed, no auto-fix
pnpm lint:style         # ESLint only (auto-fixes)
pnpm lint:types         # tsc --noEmit type-check only
pnpm format             # Prettier (writes changes)
pnpm format:ci          # Prettier check only (no writes)
```

### Full pre-PR check

```bash
pnpm lint && pnpm test && pnpm build
```

---

## TypeScript

- **Strict mode** fully enabled: `strict`, `noUncheckedIndexedAccess`,
  `noImplicitOverride`.
- Target: `ESNext`; module system: `NodeNext` with NodeNext resolution.
- All type-only imports must use `import type { ... }` (enforced by
  `@typescript-eslint/consistent-type-imports`).
- All exported functions and methods must have explicit return types
  (`@typescript-eslint/explicit-module-boundary-types`).
- Avoid non-null assertions (`!`); use explicit narrowing instead
  (`@typescript-eslint/no-non-null-assertion` is a warning).
- Use `interface` for object shapes and `type` for unions/aliases
  (`@typescript-eslint/consistent-type-definitions: ['error', 'interface']`).
- Always include `.js` extension on relative imports — NodeNext resolution
  requires it even for `.ts` source files.
- Class members follow natural ordering (fields → constructor → getters/setters
  → methods, each group by visibility) — enforced by
  `@typescript-eslint/member-ordering`.

---

## Code Style

### Formatting (Prettier)

- **Single quotes** for strings.
- **Trailing commas** everywhere (`all`).
- `quoteProps: 'consistent'` — quote all object keys or none within an object.
- `proseWrap: 'always'` — wrap markdown prose at print width.
- Prettier runs automatically via lint-staged on every commit.

### ESLint rules of note

- `eqeqeq` — always use `===`/`!==`.
- `curly: 'all'` — always use braces for control flow bodies, even single lines.
- `sort-keys` — object literal keys and interface fields must be sorted
  alphabetically in source files. Disabled in test files.
- `sort-imports` — named import specifiers must be sorted within each import
  statement. Declaration-level ordering is handled by `import-x/order`.
- `no-console` — disallowed in source (warning); permitted in tests.
- **`eslint-plugin-unicorn`** (recommended) is enabled — modern JS/TS idioms
  enforced throughout.
- **`@vitest/eslint-plugin`** (recommended) is enabled in test files.

### Import ordering (`import-x/order`)

Groups, separated by a blank line, in this order:

1. Built-in + external packages
2. Internal (`@/…` path aliases)
3. Parent and sibling relative imports
4. Type-only imports

---

## Naming Conventions

| Construct              | Convention             | Examples                     |
| ---------------------- | ---------------------- | ---------------------------- |
| Classes                | `PascalCase`           | `UCI`, `Process`, `Options`  |
| Functions / methods    | `camelCase`            | `execute`, `ingest`, `ready` |
| Types / Interfaces     | `PascalCase`           | `ID`, `InfoCommand`, `Score` |
| Module-level constants | `SCREAMING_SNAKE_CASE` | `TIMEOUT`                    |
| Variables / Parameters | `camelCase`            | `command`, `payload`, `path` |
| Source files           | `camelCase.ts`         | `index.ts`, `process.ts`     |

---

## Testing Conventions

- Framework: **Vitest** (`vitest run`).
- Test files live in `src/__tests__/` with the `.spec.ts` suffix.
- Use `describe` to group cases; use `it` (not `test`) inside them.
- Prefer `expect(x).toBe(y)` for exact equality.
- `sort-keys` and `no-console` are relaxed inside `__tests__/`.
- Integration tests (requiring a real engine binary) are skipped automatically
  when `UCI_ENGINE_PATH` is not set. To run them locally, export the path to a
  UCI-compatible engine (e.g. Stockfish):
  ```bash
  UCI_ENGINE_PATH=/usr/local/bin/stockfish pnpm test
  ```
  Never remove the `skipIf` guard — integration tests must never fail CI
  unconditionally.

---

## Architecture Notes

- `UCI` does **not** extend `Emittery` — it holds a private `#emitter` field and
  exposes only `on()`, `off()`, and `once()`. All engine output is surfaced as
  typed events (`bestmove`, `info`, `id`, `option`, `error`, etc.).
- Engine communication flows: `Process` (child process + line reader) →
  `UCI#ingest` (parser dispatch) → typed `emit` calls.
- `Options` validates and stores engine options using Zod schemas.
- `src/types.ts` holds all public types as named exports — do not use global
  ambient namespaces.
- Propagate errors via `this.#emitter.emit('error', ...)` — do not swallow them
  silently.
- Runtime dependencies (`emittery`, `zod`) are intentional; do not remove them.

### Error propagation — known limitation

`ready()` and `execute()` are **error-absorbing**: they catch all rejections
internally and route them to `this.#emitter.emit('error', ...)`, then return a
resolved promise. They never reject.

This means adding a `.catch()` to a chain like
`this.ready().then(() => this.execute(...))` is **dead code** — neither call
will reject, so the `.catch()` can never fire. Do not propose "add a `.catch()`
to propagate errors" as a fix anywhere in `src/index.ts`; it will not work
without first refactoring `ready()` or `execute()` to throw instead of absorb.

---

## Publishing

The package is published as `@echecs/uci`. A GitHub Actions workflow publishes
automatically when the `version` field in `package.json` is bumped on `main`. Do
not manually publish. Always update `CHANGELOG.md` alongside any version bump.
Bump patch for fixes, minor for new features, major for breaking changes.
