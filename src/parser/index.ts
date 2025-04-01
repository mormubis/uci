import identity from './identity';
import extract from './extract';
import noop from './noop';

const copyprotection = identity;
const error = identity;
const id = extract(['author', 'name']);
const option = extract(['default', 'max', 'min', 'name', 'type', 'var']);
const readyok = noop;
const registration = identity;
const uciok = noop;

export { default as bestmove } from './bestmove';
export { default as info } from './info';
export { copyprotection, error, id, option, readyok, registration, uciok };
