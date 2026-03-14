# Wrap Emittery Design

**Date:** 2026-03-15

## Problem

`UCI` currently extends `Emittery<Events>`, which exposes Emittery's full public
API surface on `UCI` — including `debug`, `emit`, `emitSerial`, `onAny`,
`anyEvent`, `offAny`, `clearListeners`, `listenerCount`, `bindMethods`, and
others. This:

1. Causes a naming collision with the UCI protocol's `debug` command
2. Exposes internal methods (`emit`, `emitSerial`) that users should not call
3. Gives no control over the public API surface

## Solution

Stop extending `Emittery`. Wrap it as a private field instead. Expose only `on`,
`off`, and `once` as explicit public methods with the same typed signatures
users have today. Add `debug(on: boolean)` as a new public method now that the
collision is resolved.

## Architecture

### New private field

```typescript
readonly #emitter = new Emittery<Events>();
```

Replaces `extends Emittery<Events>`.

### Public event methods

```typescript
on<K extends keyof Events>(
  event: K,
  listener: (data: Events[K]) => void | Promise<void>,
): () => void

off<K extends keyof Events>(
  event: K,
  listener: (data: Events[K]) => void | Promise<void>,
): void

once<K extends keyof Events>(event: K): Promise<Events[K]>
```

These delegate directly to `this.#emitter`. Return types and signatures are
identical to the current Emittery-based API.

### New `debug` method

```typescript
debug(on: boolean): Promise<void> {
  return this.execute(`debug ${on ? 'on' : 'off'}`);
}
```

### Internal wiring

Every `this.emit(...)`, `this.on(...)`, `this.once(...)` inside `src/index.ts`
becomes `this.#emitter.emit(...)`, `this.#emitter.on(...)`,
`this.#emitter.once(...)`. Affected locations:

- Constructor: `this.on('id', ...)`, `this.on('option', ...)`,
  `this.on('uciok', ...)`
- `ready()`: `this.on('readyok', ...)`, `this.#emitter.once(...)` (already uses
  `this.on` pattern)
- `ingest()`: `this.emit('output', ...)`, `this.emit(command, ...)`
- Error paths: all `this.emit('error', ...)`

`this.process.on(...)` calls are unchanged — those are on the `Process` emitter,
not `this`.

## Files Changed

| File           | Change                                                                                                                                   |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `src/index.ts` | Remove `extends Emittery<Events>`, add `#emitter` field, add `on`/`off`/`once`/`debug` public methods, update all internal emitter calls |

No changes to `src/process.ts`, `src/parser/`, `src/types.ts`, or
`src/options.ts`.

## Testing

- All existing tests use `uci.on('error', ...)` — unchanged, no test updates
  needed for the refactor
- New tests for `debug(true)` and `debug(false)` verify `execute` is called with
  `'debug on'` and `'debug off'` respectively
