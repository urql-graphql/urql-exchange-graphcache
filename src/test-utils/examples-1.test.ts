import gql from 'graphql-tag';
import { query, write } from '../operations';
import { Store } from '../store';

const Todos = gql`
  query {
    __typename
    todos {
      __typename
      id
      text
      complete
    }
  }
`;

const TodosWithAuthor = gql`
  query {
    __typename
    todos {
      __typename
      id
      text
      complete
      author {
        id
        name
        __typename
      }
    }
  }
`;

const ToggleTodo = gql`
  mutation($id: ID!) {
    __typename
    toggleTodo(id: $id) {
      __typename
      id
      text
      complete
    }
  }
`;

it('passes the "getting-started" example', () => {
  const store = new Store();
  const todosData = {
    __typename: 'Query',
    todos: [
      { id: '0', text: 'Go to the shops', complete: false, __typename: 'Todo' },
      { id: '1', text: 'Pick up the kids', complete: true, __typename: 'Todo' },
      { id: '2', text: 'Install urql', complete: false, __typename: 'Todo' },
    ],
  };

  const writeRes = write(store, { query: Todos }, todosData);

  const expectedSet = new Set(['Query.todos', 'Todo:0', 'Todo:1', 'Todo:2']);
  expect(writeRes.dependencies).toEqual(expectedSet);

  expect(store.serialize()).toMatchSnapshot();

  let queryRes = query(store, { query: Todos });

  expect(queryRes.data).toEqual(todosData);
  expect(queryRes.dependencies).toEqual(writeRes.dependencies);
  expect(queryRes.completeness).toBe('FULL');

  const mutatedTodo = {
    ...todosData.todos[2],
    complete: true,
  };

  const mutationRes = write(
    store,
    { query: ToggleTodo, variables: { id: '2' } },
    {
      __typename: 'Mutation',
      toggleTodo: mutatedTodo,
    }
  );

  expect(mutationRes.dependencies).toEqual(new Set(['Todo:2']));
  expect(store.serialize()).toMatchSnapshot();

  queryRes = query(store, { query: Todos });

  expect(queryRes.completeness).toBe('FULL');
  expect(queryRes.data).toEqual({
    ...todosData,
    todos: [...todosData.todos.slice(0, 2), mutatedTodo],
  });
});

it('Respects property-level resolvers when given', () => {
  const store = new Store(undefined, { Todo: { text: () => 'hi' } });
  const todosData = {
    __typename: 'Query',
    todos: [
      { id: '0', text: 'Go to the shops', complete: false, __typename: 'Todo' },
      { id: '1', text: 'Pick up the kids', complete: true, __typename: 'Todo' },
      { id: '2', text: 'Install urql', complete: false, __typename: 'Todo' },
    ],
  };

  const writeRes = write(store, { query: Todos }, todosData);

  const expectedSet = new Set(['Query.todos', 'Todo:0', 'Todo:1', 'Todo:2']);
  expect(writeRes.dependencies).toEqual(expectedSet);

  expect(store.serialize()).toMatchSnapshot();

  let queryRes = query(store, { query: Todos });

  expect(queryRes.data).toEqual({
    __typename: 'Query',
    todos: [
      { id: '0', text: 'hi', complete: false, __typename: 'Todo' },
      { id: '1', text: 'hi', complete: true, __typename: 'Todo' },
      { id: '2', text: 'hi', complete: false, __typename: 'Todo' },
    ],
  });
  expect(queryRes.dependencies).toEqual(writeRes.dependencies);
  expect(queryRes.completeness).toBe('FULL');

  const mutatedTodo = {
    ...todosData.todos[2],
    complete: true,
  };

  const mutationRes = write(
    store,
    { query: ToggleTodo, variables: { id: '2' } },
    {
      __typename: 'Mutation',
      toggleTodo: mutatedTodo,
    }
  );

  expect(mutationRes.dependencies).toEqual(new Set(['Todo:2']));
  expect(store.serialize()).toMatchSnapshot();

  queryRes = query(store, { query: Todos });

  expect(queryRes.completeness).toBe('FULL');
  expect(queryRes.data).toEqual({
    ...todosData,
    todos: [
      { id: '0', text: 'hi', complete: false, __typename: 'Todo' },
      { id: '1', text: 'hi', complete: true, __typename: 'Todo' },
      { id: '2', text: 'hi', complete: true, __typename: 'Todo' },
    ],
  });
});

it('Respects entity-level resolvers when given', () => {
  const store = new Store(undefined, { Query: { todos: () => ['test'] } });
  const todosData = {
    __typename: 'Query',
    todos: [
      { id: '0', text: 'Go to the shops', complete: false, __typename: 'Todo' },
      { id: '1', text: 'Pick up the kids', complete: true, __typename: 'Todo' },
      { id: '2', text: 'Install urql', complete: false, __typename: 'Todo' },
    ],
  };

  write(store, { query: Todos }, todosData);

  const queryRes = query(store, { query: Todos });

  expect(queryRes.data).toEqual({
    __typename: 'Query',
    todos: ['test'],
  });
});

it('Respectsd neste entity-level resolvers when given', () => {
  const store = new Store(undefined, {
    Todo: { author: () => ({ name: 'Someone' }) },
  });
  const todosData = {
    __typename: 'Query',
    todos: [
      {
        id: '0',
        text: 'Go to the shops',
        complete: false,
        __typename: 'Todo',
        author: { id: 0, __typename: 'Author' },
      },
    ],
  };

  write(store, { query: TodosWithAuthor }, todosData);

  const queryRes = query(store, { query: TodosWithAuthor });

  expect(queryRes.data).toEqual({
    __typename: 'Query',
    todos: [
      {
        id: '0',
        text: 'Go to the shops',
        complete: false,
        __typename: 'Todo',
        author: { id: 0, name: 'Someone', __typename: 'Author' },
      },
    ],
  });
});
