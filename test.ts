import UCI from './src/index.ts';

const lc0 = new UCI('lc0');

(async () => {
  lc0.on('info', console.log);
  lc0.on('bestmove', console.log);

  lc0.depth = 10;
  await lc0.start();
  console.log('>>> hello');
  await lc0.move('e2e4');
  await lc0.move('e7e5');
  await lc0.move('g1f3');
  await lc0.move('b8c6');
  await lc0.move('f1c4');
  await lc0.move('f8c5');
  await lc0.move('b2b4');
  await lc0.execute('d');
})();
