import { FragmentDefinitionNode } from 'graphql';
import { getTypeCondition } from '../ast';
import { Store } from '../store';

export const matchFragment = (
  store: Store,
  key: string,
  fragment: FragmentDefinitionNode
): boolean | 'heuristic' => {
  const typeCondition = getTypeCondition(fragment);
  const typename = store.getRecord(`${key}.__typename`);
  if (typename === 'Query') return true;
  // The name and condition are equals so we know they are matched.
  if (typeCondition === typename) return true;
  // We can't know for sure without the schema.
  // When we return 'heuristic' + have missing fragmentFields
  // We know we're making a mistake.
  return 'heuristic';
};
