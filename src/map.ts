type Data<T> = Map<string, T>;
type OptimisticData<T> = { [optimisticKey: number]: Data<T | undefined> };

export interface KVMap<T> {
  optimistic: OptimisticData<T>;
  base: Data<T>;
}

export const make = <T>(): KVMap<T> => ({
  optimistic: Object.create(null),
  base: new Map(),
});

export const set = <T>(
  map: KVMap<T>,
  key: string,
  value: T,
  optimisticKey: number
): KVMap<T> => {
  if (optimisticKey !== 0) {
    if (map.optimistic[optimisticKey] === undefined)
      map.optimistic[optimisticKey] = new Map();
    map.optimistic[optimisticKey].set(key, value);
  } else {
    map.base.set(key, value);
  }

  return map;
};

export const remove = <T>(
  map: KVMap<T>,
  key: string,
  optimisticKey: number
): KVMap<T> => {
  if (optimisticKey !== 0) {
    if (map.optimistic[optimisticKey] === undefined)
      map.optimistic[optimisticKey] = new Map();
    map.optimistic[optimisticKey].set(key, undefined);
  } else {
    map.base.delete(key);
  }

  return map;
};

export const clear = <T>(map: KVMap<T>, optimisticKey: number): KVMap<T> => {
  delete map.optimistic[optimisticKey];
  return map;
};

export const get = <T>(map: KVMap<T>, key: string): T | undefined => {
  for (const optimisticKey in map.optimistic) {
    const optimistic = map.optimistic[optimisticKey];
    if (optimistic.has(key)) return optimistic.get(key);
  }

  return map.base.get(key);
};
