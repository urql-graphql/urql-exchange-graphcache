import { stringifyVariables } from 'urql';
import { Variables, FieldInfo } from '../types';

export const keyOfField = (fieldName: string, args?: null | Variables) =>
  args ? `${fieldName}(${stringifyVariables(args)})` : fieldName;

export const fieldInfoOfKey = (fieldKey: string): FieldInfo => {
  const curlyIndex = fieldKey.indexOf('(');
  if (curlyIndex > -1) {
    return {
      fieldKey,
      fieldName: fieldKey.slice(0, curlyIndex),
      arguments: JSON.parse(fieldKey.slice(curlyIndex + 1, -1)),
    };
  } else {
    return {
      fieldKey,
      fieldName: fieldKey,
      arguments: null,
    };
  }
};

export const joinKeys = (parentKey: string, key: string) =>
  `${parentKey}.${key}`;
