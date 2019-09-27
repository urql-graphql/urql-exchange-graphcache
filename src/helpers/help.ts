const cache = new Set<string>();

export const invariant = (clause: any, message: string) => {
  if (!clause) {
    const error = new Error(message);
    error.name = 'Graphcache Error';
    throw error;
  }
};

export const warning = (clause: any, msg: string) => {
  if (!clause && !cache.has(msg)) {
    console.warn(msg);
    cache.add(msg);
  }
};
