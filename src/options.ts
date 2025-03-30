import { z } from 'zod';

import type { ZodTypeAny } from 'zod';

class Options {
  validators = new Map<string, ZodTypeAny>();
  values = new Map<string, unknown>();

  define(key: string, definition: UCI.Option) {
    if (this.validators.has(key))
      throw new Error(`Option "${key}" is already defined.`);

    let validator: ZodTypeAny;
    switch (definition.type) {
      case 'check':
        validator = z.boolean();
        break;

      case 'combo':
        // if (
        //   !definition.var ||
        //   !Array.isArray(definition.var) ||
        //   definition.var.length < 1
        // )
        //   throw new Error(`Combo option "${key}" must have var defined.`);

        validator = z.enum(definition.var as [string, ...string[]]);
        break;

      case 'spin':
        let local = z.number().int();

        if (definition.min !== undefined) {
          local = local.min(definition.min);
        }

        if (definition.max !== undefined) {
          local = local.max(definition.max);
        }

        validator = local;
        break;

      case 'string':
        validator = z.string();
        break;

      case 'button':
        // Button doesn't have a value, just a default action
        validator = z.undefined();
        break;

      default:
        // If we reach this point, the type is invalid, that's why types fail
        // @ts-expect-error - TS2339 - Property 'type' does not exist on type 'never'.
        throw new Error(`Invalid option type "${definition.type}".`);
    }

    // Store the validator
    this.validators.set(key, validator);

    // Store the default value
    if ('default' in definition) {
      this.values.set(key, definition.default);
    }
  }

  get(key: string): unknown {
    if (!this.validators.has(key))
      throw new Error(`Option "${key}" is not defined.`);

    // Return the stored value
    return this.values.get(key);
  }

  set(key: string, value: unknown) {
    if (!this.validators.has(key))
      throw new Error(`Option "${key}" is not defined.`);

    const validator = this.validators.get(key)!;

    // Validate the value
    const parsedValue = validator.parse(value);

    // Store the validated value
    this.values.set(key, parsedValue);
  }
}

export default Options;
