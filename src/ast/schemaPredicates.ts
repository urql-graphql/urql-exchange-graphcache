import invariant from 'invariant';
import warning from 'warning';

import {
  buildClientSchema,
  isNullableType,
  GraphQLSchema,
  GraphQLAbstractType,
  GraphQLObjectType,
} from 'graphql';

export class SchemaPredicates {
  schema: GraphQLSchema;

  constructor(schema) {
    this.schema = buildClientSchema(schema);
  }

  isFieldNullable(typename: string, fieldName: string): boolean {
    const type = this.schema.getType(typename) as GraphQLObjectType;
    invariant(
      type instanceof GraphQLObjectType,
      'Invalid type: The type `%s` is not an object in the defined schema, ' +
        'but the GraphQL document is traversing it.',
      typename
    );

    const object = type as GraphQLObjectType;
    if (object === undefined) {
      warning(
        false,
        'Invalid type: The type `%s` is not a type in the defined schema, ' +
          'but the GraphQL document expects it to exist.\n' +
          'Traversal will continue, however this may lead to undefined behavior!',
        typename
      );

      return false;
    }

    const field = object.getFields()[fieldName];
    if (field === undefined) {
      warning(
        false,
        'Invalid field: The field `%s` does not exist on `%s`, ' +
          'but the GraphQL document expects it to exist.\n' +
          'Traversal will continue, however this may lead to undefined behavior!',
        fieldName,
        typename
      );

      return false;
    }

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
