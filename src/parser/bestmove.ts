import extract from './extract.js';

const extractor = extract(['ponder']);

function bestmove(value: string): {
  move: string | undefined;
  ponder?: string;
} {
  const { default: move, ponder } = extractor(value);

  return {
    move: move as string | undefined,
    ...(ponder && { ponder: ponder as string }),
  };
}

export default bestmove;
