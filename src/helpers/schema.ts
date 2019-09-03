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
        resolve(parseSchema(schema));
      });
  });
};

/**
 * We can use queryType, mutationType and subscriptionType to
 * improve the check in /ast.
 *
 * We need to know what fields are mandatory (non-nullable), this
 * would allow for partial data returning.
 *
 * A second plan would be use this schema as a base to (de-)serialize
 * the cached data. Allthough I'm not sure if we can afford just saving
 * this into some cache...
 *
 * I think in essence the most important part would be to support modern browsers
 * since these are meant for PWA's.
 *
 * https://caniuse.com/#feat=indexeddb
 *
 * A worrying part about this is what do we do when a user does not supply a schema
 * do we offer x amounts of alternative codepaths? Do we disable cache-persistance?
 * ...?
 *
 * Another problem that presents itself is how optimistic data is serialized, this
 * would probably be the hardest part to recover. It would require some kind of priority
 * to correctly restore all layers and be bound to their correct operation since when
 * we are working offline and we come online we should be able to dispatch these operations.
 * --> future thoughts
 *
 * A priority before offline should be to serialize our data without any optimistic responses
 * since we have no idea how long it will take to write everything to indexeddb, huge
 * data amounts could be a huge blocker for this feature.
 *
 * And last but not least partial results could be achieved. We see that our query method
 * results in some data but not everything, normally we would just indicate this as EMPTY
 * but in theory this is PARTIAL. If there are no non-nullable fields missing we can just
 * return this to the user and send a query to the server to update the other fields and then
 * return the full result.
 *
 * In theory (with the premise) that a query is correctly formed we could already do partial
 * results. Since we could check the selection further and see all other fields are optional
 * --> return and fetch
 */
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
