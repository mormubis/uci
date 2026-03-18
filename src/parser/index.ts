import bestmove from './bestmove.js';
import extract from './extract.js';
import identity from './identity.js';
import info from './info.js';
import noop from './noop.js';

import type { Events, ID, Option } from '../types.js';

const copyprotection = identity<string>;
const id = extract(['author', 'name']) as (value: string) => ID;
const option = extract(['default', 'max', 'min', 'name', 'type', 'var']) as (
  value: string,
) => Option;
const readyok = noop;
const registration = identity<string>;
const uciok = noop;

type ParserKeys =
  | 'bestmove'
  | 'copyprotection'
  | 'id'
  | 'info'
  | 'option'
  | 'readyok'
  | 'registration'
  | 'uciok';

type Parsers = {
  [K in ParserKeys]: (value: string) => Events[K];
};

const parsers = {
  bestmove,
  copyprotection,
  id,
  info,
  option,
  readyok,
  registration,
  uciok,
} satisfies Parsers;

export type { Parsers };
export { copyprotection, id, option, parsers, readyok, registration, uciok };

export { default as bestmove } from './bestmove.js';
export { default as info } from './info.js';
