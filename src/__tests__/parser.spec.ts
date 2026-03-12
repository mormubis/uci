import { describe, expect, it } from 'vitest';

import bestmove from '../parser/bestmove.js';

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
