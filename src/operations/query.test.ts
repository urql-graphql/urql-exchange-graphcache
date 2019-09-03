import { Store } from '../store';
import gql from 'graphql-tag';
import { write } from './write';
import { query } from './query';
import { SchemaPredicates } from '../ast/schemaPredicates';

const TODO_QUERY = gql`
  query todos {
    todos {
      id
      text
      author {
        id
        name
        known
        __typename
      }
      __typename
    }
  }
`;

describe('Query', () => {
  let schema, store;

  beforeAll(() => {
    schema = require('./simple_schema.json');
  });

  beforeEach(() => {
    store = new Store(new SchemaPredicates());
    store.setSchema(schema);
    write(
      store,
      new SchemaPredicates(),
      { query: TODO_QUERY },
      {
        __typename: 'Query',
        todos: [
          { id: '0', text: 'Teach', __typename: 'Todo' },
          { id: '1', text: 'Learn', __typename: 'Todo' },
        ],
      }
    );
  });

  it('test partial results', () => {
    const result = query(store, new SchemaPredicates(), { query: TODO_QUERY });
    expect(result.completeness).toEqual('PARTIAL');
  });
});
