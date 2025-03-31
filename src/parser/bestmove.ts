import extract from './extract.ts';

const extractor = extract(['ponder']);

function bestmove(value: string) {
  const { default: move, ponder } = extractor(value);

  return { move, ...(ponder && { ponder }) };
}

export default bestmove;
