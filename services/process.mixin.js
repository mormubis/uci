const { exec } = require('shelljs');

module.exports = {
  actions: {
    exec: {
      handler({ command }) {
        return this.exec(command);
      },
      params: {
        command: 'string|min:1',
      },
    },
  },
  created() {
    this.children = {};
  },
  events: {
    'process.end': {
      handler({ pid }) {
        const child = this.children[pid];

        if (child) {
          const { stdin } = child;

          stdin.end();
        }
      },
      params: {
        pid: 'number|integer|positive',
      },
    },
    'process.in': {
      handler({ input, pid }) {
        const child = this.children[pid];

        if (child) {
          const { stdin } = child;

          stdin.write(input);
        }
      },
      params: {
        input: 'string',
        pid: 'number|integer|positive',
      },
    },
  },
  methods: {
    exec(command) {
      const child = exec(command, { async: true, silent: true });
      const { broadcast, logger } = this.broker;

      const { pid, stderr, stdout } = child;
      this.children = { ...this.children, [pid]: child };

      stderr.on('data', (data) => {
        logger.error('process.error', { error: data, pid });

        broadcast('process.error', { error: data, pid });
      });

      stdout.on('data', (data) => {
        logger.debug('process.out', { output: data, pid });

        broadcast('process.out', { output: data, pid });
      });

      child.on('close', (code) => {
        logger.debug('process.close', { pid });

        broadcast('process.close', { pid });

        delete this.children[pid];
      });

      return pid;
    },
  },
  name: 'process',
};
