import { FragmentDefinitionNode, FieldNode, InlineFragmentNode } from 'graphql';
import { getTypeCondition, getName, getSelectionSet } from '../ast';
import { Store } from '../store';

export const matchFragment = (
  store: Store,
  key: string,
  fragment: FragmentDefinitionNode | InlineFragmentNode
): boolean | 'heuristic' => {
  const typeCondition = getTypeCondition(fragment);
  const typename = store.getRecord(`${key}.__typename`);
  // The name and condition are equals so we know they are matched.
  if (typeCondition === typename) return true;
  // We can't know for sure without the schema.
  // When we return 'heuristic' + have missing fragmentFields
  // We know we're making a mistake.
  return 'heuristic';
};

export const matchFragmentHeuristically = (
  store: Store,
  key: string,
  fragment: FragmentDefinitionNode | InlineFragmentNode
) => {
  const missing: string[] = [];
  getSelectionSet(fragment).forEach(selection => {
    const fieldName = getName(selection as FieldNode);

    if (store.getRecord(`${key}.${fieldName}`) === undefined) {
      missing.push(fieldName);
    }
  });

  if (missing.length > 0) {
    missing.forEach(name => console.warn('Missing field ', name));
  }
  return missing.length > 0;
};
