import { FieldNode } from 'graphql';
import { Fragments, Variables, SelectionSet } from '../types';
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

export const forEachFieldNode = (
  typeName: string,
  entityKey: string,
  select: SelectionSet,
  ctx: Context,
  cb: (node: FieldNode) => void
) => {
  select.forEach(node => {
    if (!shouldInclude(node, ctx.variables)) {
      // Directives instruct this node to be skipped
      return;
    } else if (!isFieldNode(node)) {
      // A fragment is either referred to by FragmentSpread or inline
      const def = isInlineFragment(node) ? node : ctx.fragments[getName(node)];

      if (def !== undefined) {
        const fragmentSelect = getSelectionSet(def);
        const typeCondition = getTypeCondition(def);

        const matches =
          typeCondition === typeName ||
          !fragmentSelect.some(node => {
            if (!isFieldNode(node)) return false;
            const fieldName = getName(node);
            const fieldArgs = getFieldArguments(node, ctx.variables);
            const fieldKey = joinKeys(
              entityKey,
              keyOfField(fieldName, fieldArgs)
            );
            return !ctx.store.hasField(fieldKey);
          });

        if (matches) {
          forEachFieldNode(typeName, entityKey, fragmentSelect, ctx, cb);
        }
      }
    } else if (getName(node) !== '__typename') {
      cb(node);
    }
  });
};
