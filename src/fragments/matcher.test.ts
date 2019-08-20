import gql from 'graphql-tag';
import { matchFragment, matchFragmentHeuristically } from './index';
import { Store } from '../store';
import { write } from '../operations';

const todosData = {
  __typename: 'Query',
  todos: [
    {
      id: '0',
      text: 'Go to the shops',
      complete: false,
      __typename: 'Todo',
      author: { id: '0', name: 'Jovi', __typename: 'Author' },
    },
    {
      id: '1',
      text: 'Pick up the kids',
      complete: true,
      __typename: 'Todo',
      author: { id: '1', name: 'Phil', __typename: 'Author' },
    },
    {
      id: '2',
      text: 'Install urql',
      complete: false,
      __typename: 'Todo',
      author: { id: '0', name: 'Jovi', __typename: 'Author' },
    },
  ],
};

describe('fragmentMatcher', () => {
  let store, query;
  beforeEach(() => {
    store = new Store();
    query = gql`
      query {
        todos {
          id
          __typename
          ...TodoData
        }
      }
      fragment TodoData on Todo {
        text
        complete
      }
    `;
    write(store, { query }, todosData);
  });

  it('can match a fragment', () => {
    const fragmentQuery = gql`
      fragment TodoData on Todo {
        text
        complete
      }
    `;
    expect(matchFragment(store, 'Todo:1', fragmentQuery.definitions[0])).toBe(
      true
    );
  });

  it('returns true for Query', () => {
    const fragmentQuery = gql`
      fragment Todos on Query {
        todos {
          id
          text
          complete
          __typename
        }
      }
    `;
    expect(matchFragment(store, 'Query', fragmentQuery.definitions[0])).toBe(
      true
    );
  });

  it('warns for unavailable property on a fragment', () => {
    const fragmentQuery = gql`
      fragment TodoDataNonExistantProperty on Todo {
        text
        complete
        doesNotExist
      }
    `;
    jest.spyOn(console, 'warn');
    expect(
      matchFragmentHeuristically(store, 'Todo:1', fragmentQuery.definitions[0])
    ).toBe(true);
    expect(console.warn).toBeCalledTimes(1);
    expect(console.warn).toHaveBeenLastCalledWith(
      'Missing field "doesNotExist"'
    );
  });
});
