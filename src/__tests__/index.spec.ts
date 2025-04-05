import { describe, expect, it, vi } from 'vitest';

import UCI from '../index.js';

describe('UCI', () => {
  it('should throw an error when instantiated with an invalid path', async () => {
    const onError = vi.fn();
    const invalidPath = '/invalid/path/to/engine';

    const uci = new UCI(invalidPath);
    uci.on('error', onError);

    await expect(onError).toHaveBeenCalled();
  });
});
