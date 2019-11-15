import gql from 'graphql-tag';
import { query, write } from '../operations';
import { Store } from '../store';
import { simplePagination } from './simplePagination';

it('works with simple pagination', () => {
  const Pagination = gql`
    query($from: Number, $limit: Number) {
      persons(from: $from, limit: $limit) {
        __typename
        id
        name
      }
    }
  `;

  const store = new Store(undefined, {
    Query: {
      persons: simplePagination(),
    },
  });

  const pageOne = {
    __typename: 'Query',
    persons: [
      { id: 1, name: 'Jovi', __typename: 'Person' },
      { id: 2, name: 'Phil', __typename: 'Person' },
      { id: 3, name: 'Andy', __typename: 'Person' },
    ],
  };

  const pageTwo = {
    __typename: 'Query',
    persons: [
      { id: 4, name: 'Kadi', __typename: 'Person' },
      { id: 5, name: 'Dom', __typename: 'Person' },
      { id: 6, name: 'Sofia', __typename: 'Person' },
    ],
  };

  write(
    store,
    { query: Pagination, variables: { from: 0, limit: 3 } },
    pageOne
  );
  write(
    store,
    { query: Pagination, variables: { from: 3, limit: 3 } },
    pageTwo
  );

  const result = query(store, { query: Pagination });
  expect(result.data).toEqual({
    __typename: 'Query',
    persons: [...pageOne.persons, pageTwo.persons],
  });
});
