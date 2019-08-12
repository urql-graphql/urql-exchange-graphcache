import {
  forEachFieldNode,
  getFieldAlias,
  getFieldArguments,
  getFragments,
  getMainOperation,
  getName,
  getSelectionSet,
  normalizeVariables,
} from '../ast';

import {
  Fragments,
  Variables,
  Data,
  Entity,
  Link,
  SelectionSet,
  Completeness,
  OperationRequest,
  Resolver,
} from '../types';

import { joinKeys, keyOfField } from '../helpers';
import { Store } from '../store';

export interface QueryResult {
  completeness: Completeness;
  dependencies: Set<string>;
  data: null | Data;
}

interface Context {
  result: QueryResult;
  store: Store;
  variables: Variables;
  fragments: Fragments;
}

const isFunction = (possibleFunction: any) =>
  typeof possibleFunction === 'function';

/** Reads a request entirely from the store */
export const query = (store: Store, request: OperationRequest): QueryResult => {
  const operation = getMainOperation(request.query);
  const root: Data = Object.create(null);

  const result: QueryResult = {
    completeness: 'FULL',
    dependencies: new Set(),
    data: root,
  };

  const ctx: Context = {
    variables: normalizeVariables(operation, request.variables),
    fragments: getFragments(request.query),
    result,
    store,
  };

  result.data = readEntity(ctx, 'Query', getSelectionSet(operation), root);
  if (result.completeness === 'EMPTY') {
    result.data = null;
  }

  return result;
};

const readEntity = (
  ctx: Context,
  key: string,
  select: SelectionSet,
  data: Data
): Data | null => {
  const { store, variables } = ctx;
  let entity = store.find(key);
  if (entity === null) {
    // Cache Incomplete: A missing entity for a key means it wasn't cached
    ctx.result.completeness = 'EMPTY';
    return null;
  } else if (key !== 'Query') {
    ctx.result.dependencies.add(key);
  }

  if (key === 'Query') {
    if (
      store.resolvers &&
      store.resolvers[key] &&
      isFunction(store.resolvers[key][entity.__typename])
    ) {
      // @ts-ignore
      entity = store.resolvers[key][entity.__typename](
        // TODO: arguments...
        {} as any,
        variables,
        store,
        {
          fieldName: '',
          path: [],
          fragments: ctx.fragments,
          rootValue: null,
          operation: {},
          variables,
        }
      );
    }
  } else {
    // TODO: how do we get the parent type? Since at this
    // point we are dealing with __typename:id as key.
  }

  return readSelection(
    ctx,
    // TODO: entity is possibly null
    // @ts-ignore
    entity,
    key,
    select,
    data,
    // @ts-ignore
    store.resolvers[entity.__typename]
  );
};

const readSelection = (
  ctx: Context,
  entity: Entity,
  key: string,
  select: SelectionSet,
  data: Data,
  resolvers: { [fieldName: string]: Resolver }
): Data => {
  data.__typename = entity.__typename;
  const { store, fragments, variables } = ctx;
  forEachFieldNode(select, fragments, variables, node => {
    const fieldName = getName(node);
    const fieldArgs = getFieldArguments(node, variables);
    const fieldKey = keyOfField(fieldName, fieldArgs);

    const fieldValue =
      resolvers && isFunction(resolvers[fieldKey])
        ? resolvers[fieldKey](entity, fieldArgs as Variables, store, {
            fieldName,
            path: [],
            fragments: ctx.fragments,
            rootValue: null,
            operation: {},
            variables: fieldArgs as Variables,
          })
        : entity[fieldKey];

    const fieldAlias = getFieldAlias(node);
    const childFieldKey = joinKeys(key, fieldKey);
    if (key === 'Query') {
      ctx.result.dependencies.add(childFieldKey);
    }

    if (fieldValue === undefined) {
      // Cache Incomplete: A missing field means it wasn't cached
      ctx.result.completeness = 'EMPTY';
      data[fieldAlias] = null;
    } else if (node.selectionSet === undefined || fieldValue !== null) {
      data[fieldAlias] = fieldValue;
    } else {
      // null values mean that a field might be linked to other entities
      const fieldSelect = getSelectionSet(node);
      const link = store.readLink(childFieldKey);

      // Cache Incomplete: A missing link for a field means it's not cached
      if (link === undefined) {
        ctx.result.completeness = 'EMPTY';
        data[fieldAlias] = null;
      } else {
        const prevData = data[fieldAlias] as Data;
        data[fieldAlias] = readField(
          ctx,
          link,
          fieldSelect,
          prevData,
          resolvers
        );
      }
    }
  });

  return data;
};

const readField = (
  ctx: Context,
  link: Link,
  select: SelectionSet,
  prevData: void | Data | Data[],
  resolvers
): null | Data | Data[] => {
  if (Array.isArray(link)) {
    // @ts-ignore: Link cannot be expressed as a recursive type
    return link.map((childLink, index) => {
      const data = prevData !== undefined ? prevData[index] : undefined;
      return readField(ctx, childLink, select, data, resolvers);
    });
  } else if (link === null) {
    return null;
  } else {
    const data = prevData === undefined ? Object.create(null) : prevData;
    return readEntity(ctx, link, select, data);
  }
};
