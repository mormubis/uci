import UCI from './src/index';

const lc0 = new UCI(
  '/Users/adelarosabretin/Downloads/stockfish/stockfish-macos-m1-apple-silicon',
  // 'lc0',
);

(async () => {
  lc0.on('info', (info) => {
    console.log(info);

    if (info.depth === 25) {
      console.log('---'.repeat(80));
      lc0.execute('stop');
    }
  });
  lc0.on('bestmove', (bestmove) => console.log('!!! bestmove', bestmove));
  lc0.on('output', (output) => console.log('>>> output', output));

  // lc0.depth = 10;
  lc0.lines = 3;
  await lc0.start({ Threads: 4 });
  await lc0.move('e2e4');
  await lc0.move('e7e5');
  await lc0.move('g1f3');
  await lc0.move('b8c6');
  await lc0.move('f1c4');
  await lc0.move('f8c5');
  await lc0.move('b2b4');
  await lc0.move('d7d6');

  await lc0.execute('d');
  // await lc0.stop();
})();
