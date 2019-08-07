import {
  NamedTypeNode,
  NameNode,
  OperationDefinitionNode,
  SelectionSetNode,
  SelectionNode,
  InlineFragmentNode,
  FieldNode,
} from 'graphql';

import { OperationType, SelectionSet } from '../types';

/** Returns the name of a given node */
export const getName = (node: { name: NameNode }): string => node.name.value;

/** Returns either the field's name or the field's alias */
export const getFieldAlias = (node: FieldNode): string =>
  node.alias !== undefined ? node.alias.value : getName(node);

/** Returns the SelectionSet for a given inline or defined fragment node */
export const getSelectionSet = (node: {
  selectionSet?: SelectionSetNode;
}): SelectionSet =>
  node.selectionSet !== undefined ? node.selectionSet.selections : [];

export const getTypeCondition = ({
  typeCondition,
}: {
  typeCondition?: NamedTypeNode;
}): string | null =>
  typeCondition !== undefined ? getName(typeCondition) : null;

/** Checks whether a SelectionNode is a FieldNode */
export const isFieldNode = (node: SelectionNode): node is FieldNode =>
  node.kind === 'Field';

/** Checks whether a SelectionNode is an InlineFragmentNode */
export const isInlineFragment = (
  node: SelectionNode
): node is InlineFragmentNode => node.kind === 'InlineFragment';

export const getOperationType = (
  node: OperationDefinitionNode
): OperationType => node.operation;
