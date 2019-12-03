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
  isNonNullType,
  isListType,
  isUnionType,
  isInterfaceType,
  isCompositeType,
  isAbstractType,
  visit,
} from 'graphql';

import { pipe, tap, map } from 'wonka';
import { Exchange, Operation } from 'urql';

import { getName, getSelectionSet } from './ast';
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
  let userFragments: UserFragmentMap = Object.create(null);
  /** Collection of type fragments. */
  let typeFragments: TypeFragmentMap = Object.create(null);

  /** Handle mutation and inject selections + fragments. */
  const handleIncomingMutation = (op: Operation) => {
    if (op.operationName !== 'mutation') {
      return op;
    }

    const activeSelections = Object.keys(typeFragments).reduce(
      (state, key) => ({
        ...state,
        [key]: state[key].filter(s => activeOperations.has(s.key)),
      }),
      typeFragments
    );

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

    userFragments = newFragments.reduce((state, fragment) => {
      state[getName(fragment)] = fragment;
      return state;
    }, userFragments);

    typeFragments = newSelections.reduce((state, { selections, type }) => {
      const current = state[type] || [];
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

      current.push(entry);
      state[type] = current;
      return state;
    }, typeFragments);
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

            return [
              ...p,
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
              }),
            ];
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
  const typeInfoType = typeInfo.getType();
  const type =
    isListType(typeInfoType) || isNonNullType(typeInfoType)
      ? typeInfoType.ofType
      : typeInfoType;

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
const getTypeName = (t: TypeInfo) => {
  const typeInfoType = t.getType();
  const type =
    isListType(typeInfoType) || isNonNullType(typeInfoType)
      ? typeInfoType.ofType
      : typeInfoType;

  invariant(
    !isAbstractType(type),
    'Invalid TypeInfo state: Found an abstract type when none was expected.',
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
