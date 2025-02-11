export type Info = {
  comment?: string;
  // string?: string; // comments

  cpu?: number; // load of the cpu
  // cpuload?: number; // the cpu usage of the engine is x

  current?: { line?: string; move?: string; number?: number };
  // currline?: string;
  // currmove?: string;
  // currmovenumber?: number;

  depth?: number | { selective: number; total: number };
  // seldepth?: number;

  // hashfull?: unknown; // boolean?

  line?: number;
  // multipv?: number; // line number

  moves?: string;
  // pv?: string; // <move1> ... <movei>

  nps?: number; // nodes per second

  refutation?: string;

  score?: unknown; // ?

  tbhits?: number; // x positions where found in the endgame table bases

  time?: number; // the time searched in ms
};
