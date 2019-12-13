import { FieldNode } from 'graphql';

import {
  getMainOperation,
  normalizeVariables,
  getFragments,
  getSelectionSet,
  getName,
  getFieldArguments,
} from '../ast';

import {
  EntityField,
  OperationRequest,
  Variables,
  Fragments,
  SelectionSet,
} from '../types';

import { Store, addDependency, joinKeys, keyOfField } from '../store';
import { SchemaPredicates } from '../ast';
import { SelectionIterator } from './shared';

interface Context {
  store: Store;
  variables: Variables;
  fragments: Fragments;
  schemaPredicates?: SchemaPredicates;
}

export const invalidate = (store: Store, request: OperationRequest) => {
  const operation = getMainOperation(request.query);

  const ctx: Context = {
    variables: normalizeVariables(operation, request.variables),
    fragments: getFragments(request.query),
    store,
    schemaPredicates: store.schemaPredicates,
  };

  invalidateSelection(
    ctx,
    ctx.store.getRootKey('query'),
    getSelectionSet(operation)
  );
};

export const invalidateSelection = (
  ctx: Context,
  entityKey: string,
  select: SelectionSet
) => {
  const { store } = ctx;
  const isQuery = entityKey === 'Query';

  let typename: EntityField;
  if (!isQuery) {
    addDependency(entityKey);
    typename = store.getField(entityKey, '__typename');
    if (typeof typename !== 'string') {
      return;
    } else {
      store.writeRecord(undefined, entityKey, keyOfField('__typename'));
    }
  } else {
    typename = entityKey;
  }

  const iter = new SelectionIterator(typename, entityKey, select, ctx);

  let node: FieldNode | void;
  while ((node = iter.next()) !== undefined) {
    const fieldName = getName(node);
    const fieldKey = keyOfField(
      fieldName,
      getFieldArguments(node, ctx.variables)
    );
    const key = joinKeys(entityKey, fieldKey);

    if (
      process.env.NODE_ENV !== 'production' &&
      ctx.schemaPredicates &&
      typename
    ) {
      ctx.schemaPredicates.isFieldAvailableOnType(typename, fieldName);
    }

    if (isQuery) addDependency(key);

    if (node.selectionSet === undefined) {
      store.writeRecord(undefined, entityKey, fieldKey);
    } else {
      const fieldSelect = getSelectionSet(node);
      const link = store.getLink(entityKey, fieldKey);
      store.writeLink(undefined, entityKey, fieldKey);
      store.writeRecord(undefined, entityKey, fieldKey);

      if (Array.isArray(link)) {
        for (let i = 0, l = link.length; i < l; i++) {
          const childLink = link[i];
          if (childLink !== null) {
            invalidateSelection(ctx, childLink, fieldSelect);
          }
        }
      } else if (link) {
        invalidateSelection(ctx, link, fieldSelect);
      }
    }
  }
};
