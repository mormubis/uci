namespace UCI {
  /**
   * Options for the UCI protocol
   */
  type MergeTypes<TypesArray extends any[], Res = {}> = TypesArray extends [
    infer Head,
    ...infer Rem,
  ]
    ? MergeTypes<Rem, Res & Head>
    : Res;

  type OneOf<
    TypesArray extends any[],
    Res = never,
    AllProperties = MergeTypes<TypesArray>,
  > = TypesArray extends [infer Head, ...infer Rem]
    ? OneOf<Rem, Res | OnlyFirst<Head, AllProperties>, AllProperties>
    : Res;

  type OnlyFirst<F, S> = F & { [Key in keyof Omit<S, keyof F>]?: never };

  type Value<T> = {
    default: T;
    value?: T;
  };

  type Type<T> = {
    type: T;
  };

  type Button = Value<void> & Type<'button'>;

  type Check = Value<boolean> & Type<'check'>;

  type Combo = Value<string> & Type<'combo'> & { var: string[] };

  type Spin = Value<number> & Type<'spin'> & { max?: number; min?: number };

  type Stringy = Value<string> & Type<'string'>;

  type Name = { name: string };

  export type Option = OneOf<[Button, Check, Combo, Spin, Stringy]> & Name;

  /**
   * ID of the UCI protocol
   */
  export type ID = { author: string; name: string };

  /**
   * Information emitted by the engine
   */
  export type InfoCommand = {
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
}
