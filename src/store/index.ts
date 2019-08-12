import {
  Entity,
  Link,
  LinksMap,
  EntitiesMap,
  ResolverConfig,
  Primitive,
  SystemFields,
  Scalar,
} from '../types';

import { keyOfEntity } from '../helpers';
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

  resolveEntity(entity: SystemFields): Entity | null {
    const key = keyOfEntity(entity);
    return key !== null ? this.find(key) : null;
  }

  resolveProperty(
    parent: Entity,
    key: string
  ): Entity[] | Entity | Primitive | Scalar {
    const result = parent[key];
    if (result === null) {
      const link = this.readLink(`${parent.__typename}:${parent.id}.${key}`);
      if (!link) return null;
      else if (Array.isArray(link)) {
        // @ts-ignore: Link cannot be expressed as a recursive type
        return link.map((key: string) => this.find(key));
      } else {
        return this.find(link);
      }
    }
    return result;
  }

  resolveEntities(__typename: string): Entity[] | null {
    const result: Entity[] = [];
    // TODO: this should have an easier way...
    // We have 'Query.todos' => [ 'Todo:0', 'Todo:1', 'Todo:2' ] } in links
    // This however does not work until we know that we need "todos" and that
    // the parent is Query.
    this.records.forEach((entity, key) => {
      if (key.startsWith(__typename)) result.push(entity);
    });
    return result;
  }
}
