import extract from './extract.js';

const extractor = extract([
  'cpuload',
  'currline',
  'currmove',
  'currmovenumber',
  'depth',
  'hashfull',
  'lowerbound',
  'multipv',
  'nodes',
  'nps',
  'pv',
  'refutation',
  'seldepth',
  'score',
  'string',
  'upperbound',
  'tbhits',
  'time',
]);

function info(value: string) {
  const {
    cpuload,
    currline,
    currmove,
    currmovenumber,
    depth,
    hashfull,
    multipv,
    pv,
    nps,
    refutation,
    score,
    string,
    tbhits,
  } = extractor(value);

  return {
    ...(nps && { stats: { nps } }),
    ...((currline || currmove || currmovenumber) && {
      current: { line: currline, move: currmove, number: currmovenumber },
    }),
    ...(depth && { depth: Number(depth) }),
    ...(multipv && { line: Number(multipv) }),
    ...(pv && { moves: pv.split(' ') }),
    ...(refutation && { refutation }),
    ...(score && { score: Number(score.replace('cp', '')) / 100 }),
    ...(string && { info: string }),
    // No idea what this is
    ...(cpuload && { cpuload }),
    ...(hashfull && { hashfull }),
    ...(tbhits && { tbhits }),
  };
}

export default info;
