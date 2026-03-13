namespace UCI {
  /**
   * Options for the UCI protocol
   */
  type MergeTypes<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    TypesArray extends any[],
    Result = unknown,
  > = TypesArray extends [infer Head, ...infer Rem]
    ? MergeTypes<Rem, Result & Head>
    : Result;

  type OneOf<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    TypesArray extends any[],
    Result = never,
    AllProperties = MergeTypes<TypesArray>,
  > = TypesArray extends [infer Head, ...infer Rem]
    ? OneOf<Rem, Result | OnlyFirst<Head, AllProperties>, AllProperties>
    : Result;

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
   * Score from the engine — centipawns or mate distance, with optional bound
   */
  export type Score =
    | { bound: 'lower'; type: 'cp'; value: number }
    | { bound: 'upper'; type: 'cp'; value: number }
    | { bound?: never; type: 'cp'; value: number }
    | { bound?: never; type: 'mate'; value: number };

  /**
   * Information emitted by the engine
   */
  export type InfoCommand = {
    cpuload?: number; // cpu usage in permill

    current?: { line?: string[]; move?: string; number?: number };

    depth?: number | { selective: number; total: number };

    hashfull?: number; // hash is x permill full

    info?: string; // free-form string from engine

    line?: number; // multipv line number

    moves?: string[]; // pv moves

    nodes?: number; // nodes searched

    refutation?: string[];

    score?: Score;

    stats?: { nps?: number }; // engine statistics

    tbhits?: number; // positions found in endgame tablebases

    time?: number; // time searched in ms
  };
}
