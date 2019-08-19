import { DocumentNode } from 'graphql';
import { Map, make, get, set, remove } from 'pessimism';

import {
  EntityField,
  Link,
  ResolverConfig,
  DataField,
  SystemFields,
  Variables,
  Data,
  UpdatesConfig,
  OptimisticMutationConfig,
} from '../types';

import { keyOfEntity, joinKeys, keyOfField } from '../helpers';
import { query, write, writeFragment } from '../operations';

export class Store {
  records: Map<EntityField>;
  links: Map<Link>;
  pendingDependencies: Set<string>;

  resolvers: ResolverConfig;
  updates: UpdatesConfig;
  optimisticMutations: OptimisticMutationConfig;

  constructor(
    resolvers?: ResolverConfig,
    updates?: UpdatesConfig,
    optimisticMutations?: OptimisticMutationConfig
  ) {
    this.records = make();
    this.links = make();
    this.pendingDependencies = new Set();
    this.resolvers = resolvers || {};
    this.updates = updates || {};
    this.optimisticMutations = optimisticMutations || {};
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

  resolveValueOrLink(fieldKey: string): DataField {
    const fieldValue = this.getRecord(fieldKey);
    // Undefined implies a link OR incomplete data.
    // A value will imply that we are just fetching a field like date.
    if (fieldValue !== undefined) return fieldValue;

    // This can be an array OR a string OR undefined again
    const link = this.getLink(fieldKey);
    return link ? link : null;
  }

  addDeps(dependencies: string | Set<string>) {
    if (typeof dependencies === 'string')
      this.pendingDependencies.add(dependencies);
    else {
      this.pendingDependencies = new Set([
        ...this.pendingDependencies,
        ...dependencies,
      ]);
    }
  }

  releaseDeps(): Set<string> {
    const temp = this.pendingDependencies;
    this.pendingDependencies = new Set<string>();
    return temp;
  }

  resolve(entity: SystemFields, field: string, args?: Variables): DataField {
    if (typeof entity === 'string') {
      this.addDeps(entity);
      return this.resolveValueOrLink(joinKeys(entity, keyOfField(field, args)));
    } else {
      // This gives us __typename:key
      const entityKey = keyOfEntity(entity);
      if (entityKey === null) return null;
      this.addDeps(entityKey);
      return this.resolveValueOrLink(
        joinKeys(entityKey, keyOfField(field, args))
      );
    }
  }

  updateQuery(
    dataQuery: DocumentNode,
    updater: (data: Data | null) => Data
  ): void {
    // The pendingDependencies will also include passes of our dataQuery.
    // in resolvers... Don't know if this is a problem...
    // Personally I don't think so since the data is probably related to the
    // query anyway.
    const { data } = query(this, { query: dataQuery });
    const { dependencies } = write(this, { query: dataQuery }, updater(data));
    this.addDeps(dependencies);
  }

  writeFragment(dataFragment: DocumentNode, data: Data): void {
    const { dependencies } = writeFragment(this, dataFragment, data);
    this.addDeps(dependencies);
  }
}
