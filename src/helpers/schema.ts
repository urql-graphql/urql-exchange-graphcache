import { buildClientSchema, printSchema, parse, DocumentNode } from 'graphql';

export const parseSchema = schema =>
  parse(printSchema(buildClientSchema(schema)));

export const getSchema = (schemaUrl: string): Promise<DocumentNode> => {
  return new Promise((resolve, reject) => {
    fetch(schemaUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: introspectionQuery,
      }),
    })
      .then(result => {
        if (result.status < 200 || result.status >= 300) {
          reject(result.statusText);
        }
        return result.json();
      })
      .then(({ data: schema, errors }) => {
        if (errors) {
          console.error(errors);
          // TODO: we need to check what errors can be present here.
          reject(`Something went wrong while fetching your schema.`);
        }
        resolve(schema);
      });
  });
};

const introspectionQuery = `
  query IntrospectionQuery {
    __schema {
      queryType { name }
      mutationType { name }
      subscriptionType { name }
      types {
        ...FullType
      }
    }
  }

  fragment FullType on __Type {
    kind
    name
    fields(includeDeprecated: true) {
      name
      args {
        ...InputValue
      }
      type {
        ...TypeRef
      }
    }
    inputFields {
      ...InputValue
    }
    interfaces {
      ...TypeRef
    }
    enumValues(includeDeprecated: true) {
      name
    }
    possibleTypes {
      ...TypeRef
    }
  }

  fragment InputValue on __InputValue {
    name
    type { ...TypeRef }
    defaultValue
  }

  fragment TypeRef on __Type {
    kind
    name
    ofType {
      kind
      name
      ofType {
        kind
        name
        ofType {
          kind
          name
          ofType {
            kind
            name
            ofType {
              kind
              name
              ofType {
                kind
                name
                ofType {
                  kind
                  name
                }
              }
            }
          }
        }
      }
    }
  }
`;
