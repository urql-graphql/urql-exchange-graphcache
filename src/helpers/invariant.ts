export const error = (message: string) => {
  const error = new Error(message);
  error.name = 'Graphcache Error';
  return error;
};

export const invariant = (clause: any, msg: string) => {
  if (!clause) throw error(msg);
};
