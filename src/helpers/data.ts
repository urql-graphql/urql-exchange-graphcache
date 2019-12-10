import { Link, EntityField } from '../types';
import { makeDict } from './dict';

type KeyMap<T> = Map<string, T>;
type OptimisticMap<T> = { [optimisticKey: number]: T };

interface KVMap<T> {
  optimistic: OptimisticMap<KeyMap<T | undefined>>;
  base: KeyMap<T>;
  keys: number[];
}

const makeKVMap = <T>(): KVMap<T> => ({
  optimistic: makeDict(),
  base: new Map(),
  keys: [],
});

export class InMemoryData {
  refCount: KeyMap<number>;
  refLock: OptimisticMap<string[]>;
  links: KVMap<KeyMap<Link>>;
  records: KVMap<KeyMap<EntityField>>;

  constructor() {
    this.refCount = makeDict();
    this.refLock = makeDict();
    this.links = makeKVMap();
    this.records = makeKVMap();
  }
}
