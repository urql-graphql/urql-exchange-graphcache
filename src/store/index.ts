import {
  Entity,
  Link,
  LinksMap,
  EntitiesMap,
  ResolverConfig,
  Primitive,
  Scalar,
} from '../types';
import { assignObjectToMap, objectOfMap } from './utils';

export interface SerializedStore {
  records: { [link: string]: Entity };
  links: { [link: string]: Link };
}

export class Store {
  records: EntitiesMap;
  links: LinksMap;

  resolvers: ResolverConfig;

  constructor(initial?: SerializedStore, resolvers?: ResolverConfig) {
    this.records = new Map();
    this.links = new Map();
    this.resolvers = resolvers || {};

    if (initial !== undefined) {
      assignObjectToMap(this.records, initial.records);
      assignObjectToMap(this.links, initial.links);
    }
  }

  serialize(): SerializedStore {
    const records = objectOfMap(this.records);
    const links = objectOfMap(this.links);
    return { records, links };
  }

  find(key: string): Entity | null {
    const entity = this.records.get(key);
    return entity !== undefined ? entity : null;
  }

  findOrCreate(key: string): Entity {
    const entity = this.find(key);
    if (entity !== null) {
      return entity;
    }

    const record: Entity = Object.create(null);
    this.records.set(key, record);
    return record;
  }

  readLink(key: string): void | Link {
    return this.links.get(key);
  }

  remove(key: string): void {
    this.records.delete(key);
  }

  setLink(key: string, link: Link): void {
    this.links.set(key, link);
  }

  removeLink(key: string): void {
    this.links.delete(key);
  }

  resolveEntity({
    __typename,
    id,
  }: {
    __typename: string;
    id?: string;
  }): Entity | null {
    return this.find(`${__typename}:${id}`);
  }

  resolveProperty(parent: Entity, key: string): Link | Primitive | Scalar {
    const result = parent[key];
    // TODO: arguments to achieve correct key
    if (result === null) return this.links[key];
    return result;
  }

  resolveEntities(__typename: string): Entity[] | null {
    const result: Entity[] = [];
    this.records.forEach((entity, key) => {
      if (key.startsWith(__typename)) result.push(entity);
    });
    return result;
  }
}
