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

  it('emits an error when ready() times out', async () => {
    // Use a very short timeout so the test does not take 5 seconds
    const uci = new UCI('/invalid/path', { timeout: 20 });
    const errors: Error[] = [];
    uci.on('error', (error) => {
      errors.push(error);
    });

    // Call ready() directly — it will send isready and then time out
    void (uci as unknown as { ready: () => Promise<void> }).ready();

    // Wait for the timeout to fire
    await new Promise<void>((resolve) => setTimeout(resolve, 150));

    const timeoutErrors = errors.filter((error) =>
      error.message.includes('timeout'),
    );
    expect(timeoutErrors.length).toBeGreaterThan(0);
  });

  it('emits an error immediately when process exits while ready() is waiting', async () => {
    const uci = new UCI('/invalid/path', { timeout: 5000 });
    const errors: Error[] = [];
    uci.on('error', (error) => {
      errors.push(error);
    });

    // Start a ready() race
    void (uci as unknown as { ready: () => Promise<void> }).ready();

    // Give ready() one tick to register its exit listener
    await Promise.resolve();

    const before = errors.length;

    // Simulate engine crash
    void (
      uci as unknown as {
        process: { emit: (event: string, value: number) => Promise<void> };
      }
    ).process.emit('exit', 1);

    await new Promise<void>((resolve) => setTimeout(resolve, 50));

    const exitErrors = errors
      .slice(before)
      .filter((error) => error.message.includes('exited'));
    expect(exitErrors.length).toBeGreaterThan(0);
  });

  it('debug(true) sends "debug on"', async () => {
    const uci = new UCI('/invalid/path');
    const spy = vi.spyOn(
      uci as unknown as { execute: (cmd: string) => Promise<void> },
      'execute',
    );

    await uci.debug(true).catch(vi.fn());

    expect(spy).toHaveBeenCalledWith('debug on');
  });

  it('debug(false) sends "debug off"', async () => {
    const uci = new UCI('/invalid/path');
    const spy = vi.spyOn(
      uci as unknown as { execute: (cmd: string) => Promise<void> },
      'execute',
    );

    await uci.debug(false).catch(vi.fn());

    expect(spy).toHaveBeenCalledWith('debug off');
  });

  it('off() unsubscribes a listener', async () => {
    const uci = new UCI('/invalid/path');
    const handler = vi.fn();

    uci.on('output', handler);
    uci.off('output', handler);

    // Trigger an output event via ingest (unknown command routes to 'output')
    await (
      uci as unknown as { ingest: (line: string) => Promise<void> }
    ).ingest('unknown command');

    expect(handler).not.toHaveBeenCalled();
  });

  it('once() resolves on the next event', async () => {
    const uci = new UCI('/invalid/path');

    const promise = uci.once('output');

    // Trigger an output event via ingest
    void (uci as unknown as { ingest: (line: string) => Promise<void> }).ingest(
      'unknown command',
    );

    const result = await promise;
    expect(result).toBe('unknown command');
  });

  it('reset() sends ucinewgame then position startpos', async () => {
    const uci = new UCI('/invalid/path');
    const calls: string[] = [];
    vi.spyOn(
      uci as unknown as { execute: (cmd: string) => Promise<void> },
      'execute',
    ).mockImplementation(async (cmd) => {
      calls.push(cmd);
    });
    vi.spyOn(
      uci as unknown as { ready: () => Promise<void> },
      'ready',
    ).mockResolvedValue();

    await uci.reset();

    expect(calls[0]).toBe('ucinewgame');
    expect(calls[1]).toBe('position startpos');
  });

  it('short-circuits on subsequent ready() calls after failure', async () => {
    const uci = new UCI('/invalid/path', { timeout: 20 });
    const errors: Error[] = [];
    uci.on('error', (error) => {
      errors.push(error);
    });

    // Trigger a ready() that will time out
    void (uci as unknown as { ready: () => Promise<void> }).ready();

    // Wait for timeout to set #errored
    await new Promise<void>((resolve) => setTimeout(resolve, 150));

    const before = errors.length;
    expect(before).toBeGreaterThan(0);

    // Second call should short-circuit and emit same error immediately
    await (uci as unknown as { ready: () => Promise<void> }).ready();

    expect(errors.length).toBeGreaterThan(before);
    // The re-emitted error should be the same message
    expect(errors.at(-1)?.message).toBe(errors[before - 1]?.message);
  });
});
