import {
  SelectionNode,
  DocumentNode,
  DefinitionNode,
  FragmentDefinitionNode,
  OperationDefinitionNode,
} from 'graphql';

import { getName } from './node';
import { evaluateValueNode } from './variables';
import { Fragments, Variables } from '../types';

const isFragmentNode = (
  node: DefinitionNode
): node is FragmentDefinitionNode => {
  return node.kind === 'FragmentDefinition';
};

/** Returns the main operation's definition */
export const getMainOperation = (
  doc: DocumentNode
): OperationDefinitionNode | void => {
  return doc.definitions.find(
    node => node.kind === 'OperationDefinition'
  ) as OperationDefinitionNode;
};

/** Returns a mapping from fragment names to their selections */
export const getFragments = (doc: DocumentNode): Fragments =>
  doc.definitions.filter(isFragmentNode).reduce((map: Fragments, node) => {
    map[getName(node)] = node;
    return map;
  }, {});

export const shouldInclude = (
  node: SelectionNode,
  vars: Variables
): boolean => {
  if (node.directives === undefined) {
    return true;
  }

  // Finds any @include or @skip directive that forces the node to be skipped
  return !node.directives.some(directive => {
    const name = getName(directive);
    // Ignore other directives
    const isInclude = name === 'include';
    if (!isInclude && name !== 'skip') {
      return false;
    }

    // Get the first argument and expect it to be named "if"
    const firstArg =
      directive.arguments !== undefined ? directive.arguments[0] : null;
    if (firstArg === null) {
      return false;
    } else if (getName(firstArg) !== 'if') {
      return false;
    }

    const value = evaluateValueNode(firstArg.value, vars);
    if (typeof value !== 'boolean' && value !== null) {
      return false;
    }

    // Return whether this directive forces us to skip
    // `@include(if: false)` or `@skip(if: true)`
    return isInclude ? !value : !!value;
  });
};
