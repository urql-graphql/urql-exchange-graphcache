const cache = {};

export const warning = (clause, msg) => {
  if (!clause && !cache[msg]) {
    console.error(msg);
    cache[msg] = true;
  }
};
