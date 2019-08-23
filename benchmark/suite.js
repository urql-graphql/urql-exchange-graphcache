const gql = require('graphql-tag');
const { InMemoryCache } = require('apollo-cache-inmemory');
const { Store, write, query } = require('..');

const makeEntries = (amount) => {
  const entries = [];
  for(let i = 0;i<amount;i++) {
    entries.push({
      id: `${i}`,
      text: `Todo ${i}`,
      __typename: 'Todo',
    });
  }
  return entries;
}

const TodosQuery = gql`
  query {
    todos {
      id
      text
    }
  }
`;

const hundredEntries = makeEntries(100);
const thousandEntries = makeEntries(1000);
const tenThousandEntries = makeEntries(10000);

suite('100 entries write', () => {
  const urqlStore = new Store();
  const apolloCache = new InMemoryCache();

  benchmark('apollo', () => {
    return apolloCache.writeQuery({
      query: TodosQuery,
      data: { todos: hundredEntries }
    })
  });

  benchmark('urql', () => {
    return write(urqlStore, { query: TodosQuery }, { todos: hundredEntries });
  });
});

suite('1000 entries write', () => {
  const urqlStore = new Store();
  const apolloCache = new InMemoryCache();

  benchmark('apollo', () => {
    return apolloCache.writeQuery({
      query: TodosQuery,
      data: { todos: thousandEntries },
    });
  });

  benchmark('urql', () => {
    return write(urqlStore, { query: TodosQuery }, { todos: thousandEntries });
  });
});

suite('10000 entries write', () => {
  const urqlStore = new Store();
  const apolloCache = new InMemoryCache();

  benchmark('apollo', () => {
    return apolloCache.writeQuery({
      query: TodosQuery,
      data: { todos: tenThousandEntries },
    });
  });

  benchmark('urql', () => {
    return write(
      urqlStore,
      { query: TodosQuery },
      { todos: tenThousandEntries }
    );
  });
});

suite('100 entries read', () => {
  const urqlStore = new Store();
  const apolloCache = new InMemoryCache();

  write(urqlStore, { query: TodosQuery }, { todos: hundredEntries });
  apolloCache.writeQuery({ query: TodosQuery, data: { todos: hundredEntries } })

  benchmark('apollo', () => {
    return apolloCache.readQuery({
      query: TodosQuery,
    });
  });

  benchmark('urql', () => {
    return query(urqlStore, { query: TodosQuery });
  });
});

suite('1000 entries read', () => {
  const urqlStore = new Store();
  const apolloCache = new InMemoryCache();

  write(urqlStore, { query: TodosQuery }, { todos: thousandEntries });
  apolloCache.writeQuery({
    query: TodosQuery,
    data: { todos: thousandEntries },
  });

  benchmark('apollo', () => {
    return apolloCache.readQuery({
      query: TodosQuery,
    });
  });

  benchmark('urql', () => {
    return query(urqlStore, { query: TodosQuery });
  });
});

suite('10000 entries read', () => {
  const urqlStore = new Store();
  const apolloCache = new InMemoryCache();

  write(urqlStore, { query: TodosQuery }, { todos: tenThousandEntries });
  apolloCache.writeQuery({
    query: TodosQuery,
    data: { todos: tenThousandEntries },
  });

  benchmark('apollo', () => {
    return apolloCache.readQuery({
      query: TodosQuery,
    });
  });

  benchmark('urql', () => {
    return query(
      urqlStore,
      { query: TodosQuery },
    );
  });
});
