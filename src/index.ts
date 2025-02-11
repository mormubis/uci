import EventEmitter from './event-emitter';
import Process from './process';

import type { ID } from './id';
import type { Info } from './info';
import type { Option } from './options';

type Events = {
  error: (value: Error) => void;
  id: (value: ID) => void;
  info: (value: Info) => void;
  option: (value: Option) => void;
  ready: () => void;
  ok: () => void;
};

type UCIOptions = { timeout?: number } & Record<string, Option>;

const COMMANDS = {
  bestmove: identity,
  copyprotection: identity,
  id: extract(['author', 'name']),
  info: extract([
    'cpuload',
    'currline',
    'currmove',
    'currmovenumber',
    'depth',
    'hashfull',
    'multipv',
    'nodes',
    'nps',
    'pv',
    'refutation',
    'seldepth',
    'score',
    'string',
    'tbhits',
    'time',
  ]),
  option: extract(['default', 'max', 'min', 'name', 'type', 'var']),
  readyok: empty,
  registration: identity,
  uciok: empty,
};
const EVENTS = {
  readyok: 'ready',
  uciok: 'ok',
};
const TIMEOUT = 5000;

function empty(): void {}

function extract<K extends string[], I extends K[number]>(keywords: K) {
  return (line: string): Partial<Record<I, string>> => {
    const chunks = line.split(' ');

    const result: Partial<Record<I, K>> = {} satisfies Partial<Record<I, K>>;

    for (let i = 0, chunk = chunks[i], key: K[number] = keywords[0]; i < chunks.length; i++) {
      if (keywords.includes(chunk)) {
        key = chunk;
        result[key] = [];
      } else {
        result[key]?.push(chunk);
      }
    }

    return Object.entries(result).reduce(
      (acc, [key, value]) => ({ ...acc, [key]: (value as string[]).join(' ') }),
      {} as Partial<Record<K[number], string>>,
    );
  };
}

function identity(value: string): string {
  return value;
}

function isCommand(input: string): input is keyof typeof COMMANDS {
  return input in COMMANDS;
}

function isEvent(input: string): input is keyof typeof EVENTS {
  return input in EVENTS;
}

function memoize<T extends Promise<void>>(target: any, property: string, descriptor: TypedPropertyDescriptor<T>) {
  const getter = descriptor.get!;

  let memory: T | null = null;

  descriptor.get = function (): T {
    if (!memory) {
      memory = getter();
    }

    return memory;
  };
}

class UCIError extends Error {
  constructor(message: string) {
    super(`UCI Error: ${message}`);
  }
}

class UCIOptionError extends UCIError {
  constructor(message: string) {
    super(`'setoption' - ${message}`);
  }
}

class UCI extends EventEmitter<Events> {
  #debug: boolean = false;
  readonly #id: ID = {};
  readonly #ok: Promise<void>;
  readonly #options: Record<string, Option> = {};

  constructor(path: string, { timeout, ...options }: UCIOptions = {}, private process = new Process(path)) {
    super();

    process.on('read', this.ingest);
    process.on('error', (value) => this.emit('error', value));

    // It will store id
    this.on('id', this.store('id'));
    // It stores the options
    this.on('option', this.store('options'));

    // Set a mutex for running any commands until uci is ready
    this.#ok = new Promise((ok, ko) => {
      this.on('ok', () => ok());

      setTimeout(ko, timeout ?? TIMEOUT);
    });

    // Starts the communication
    this.execute(`uci`);

    // Set any options
    Object.entries(options).forEach(([key, value]) => this.options.set(key, value));
  }

  async debug(force?: boolean): Promise<void> {
    const next = force ?? !this.#debug;

    await this.execute(`debug ${next ? 'on' : 'off'}`);

    this.#debug = next;
  }

  private async execute(command: string): Promise<void> {
    await this.#ok;
    await this.process.write(`${command}\n`);
  }

  async id(): Promise<ID> {
    await this.#ok;

    return this.#id;
  }

  go() {}

  private ingest(input: string) {
    const [eventName, ...chunks] = input.split(' ') as [keyof typeof COMMANDS, ...string[]];

    if (!isCommand(eventName)) {
      throw new UCIError(`Not supported event ${input}`);
    }

    const data = COMMANDS[eventName](chunks.join(' '));

    if (isEvent(eventName)) {
      this.emit(EVENTS[eventName as keyof typeof EVENTS], data);
    }
    this.emit(isEvent(eventName) ? EVENTS[eventName] : eventName);
  }

  get options() {
    return {
      ...this.#options,
      get: (name: string): Option | undefined => {
        return this.#options[name];
      },
      set: async (name: string, value: any): Promise<void> => {
        const parameters = this.#options[name];

        if (!parameters) {
          throw new UCIOptionError(`'${name}' is not part of the available options`);
        }

        if (typeof value !== parameters.type)
          throw new UCIOptionError(`option '${name}' expected ${parameters.type} but received ${typeof value}`);
        if ('options' in parameters && !parameters.options.includes(value)) {
          const available = parameters.options.map((item) => `'${item}'`).join(', ');
          const message = `'${value}' does not match any available option: ${available}`;

          throw new UCIOptionError(`${message}`);
        }
        if ('max' in parameters && value > parameters.max!)
          throw new UCIOptionError(`'${value}' is greater than the max '${parameters.max}'`);
        if ('min' in parameters && value < parameters.min!)
          throw new UCIOptionError(`'${value}' is less than the min '${parameters.max}'`);

        await this.execute(`setoption ${name} ${value}`);
        this.#options[name].value = value;
      },
    };
  }

  ponderhit() {}

  position() {}

  register() {}

  reset() {}

  stop() {}

  private store(key: 'id'): (value: ID) => void;
  private store(key: 'options'): (value: Option) => void;
  private store(key: 'id' | 'options') {
    return ({ name, ...value }: any) => {
      this[`__${key}__`][name] = value;
    };
  }

  ready(): Promise<void> {
    return new Promise(async (ok) => {
      this.on('ready', () => ok(undefined));

      await this.execute('ready');
    });
  }
}

export default UCI;
