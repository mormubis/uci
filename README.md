# Universal Chess Interface (UCI)

UCI is a Universal Chess Interface (UCI) designed for integrating chess engines
with graphical user interfaces (GUIs). For more details, you can refer to the
official
[UCI Protocol Documentation](https://www.wbec-ridderkerk.nl/html/UCIProtocol.html).

## Installation

```bash
npm install --save-dev @echecs/uci
```

## Usage

The UCI module provides functions to communicate with chess engines using the
UCI protocol.

### Example

Here's a basic example demonstrating how to use the UCI module:

```typescript
import { UCI } from '@echecs/uci';

const engine = new UCI('path-to-executable-engine');

engine.on('info', () => {
  console.log('Engine is ready');
});

engine.on('bestmove', ({ move }) => {
  console.log(`Best move: ${move}`);
});

// Optional configurations
engine.lines = 3; // Set the number of lines to return in the 'info' callback
engine.depth = 10; // Set the depth for the engine to search

// Start the engine
engine.start();

// Send a move to the engine
engine.move('c2c4');
```

## API

The UCI module provides the following methods and properties:

### Constructor

#### `UCI(executable: string, options?: { timeout?: number }): UCI` (Constructor)

Initializes a new UCI instance with the path to the executable of the chess
engine.

**Example:**

```typescript
const engine = new UCI('./stockfish'); // Path to the UCI engine executable
```

### Methods

#### `execute(command: string): Promise<void>`

Sends arbitrary UCI commands to the engine. This method is useful for low-level
control.

**Example:**

```typescript
engine.on('output', (data: string) => {
  console.log(`Engine output:\n${data}`);
});

engine.execute('d'); // Sends an arbitrary UCI command

// Engine output:
// +---+---+---+---+---+---+---+---+
// | r |   | b | q | k |   | n | r | 8
// +---+---+---+---+---+---+---+---+
// | p | p | p |   |   | p | p | p | 7
// +---+---+---+---+---+---+---+---+
// |   |   | n | p |   |   |   |   | 6
// +---+---+---+---+---+---+---+---+
// |   |   | b |   | p |   |   |   | 5
// +---+---+---+---+---+---+---+---+
// |   | P | B |   | P |   |   |   | 4
// +---+---+---+---+---+---+---+---+
// |   |   |   |   |   | N |   |   | 3
// +---+---+---+---+---+---+---+---+
// | P |   | P | P |   | P | P | P | 2
// +---+---+---+---+---+---+---+---+
// | R | N | B | Q | K |   |   | R | 1
// +---+---+---+---+---+---+---+---+
//   a   b   c   d   e   f   g   h
```

Note: The command above works only for engines that support the `d` command,
such Stockfish or other UCI engines that provide a board display. The output
format may vary by engine.

#### `move(move: string): Promise<void>`

Sends a move to the UCI engine. The `move` parameter should be in standard
algebraic notation (e.g., 'e2e4', 'c2c4').

For promotions, you can specify the promotion piece by appending it to the move
(e.g., 'e7e8q' for promoting to a queen).

**Example:**

```typescript
engine.move('e2e4'); // Sends the move e2 to e4
```

#### `register(options: { name: string, code: string }): Promise<void>`

Registers the engine with a name and code, typically for engines that require
registration.

**Example:**

```typescript
engine.register({
  name: 'MyChessEngine',
  code: 'my_engine_code',
}); // Registers the engine
```

#### `start(options?: { [key: string]: any }): Promise<void>`

Starts the UCI engine. The `options` parameter can be used to customize the
engine's behavior.

**Example:**

```typescript
engine.start({ Threads: 4 }); // Starts the engine with 4 threads
```

#### `stop(): Promise<void>`

Stops the UCI engine from processing further commands.

**Example:**

```typescript
engine.stop(); // Stops the UCI engine
```

### Properties

#### `depth: number`

Specifies the maximum search depth for the UCI engine. The default value is
`infinite`.

**Example:**

```typescript
engine.depth = 10; // Set the maximum search depth for the engine
```

#### `lines: number`

Specifies the number of lines of information the engine should return in the
`info` event. The default value is `1`.

**Example:**

```typescript
engine.lines = 3; // Set the number of lines to return in the 'info' callback
```

#### `position: string`

Sets the position of the UCI engine using a FEN (Forsyth-Edwards Notation)
string.

This is useful when you want to analyze a specific position or start from a
custom position rather than the initial position of the chessboard.

**Example:**

```typescript
engine.position =
  'rnbqkb1r/pppppppp/8/8/2PpP3/P1P1P3/1P1P1P1P/RNBQK1NR w KQ - 0 2'; // Sets the position
```

### Events

The UCI module emits several events that can be listened to using the `on`
method:

- **`bestmove`**: Emitted when the engine returns the best move after a search.
- **`copyprotection`**: Emitted for copy protection requests.
- **`error`**: Emitted on communication errors with the engine.
- **`info`**: Emitted when the engine provides search information.
- **`option`**: Emitted when the engine provides an option.
- **`output`**: Emitted for any other output from the engine.
- **`readyok`**: Emitted when the engine is ready to accept commands.
- **`registration`**: Emitted when the engine sends its registration request.
- **`uciok`**: Emitted when the engine acknowledges the UCI protocol.

### Event Details

#### `on('bestmove', ({ move, ponder }) => void)`

Emitted when the engine returns the best move.

- **`move`**: The best move suggested by the engine.
- **`ponder`**: (optional) The move to ponder on.

#### `on('copyprotection', (data: string) => void)`

This event is emitted when the engine sends a copy protection request. The
`data` object contains the following properties:

#### `on('error', (error: Error) => void)`

This event is emitted when there is an error in communication with the UCI
engine.

This can include issues like the engine not starting, invalid responses, or
other communication errors. The `error` object provides details about the error.

#### `on('info', (info: { stats?: { nps: number }, current?: { line: string, move: string, number: string }, depth?: number, line?: number, moves?: string[], refutation?: string, score?: number, string?: string }) => void)`

This event is emitted when the engine provides information during its search.
The `info` object can contain various properties, including:

- `stats`: Contains statistics about the search, such as `nps` (nodes per
  second).
- `current`: Contains the current line being searched, with properties:
  - `line`: The current line of moves.
  - `move`: The move being considered.
  - `number`: The move number.
- `depth`: The current search depth.
- `line`: The line number of the current search.
- `moves`: An array of moves considered by the engine.
- `refutation`: The refutation line suggested by the engine.
- `score`: The score of the current position (if available).
- `string`: A raw string output from the engine, which can be used for debugging
  or logging.

#### `on('option', (option: { name: string, type: 'button' | 'spin' | 'combo' | 'string' | 'check', default?: any, min?: number, max?: number, value?: any }) => void)`

This event is emitted when the engine provides an option. The `option` object
contains the following properties:

- `name`: The name of the option.
- `type`: The type of the option, which can be one of:
  - `button`: A button that can be clicked.
  - `spin`: A numeric input with a min and max value.
  - `combo`: A dropdown selection.
  - `string`: A text input.
  - `check`: A checkbox (boolean).
- `default`: The default value for the option (if applicable).
- `min`: The minimum value for numeric options (if applicable).
- `max`: The maximum value for numeric options (if applicable).
- `value`: The current value of the option (if applicable).

#### `on('output', (data: string) => void)`

This event is emitted for any other output from the engine that does not fit
into the other categories. The `data` parameter contains the raw string output
from the engine. This can be useful for debugging or logging purposes, as it
captures any additional information or messages sent by the engine.

#### `on('readyok', () => void)`

This event is emitted when the engine signals that it is ready to accept
commands. This typically occurs after the `uciok` event and indicates that the
engine has completed its initialization process.

#### `on('registration', (data: string) => void)`

This event is emitted when the engine sends its registration request. The `data`
object contains the registration information sent by the engine. This can
include details like the engine's name, version, and other registration-related
information.

#### `on('uciok', () => void)`

This event is emitted when the engine acknowledges the UCI protocol. This
indicates that the engine is ready to accept UCI commands and is fully
initialized. After this event, you can start sending moves or other UCI
commands.
Test
