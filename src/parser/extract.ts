function extract<K extends string>(
  keys: K[],
): (value: string) => Partial<Record<K | 'default', string>> {
  return (value: string) => {
    const chunks = value.split(' ');
    const extraction: Partial<Record<K | 'default', string>> = {};

    let key: K | 'default' = 'default';
    for (const chunk of chunks) {
      if (keys.includes(chunk as K)) {
        key = chunk as K;
        if (extraction[key] === undefined) {
          extraction[key] = '';
        }
      } else {
        if (extraction[key] === undefined) {
          extraction[key] = '';
        }

        extraction[key] += ` ${chunk}`;
        extraction[key] = extraction[key]?.trim();
      }
    }

    return extraction;
  };
}

export default extract;
