import { spawn } from 'node:child_process';

import EventEmitter from './event-emitter';

type Events = {
  disconnect: () => void;
  exit: (code: number | null) => void;
  error: (output: Error) => void;
  read: (output: string) => void;
};

class Process extends EventEmitter<Events> {
  private buffer: string = '';

  constructor(path: string, private child = spawn(path)) {
    super();

    this.child.on('disconnect', () => this.emit('disconnect'));
    this.child.on('error', (error) => this.emit('error', error));
    this.child.on('exit', (code) => this.emit('exit', code));
    this.child.stdout.on('data', (data) => {
      this.buffer += data;

      const lines = this.buffer.split('\n');
      this.buffer = lines.pop() ?? '';

      lines.forEach((line) => this.emit('read', line));
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
      });
    });
  }
}

export default Process;
