export const defer: (fn: () => void) => void =
  typeof Promise !== 'undefined'
    ? Promise.prototype.then.bind(Promise.resolve())
    : setTimeout;
