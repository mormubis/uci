import extract from './extract.js';

import type { InfoCommand, Score } from '../types.js';

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

function asString(v: string | string[] | undefined): string | undefined {
  if (v === undefined) {
    return undefined;
  }

  return Array.isArray(v) ? v.join(' ') : v;
}

function parseScore(
  raw: string,
  lowerbound: string | undefined,
  upperbound: string | undefined,
): Score | undefined {
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

  if (!Number.isFinite(numeric)) {
    return undefined;
  }

  const value = kind === 'cp' ? numeric / 100 : numeric;

  if (kind === 'cp') {
    if (lowerbound !== undefined) {
      return { bound: 'lower', type: 'cp', value };
    }

    if (upperbound !== undefined) {
      return { bound: 'upper', type: 'cp', value };
    }

    return { type: 'cp', value };
  }

  return { type: 'mate', value };
}

function info(value: string): InfoCommand {
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

  const scoreString = asString(score);
  const parsedScore =
    scoreString === undefined
      ? undefined
      : parseScore(scoreString, asString(lowerbound), asString(upperbound));

  const cpuloadString = asString(cpuload);
  const currlineString = asString(currline);
  const currmoveString = asString(currmove);
  const currmovenumberString = asString(currmovenumber);
  const depthString = asString(depth);
  const hashfullString = asString(hashfull);
  const multipvString = asString(multipv);
  const nodesString = asString(nodes);
  const npsString = asString(nps);
  const pvString = asString(pv);
  const refutationString = asString(refutation);
  const seldepthString = asString(seldepth);
  const infoString = asString(string);
  const tbhitsString = asString(tbhits);
  const timeString = asString(time);

  return {
    ...(cpuloadString !== undefined && { cpuload: Number(cpuloadString) }),
    ...((currlineString !== undefined ||
      currmoveString !== undefined ||
      currmovenumberString !== undefined) && {
      current: {
        ...(currlineString !== undefined && {
          line: currlineString.trim().split(' '),
        }),
        ...(currmoveString !== undefined && { move: currmoveString }),
        ...(currmovenumberString !== undefined && {
          number: Number(currmovenumberString),
        }),
      },
    }),
    ...(depthString !== undefined && {
      depth:
        seldepthString === undefined
          ? Number(depthString)
          : { selective: Number(seldepthString), total: Number(depthString) },
    }),
    ...(hashfullString !== undefined && { hashfull: Number(hashfullString) }),
    ...(infoString !== undefined && { info: infoString }),
    ...(multipvString !== undefined && { line: Number(multipvString) }),
    ...(pvString !== undefined && { moves: pvString.trim().split(' ') }),
    ...(nodesString !== undefined && { nodes: Number(nodesString) }),
    ...(npsString !== undefined && { stats: { nps: Number(npsString) } }),
    ...(refutationString !== undefined && {
      refutation: refutationString.trim().split(' '),
    }),
    ...(parsedScore !== undefined && { score: parsedScore }),
    ...(tbhitsString !== undefined && { tbhits: Number(tbhitsString) }),
    ...(timeString !== undefined && { time: Number(timeString) }),
  };
}

export default info;
