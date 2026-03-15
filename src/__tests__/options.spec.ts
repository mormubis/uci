import { describe, expect, it } from 'vitest';

import Options from '../options.js';

import type { Option } from '../types.js';

const checkOption: Option = {
  default: true,
  name: 'Nullmove',
  type: 'check',
} as Option;
const spinOption: Option = {
  default: 16,
  max: 128,
  min: 1,
  name: 'Hash',
  type: 'spin',
} as Option;
const spinUnboundedOption: Option = {
  default: 2,
  name: 'Selectivity',
  type: 'spin',
} as Option;
const comboOption: Option = {
  default: 'Normal',
  name: 'Style',
  type: 'combo',
  var: ['Normal', 'Risky', 'Solid'],
} as Option;
const stringOption: Option = {
  default: '',
  name: 'NalimovPath',
  type: 'string',
} as Option;
const buttonOption: Option = {
  default: undefined,
  name: 'Clear Hash',
  type: 'button',
} as Option;

describe('Options', () => {
  describe('define()', () => {
    it('throws when the same key is defined twice', () => {
      const options = new Options();
      options.define('Hash', spinOption);

      expect(() => {
        options.define('Hash', spinOption);
      }).toThrow('Option "Hash" is already defined.');
    });

    it('stores the default value for a check option', () => {
      const options = new Options();
      options.define('Nullmove', checkOption);

      expect(options.get('Nullmove')).toBe(true);
    });

    it('stores the default value for a spin option', () => {
      const options = new Options();
      options.define('Hash', spinOption);

      expect(options.get('Hash')).toBe(16);
    });

    it('stores the default value for a combo option', () => {
      const options = new Options();
      options.define('Style', comboOption);

      expect(options.get('Style')).toBe('Normal');
    });

    it('stores the default value for a string option', () => {
      const options = new Options();
      options.define('NalimovPath', stringOption);

      expect(options.get('NalimovPath')).toBe('');
    });

    it('stores no value for a button option (undefined default)', () => {
      const options = new Options();
      options.define('Clear Hash', buttonOption);

      expect(options.get('Clear Hash')).toBeUndefined();
    });
  });

  describe('get()', () => {
    it('throws for an unknown key', () => {
      const options = new Options();

      expect(() => {
        options.get('Unknown');
      }).toThrow('Option "Unknown" is not defined.');
    });

    it('returns the updated value after set()', () => {
      const options = new Options();
      options.define('Hash', spinOption);
      options.set('Hash', 64);

      expect(options.get('Hash')).toBe(64);
    });
  });

  describe('set()', () => {
    it('throws for an unknown key', () => {
      const options = new Options();

      expect(() => {
        options.set('Unknown', 42);
      }).toThrow('Option "Unknown" is not defined.');
    });

    describe('check', () => {
      it('accepts true', () => {
        const options = new Options();
        options.define('Nullmove', checkOption);
        options.set('Nullmove', true);

        expect(options.get('Nullmove')).toBe(true);
      });

      it('accepts false', () => {
        const options = new Options();
        options.define('Nullmove', checkOption);
        options.set('Nullmove', false);

        expect(options.get('Nullmove')).toBe(false);
      });

      it('rejects a non-boolean value', () => {
        const options = new Options();
        options.define('Nullmove', checkOption);

        expect(() => {
          options.set('Nullmove', 'yes');
        }).toThrow();
      });
    });

    describe('spin', () => {
      it('accepts a valid integer within range', () => {
        const options = new Options();
        options.define('Hash', spinOption);
        options.set('Hash', 64);

        expect(options.get('Hash')).toBe(64);
      });

      it('rejects a value below min', () => {
        const options = new Options();
        options.define('Hash', spinOption);

        expect(() => {
          options.set('Hash', 0);
        }).toThrow();
      });

      it('rejects a value above max', () => {
        const options = new Options();
        options.define('Hash', spinOption);

        expect(() => {
          options.set('Hash', 256);
        }).toThrow();
      });

      it('rejects a non-integer (float) value', () => {
        const options = new Options();
        options.define('Hash', spinOption);

        expect(() => {
          options.set('Hash', 1.5);
        }).toThrow();
      });

      it('accepts any integer when no min/max are set', () => {
        const options = new Options();
        options.define('Selectivity', spinUnboundedOption);
        options.set('Selectivity', -999);

        expect(options.get('Selectivity')).toBe(-999);
      });
    });

    describe('combo', () => {
      it('accepts a value in the var list', () => {
        const options = new Options();
        options.define('Style', comboOption);
        options.set('Style', 'Risky');

        expect(options.get('Style')).toBe('Risky');
      });

      it('rejects a value not in the var list', () => {
        const options = new Options();
        options.define('Style', comboOption);

        expect(() => {
          options.set('Style', 'Aggressive');
        }).toThrow();
      });
    });

    describe('string', () => {
      it('accepts a string value', () => {
        const options = new Options();
        options.define('NalimovPath', stringOption);
        options.set('NalimovPath', String.raw`c:\tb`);

        expect(options.get('NalimovPath')).toBe(String.raw`c:\tb`);
      });

      it('rejects a non-string value', () => {
        const options = new Options();
        options.define('NalimovPath', stringOption);

        expect(() => {
          options.set('NalimovPath', 42);
        }).toThrow();
      });
    });

    describe('button', () => {
      it('accepts undefined', () => {
        const options = new Options();
        options.define('Clear Hash', buttonOption);
        options.set('Clear Hash', undefined);

        expect(options.get('Clear Hash')).toBeUndefined();
      });

      it('rejects a non-undefined value', () => {
        const options = new Options();
        options.define('Clear Hash', buttonOption);

        expect(() => {
          options.set('Clear Hash', 'click');
        }).toThrow();
      });
    });
  });
});
