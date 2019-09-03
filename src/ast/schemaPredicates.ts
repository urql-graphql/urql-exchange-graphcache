import {
  DocumentNode,
  Kind,
  ObjectTypeDefinitionNode,
  buildClientSchema,
  printSchema,
  parse,
} from 'graphql';

const parseSchema = schema => parse(printSchema(buildClientSchema(schema)));

export class SchemaPredicates {
  schema: DocumentNode;
  fragTypes: { [typeCondition: string]: Array<string> };

  constructor(schema) {
    this.schema = parseSchema(schema);
    this.fragTypes = {};
    schema.__schema.types.forEach(type => {
      if (
        type.kind === Kind.UNION_TYPE_DEFINITION ||
        type.kind === Kind.INTERFACE_TYPE_DEFINITION
      ) {
        this.fragTypes[type.name] = type.possibleTypes.map(({ name }) => name);
      }
    });
  }

  isFieldNullable(typename: string, fieldName: string): boolean {
    const objectTypeNode = this.schema.definitions.find(
      node =>
        node.kind === Kind.OBJECT_TYPE_DEFINITION &&
        node.name.value === typename
    );

    // TODO: error when the type does not exist
    if (!objectTypeNode) return true;

    const field = (
      (objectTypeNode as ObjectTypeDefinitionNode).fields || []
    ).find(node => node.name.value === fieldName);

    // TODO: error when the field does not exist
    if (!field) return true;

    return field.type.kind !== Kind.NON_NULL_TYPE;
  }

  isInterfaceOfType(typeCondition: string, typename: string): boolean {
    if (typename === typeCondition) return true;
    const possibleTypes = this.fragTypes[typeCondition];
    if (possibleTypes && possibleTypes.includes(typename)) return true;
    return false;
  }
}
