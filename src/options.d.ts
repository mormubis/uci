type Base<T> = {
  default: T;
  value?: T;
};

type Type<T> = {
  type: T;
};

type Button = Base<void> & Type<'undefined'>;

type Check = Base<boolean> & Type<'boolean'>;

type Combo = Base<string> & Type<'string'> & { options: string[] };

type Spin = Base<number> & Type<'number'> & { max?: number; min?: number };

type Stringy = Base<string> & Type<'string'>;

export type Option = Button | Check | Combo | Spin | Stringy;
