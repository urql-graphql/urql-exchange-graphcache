import { FieldNode, InlineFragmentNode, FragmentDefinitionNode } from 'graphql';
import { Fragments, Variables, SelectionSet, Scalar } from '../types';
import { Store } from '../store';
import { joinKeys, keyOfField } from '../helpers';

import {
  getTypeCondition,
  getFieldArguments,
  shouldInclude,
  isFieldNode,
  isInlineFragment,
  getSelectionSet,
  getName,
} from '../ast';
import { SchemaPredicates } from '../ast/schemaPredicates';

interface Context {
  store: Store;
  variables: Variables;
  fragments: Fragments;
  schemaPredicates: SchemaPredicates;
}

const isFragmentHeuristicallyMatching = (
  node: InlineFragmentNode | FragmentDefinitionNode,
  entityKey: string,
  ctx: Context
) =>
  !getSelectionSet(node).some(node => {
    if (!isFieldNode(node)) return false;
    const fieldName = getName(node);
    const fieldArgs = getFieldArguments(node, ctx.variables);
    const fieldKey = keyOfField(fieldName, fieldArgs);
    return !ctx.store.hasField(joinKeys(entityKey, fieldKey));
  });

export class SelectionIterator {
  typename: void | string;
  entityKey: string;
  indexStack: number[];
  context: Context;
  selectionStack: SelectionSet[];

  // We can add schema here and iterate over query simultaneously with
  // our selectionset. This would probably make us return both of them in .next()
  // So we'd get for example query { todos { id title } } This would make us go into
  // the selectionSet and see it's a query. Go to the subpath of the schema return the node.
  // Selection gets selected again and so on. This way we always have the same node in the
  // schema and in the iterator. This would ensure we can always compare non-nullable.
  //
  // This does introduce a problem for partial queries since for that we would have to explore
  // the tree further to see if we can return or should just go for an EMPTY result.
  constructor(
    typename: void | string,
    entityKey: string,
    select: SelectionSet,
    ctx: Context
  ) {
    this.typename = typename;
    this.entityKey = entityKey;
    this.context = ctx;
    this.indexStack = [0];
    this.selectionStack = [select];
  }

  next(): void | FieldNode {
    while (this.indexStack.length !== 0) {
      const index = this.indexStack[this.indexStack.length - 1]++;
      const select = this.selectionStack[this.selectionStack.length - 1];
      if (index >= select.length) {
        this.indexStack.pop();
        this.selectionStack.pop();
        continue;
      } else {
        const node = select[index];
        if (!shouldInclude(node, this.context.variables)) {
          continue;
        } else if (!isFieldNode(node)) {
          // A fragment is either referred to by FragmentSpread or inline
          const fragmentNode = !isInlineFragment(node)
            ? this.context.fragments[getName(node)]
            : node;

          if (fragmentNode !== undefined) {
            const typeCondition = getTypeCondition(fragmentNode);
            const isMatching = this.context.schemaPredicates.isInterfaceOfType(
              typeCondition as string,
              this.typename as string
            );
            if (
              !isMatching ||
              (isMatching === 'heuristic' &&
                !isFragmentHeuristicallyMatching(
                  fragmentNode,
                  this.entityKey,
                  this.context
                ))
            )
              continue;

            this.indexStack.push(0);
            this.selectionStack.push(getSelectionSet(fragmentNode));
          }
          continue;
        } else if (getName(node) === '__typename') {
          continue;
        } else {
          return node;
        }
      }
    }

    return undefined;
  }
}

// Without a typename field on Data or Data[] the result must be a scalar
// This effectively prevents us from writing Data into the store that
// doesn't have a __typename field
export const isScalar = (x: any): x is Scalar | Scalar[] => {
  if (Array.isArray(x)) {
    return x.some(isScalar);
  }

  return (
    typeof x !== 'object' ||
    (x !== null && typeof (x as any).__typename !== 'string')
  );
};
