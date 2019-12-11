import { Link, EntityField, FieldInfo } from '../types';
import { fieldInfoOfKey } from './keys';

type Dict<T> = Record<string, T>;
type KeyMap<T> = Map<string, T>;
type OptimisticMap<T> = Record<number, T>;

interface NodeMap<T> {
  optimistic: OptimisticMap<KeyMap<Dict<T | undefined>>>;
  base: KeyMap<Dict<T>>;
  keys: number[];
}

export interface InMemoryData {
  gcBatch: Set<string>;
  refCount: Dict<number>;
  refLock: OptimisticMap<Dict<number>>;
  records: NodeMap<EntityField>;
  links: NodeMap<Link>;
}

let currentOptimisticKey: null | number = null;

const makeDict = <T>(): Dict<T> => Object.create(null);

const makeNodeMap = <T>(): NodeMap<T> => ({
  optimistic: makeDict(),
  base: new Map(),
  keys: [],
});

export const setCurrentOptimisticKey = (optimisticKey: number | null) => {
  currentOptimisticKey = optimisticKey;
};

export const make = (): InMemoryData => ({
  gcBatch: new Set(),
  refCount: makeDict(),
  refLock: makeDict(),
  links: makeNodeMap(),
  records: makeNodeMap(),
});

const setNode = <T>(
  map: NodeMap<T>,
  entityKey: string,
  fieldKey: string,
  value: T
) => {
  let keymap: KeyMap<Dict<T | undefined>>;
  if (currentOptimisticKey) {
    if (map.optimistic[currentOptimisticKey] === undefined) {
      map.optimistic[currentOptimisticKey] = new Map();
      map.keys.unshift(currentOptimisticKey);
    }

    keymap = map.optimistic[currentOptimisticKey];
  } else {
    keymap = map.base;
  }

  let entity = keymap.get(entityKey) as Dict<T | undefined>;
  if (entity === undefined) {
    keymap.set(entityKey, (entity = makeDict()));
  }

  if (value === undefined && !currentOptimisticKey) {
    delete entity[fieldKey];
  } else {
    entity[fieldKey] = value;
  }
};

const getNode = <T>(
  map: NodeMap<T>,
  entityKey: string,
  fieldKey: string
): T | undefined => {
  for (let i = 0, l = map.keys.length; i < l; i++) {
    const optimistic = map.optimistic[map.keys[i]];
    const node = optimistic.get(entityKey);
    if (node !== undefined && fieldKey in node) {
      return node[fieldKey];
    }
  }

  const node = map.base.get(entityKey);
  return node !== undefined ? node[fieldKey] : undefined;
};

const clearOptimisticNodes = <T>(map: NodeMap<T>, optimisticKey: number) => {
  const index = map.keys.indexOf(optimisticKey);
  if (index > -1) {
    delete map.optimistic[optimisticKey];
    map.keys.splice(index, 1);
  }
};

const updateRCForEntity = (
  gcBatch: Set<string>,
  refCount: Dict<number>,
  entityKey: string,
  by: number
) => {
  const count = refCount[entityKey] !== undefined ? refCount[entityKey] : 0;
  const newCount = (refCount[entityKey] = (count + by) | 0);
  if (newCount <= 0) {
    gcBatch.add(entityKey);
  } else if (count <= 0 && newCount > 0) {
    gcBatch.delete(entityKey);
  }
};

const updateRCForLink = (
  gcBatch: Set<string>,
  refCount: Dict<number>,
  link: Link | undefined,
  by: number
) => {
  if (typeof link === 'string') {
    updateRCForEntity(gcBatch, refCount, link, by);
  } else if (Array.isArray(link)) {
    for (let i = 0, l = link.length; i < l; i++) {
      const entityKey = link[i];
      if (entityKey) {
        updateRCForEntity(gcBatch, refCount, entityKey, by);
      }
    }
  }
};

const extractNodeFields = <T>(
  fieldInfos: FieldInfo[],
  seenFieldKeys: Set<string>,
  node: Dict<T> | undefined
) => {
  if (node !== undefined) {
    for (const fieldKey in node) {
      if (!seenFieldKeys.has(fieldKey)) {
        fieldInfos.push(fieldInfoOfKey(fieldKey));
        seenFieldKeys.add(fieldKey);
      }
    }
  }
};

const extractNodeMapFields = <T>(
  fieldInfos: FieldInfo[],
  seenFieldKeys: Set<string>,
  entityKey: string,
  map: NodeMap<T>
) => {
  extractNodeFields(fieldInfos, seenFieldKeys, map.base.get(entityKey));

  for (let i = 0, l = map.keys.length; i < l; i++) {
    const optimistic = map.optimistic[map.keys[i]];
    extractNodeFields(fieldInfos, seenFieldKeys, optimistic.get(entityKey));
  }
};

export const gc = (data: InMemoryData) => {
  data.gcBatch.forEach(entityKey => {
    const rc = data.refCount[entityKey] || 0;
    if (rc <= 0) {
      for (const optimisticKey in data.refLock) {
        const refCount = data.refLock[optimisticKey];
        const locks = refCount[entityKey] || 0;
        if (locks > 0) return;
        delete refCount[entityKey];
      }

      delete data.refCount[entityKey];
      data.records.base.delete(entityKey);
      data.gcBatch.delete(entityKey);

      const linkNode = data.links.base.get(entityKey);
      if (linkNode !== undefined) {
        data.links.base.delete(entityKey);
        for (const key in linkNode) {
          updateRCForLink(data.gcBatch, data.refCount, linkNode[key], -1);
        }
      }
    }
  });
};

export const readRecord = (
  data: InMemoryData,
  entityKey: string,
  fieldKey: string
): EntityField => getNode(data.records, entityKey, fieldKey);

export const readLink = (
  data: InMemoryData,
  entityKey: string,
  fieldKey: string
): Link | undefined => getNode(data.links, entityKey, fieldKey);

export const writeRecord = (
  data: InMemoryData,
  entityKey: string,
  fieldKey: string,
  value: EntityField
) => setNode(data.records, entityKey, fieldKey, value);

export const writeLink = (
  data: InMemoryData,
  entityKey: string,
  fieldKey: string,
  link: Link | undefined
) => {
  let refCount: Dict<number>;
  let links: KeyMap<Dict<Link | undefined>> | undefined;
  if (currentOptimisticKey) {
    refCount =
      data.refLock[currentOptimisticKey] ||
      (data.refLock[currentOptimisticKey] = makeDict());
    links = data.links.optimistic[currentOptimisticKey];
  } else {
    refCount = data.refCount;
    links = data.links.base;
  }

  const prevLinkNode = links !== undefined ? links.get(entityKey) : undefined;
  const prevLink = prevLinkNode !== undefined ? prevLinkNode[fieldKey] : null;

  updateRCForLink(data.gcBatch, refCount, prevLink, -1);
  setNode(data.links, entityKey, fieldKey, link);
  updateRCForLink(data.gcBatch, refCount, link, 1);
};

export const clearOptimistic = (data: InMemoryData, optimisticKey: number) => {
  delete data.refLock[optimisticKey];
  clearOptimisticNodes(data.records, optimisticKey);
  clearOptimisticNodes(data.links, optimisticKey);
};

export const inspectFields = (
  data: InMemoryData,
  entityKey: string
): FieldInfo[] => {
  const { links, records } = data;
  const fieldInfos: FieldInfo[] = [];
  const seenFieldKeys: Set<string> = new Set();
  extractNodeMapFields(fieldInfos, seenFieldKeys, entityKey, links);
  extractNodeMapFields(fieldInfos, seenFieldKeys, entityKey, records);
  return fieldInfos;
};
