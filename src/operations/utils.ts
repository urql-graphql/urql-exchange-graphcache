import { keyOfField, joinKeys } from 'src/helpers';
import { getFieldArguments, getName, getFieldAlias } from 'src/ast';
import { Entity, Variables, Scalar } from 'src/types';
import { FieldNode } from 'graphql';

interface GetFieldDataArguments {
  entity: Entity;
  key: string;
  node: FieldNode;
  variables: Variables;
}

interface GetFieldDataResult {
  childFieldKey: string;
  fieldName: string;
  fieldArgs: Variables | null;
  fieldKey: string;
  fieldValue: Scalar | Scalar[];
  fieldAlias: string;
}

export const getFieldData = ({
  entity,
  key,
  node,
  variables,
}: GetFieldDataArguments): GetFieldDataResult => {
  const fieldName = getName(node);
  const fieldArgs = getFieldArguments(node, variables);
  const fieldKey = keyOfField(fieldName, fieldArgs);
  return {
    fieldName,
    fieldArgs,
    fieldKey,
    fieldValue: entity[fieldKey],
    fieldAlias: getFieldAlias(node),
    childFieldKey: joinKeys(key, fieldKey),
  };
};
