import * as process from 'node:child_process';

import Emittery from 'emittery';

type Events = {
  disconnect: undefined;
  exit: number;
  error: Error;
  line: string;
};

class Process extends Emittery<Events> {
  private buffer: string = '';
  private child: process.ChildProcessWithoutNullStreams;

  constructor(path: string) {
    super();

    this.child = process.spawn(path);

    this.child.on('disconnect', () => this.emit('disconnect'));
    this.child.on('error', (error) => this.emit('error', error));
    this.child.on('exit', (code) => this.emit('exit', code ?? 0));
    this.child.stdout.on('data', (data) => {
      this.buffer += data;

      const lines = this.buffer.split('\n');
      this.buffer = lines.pop() ?? '';

      lines.forEach((line) => this.emit('line', line));
    });
    this.child.stderr.on('data', (data) => this.emit('error', data));
  }

  disconnect() {
    this.child.disconnect();
  }

  kill() {
    this.child.kill();
  }

  async write(input: string): Promise<void> {
    return new Promise((ok, ko) => {
      this.child.stdin.write(input, 'utf-8', (error) => {
        if (error) return ko(error);
        ok();
      });
    });
  }
}

export default Process;
