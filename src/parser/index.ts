import identity from './identity.ts';
import extract from './extract.ts';
import noop from './noop.ts';

const copyprotection = identity;
const error = identity;
const id = extract(['author', 'name']);
const option = extract(['default', 'max', 'min', 'name', 'type', 'var']);
const readyok = noop;
const registration = identity;
const uciok = noop;

export { default as bestmove } from './bestmove.ts';
export { default as info } from './info.ts';
export { copyprotection, error, id, option, readyok, registration, uciok };
