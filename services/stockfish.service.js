const uci = require('./uci.mixin');

module.exports = {
  mixins: [uci],
  name: 'stockfish',
  settings: {
    options: {
      Hash: 512,
      MultiPV: 3,
      Threads: 8,
    },
    // path: '~/Downloads/stockfish-11-mac/Mac/stockfish-11-bmi2',
  },
};
