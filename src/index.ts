import Emmittery from 'emittery';

import Options from './options.js';
import * as parser from './parser/index.js';
import Process from './process.js';

import type { ID, InfoCommand, Option } from './types.js';

interface Events {
  bestmove: { move: string | undefined; ponder?: string };
  copyprotection: string;
  error: Error;
  id: ID;
  info: InfoCommand;
  option: Option;
  output: string;
  readyok: undefined;
  registration: string;
  uciok: undefined;
}

interface RegisterOptions {
  code: string;
  name: string;
}

const TIMEOUT = 5000;

class UCI extends Emmittery<Events> {
  /**
   * Internal store of the engine options
   * @private
   */
  private readonly options = new Options();

  private process: Process;

  /**
   * Internal state of the depth
   * @private
   */
  #depth: number | 'infinite' = 'infinite';

  /**
   * Stores the first error that caused ready() to fail.
   * Once set, all subsequent ready() calls short-circuit.
   * @private
   */
  #errored: Error | undefined;

  /**
   * Internal store of the engine id
   * @private
   */
  #id: ID | undefined;

  /**
   * Internal state of the number of lines
   * @private
   */
  #lines = 1;

  /**
   * Internal list of moves
   * @private
   */
  #moves: string[] = [];

  /**
   * Initial position of the engine
   * @private
   */
  #position = 'startpos';

  /**
   * Internal state of uciok event
   * @private
   */
  readonly #ready: Promise<void>;

  /**
   * Timeout in ms for UCI handshake and isready responses.
   * @private
   */
  readonly #timeout: number;

  constructor(path: string, { timeout }: { timeout?: number } = {}) {
    super();

    this.#timeout = timeout ?? TIMEOUT;
    this.process = new Process(path);

    this.process.on('line', this.ingest.bind(this));
    this.process.on('error', (value) => this.emit('error', value));

    // Store the ID of the engine
    this.on('id', (id) => {
      this.#id = id;
    });
    // Define the available options
    this.on('option', (option) => {
      this.options.define(option.name, option);
    });

    // Set a promise to wait for the engine to be ready
    this.#ready = new Promise<void>((ok, ko) => {
      this.on('uciok', () => {
        ok();
      });

      // Set a timeout as a fallback
      setTimeout(ko, this.#timeout);

      // Starts the communication protocol
      this.execute('uci').catch(ko);
    }).catch(() => {
      // Rejection is surfaced via the error event; suppress unhandled rejection.
    });

    // Immediately start waiting for readyok so that process exit or timeout
    // during the handshake is caught and surfaced as an error event.
    void this.ready();
  }

  get depth(): number | 'infinite' {
    return this.#depth;
  }

  set depth(value: number | 'infinite') {
    this.#depth = value;
  }

  get lines(): number {
    return this.#lines;
  }

  set lines(value: number) {
    this.#lines = value;
  }

  get position(): string {
    return this.#position;
  }

  set position(input: string) {
    this.#position = input;
    this.#moves = [];

    this.ready().then(() => this.execute(`position ${input}`));
  }

  async [Symbol.dispose](): Promise<void> {
    await this.execute('quit');
    this.process.kill();
  }

  async execute(command: string): Promise<void> {
    await this.process.write(`${command}\n`).catch((error: unknown) => {
      void this.emit(
        'error',
        error instanceof Error ? error : new Error(String(error)),
      );
    });
  }

  async id(): Promise<ID> {
    await this.#ready;

    if (!this.#id) {
      throw new Error('ID not found');
    }

    return this.#id;
  }

  async move(input: string): Promise<void> {
    this.#moves.push(input);

    const list = this.#moves.join(' ');

    await this.execute('stop');
    await this.execute(`position ${this.#position} moves ${list}`);
    await this.go();
  }

  async register(options?: RegisterOptions): Promise<void> {
    if (!options) {
      return this.execute('register later');
    }

    const { code, name } = options;
    return this.execute(`register name ${name} code ${code}`);
  }

  async reset(): Promise<void> {
    this.position = 'startpos';
  }

  async start(options: Record<string, unknown> = {}): Promise<void> {
    await this.#ready;

    for (const [key, value] of Object.entries({
      MultiPV: this.#lines,
      ...options,
    })) {
      this.options.set(key, value);
      await this.execute(`setoption name ${key} value ${value}`);
    }

    await this.go();
  }

  stop(): Promise<void> {
    return this.execute('stop');
  }

  private async go(): Promise<void> {
    await this.ready();

    const depth =
      this.#depth === 'infinite' ? 'infinite' : `depth ${this.#depth}`;
    await this.execute(`go ${depth}`);
  }

  private async ingest(input: string): Promise<void> {
    const [key, ...argv] = input.split(' ');
    const value = argv.join(' ');

    if (key === undefined) {
      return;
    }

    if (!(key in parser)) {
      // If the command is not in the parser, emit it as output
      await this.emit('output', input);
      return;
    }

    const command = key as keyof typeof parser;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, import-x/namespace
    const payload = (parser[command] as (v: string) => any)(value);

    await this.emit(command as keyof Events, payload);
  }

  private async ready(): Promise<void> {
    if (this.#errored) {
      void this.emit('error', this.#errored);
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const readyok = this.once('readyok');

    const exit = new Promise<never>((_, ko) => {
      void this.process.once('exit').then(() => {
        ko(new Error('Engine process exited'));
      });
    });

    const timeout = new Promise<never>((_, ko) => {
      timeoutId = setTimeout(() => {
        ko(new Error('Engine ready timeout'));
      }, this.#timeout);
    });

    await this.execute('isready');

    try {
      await Promise.race([readyok, exit, timeout]);
    } catch (error: unknown) {
      this.#errored = error instanceof Error ? error : new Error(String(error));
      void this.emit('error', this.#errored);
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export default UCI;
