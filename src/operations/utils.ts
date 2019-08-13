import { FieldNode } from 'graphql';
import { keyOfField, joinKeys } from '../helpers';
import { getFieldArguments, getName, getFieldAlias } from '../ast';
import { Variables } from '../types';

interface GetFieldDataArguments {
  key: string;
  node: FieldNode;
  variables: Variables;
}

interface GetFieldDataResult {
  childFieldKey: string;
  fieldName: string;
  fieldArgs: Variables | null;
  fieldKey: string;
  fieldAlias: string;
}

export const getFieldData = ({
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
    fieldAlias: getFieldAlias(node),
    childFieldKey: joinKeys(key, fieldKey),
  };
};
