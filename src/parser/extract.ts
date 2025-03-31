function extract<K extends string>(keys: K[]) {
  return (value: string) => {
    const chunks = value.split(' ');
    const extraction: Partial<Record<K | 'default', string>> = {};

    let key: K | 'default' = 'default';
    for (let chunk of chunks) {
      if (keys.includes(chunk as K)) {
        key = chunk as K;
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
