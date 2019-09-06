import w from 'warning';

const cache = {};

export const warning = (clause, msg) => {
  if (!clause && !cache[msg]) {
    w(false, msg);
    cache[msg] = true;
  }
};
