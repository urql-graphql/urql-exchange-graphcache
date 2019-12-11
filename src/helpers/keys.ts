import { stringifyVariables } from 'urql';
import { Variables } from '../types';

export const keyOfField = (fieldName: string, args?: null | Variables) =>
  args ? `${fieldName}(${stringifyVariables(args)})` : fieldName;

export const joinKeys = (parentKey: string, key: string) =>
  `${parentKey}.${key}`;

/** Prefix key with its owner type Connection / Link / Record */
export const prefixKey = (owner: 'c' | 'l' | 'r', key: string) =>
  `${owner}|${key}`;
