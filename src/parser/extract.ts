function extract<K extends string>(
  keys: K[],
): (value: string) => Partial<Record<K | 'default', string | string[]>> {
  return (value: string) => {
    const chunks = value.split(' ');
    const extraction: Partial<Record<K | 'default', string | string[]>> = {};

    let key: K | 'default' = 'default';
    for (const chunk of chunks) {
      if (keys.includes(chunk as K)) {
        key = chunk as K;
        const current = extraction[key];
        if (current === undefined) {
          // First occurrence — initialise as empty string sentinel
          extraction[key] = '';
        } else if (Array.isArray(current)) {
          // Third+ occurrence — push a new empty-string slot
          current.push('');
        } else {
          // Second occurrence — convert to array
          extraction[key] = [current, ''];
        }
      } else {
        const current = extraction[key];
        if (current === undefined) {
          extraction[key] = chunk;
        } else if (Array.isArray(current)) {
          const last = current.at(-1) ?? '';
          current[current.length - 1] = last
            ? `${last} ${chunk}`.trim()
            : chunk;
        } else {
          extraction[key] = current ? `${current} ${chunk}`.trim() : chunk;
        }
      }
    }

    // Trim strings and filter empty-string slots from arrays
    for (const k of Object.keys(extraction) as (K | 'default')[]) {
      const v = extraction[k];
      if (Array.isArray(v)) {
        extraction[k] = v.map((s) => s.trim()).filter((s) => s.length > 0);
      } else if (typeof v === 'string') {
        extraction[k] = v.trim();
      }
    }

    return extraction;
  };
}

export default extract;
