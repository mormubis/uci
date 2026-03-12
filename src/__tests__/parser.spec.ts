import { describe, expect, it } from 'vitest';

import bestmove from '../parser/bestmove.js';
import { id, option } from '../parser/index.js';

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
