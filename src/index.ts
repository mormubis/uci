import Emmittery from 'emittery';

import Options from './options.ts';
import * as parser from './parser/index.ts';
import Process from './process.ts';

type Events = {
  bestmove: string;
  copyprotection: string;
  error: Error;
  id: UCI.ID;
  info: UCI.InfoCommand;
  option: UCI.Option;
  readyok: undefined;
  registration: string;
  uciok: undefined;
};

type RegisterOptions = {
  name: string;
  code: string;
};

const TIMEOUT = 5000;

class UCI extends Emmittery<Events> {
  /**
   * Internal state of the debug mode
   * @private
   */
  #debug = false;

  /**
   * Internal state of the depth
   * @private
   */
  #depth: number | 'infinite' = 'infinite';

  /**
   * Internal state of uciok event
   * @private
   */
  readonly #ready: Promise<void>;

  /**
   * Internal store of the engine id
   * @private
   */
  #id: UCI.ID | undefined;

  /**
   * Internal list of moves
   * @private
   */
  #moves: string[] = [];

  /**
   * Initial position of the engine
   * @private
   */
  #position: string = 'startpos';

  /**
   * Internal store of the engine options
   * @private
   */
  private readonly options = new Options();

  private process: Process;

  constructor(path: string, { timeout }: { timeout?: number } = {}) {
    super();

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
    this.#ready = new Promise(async (ok, ko) => {
      this.on('uciok', () => ok());

      // Set a timeout as a fallback
      setTimeout(ko, timeout ?? TIMEOUT);

      // Starts the communication protocol
      await this.execute('uci');
    });
  }

  get depth() {
    return this.#depth;
  }

  set depth(value: number | 'infinite') {
    this.#depth = value;
    console.log('>>> this.#depth', this.#depth);
  }

  async id(): Promise<UCI.ID> {
    await this.#ready;

    if (!this.#id) throw new Error('ID not found');

    return this.#id;
  }

  async execute(command: string): Promise<void> {
    await this.process.write(`${command}\n`);
  }

  async move(input: string): Promise<void> {
    this.#moves.push(input);

    const list = this.#moves.join(' ');

    await this.ready();
    await this.execute(`position ${this.#position} moves ${list}`);
  }

  get position() {
    return this.#position;
  }

  set position(input: string) {
    this.#position = input;
    this.#moves = [];

    this.ready().then(() => this.execute(`position ${input}`));
  }

  async register(options?: RegisterOptions) {
    if (!options) return this.execute('register later');

    const { name, code } = options;
    return this.execute(`register name ${name} code ${code}`);
  }

  async reset() {
    this.position = 'startpos';
  }

  async start(options: Record<string, unknown> = {}) {
    Object.entries(options).forEach(([key, value]) => {
      this.options.set(key, value);
      this.execute(`setoption name ${key} value ${value}`);
    });

    await this.#ready;

    const depth =
      this.#depth === 'infinite' ? 'infinite' : `depth ${this.#depth}`;
    await this.execute(`go ${depth}`);
  }

  stop() {}

  private async ingest(input: string) {
    const [key, ...argv] = input.split(' ');
    const value = argv.join(' ');

    if (key === undefined) throw new Error('No command found');
    if (!(key in parser)) throw new Error(`Unknown command: ${key}`);

    const command = key as keyof Events;
    const payload = parser[command](value);

    await this.emit(command, payload as any);
  }

  private async ready(): Promise<void> {
    const promise = this.once('readyok');

    await this.execute('isready');

    return promise;
  }
}

export default UCI;
