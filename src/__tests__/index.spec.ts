import { describe, expect, it, vi } from 'vitest';

import UCI from '../index.js';

describe('UCI', () => {
  it('emits an error when instantiated with an invalid path', async () => {
    const onError = vi.fn();
    const invalidPath = '/invalid/path/to/engine';

    const uci = new UCI(invalidPath);
    uci.on('error', onError);

    // Wait for the error event to fire asynchronously
    await new Promise<void>((resolve) => {
      uci.on('error', () => {
        resolve();
      });
    });

    expect(onError).toHaveBeenCalled();
  });
});
