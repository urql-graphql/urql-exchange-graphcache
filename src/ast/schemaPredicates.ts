import {
  buildClientSchema,
  GraphQLSchema,
  isNullableType,
  GraphQLAbstractType,
  GraphQLObjectType,
} from 'graphql';
import invariant from 'invariant';

export class SchemaPredicates {
  schema: GraphQLSchema;

  constructor(schema) {
    this.schema = buildClientSchema(schema);
  }

  isFieldNullable(typename: string, fieldName: string): boolean {
    const objectTypeNode = this.schema.getType(typename) as GraphQLObjectType;

    invariant(
      !!objectTypeNode,
      `The type ${typename} does not exist in your schema`
    );

    const field = objectTypeNode.getFields()[fieldName];

    invariant(
      !!field,
      `The type ${typename}.${fieldName} does not exist in your schema`
    );

    return isNullableType(field.type);
  }

  isInterfaceOfType(typeCondition: string, typename: string | void): boolean {
    if (!typename) return false;
    if (typename === typeCondition) return true;

    const abstractNode = this.schema.getType(
      typeCondition
    ) as GraphQLAbstractType;
    const concreteNode = this.schema.getType(typename) as GraphQLObjectType;

    return this.schema.isPossibleType(abstractNode, concreteNode);
  }
}
