import {
  FieldNode,
  InlineFragmentNode,
  FragmentDefinitionNode,
  DocumentNode,
  ObjectTypeDefinitionNode,
  Kind,
} from 'graphql';
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

interface Context {
  store: Store;
  variables: Variables;
  fragments: Fragments;
}

const isFragmentMatching = (
  node: InlineFragmentNode | FragmentDefinitionNode,
  typename: void | string,
  entityKey: string,
  ctx: Context
) => {
  if (!typename) {
    return false;
  } else if (typename === getTypeCondition(node)) {
    return true;
  }

  // This is a heuristic for now, but temporary until schema awareness becomes a thing
  return !getSelectionSet(node).some(node => {
    if (!isFieldNode(node)) return false;
    const fieldName = getName(node);
    const fieldArgs = getFieldArguments(node, ctx.variables);
    const fieldKey = keyOfField(fieldName, fieldArgs);
    return !ctx.store.hasField(joinKeys(entityKey, fieldKey));
  });
};

export class SelectionIterator {
  typename: void | string;
  entityKey: string;
  indexStack: number[];
  context: Context;
  selectionStack: SelectionSet[];
  schema?: ObjectTypeDefinitionNode;

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
    ctx: Context,
    schema?: DocumentNode
  ) {
    this.typename = typename;
    this.entityKey = entityKey;
    this.context = ctx;
    this.indexStack = [0];
    this.selectionStack = [select];
    if (schema) {
      this.schema = schema.definitions.find(
        ({ name }: any) => name.value === typename
      ) as ObjectTypeDefinitionNode;
    }
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
          if (
            fragmentNode !== undefined &&
            isFragmentMatching(
              fragmentNode,
              this.typename,
              this.entityKey,
              this.context
            )
          ) {
            this.indexStack.push(0);
            this.selectionStack.push(getSelectionSet(fragmentNode));
          }

          continue;
        } else if (getName(node) === '__typename') {
          continue;
        } else {
          let nullable = true;
          if (this.schema && this.schema.fields) {
            const schemaNode = this.schema.fields.find(
              ({ name }) => name.value === node.name.value
            );
            if (schemaNode) {
              nullable = schemaNode.type.kind !== Kind.NON_NULL_TYPE;
            }
          }
          // console.log(node.name.value, nullable);
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
