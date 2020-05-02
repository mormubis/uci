const { Chess } = require('chess.js');

module.exports = {
  actions: {
    board: {
      handler({ ascii }) {},
      params: {
        ascii: 'boolean|optional',
      },
    },
  },
  created() {
    this.board = new Chess();
  },
  methods: {
    load(fen) {
      this.board.load(fen);
    },
  },
  name: 'chess',
};
