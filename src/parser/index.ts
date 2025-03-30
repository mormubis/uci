import identity from './identity.ts';
import extract from './extract.ts';
import noop from './noop.ts';

const bestmove = identity;
const copyprotection = identity;
const error = identity;
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
const readyok = noop;
const registration = identity;
const uciok = noop;

export {
  bestmove,
  copyprotection,
  error,
  id,
  info,
  option,
  readyok,
  registration,
  uciok,
};
