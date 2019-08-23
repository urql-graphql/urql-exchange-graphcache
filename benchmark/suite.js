const gql = require('graphql-tag');
const { InMemoryCache } = require('apollo-cache-inmemory');
const { Store, write, query } = require('..');

const makeEntries = (amount, makeEntry) => {
  const entries = [];
  for(let i = 0;i<amount;i++) {
    entries.push(makeEntry(i));
  }
  return entries;
}

const TodosQuery = gql`
  query {
    todos {
      id
      text
      __typename
    }
  }
`;

const makeTodo = i => ({
  id: `${i}`,
  text: `Todo ${i}`,
  __typename: 'Todo',
});
const hundredEntries = makeEntries(100, makeTodo);
const thousandEntries = makeEntries(1000, makeTodo);
const tenThousandEntries = makeEntries(10000, makeTodo);

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

const makeAuthor = i => ({
  id: `${i}`,
  name: `author ${i}`,
  __typename: 'Author',
  book: {
    id: `${i}`,
    name: `book ${i}`,
    __typename: 'Book',
    review: {
      id: `${i}`,
      score: i,
      name: `review ${i}`,
      __typename: 'Review',
    },
  },
});

const AuthorQuery = gql`
  query {
    authors {
      id
      name
      __typename
      book {
        id
        name
        __typename
        review {
          id
          score
          name
          __typename
        }
      }
    }
  }
`;

const hundredEntriesComplex = makeEntries(100, makeAuthor);
const thousandEntriesComplex = makeEntries(1000, makeAuthor);
const tenThousandEntriesComplex = makeEntries(10000, makeAuthor);

suite('100 entries complex write', () => {
  const urqlStore = new Store();
  const apolloCache = new InMemoryCache();

  benchmark('apollo', () => {
    return apolloCache.writeQuery({
      query: AuthorQuery,
      data: { todos: hundredEntriesComplex },
    });
  });

  benchmark('urql', () => {
    return write(urqlStore, { query: AuthorQuery }, { todos: hundredEntriesComplex });
  });
});

suite('1000 entries complex write', () => {
  const urqlStore = new Store();
  const apolloCache = new InMemoryCache();

  benchmark('apollo', () => {
    return apolloCache.writeQuery({
      query: AuthorQuery,
      data: { todos: thousandEntriesComplex },
    });
  });

  benchmark('urql', () => {
    return write(urqlStore, { query: AuthorQuery }, { todos: thousandEntriesComplex });
  });
});

suite('10000 entries complex write', () => {
  const urqlStore = new Store();
  const apolloCache = new InMemoryCache();

  benchmark('apollo', () => {
    return apolloCache.writeQuery({
      query: AuthorQuery,
      data: { todos: tenThousandEntriesComplex },
    });
  });

  benchmark('urql', () => {
    return write(
      urqlStore,
      { query: AuthorQuery },
      { todos: tenThousandEntriesComplex }
    );
  });
});
