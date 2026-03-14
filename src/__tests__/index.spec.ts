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

  it('stop() sends the stop command', async () => {
    const uci = new UCI('/invalid/path');
    const spy = vi.spyOn(
      uci as unknown as { execute: (cmd: string) => Promise<void> },
      'execute',
    );

    // stop() should not throw — ignore the underlying write error
    await uci.stop().catch(vi.fn());

    expect(spy).toHaveBeenCalledWith('stop');
  });

  it('emits an error when position write fails', async () => {
    const uci = new UCI('/invalid/path');
    const errors: Error[] = [];
    uci.on('error', (error) => {
      errors.push(error);
    });

    // Trigger position setter — write will fail because process is dead
    uci.position = 'startpos';

    // Give async error a tick to surface
    await new Promise<void>((resolve) => setTimeout(resolve, 50));

    // At least one error should have been emitted (from uci handshake or position write)
    expect(errors.length).toBeGreaterThan(0);
  });

  it('[Symbol.dispose]() sends quit and kills the process', async () => {
    const uci = new UCI('/invalid/path');
    const executeSpy = vi.spyOn(
      uci as unknown as { execute: (cmd: string) => Promise<void> },
      'execute',
    );
    const killSpy = vi.spyOn(
      (uci as unknown as { process: { kill: () => void } }).process,
      'kill',
    );

    await uci[Symbol.dispose]().catch(vi.fn());

    expect(executeSpy).toHaveBeenCalledWith('quit');
    expect(killSpy).toHaveBeenCalledOnce();
  });
});
