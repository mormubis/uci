import bestmove from './bestmove.js';
import extract from './extract.js';
import identity from './identity.js';
import info from './info.js';
import noop from './noop.js';

import type { Events, ID, Option } from '../types.js';

const copyprotection = identity<string>;
const error = identity;
const id = extract(['author', 'name']) as (value: string) => ID;
const option = extract(['default', 'max', 'min', 'name', 'type', 'var']) as (
  value: string,
) => Option;
const readyok = noop as (value: string) => undefined;
const registration = identity<string>;
const uciok = noop as (value: string) => undefined;

type ParserKeys =
  | 'bestmove'
  | 'copyprotection'
  | 'id'
  | 'info'
  | 'option'
  | 'readyok'
  | 'registration'
  | 'uciok';

export type Parsers = {
  [K in ParserKeys]: (value: string) => Events[K];
};

export const parsers = {
  bestmove,
  copyprotection,
  id,
  info,
  option,
  readyok,
  registration,
  uciok,
} satisfies Parsers;

export { copyprotection, error, id, option, readyok, registration, uciok };

export { default as bestmove } from './bestmove.js';
export { default as info } from './info.js';
