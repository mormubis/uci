const { Chess } = require('chess.js');
const { MoleculerError } = require('moleculer').Errors;

const process = require('./process.mixin');

class UCIError extends MoleculerError {
  constructor(message) {
    super(message, 500, 'UCI_ERROR', {});
  }
}

class UCIConfigurationError extends UCIError {}

class UCIParameterError extends UCIError {}

class UCIPositionError extends UCIError {
  constructor(position, reason) {
    super(`${position} not valid due to: ${reason}`);
  }
}

function defer() {
  let ok;
  let ko;

  const promise = new Promise((resolve, reject) => {
    [ok, ko] = [resolve, reject];
  });

  return { promise, reject: ko, resolve: ok };
}

function empty() {
  return {};
}
function extract(keys) {
  return (string) => {
    const chunks = string.split(' ');

    const result = {};

    for (let i = 0, key = ''; i < chunks.length; i++) {
      const chunk = chunks[i];

      if (keys.includes(chunk)) {
        key = chunk;
        result[key] = [];
      } else {
        result[key].push(chunk);
      }
    }

    return Object.entries(result).reduce(
      (acc, [key, value]) => ({ ...acc, [key]: value.join(' ') }),
      {},
    );
  };
}
function identity(string) {
  return string;
}

const id = extract(['author', 'name']);
const info = extract([
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
]);
const option = extract(['default', 'max', 'min', 'name', 'type', 'var']);

const COMMANDS = {
  bestmove: identity,
  copyprotection: identity,
  id,
  info,
  option,
  readyok: empty,
  registration: identity,
  uciok: empty,
};
const FEN = /^([rnbqkp1-8]{1,8}[\\/]){7}[rnbqkp1-8]{1,8} [bw]( (([kq]{0,4})|-))?( (([a-h][1-8])|-))?( ([0-9]+){2})?/i;
const EOL = '\n';
// It is not working :\, the one below is equal.
// const MOVES = /(([a-h][1-8]){2}((?<=8)[rnbq])?\s|$)+/;
const MOVES = /(([a-h][1-8]){2}((?<=8)[rnbq])?\s)*([a-h][1-8]){2}((?<=8)[rnbq])?$/;

module.exports = {
  actions: {
    board: {
      handler({ ascii = false }) {
        return this.board(ascii);
      },
      params: {
        ascii: 'boolean|optional',
      },
    },

    debug: {
      handler({ toggle }) {
        return this.debug(toggle);
      },
      params: {
        toggle: 'boolean|optional',
      },
    },

    go: {
      handler({
        binc,
        btime,
        depth,
        infinite,
        mate,
        movestogo,
        movetime,
        nodes,
        ponder,
        searchmoves = '',
        winc,
        wtime,
      }) {
        return this.go({
          binc,
          btime,
          depth,
          infinite,
          mate,
          movestogo,
          movetime,
          nodes,
          ponder,
          searchmoves: searchmoves.split(' ').filter(Boolean),
          winc,
          wtime,
        });
      },
      params: {
        binc: 'number|optional|integer|positive',
        btime: 'number|optional|integer|positive',
        depth: 'number|optional|integer|positive',
        infinite: 'boolean|optional',
        mate: 'number|optional|integer|positive',
        movestogo: 'number|optional|integer|positive',
        movetime: 'number|optional|integer|positive',
        nodes: 'number|optional|integer|positive',
        ponder: 'boolean|optional',
        searchmoves: {
          optional: true,
          pattern: MOVES,
          type: 'string',
        },
        winc: 'number|optional|integer|positive',
        wtime: 'number|optional|integer|positive',
      },
    },

    isready() {
      return this.isready();
    },

    ponderhit() {
      return this.ponderhit();
    },

    position: {
      handler({ moves = '', startpos }) {
        return this.position(moves.split(' ').filter(Boolean), startpos);
      },
      params: {
        moves: {
          optional: true,
          pattern: MOVES,
          type: 'string',
        },
        startpos: {
          optional: true,
          pattern: FEN,
          type: 'string',
        },
      },
    },

    register: {
      handler({ later, name, code }) {
        if (later !== undefined) {
          return this.register();
        }

        if (!name || !code) {
          throw new UCIParameterError();
        }

        return this.register(name, code);
      },
      params: {
        code: 'string|optional|min:1',
        later: 'boolean|optional',
        name: 'string|optional|min:1',
      },
    },

    reset() {
      return this.reset();
    },

    setoption: {
      handler({ name, value }) {
        return this.setoption(name, value);
      },
      params: {
        name: 'string|min:1',
        value: 'any',
      },
    },

    stop() {
      return this.stop();
    },

    ucinewgame() {
      return this.reset();
    },

    write: {
      handler({ command }) {
        return this.write(command);
      },
      params: {
        command: 'string|min:1',
      },
    },
  },

  // Lifecyle - Created
  created() {
    const { debug, path } = this.settings;

    if (path) {
      this.pid = this.exec(path);
    }

    this._debug_ = debug;
    this.buffer = '';
  },

  events: {
    'process.close': {
      handler({ pid }) {
        if (pid === this.pid) {
          this.pid = undefined;
        }
      },
      params: {
        pid: 'number|integer|positive',
      },
    },
    'process.out': {
      handler({ output, pid }) {
        if (pid === this.pid) {
          this.buffer += output;

          const [buffer, ...parts] = this.buffer.split(EOL).reverse();

          this.buffer = buffer;

          parts.reverse().map((line) => {
            const [commandName, ...chunks] = line.split(' ');
            const command = COMMANDS[commandName];
            const string = chunks.join(' ');

            if (command) {
              this.broker.broadcast(`uci.${commandName}`, command(string));
            }
          });
        }
      },
      params: {
        output: 'string',
        pid: 'number',
      },
    },
    'uci.bestmove'(bestmove) {
      this._go_ = false;
      this._ponder_ = false;

      if (this._ponderhit_) {
        const [move] = bestmove.split(' ');

        this.position([move]);
        this._ponderhit_ = false;
      }

      this.broker.logger.info('bestmove', bestmove);
    },
    'uci.info'(data) {
      const { depth, multipv, pv, score } = data;
      if (pv) {
        const [mode, count] = score.split(' ');
        const isMate = mode === 'mate';
        const mark = isMate ? (this.turn() === 'w' ? 1 : -1) * 40 : count / 100;

        this.broker.logger.info(
          `${isMate ? `#${count}` : mark}/${depth}: [${multipv}] ${pv}`,
        );
        this.broker.broadcast('uci.pondering', {
          depth,
          line: pv,
          score: mark,
          variant: multipv,
          ...(isMate && { mate: count }),
        });
      }
    },
    'uci.readyok'() {
      this._isready_.resolve();
    },
  },
  methods: {
    board(ascii) {
      return ascii ? this._board_.ascii() : this._board_.fen();
    },

    debug(flag) {
      const toggle = flag !== undefined ? flag : !this._debug_;
      this._debug_ = toggle;

      return this.write(`debug ${toggle ? 'on' : 'off'}`);
    },

    go({
      binc,
      btime,
      depth,
      infinite,
      mate,
      movestogo,
      movetime,
      nodes,
      ponder,
      searchmoves = [],
      winc,
      wtime,
    }) {
      const options = {
        binc,
        btime,
        depth,
        mate,
        movestogo,
        movetime,
        nodes,
        winc,
        wtime,
      };

      if (this._go_) {
        throw new UCIError('There is running a go command');
      }

      const flags = [];

      if (infinite) {
        flags.push('infinite');
      }

      if (ponder) {
        this._ponder_ = true;
        flags.push('ponder');
      }

      if (searchmoves.length > 0) {
        const [error, fen] = this.validateMoves(searchmoves);

        if (error) {
          throw new UCIPositionError(fen, `${error} cannot be done`);
        }

        flags.push(`searchmoves ${searchmoves.join(' ')}`);
      }

      Object.entries(options)
        .filter(([_, value]) => Boolean(value))
        .forEach(([key, value]) => flags.push(`${key} ${value}`));

      this._go_ = true;

      return this.write(`go ${flags.join(' ')}`);
    },

    async isready() {
      if (!this._isready_) {
        this._isready_ = defer();
      }

      this.write('isready');

      await this._isready_.promise;

      this._isready_ = undefined;

      return true;
    },

    load(fen) {
      return this._board_.load(fen);
    },

    ponderhit() {
      if (!this._ponder_) {
        throw new UCIError('Go is not running in ponder mode');
      }

      this._ponderhit_ = true;

      return this.write('ponderhit');
    },

    position(moves = [], fen) {
      if (fen) {
        const [message] = this.validateFEN(fen);

        if (message) {
          throw new UCIPositionError(fen, message);
        }

        this.load(fen);
      }

      const startpos = fen || this.board();

      const [error, output] = this.validateMoves(moves);

      if (error) {
        throw new UCIPositionError(output, `${error} cannot be done`);
      }

      this.load(output);

      let command = `position fen ${startpos}`;

      if (moves.length > 0) {
        command += ` moves ${moves}`;
      }

      return this.write(command);
    },

    register(name, code) {
      if (!name || !code) {
        return this.write('register later');
      }

      return this.write(`register name ${name} code ${code}`);
    },

    reset() {
      this.ucinewgame();
    },

    setoption(name, value) {
      let command = `setoption name ${name}`;

      if (value !== undefined) {
        command += ` value ${value}`;
      }

      return this.write(command);
    },

    stop() {
      return this.write('stop');
    },

    turn() {
      return this._board_.turn();
    },

    ucinewgame() {
      this._board_.reset();

      return this.write('ucinewgame');
    },

    validateFEN(fen) {
      const { valid, error } = this._board_.validate_fen(fen);

      if (!valid) {
        return [error, fen];
      }

      return [null, fen];
    },

    validateMoves(moves = [], fen = this.board()) {
      const board = new Chess(fen);

      const error = moves.reduce((acc, move) => {
        if (acc) {
          return acc;
        }

        return board.move(move, { sloppy: true }) === null ? move : null;
      }, null);

      return [error, fen];
    },

    write(string) {
      if (this.pid) {
        this.broker.broadcast(`process.in`, {
          input: `${string}\n`,
          pid: this.pid,
        });
      }

      return undefined;
    },
  },
  mixins: [process],
  name: 'uci',
  settings: {
    debug: false,
    options: {},
  },

  // Lifecycle - Start
  started() {
    const { debug, options } = this.settings;

    this._board_ = new Chess();

    // Deferrring this until the events initialization
    // this.write('uci');
    setTimeout(() => {
      this.write('uci');

      this.debug(debug);

      Object.entries(options).map(([name, value]) =>
        this.setoption(name, value),
      );
    });
  },

  // Lifecycle - Stopp
  stopped() {
    return this.write('quit');
  },
};
