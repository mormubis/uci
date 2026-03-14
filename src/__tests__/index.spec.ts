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

  it('stop() does not kill the engine process', async () => {
    // We can't easily test process liveness without a real engine,
    // so we test that stop() sends 'stop' by spying on execute.
    const uci = new UCI('/invalid/path');
    const spy = vi.spyOn(
      uci as unknown as { execute: (cmd: string) => Promise<void> },
      'execute',
    );

    // stop() should not throw — ignore the underlying write error
    await uci.stop().catch(vi.fn());

    expect(spy).toHaveBeenCalledWith('stop');
  });

  it('[Symbol.dispose]() sends quit', async () => {
    const uci = new UCI('/invalid/path');
    const spy = vi.spyOn(
      uci as unknown as { execute: (cmd: string) => Promise<void> },
      'execute',
    );

    await uci[Symbol.dispose]().catch(vi.fn());

    expect(spy).toHaveBeenCalledWith('quit');
  });
});
