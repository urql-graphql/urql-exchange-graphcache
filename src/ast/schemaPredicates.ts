import {
  DocumentNode,
  Kind,
  ObjectTypeDefinitionNode,
  buildClientSchema,
  printSchema,
  parse,
} from 'graphql';
import invariant from 'invariant';

type RootField = 'query' | 'mutation' | 'subscription';

export class SchemaPredicates {
  schema?: DocumentNode;
  objectTypes: { [typename: string]: ObjectTypeDefinitionNode };
  fragTypes?: { [typeCondition: string]: Array<string> };
  rootFields: { query: string; mutation: string; subscription: string };

  constructor(schema?) {
    if (schema) {
      this.schema = parseSchema(schema);
      this.objectTypes = getObjectTypes(this.schema.definitions);
      this.fragTypes = getFragmentTypes(schema.__schema.types);
      this.rootFields = getRootTypes(schema.__schema);
    } else {
      this.objectTypes = {};
      this.rootFields = {
        query: 'Query',
        mutation: 'Mutation',
        subscription: 'Subscription',
      };
    }
  }

  getRootKey(name: RootField) {
    return this.rootFields[name];
  }

  isFieldNullable(typename: string, fieldName: string): boolean {
    // When there is no schema we don't assume the nullability of fields.
    if (!this.schema) return false;

    // Get the overcoupling type, for instance Todo.
    // Perf boost: make a mapping of objectTypes.
    const objectTypeNode = this.objectTypes[typename];

    invariant(
      !!objectTypeNode,
      `The type ${typename} does not exist in your schema`
    );

    // Get the specific field.
    const field = getField(objectTypeNode, fieldName);

    invariant(
      !!field,
      `The type ${typename}.${fieldName} does not exist in your schema`
    );

    // @ts-ignore
    return field.type.kind !== Kind.NON_NULL_TYPE;
  }

  isInterfaceOfType(
    typeCondition: string,
    typename: string
  ): boolean | 'heuristic' {
    if (!typename) return false;
    if (typename === typeCondition) return true;
    if (!this.fragTypes) return 'heuristic';
    const possibleTypes = this.fragTypes[typeCondition];
    if (possibleTypes && possibleTypes.includes(typename)) return true;
    return false;
  }
}

const parseSchema = schema => parse(printSchema(buildClientSchema(schema)));
const getFragmentTypes = types => {
  const mapping = {};
  types.forEach(type => {
    // TODO: find the possibleTypes on the parsed schema.
    if (type.kind === 'UNION' || type.kind === 'INTERFACE') {
      mapping[type.name] = type.possibleTypes.map(({ name }) => name);
    }
  });
  return mapping;
};

const getRootTypes = schema => ({
  query: schema.queryType && schema.queryType.name,
  mutation: schema.mutationType && schema.mutationType.name,
  subscription: schema.subscriptionType && schema.subscriptionType.name,
});

const getField = (
  objectTypeNode: ObjectTypeDefinitionNode,
  fieldName: string
) => {
  return (objectTypeNode.fields || []).find(
    node => node.name.value === fieldName
  );
};

const getObjectTypes = definitions => {
  const mapping = {};
  definitions.forEach(type => {
    if (type.kind === Kind.OBJECT_TYPE_DEFINITION)
      mapping[type.name.value] = type;
  });
  return mapping;
};
