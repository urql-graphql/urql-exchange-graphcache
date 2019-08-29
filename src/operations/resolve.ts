import { Store } from '../store';
import {
  Data,
  SelectionSet,
  OperationRequest,
  Variables,
  Fragments,
  DataField,
} from '../types';
import {
  getSelectionSet,
  getMainOperation,
  normalizeVariables,
  getFragments,
  getName,
  getFieldArguments,
  getFieldAlias,
} from '../ast';
import { SelectionIterator } from './shared';
import { joinKeys, keyOfField, isDataOrKey } from '../helpers';
import warning from 'warning';

interface Context {
  store: Store;
  variables: Variables;
  fragments: Fragments;
}

export const resolveData = (
  store: Store,
  request: OperationRequest,
  data: Data
) => {
  const operation = getMainOperation(request.query);
  const ctx = {
    store,
    variables: normalizeVariables(operation, request.variables),
    fragments: getFragments(request.query),
  };
  resolveDataSelection(ctx, 'Query', getSelectionSet(operation), data);
  return data;
};

const resolveResolverResult = (
  ctx: Context,
  result: DataField,
  key: string,
  select: SelectionSet,
  prevData: void | Data | Data[]
) => {
  // When we are dealing with a list we have to call this method again.
  if (Array.isArray(result)) {
    // @ts-ignore: Link cannot be expressed as a recursive type
    return result.map((childResult, index) => {
      const data = prevData !== undefined ? prevData[index] : undefined;
      const indexKey = joinKeys(key, `${index}`);
      return resolveResolverResult(ctx, childResult, indexKey, select, data);
    });
  } else if (result === null) {
    return null;
  } else if (isDataOrKey(result)) {
    // We don't need to read the entity after exiting a resolver
    // we can just go on and read the selection further.
    const data = prevData === undefined ? Object.create(null) : prevData;
    const childKey =
      (typeof result === 'string' ? result : ctx.store.keyOfEntity(result)) ||
      key;
    const selectionResult = resolveDataSelection(ctx, childKey, select, data);

    if (selectionResult !== null && typeof result === 'object') {
      for (key in result) {
        if (key !== '__typename' && result.hasOwnProperty(key)) {
          selectionResult[key] = result[key];
        }
      }
    }

    return selectionResult;
  }

  warning(
    false,
    'Invalid resolver value: The resolver at `%s` returned a scalar (number, boolean, etc)' +
      ', but the GraphQL query expects a selection set for this field.\n' +
      'If necessary, use Cache.resolve() to resolve a link or entity from the cache.',
    key
  );

  return null;
};

const resolveDataSelection = (
  ctx: Context,
  entityKey: string,
  select: SelectionSet,
  data: Data
) => {
  const { store, variables } = ctx;
  const typename =
    entityKey === 'Query'
      ? entityKey
      : (store.getField(entityKey, '__typename') as string);
  const iter = new SelectionIterator(typename, entityKey, select, ctx);

  let node;
  while ((node = iter.next()) !== undefined) {
    // Derive the needed data from our node.
    const fieldName = getName(node);
    const fieldArgs = getFieldArguments(node, variables);
    const fieldAlias = getFieldAlias(node);
    const fieldKey = joinKeys(entityKey, keyOfField(fieldName, fieldArgs));

    const resolvers = store.resolvers[typename];
    if (resolvers !== undefined && resolvers.hasOwnProperty(fieldName)) {
      // We have a resolver for this field.
      const resolverValue = resolvers[fieldName](
        data,
        fieldArgs || {},
        store,
        ctx
      );

      if (node.selectionSet === undefined) {
        data[fieldAlias] = resolverValue !== undefined ? resolverValue : null;
      } else {
        const fieldSelect = getSelectionSet(node);

        data[fieldAlias] = resolveResolverResult(
          ctx,
          resolverValue,
          fieldKey,
          fieldSelect,
          data[fieldAlias] as Data | Data[]
        );
      }
    }
  }
};
