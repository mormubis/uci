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
  'tbhits',
  'time',
  'upperbound',
]);

function parseScore(
  raw: string,
  lowerbound: string | undefined,
  upperbound: string | undefined,
): UCI.Score | undefined {
  const tokens = raw.trim().split(' ');
  const kind = tokens[0];

  if (kind !== 'cp' && kind !== 'mate') {
    return undefined;
  }

  const rawValue = tokens[1];

  if (rawValue === undefined) {
    return undefined;
  }

  const numeric = Number(rawValue);
  const value = kind === 'cp' ? numeric / 100 : numeric;

  if (lowerbound !== undefined) {
    return { bound: 'lower', type: 'cp', value };
  }

  if (upperbound !== undefined) {
    return { bound: 'upper', type: 'cp', value };
  }

  if (kind === 'cp') {
    return { type: 'cp', value };
  }

  return { type: 'mate', value };
}

function info(value: string): UCI.InfoCommand {
  const {
    cpuload,
    currline,
    currmove,
    currmovenumber,
    depth,
    hashfull,
    lowerbound,
    multipv,
    nodes,
    nps,
    pv,
    refutation,
    score,
    seldepth,
    string,
    tbhits,
    time,
    upperbound,
  } = extractor(value);

  const parsedScore =
    score === undefined ? undefined : parseScore(score, lowerbound, upperbound);

  return {
    ...((currline !== undefined ||
      currmove !== undefined ||
      currmovenumber !== undefined) && {
      current: {
        line: currline === undefined ? undefined : currline.trim().split(' '),
        move: currmove,
        number:
          currmovenumber === undefined ? undefined : Number(currmovenumber),
      },
    }),
    ...(cpuload !== undefined && { cpuload: Number(cpuload) }),
    ...(depth !== undefined && seldepth !== undefined
      ? { depth: { selective: Number(seldepth), total: Number(depth) } }
      : (depth === undefined
        ? {}
        : { depth: Number(depth) })),
    ...(hashfull !== undefined && { hashfull: Number(hashfull) }),
    ...(string !== undefined && { info: string }),
    ...(multipv !== undefined && { line: Number(multipv) }),
    ...(pv !== undefined && { moves: pv.trim().split(' ') }),
    ...(nodes !== undefined && { nodes: Number(nodes) }),
    ...(nps !== undefined && { stats: { nps: Number(nps) } }),
    ...(refutation !== undefined && {
      refutation: refutation.trim().split(' '),
    }),
    ...(parsedScore !== undefined && { score: parsedScore }),
    ...(tbhits !== undefined && { tbhits: Number(tbhits) }),
    ...(time !== undefined && { time: Number(time) }),
  };
}

export default info;
