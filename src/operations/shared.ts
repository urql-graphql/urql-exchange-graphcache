import { FieldNode } from 'graphql';

import {
  getFragments,
  getMainOperation,
  getName,
  normalizeVariables,
  getSelectionSet,
  isFieldNode,
  isInlineFragment,
  shouldInclude,
} from '../ast';

import { Store } from '../store';
import { SelectionSet } from '../types';
import { Context, Request } from './types';

export const makeContext = (store: Store, request: Request): void | Context => {
  const { query, variables } = request;
  const operation = getMainOperation(query);
  if (operation === undefined) {
    return;
  }

  const dependencies = [];
  const fragments = getFragments(query);
  const vars = normalizeVariables(operation, variables);
  const isComplete = true;

  return { dependencies, isComplete, operation, fragments, vars, store };
};

export const forEachFieldNode = (
  ctx: Context,
  select: SelectionSet,
  cb: (node: FieldNode) => void
) => {
  const { vars, fragments } = ctx;

  select.forEach(node => {
    if (!shouldInclude(node, vars)) {
      // Directives instruct this node to be skipped
      return;
    } else if (!isFieldNode(node)) {
      // A fragment is either referred to by FragmentSpread or inline
      const def = isInlineFragment(node) ? node : fragments[getName(node)];

      if (def !== undefined) {
        const fragmentSelect = getSelectionSet(def);
        // TODO: Check for getTypeCondition(def) to match
        // Recursively process the fragments' selection sets
        forEachFieldNode(ctx, fragmentSelect, cb);
      }
    } else if (getName(node) !== '__typename') {
      cb(node);
    }
  });
};
