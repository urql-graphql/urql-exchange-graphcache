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

const makeWriter = i => ({
  id: `${i}`,
  name: `writer ${i}`,
  __typename: 'Writer',
});
const makeBook = i => ({
  id: `${i}`,
  title: `book ${i}`,
  __typename: 'Book',
});
const makeStore = i => ({
  id: `${i}`,
  name: `store ${i}`,
  __typename: 'Store',
});
const makeEmployee = i => ({
  id: `${i}`,
  name: `employee ${i}`,
  __typename: 'Employee',
});

const WritersQuery = gql`
  query {
    writers {
      id
      name
      __typename
    }
  }
`;
const hundredWriters = makeEntries(100, makeWriter);
const thousandWriters= makeEntries(1000, makeWriter);
const tenThousandWriters = makeEntries(10000, makeWriter);

const BooksQuery = gql`
  query {
    books {
      id
      title
      __typename
    }
  }
`;
const hundredBooks = makeEntries(100, makeBook);
const thousandBooks = makeEntries(1000, makeBook);
const tenThousandBooks = makeEntries(10000, makeBook);

const StoresQuery = gql`
  query {
    stores {
      id
      name
      __typename
    }
  }
`;
const hundredStores = makeEntries(100, makeStore);
const thousandStores = makeEntries(1000, makeStore);
const tenThousandStores = makeEntries(10000, makeStore);

const EmployeesQuery = gql`
  query {
    employees {
      id
      name
      __typename
    }
  }
`;
const hundredEmployees = makeEntries(100, makeEmployee);
const thousandEmployees = makeEntries(1000, makeEmployee);
const tenThousandEmployees = makeEntries(10000, makeEmployee);

suite('100 entries write five entities', () => {
  const urqlStore = new Store();
  const apolloCache = new InMemoryCache();

  benchmark('apollo', () => {
    apolloCache.writeQuery({
      query: BooksQuery,
      data: { books: hundredBooks },
    });
    apolloCache.writeQuery({
      query: EmployeesQuery,
      data: { employees: hundredEmployees },
    });
    apolloCache.writeQuery({
      query: StoresQuery,
      data: { stores: hundredStores },
    });
    apolloCache.writeQuery({
      query: WritersQuery,
      data: { writers: hundredWriters },
    });
    return apolloCache.writeQuery({
      query: TodosQuery,
      data: { todos: hundredEntries },
    });
  });

  benchmark('urql', () => {
    write(urqlStore, { query: BooksQuery }, { books: hundredBooks });
    write(urqlStore, { query: EmployeesQuery }, { employees: hundredEmployees });
    write(urqlStore, { query: StoresQuery }, { stores: hundredStores });
    write(urqlStore, { query: WritersQuery }, { writers: hundredWriters });
    return write(urqlStore, { query: TodosQuery }, { todos: hundredEntries });
  });
});

suite('1000 entries write five entities', () => {
  const urqlStore = new Store();
  const apolloCache = new InMemoryCache();

  benchmark('apollo', () => {
    apolloCache.writeQuery({
      query: BooksQuery,
      data: { books: thousandBooks },
    });
    apolloCache.writeQuery({
      query: EmployeesQuery,
      data: { employees: thousandEmployees },
    });
    apolloCache.writeQuery({
      query: StoresQuery,
      data: { stores: thousandStores },
    });
    apolloCache.writeQuery({
      query: WritersQuery,
      data: { writers: thousandWriters },
    });
    return apolloCache.writeQuery({
      query: TodosQuery,
      data: { todos: thousandEntries },
    });
  });

  benchmark('urql', () => {
    write(urqlStore, { query: BooksQuery }, { books: thousandBooks });
    write(
      urqlStore,
      { query: EmployeesQuery },
      { employees: thousandEmployees }
    );
    write(urqlStore, { query: StoresQuery }, { stores: thousandStores });
    write(urqlStore, { query: WritersQuery }, { writers: thousandWriters });
    return write(urqlStore, { query: TodosQuery }, { todos: thousandEntries });
  });
});

suite('10000 entries write five entities', () => {
  const urqlStore = new Store();
  const apolloCache = new InMemoryCache();

  benchmark('apollo', () => {
    apolloCache.writeQuery({
      query: BooksQuery,
      data: { books: tenThousandBooks },
    });
    apolloCache.writeQuery({
      query: EmployeesQuery,
      data: { employees: tenThousandEmployees },
    });
    apolloCache.writeQuery({
      query: StoresQuery,
      data: { stores: tenThousandStores },
    });
    apolloCache.writeQuery({
      query: WritersQuery,
      data: { writers: tenThousandWriters },
    });
    return apolloCache.writeQuery({
      query: TodosQuery,
      data: { todos: tenThousandEntries },
    });
  });

  benchmark('urql', () => {
    write(urqlStore, { query: BooksQuery }, { books: tenThousandBooks });
    write(
      urqlStore,
      { query: EmployeesQuery },
      { employees: tenThousandEmployees }
    );
    write(urqlStore, { query: StoresQuery }, { stores: tenThousandStores });
    write(urqlStore, { query: WritersQuery }, { writers: tenThousandWriters });
    return write(urqlStore, { query: TodosQuery }, { todos: tenThousandEntries });
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
