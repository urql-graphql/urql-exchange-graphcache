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
import {
  SelectionSet,
  Variables,
  OperationRequest,
  Fragments,
  Completeness,
} from '../types';

export interface Context {
  dependencies: Set<string>;
  completeness: Completeness;
  vars: Variables;
  fragments: Fragments;
  store: Store;
  // TODO: type this
  operation: any;
}

export const makeContext = (
  store: Store,
  request: OperationRequest
): void | Context => {
  const { query, variables } = request;
  const operation = getMainOperation(query);
  if (operation === undefined) {
    return;
  }

  const dependencies = new Set<string>();
  const fragments = getFragments(query);
  const vars = normalizeVariables(operation, variables);
  const completeness = 'FULL';

  return {
    dependencies,
    completeness,
    operation,
    fragments,
    vars,
    store,
  };
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
