import Emittery from 'emittery';
import * as process from 'node:child_process';

interface Events {
  disconnect: undefined;
  error: Error;
  exit: number;
  line: string;
}

class Process extends Emittery<Events> {
  private buffer = '';
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

      for (const line of lines) {
        this.emit('line', line);
      }
    });
    this.child.stderr.on('data', (data) =>
      this.emit('error', new Error(data.toString().trim())),
    );
  }

  disconnect(): void {
    this.child.disconnect();
  }

  kill(): void {
    this.child.kill();
  }

  async write(input: string): Promise<void> {
    return new Promise((ok, ko) => {
      this.child.stdin.write(input, 'utf8', (error) => {
        if (error) {
          return ko(error);
        }
        ok();
      });
    });
  }
}

export default Process;
