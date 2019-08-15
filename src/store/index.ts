import { DocumentNode } from 'graphql';
import { Map, make, get, set, remove } from 'pessimism';

import {
  EntityField,
  Entity,
  Link,
  ResolverConfig,
  ResolverResult,
  SystemFields,
  Variables,
  Data,
  UpdatesConfig,
} from '../types';

import { keyOfEntity, joinKeys, keyOfField } from '../helpers';
import { query, write, writeFragment } from '../operations';

export class Store {
  records: Map<EntityField>;
  links: Map<Link>;

  resolvers: ResolverConfig;
  updates: UpdatesConfig;

  constructor(resolvers?: ResolverConfig, updates?: UpdatesConfig) {
    this.records = make();
    this.links = make();
    this.resolvers = resolvers || {};
    this.updates = updates || {};
  }

  getRecord(fieldKey: string): EntityField {
    return get(this.records, fieldKey);
  }

  removeRecord(fieldKey: string) {
    return (this.records = remove(this.records, fieldKey));
  }

  writeRecord(field: EntityField, fieldKey: string) {
    return (this.records = set(this.records, fieldKey, field));
  }

  getField(
    entityKey: string,
    fieldName: string,
    args?: Variables
  ): EntityField {
    const fieldKey = joinKeys(entityKey, keyOfField(fieldName, args));
    return this.getRecord(fieldKey);
  }

  writeField(
    field: EntityField,
    entityKey: string,
    fieldName: string,
    args?: Variables
  ) {
    const fieldKey = joinKeys(entityKey, keyOfField(fieldName, args));
    return (this.records = set(this.records, fieldKey, field));
  }

  getLink(key: string): undefined | Link {
    return get(this.links, key);
  }

  removeLink(key: string) {
    return (this.links = remove(this.links, key));
  }

  writeLink(link: Link, key: string) {
    return (this.links = set(this.links, key, link));
  }

  resolveEntity(entity: SystemFields): Entity | null {
    return keyOfEntity(entity) ? (entity as any) : null; // TODO: Create stand-in entities
  }

  resolveProperty(
    parent: Entity,
    field: string,
    args?: null | Variables
  ): ResolverResult {
    const entityKey = keyOfEntity(parent);
    if (entityKey === null) return null;

    const fieldKey = joinKeys(entityKey, keyOfField(field, args));
    const fieldValue = this.getRecord(fieldKey);
    if (fieldValue !== undefined) return fieldValue;

    return null; // TODO: Figure out how to do this; Stand-in entities?

    /*
    const link = this.getLink(fieldKey);
    if (Array.isArray(link)) {
      return link.map(key => (key !== null ? this.find(key) : null));
    } else {
      return link ? this.find(link) : null;
    }
    */
  }

  updateQuery(
    dataQuery: DocumentNode,
    updater: (data: Data | null) => Data
  ): void {
    const { data } = query(this, { query: dataQuery });
    write(this, { query: dataQuery }, updater(data));
  }

  writeFragment(dataFragment: DocumentNode, data: Data): void {
    writeFragment(this, dataFragment, data);
  }
}
