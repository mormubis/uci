function extract<K extends string>(keys: K[]) {
  return (value: string): Record<K, string> => {
    const chunks = value.split(' ');
    const extraction: Partial<Record<K, string>> = {};

    let key: K | undefined = undefined;
    for (let chunk of chunks) {
      if (keys.includes(chunk as K)) {
        key = chunk as K;
        extraction[key] = '';
      } else if (key !== undefined) {
        extraction[key] += ` ${chunk}`;
        extraction[key] = extraction[key]?.trim();
      }
    }

    return extraction as Record<K, string>;
  };
}

export default extract;
