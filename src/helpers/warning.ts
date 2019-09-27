const cache = new Set<string>();

export const warning = (clause: any, msg: string) => {
  if (!clause && !cache.has(msg)) {
    console.warn(msg);
    cache.add(msg);
  }
};
