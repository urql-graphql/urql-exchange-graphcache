import {
  getFieldAlias,
  getFieldArguments,
  getName,
  getSelectionSet,
} from '../ast';

import { joinKeys, keyOfEntity, keyOfField } from '../helpers';
import { Store } from '../store';
import {
  Entity,
  Link,
  Scalar,
  SelectionSet,
  Data,
  WriteResult,
  OperationRequest,
} from '../types';

import { forEachFieldNode, makeContext, Context } from './shared';

export interface WriteResultTemp {
  touched: string[];
}

/** Writes a request given its response to the store */
export const write = (
  store: Store,
  request: OperationRequest,
  data: Data
): WriteResult => {
  const ctx = makeContext(store, request);
  if (ctx === undefined) {
    return { dependencies: new Set<string>() };
  }

  const { operation } = ctx;
  const select = getSelectionSet(operation);
  const operationType = operation.operation;

  if (typeof data.__typename !== 'string') {
    data.__typename = operationType;
  }

  if (operationType === 'query') {
    writeEntity(ctx, 'Query', data, select);
  } else {
    writeRoot(ctx, data, select);
  }

  return { dependencies: ctx.dependencies };
};

const writeEntity = (
  ctx: Context,
  key: string,
  data: Data,
  select: SelectionSet
) => {
  const { store } = ctx;
  const entity = store.findOrCreate(key);
  if (key !== 'Query') {
    ctx.dependencies.add(key);
  }

  writeSelection(ctx, entity, key, data, select);
};

const writeSelection = (
  ctx: Context,
  entity: Entity,
  key: string,
  data: Data,
  select: SelectionSet
) => {
  entity.__typename = data.__typename;

  forEachFieldNode(ctx, select, node => {
    const { store, vars } = ctx;

    const fieldName = getName(node);
    const fieldValue = data[getFieldAlias(node)];
    // The field's key can include arguments if it has any
    const fieldKey = keyOfField(fieldName, getFieldArguments(node, vars));
    const childFieldKey = joinKeys(key, fieldKey);
    if (key === 'Query' && fieldName !== '__typename') {
      ctx.dependencies.add(childFieldKey);
    }

    if (
      node.selectionSet === undefined ||
      fieldValue === null ||
      isScalar(fieldValue)
    ) {
      // This is a leaf node, so we're setting the field's value directly
      entity[fieldKey] = fieldValue;
      // Remove any links that might've existed before for this field
      store.removeLink(childFieldKey);
    } else {
      // Ensure that this key exists on the entity and that previous values are thrown away
      entity[fieldKey] = null;

      // Process the field and write links for the child entities that have been written
      const { selections: fieldSelect } = node.selectionSet;
      // TODO: apparently this can be null meaning no intersection with SystemFields.
      // TODO: type
      const link = writeField(
        ctx,
        childFieldKey,
        fieldValue as Data,
        fieldSelect
      );
      store.setLink(childFieldKey, link);
    }
  });
};

const writeField = (
  ctx: Context,
  parentFieldKey: string,
  data: Data,
  select: SelectionSet
): Link => {
  if (Array.isArray(data)) {
    return data.map((item, index) => {
      // Append the current index to the parentFieldKey fallback
      const indexKey = joinKeys(parentFieldKey, `${index}`);
      // Recursively write array data
      const links = writeField(ctx, indexKey, item, select);
      // Link cannot be expressed as a recursive type
      return links as string | null;
    });
  } else if (data === null) {
    return null;
  }

  // Write entity to key that falls back to the given parentFieldKey
  const entityKey = keyOfEntity(data);
  const key = entityKey !== null ? entityKey : parentFieldKey;
  writeEntity(ctx, key, data, select);
  return key;
};

// This is like writeSelection but assumes no parent entity exists
const writeRoot = (ctx: Context, data: Data, select: SelectionSet) => {
  forEachFieldNode(ctx, select, node => {
    const fieldValue = data[getFieldAlias(node)];

    if (
      node.selectionSet !== undefined &&
      fieldValue !== null &&
      !isScalar(fieldValue)
    ) {
      const { selections: fieldSelect } = node.selectionSet;
      // TODO: apparently this can be null meaning no intersection with SystemFields.
      // TODO: type
      writeRootField(ctx, fieldValue as Data, fieldSelect);
    }
  });
};

// This is like writeField but doesn't fall back to a generated key
const writeRootField = (ctx: Context, data: Data, select: SelectionSet) => {
  if (Array.isArray(data)) {
    return data.map(item => writeRootField(ctx, item, select));
  } else if (data === null) {
    return;
  }

  // Write entity to key that falls back to the given parentFieldKey
  const entityKey = keyOfEntity(data);
  if (entityKey !== null) {
    writeEntity(ctx, entityKey, data, select);
  }
};

// Without a typename field on Data or Data[] the result must be a scalar
// This effectively prevents us from writing Data into the store that
// doesn't have a __typename field
const isScalar = (x: Scalar | Data | Array<Scalar | Data>): x is Scalar => {
  if (Array.isArray(x)) {
    return x.some(isScalar);
  }

  return (
    typeof x !== 'object' ||
    (x !== null && typeof (x as any).__typename !== 'string')
  );
};
