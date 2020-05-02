const COLORS = {
  BLACK: 128,
  WHITE: 64,
};

const EMPTY = 0;

const PIECES = {
  BISHOP: 4,
  KING: 1,
  KNIGHT: 8,
  PAWN: 32,
  QUEEN: 2,
  ROOK: 16,
};

class Board {
  constructor(position) {
    this.board = [
      PIECES.ROOK & COLORS.WHITE,
      PIECES.KNIGHT & COLORS.WHITE,
      PIECES.BISHOP & COLORS.WHITE,
      PIECES.QUEEN & COLORS.WHITE,
      PIECES.KING & COLORS.WHITE,
      PIECES.BISHOP & COLORS.WHITE,
      PIECES.KNIGHT & COLORS.WHITE,
      PIECES.ROOK & COLORS.WHITE,

      PIECES.PAWN & COLORS.WHITE,
      PIECES.PAWN & COLORS.WHITE,
      PIECES.PAWN & COLORS.WHITE,
      PIECES.PAWN & COLORS.WHITE,
      PIECES.PAWN & COLORS.WHITE,
      PIECES.PAWN & COLORS.WHITE,
      PIECES.PAWN & COLORS.WHITE,
      PIECES.PAWN & COLORS.WHITE,

      EMPTY,
      EMPTY,
      EMPTY,
      EMPTY,
      EMPTY,
      EMPTY,
      EMPTY,
      EMPTY,

      EMPTY,
      EMPTY,
      EMPTY,
      EMPTY,
      EMPTY,
      EMPTY,
      EMPTY,
      EMPTY,

      EMPTY,
      EMPTY,
      EMPTY,
      EMPTY,
      EMPTY,
      EMPTY,
      EMPTY,
      EMPTY,

      EMPTY,
      EMPTY,
      EMPTY,
      EMPTY,
      EMPTY,
      EMPTY,
      EMPTY,
      EMPTY,

      PIECES.PAWN & COLORS.BLACK,
      PIECES.PAWN & COLORS.BLACK,
      PIECES.PAWN & COLORS.BLACK,
      PIECES.PAWN & COLORS.BLACK,
      PIECES.PAWN & COLORS.BLACK,
      PIECES.PAWN & COLORS.BLACK,
      PIECES.PAWN & COLORS.BLACK,
      PIECES.PAWN & COLORS.BLACK,

      PIECES.ROOK & COLORS.BLACK,
      PIECES.KNIGHT & COLORS.BLACK,
      PIECES.BISHOP & COLORS.BLACK,
      PIECES.KING & COLORS.BLACK,
      PIECES.QUEEN & COLORS.BLACK,
      PIECES.BISHOP & COLORS.BLACK,
      PIECES.KNIGHT & COLORS.BLACK,
      PIECES.ROOK & COLORS.BLACK,
    ];
  }
}