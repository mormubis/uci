import { describe, expect, it } from 'vitest';

import Process from '../process.js';

describe('Process', () => {
  it('emits an Error object (not a Buffer) when stderr receives data', async () => {
    const proc = new Process('sh');

    const errorPromise = new Promise<Error>((resolve) => {
      proc.on('error', (error_) => {
        resolve(error_);
      });
    });

    await proc.write('echo "stderr message" >&2\n');

    try {
      const error = await errorPromise;

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('stderr message');
    } finally {
      proc.kill();
    }
  });
});
