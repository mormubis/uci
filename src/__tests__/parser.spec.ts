import { describe, expect, it } from 'vitest';

import bestmove from '../parser/bestmove.js';
import identity from '../parser/identity.js';
import { id, option } from '../parser/index.js';
import info from '../parser/info.js';
import noop from '../parser/noop.js';

describe('bestmove', () => {
  it('parses a move with no ponder', () => {
    expect(bestmove('e2e4')).toEqual({ move: 'e2e4' });
  });

  it('parses a move with a ponder move', () => {
    expect(bestmove('g1f3 ponder d8f6')).toEqual({
      move: 'g1f3',
      ponder: 'd8f6',
    });
  });

  it('parses a null move (0000)', () => {
    expect(bestmove('0000')).toEqual({ move: '0000' });
  });
});

describe('id', () => {
  it('parses an engine name that contains spaces', () => {
    expect(id('name Shredder X.Y')).toMatchObject({ name: 'Shredder X.Y' });
  });

  it('parses an author name that contains spaces', () => {
    expect(id('author Stefan MK')).toMatchObject({ author: 'Stefan MK' });
  });
});

describe('option', () => {
  it('parses a check option', () => {
    expect(option('name Nullmove type check default true')).toMatchObject({
      name: 'Nullmove',
      type: 'check',
      default: 'true',
    });
  });

  it('parses a spin option with min and max', () => {
    expect(
      option('name Selectivity type spin default 2 min 0 max 4'),
    ).toMatchObject({
      name: 'Selectivity',
      type: 'spin',
      default: '2',
      min: '0',
      max: '4',
    });
  });

  it('parses a combo option with multiple var values', () => {
    const result = option(
      'name Style type combo default Normal var Solid var Normal var Risky',
    );
    expect(result).toMatchObject({
      name: 'Style',
      type: 'combo',
      default: 'Normal',
    });
    expect(result.var).toEqual(['Solid', 'Normal', 'Risky']);
  });

  it('parses a string option', () => {
    expect(option('name NalimovPath type string default c:\\')).toMatchObject({
      name: 'NalimovPath',
      type: 'string',
      default: 'c:\\',
    });
  });

  it('parses a button option with a multi-word name', () => {
    expect(option('name Clear Hash type button')).toMatchObject({
      name: 'Clear Hash',
      type: 'button',
    });
  });
});

describe('info', () => {
  it('parses depth', () => {
    expect(info('depth 12 nodes 123456 nps 100000')).toMatchObject({
      depth: 12,
    });
  });

  it('parses score (centipawns) and pv moves', () => {
    expect(
      info(
        'depth 2 score cp 214 time 1242 nodes 2124 nps 34928 pv e2e4 e7e5 g1f3',
      ),
    ).toMatchObject({
      depth: 2,
      moves: ['e2e4', 'e7e5', 'g1f3'],
      score: { type: 'cp', value: 2.14 },
    });
  });

  it('parses currmove and currmovenumber as a number', () => {
    expect(info('currmove e2e4 currmovenumber 1')).toMatchObject({
      current: { move: 'e2e4', number: 1 },
    });
  });

  it('parses multipv line number', () => {
    expect(info('multipv 2')).toMatchObject({ line: 2 });
  });

  it('parses nps as a stat', () => {
    expect(info('nps 34928')).toMatchObject({ stats: { nps: 34_928 } });
  });

  it('parses tbhits as a number', () => {
    expect(info('tbhits 42')).toMatchObject({ tbhits: 42 });
  });

  it('parses a cp score', () => {
    expect(info('score cp 214')).toMatchObject({
      score: { type: 'cp', value: 2.14 },
    });
  });

  it('parses a mate score', () => {
    expect(info('score mate 3')).toMatchObject({
      score: { type: 'mate', value: 3 },
    });
  });

  it('parses a negative mate score (engine getting mated)', () => {
    expect(info('score mate -2')).toMatchObject({
      score: { type: 'mate', value: -2 },
    });
  });

  it('parses a lowerbound cp score', () => {
    expect(info('score cp -30 lowerbound')).toMatchObject({
      score: { bound: 'lower', type: 'cp', value: -0.3 },
    });
  });

  it('parses an upperbound cp score', () => {
    expect(info('score cp 50 upperbound')).toMatchObject({
      score: { bound: 'upper', type: 'cp', value: 0.5 },
    });
  });

  it('parses a lowerbound score regardless of token order', () => {
    expect(info('score lowerbound cp -30')).toMatchObject({
      score: { bound: 'lower', type: 'cp', value: -0.3 },
    });
  });

  it('parses an upperbound score regardless of token order', () => {
    expect(info('score upperbound cp 50')).toMatchObject({
      score: { bound: 'upper', type: 'cp', value: 0.5 },
    });
  });

  it('parses depth with seldepth as an object', () => {
    expect(info('depth 12 seldepth 18')).toMatchObject({
      depth: { selective: 18, total: 12 },
    });
  });

  it('parses time in milliseconds', () => {
    expect(info('time 1242')).toMatchObject({ time: 1242 });
  });

  it('parses nodes as a number', () => {
    expect(info('nodes 123456')).toMatchObject({ nodes: 123_456 });
  });

  it('parses hashfull as a number', () => {
    expect(info('hashfull 512')).toMatchObject({ hashfull: 512 });
  });

  it('parses cpuload as a number', () => {
    expect(info('cpuload 750')).toMatchObject({ cpuload: 750 });
  });

  it('parses currline as an array of moves', () => {
    expect(info('currline e2e4 e7e5 g1f3')).toMatchObject({
      current: { line: ['e2e4', 'e7e5', 'g1f3'] },
    });
  });

  it('parses refutation as an array of moves', () => {
    expect(info('refutation d1h5 g6h5')).toMatchObject({
      refutation: ['d1h5', 'g6h5'],
    });
  });

  it('parses sbhits', () => {
    expect(info('sbhits 42')).toEqual({ sbhits: 42 });
  });

  it('returns empty object for empty input', () => {
    expect(info('')).toEqual({});
  });

  it('parses string info', () => {
    expect(info('string engine is thinking...')).toMatchObject({
      info: 'engine is thinking...',
    });
  });
});

describe('identity', () => {
  it('returns the input string unchanged', () => {
    expect(identity('checking')).toBe('checking');
    expect(identity('ok')).toBe('ok');
    expect(identity('error')).toBe('error');
  });
});

describe('noop', () => {
  it('returns undefined for any input', () => {
    expect(noop('')).toBeUndefined();
    expect(noop('anything')).toBeUndefined();
  });
});
