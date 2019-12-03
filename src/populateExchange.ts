import {
  DocumentNode,
  buildClientSchema,
  visitWithTypeInfo,
  TypeInfo,
  FragmentDefinitionNode,
  SelectionSetNode,
  GraphQLSchema,
  IntrospectionQuery,
  FragmentSpreadNode,
  ASTNode,
  isUnionType,
  isInterfaceType,
  isCompositeType,
  isAbstractType,
  visit,
} from 'graphql';

import { pipe, tap, map } from 'wonka';
import { Exchange, Operation } from 'urql';

import { getName, getSelectionSet, unwrapType } from './ast';
import { invariant, warn } from './helpers/help';

interface ExchangeArgs {
  schema: IntrospectionQuery;
}

/** An exchange for auto-populating mutations with a required response body. */
export const populateExchange = ({
  schema: ogSchema,
}: ExchangeArgs): Exchange => ({ forward }) => {
  const schema = buildClientSchema(ogSchema);
  /** List of operation keys that have already been parsed. */
  const parsedOperations = new Set<number>();
  /** List of operation keys that have not been torn down. */
  const activeOperations = new Set<number>();
  /** Collection of fragments used by the user. */
  const userFragments: UserFragmentMap = Object.create(null);
  /** Collection of type fragments. */
  const typeFragments: TypeFragmentMap = Object.create(null);

  /** Handle mutation and inject selections + fragments. */
  const handleIncomingMutation = (op: Operation) => {
    if (op.operationName !== 'mutation') {
      return op;
    }

    const activeSelections: TypeFragmentMap = Object.create(null);
    for (const name in typeFragments) {
      activeSelections[name] = typeFragments[name].filter(s =>
        activeOperations.has(s.key)
      );
    }

    return {
      ...op,
      query: addFragmentsToQuery({
        schema,
        typeFragments: activeSelections,
        userFragments: userFragments,
        query: op.query,
      }),
    };
  };

  /** Handle query and extract fragments. */
  const handleIncomingQuery = ({ key, operationName, query }: Operation) => {
    if (operationName !== 'query') {
      return;
    }

    activeOperations.add(key);
    if (parsedOperations.has(key)) {
      return;
    }

    parsedOperations.add(key);

    const {
      fragments: newFragments,
      selections: newSelections,
    } = extractSelectionsFromQuery({
      schema,
      query,
    });

    for (let i = 0, l = newFragments.length; i < l; i++) {
      const fragment = newFragments[i];
      userFragments[getName(fragment)] = fragment;
    }

    for (let i = 0, l = newSelections.length; i < l; i++) {
      const { selections, type } = newSelections[i];
      const current = typeFragments[type] || [];
      const entry: TypeFragment = {
        key,
        fragment: {
          kind: 'FragmentDefinition',
          typeCondition: {
            kind: 'NamedType',
            name: {
              kind: 'Name',
              value: type,
            },
          },
          name: {
            kind: 'Name',
            value: `${type}_PopulateFragment_${current.length}`,
          },
          selectionSet: selections,
        },
        type,
      };

      typeFragments[type] = current;
      current.push(entry);
    }
  };

  const handleIncomingTeardown = ({ key, operationName }: Operation) => {
    if (operationName === 'teardown') {
      activeOperations.delete(key);
    }
  };

  return ops$ => {
    return pipe(
      ops$,
      tap(handleIncomingQuery),
      tap(handleIncomingTeardown),
      map(handleIncomingMutation),
      forward
    );
  };
};

type UserFragmentMap<T extends string = string> = Record<
  T,
  FragmentDefinitionNode
>;

type TypeFragmentMap<T extends string = string> = Record<T, TypeFragment[]>;

interface TypeFragment {
  /** Operation key where selection set is being used. */
  key: number;
  /** Selection set. */
  fragment: FragmentDefinitionNode;
  /** Type of selection. */
  type: string;
}

interface MakeFragmentsFromQueryArg {
  schema: GraphQLSchema;
  query: DocumentNode;
}

/** Gets typed selection sets and fragments from query */
export const extractSelectionsFromQuery = ({
  schema,
  query,
}: MakeFragmentsFromQueryArg) => {
  const selections: { selections: SelectionSetNode; type: string }[] = [];
  const fragments: FragmentDefinitionNode[] = [];
  const typeInfo = new TypeInfo(schema);

  visit(
    query,
    visitWithTypeInfo(typeInfo, {
      Field: node => {
        if (node.selectionSet) {
          const type = getTypeName(typeInfo);
          selections.push({ selections: node.selectionSet, type });
        }
      },
      FragmentDefinition: node => {
        fragments.push(node);
      },
    })
  );

  return { selections, fragments };
};

interface AddFragmentsToQuery {
  schema: GraphQLSchema;
  query: DocumentNode;
  typeFragments: Record<string, Omit<TypeFragment, 'key'>[]>;
  userFragments: UserFragmentMap;
}

/** Replaces populate decorator with fragment spreads + fragments. */
export const addFragmentsToQuery = ({
  schema,
  query,
  typeFragments,
  userFragments,
}: AddFragmentsToQuery) => {
  const typeInfo = new TypeInfo(schema);

  const requiredUserFragments: Record<
    string,
    FragmentDefinitionNode
  > = Object.create(null);

  const additionalFragments: Record<
    string,
    FragmentDefinitionNode
  > = Object.create(null);

  return visit(
    query,
    visitWithTypeInfo(typeInfo, {
      Field: {
        enter: node => {
          if (!node.directives) {
            return;
          }

          const directives = node.directives.filter(
            d => getName(d) !== 'populate'
          );
          if (directives.length === node.directives.length) {
            return;
          }

          const types = getTypes(schema, typeInfo);
          const newSelections = types.reduce((p, t) => {
            const typeFrags = typeFragments[t.name];
            if (!typeFrags) {
              return p;
            }

            p.push(
              ...typeFragments[t.name].map(({ fragment }) => {
                const fragmentName = getName(fragment);
                const usedFragments = getUsedFragments(fragment);

                // Add used fragment for insertion at Document node
                for (let i = 0, l = usedFragments.length; i < l; i++) {
                  const name = usedFragments[i];
                  requiredUserFragments[name] = userFragments[name];
                }

                // Add fragment for insertion at Document node
                additionalFragments[fragmentName] = fragment;

                return {
                  kind: 'FragmentSpread',
                  name: {
                    kind: 'Name',
                    value: fragmentName,
                  },
                } as const;
              })
            );

            return p;
          }, [] as FragmentSpreadNode[]);

          const existingSelections = getSelectionSet(node);

          const selections =
            existingSelections.length + newSelections.length !== 0
              ? [...newSelections, ...existingSelections]
              : [
                  {
                    kind: 'Field',
                    name: {
                      kind: 'Name',
                      value: '__typename',
                    },
                  },
                ];

          return {
            ...node,
            directives,
            selectionSet: {
              kind: 'SelectionSet',
              selections,
            },
          };
        },
      },
      Document: {
        leave: node => {
          const definitions = [...node.definitions];
          for (const key in additionalFragments)
            definitions.push(additionalFragments[key]);
          for (const key in requiredUserFragments)
            definitions.push(requiredUserFragments[key]);
          return { ...node, definitions };
        },
      },
    })
  );
};

/** Get all possible types for node with TypeInfo. */
const getTypes = (schema: GraphQLSchema, typeInfo: TypeInfo) => {
  const type = unwrapType(typeInfo.getType());
  if (!isCompositeType(type)) {
    warn(
      'Invalid type: The type ` + type + ` is used with @populate but does not exist.',
      17
    );
    return [];
  }

  return isInterfaceType(type) || isUnionType(type)
    ? schema.getPossibleTypes(type)
    : [type];
};

/** Get name of non-abstract type for adding to 'typeFragments'. */
const getTypeName = (typeInfo: TypeInfo) => {
  const type = unwrapType(typeInfo.getType());
  invariant(
    type && !isAbstractType(type),
    'Invalid TypeInfo state: Found no flat schema type when one was expected.',
    18
  );

  return type.toString();
};

/** Get fragment names referenced by node. */
const getUsedFragments = (node: ASTNode) => {
  const names: string[] = [];

  visit(node, {
    FragmentSpread: f => {
      names.push(getName(f));
    },
  });

  return names;
};
