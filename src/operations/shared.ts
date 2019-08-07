import { FieldNode } from 'graphql';

import {
  getFragments,
  getMainOperation,
  getName,
  getNormalizedVars,
  getSelectionSet,
  isFieldNode,
  isInlineFragment,
  SelectionSet,
  shouldInclude,
} from '../ast';

import { Store } from '../store';
import { Context, Request } from './types';

export const makeContext = (store: Store, request: Request): void | Context => {
  const { query, variables } = request;
  const operation = getMainOperation(query);
  if (operation === undefined) {
    return;
  }

  const dependencies = [];
  const fragments = getFragments(query);
  const vars = getNormalizedVars(operation, variables);
  const isComplete = true;

  return { dependencies, isComplete, operation, fragments, vars, store };
};
