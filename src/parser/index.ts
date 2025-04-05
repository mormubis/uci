import identity from './identity.js';
import extract from './extract.js';
import noop from './noop.js';

const copyprotection = identity;
const error = identity;
const id = extract(['author', 'name']);
const option = extract(['default', 'max', 'min', 'name', 'type', 'var']);
const readyok = noop;
const registration = identity;
const uciok = noop;

export { default as bestmove } from './bestmove.js';
export { default as info } from './info.js';
export { copyprotection, error, id, option, readyok, registration, uciok };
