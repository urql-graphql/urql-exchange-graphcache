import {
  introspectionQuery,
  buildClientSchema,
  printSchema,
  parse,
  DocumentNode,
} from 'graphql';

export const getSchema = async (schemaUrl: string): Promise<DocumentNode> => {
  const result = await fetch(schemaUrl, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: introspectionQuery }),
  });

  if (result.status < 200 || result.status >= 300) {
    throw new Error(result.statusText);
  }

  const { data: schema, errors } = await result.json();

  if (errors) {
    console.error(errors);
    // TODO: we need to check what errors can be present here.
    throw new Error(`Something went wrong while fetching your schema.`);
  }

  // TODO: kitten said we are pulling in too much like this,
  // this has to be stripped down.
  const rawSchema = buildClientSchema(schema);
  const clientSchema = printSchema(rawSchema);
  return parse(clientSchema);
};
