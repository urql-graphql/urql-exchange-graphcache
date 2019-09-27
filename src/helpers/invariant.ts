export const invariant = (clause: any, message: string) => {
  if (!clause) {
    const error = new Error(message);
    error.name = 'Graphcache Error';
    throw error;
  }
};
