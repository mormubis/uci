import extract from './extract.js';

const extractor = extract(['ponder']);

function bestmove(value: string): {
  move: string | undefined;
  ponder?: string;
} {
  const { default: move, ponder } = extractor(value);

  return {
    move: Array.isArray(move) ? move.join(' ') : move,
    ...(ponder && {
      ponder: Array.isArray(ponder) ? ponder.join(' ') : ponder,
    }),
  };
}

export default bestmove;
