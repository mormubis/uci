import { describe, expect, it } from 'vitest';

import bestmove from '../parser/bestmove.js';
import { id, option } from '../parser/index.js';
import info from '../parser/info.js';

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
    expect(result.var).toBe('Solid Normal Risky');
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
      score: 2.14,
      moves: ['e2e4', 'e7e5', 'g1f3'],
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
    expect(info('nps 34928')).toMatchObject({ stats: { nps: '34928' } });
  });

  it('parses tbhits as a number', () => {
    expect(info('tbhits 42')).toMatchObject({ tbhits: 42 });
  });
});
