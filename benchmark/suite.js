const gql = require('graphql-tag');
const urqlNew = require('../dist/urql-exchange-graphcache.min.js');
const urql122 = require('./urql-exchange-graphcache-1.2.2.min.js');
const urql121 = require('./urql-exchange-graphcache-1.2.1.min.js');

const countries = ['UK', 'BE', 'ES', 'US'];

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
      complete
      due
      __typename
    }
  }
`;

const makeTodo = i => ({
  id: `${i}`,
  due: new Date(+new Date() - Math.floor(Math.random() * 10000000000)),
  text: `Todo ${i}`,
  complete: Boolean(i % 2),
  __typename: 'Todo',
});
const thousandEntries = makeEntries(1000, makeTodo);
const tenThousandEntries = makeEntries(10000, makeTodo);

suite('1,000 entries write', () => {
  const urqlStore121 = new urql121.Store();
  const urqlStore122 = new urql122.Store();
  const urqlStoreNew = new urqlNew.Store();

  benchmark('urql (current)', () => {
    return urqlNew.write(urqlStoreNew, { query: TodosQuery }, { todos: thousandEntries });
  });

  benchmark('urql (1.2.2)', () => {
    return urql122.write(urqlStore122, { query: TodosQuery }, { todos: thousandEntries });
  });

  benchmark('urql (1.2.1)', () => {
    return urql122.write(urqlStore122, { query: TodosQuery }, { todos: thousandEntries });
  });
});

suite('10,000 entries write', () => {
  const urqlStore121 = new urql121.Store();
  const urqlStore122 = new urql122.Store();
  const urqlStoreNew = new urqlNew.Store();

  benchmark('urql (current)', () => {
    return urqlNew.write(urqlStoreNew, { query: TodosQuery }, { todos: tenThousandEntries });
  });

  benchmark('urql (1.2.2)', () => {
    return urql122.write(urqlStore122, { query: TodosQuery }, { todos: tenThousandEntries });
  });

  benchmark('urql (1.2.1)', () => {
    return urql121.write(urqlStore121, { query: TodosQuery }, { todos: tenThousandEntries });
  });
});

suite('1,000 entries read', () => {
  const urqlStore121 = new urql121.Store();
  const urqlStore122 = new urql122.Store();
  const urqlStoreNew = new urqlNew.Store();

  urql121.write(urqlStore121, { query: TodosQuery }, { todos: thousandEntries });
  urql122.write(urqlStore122, { query: TodosQuery }, { todos: thousandEntries });
  urqlNew.write(urqlStoreNew, { query: TodosQuery }, { todos: thousandEntries });

  benchmark('urql (current)', () => {
    return urqlNew.query(urqlStoreNew, { query: TodosQuery });
  });

  benchmark('urql (1.2.2)', () => {
    return urql122.query(urqlStore122, { query: TodosQuery });
  });

  benchmark('urql (1.2.1)', () => {
    return urql121.query(urqlStore121, { query: TodosQuery });
  });
});

suite('10,000 entries read', () => {
  const urqlStore121 = new urql121.Store();
  const urqlStore122 = new urql122.Store();
  const urqlStoreNew = new urqlNew.Store();

  urql121.write(urqlStore121, { query: TodosQuery }, { todos: tenThousandEntries });
  urql122.write(urqlStore122, { query: TodosQuery }, { todos: tenThousandEntries });
  urqlNew.write(urqlStoreNew, { query: TodosQuery }, { todos: tenThousandEntries });

  benchmark('urql (current)', () => {
    return urqlNew.query(urqlStoreNew, { query: TodosQuery });
  });

  benchmark('urql (1.2.2)', () => {
    return urql122.query(urqlStore122, { query: TodosQuery });
  });

  benchmark('urql (1.2.1)', () => {
    return urql121.query(urqlStore121, { query: TodosQuery });
  });
});

const makeWriter = i => ({
  id: `${i}`,
  name: `writer ${i}`,
  amountOfBooks: Math.random() * 100,
  recognised: Boolean(i % 2),
  number: i,
  interests: 'star wars',
  __typename: 'Writer',
});
const makeBook = i => ({
  id: `${i}`,
  title: `book ${i}`,
  published: Boolean(i % 2),
  genre: 'Fantasy',
  rating: (i / Math.random()) * 100,
  release: new Date(+new Date() - Math.floor(Math.random() * 10000000000)),
  __typename: 'Book',
});
const makeStore = i => ({
  id: `${i}`,
  name: `store ${i}`,
  started: new Date(+new Date() - Math.floor(Math.random() * 10000000000)),
  country: countries[Math.floor(Math.random()) * 4],
  __typename: 'Store',
});
const makeEmployee = i => ({
  id: `${i}`,
  name: `employee ${i}`,
  dateOfBirth: new Date(+new Date() - Math.floor(Math.random() * 10000000000)),
  origin: countries[Math.floor(Math.random()) * 4],
  __typename: 'Employee',
});

const WritersQuery = gql`
  query {
    writers {
      id
      name
      amountOfBooks
      interests
      recognised
      number
      __typename
    }
  }
`;
const thousandWriters= makeEntries(1000, makeWriter);
const tenThousandWriters = makeEntries(10000, makeWriter);

const BooksQuery = gql`
  query {
    books {
      id
      title
      genre
      published
      rating
      release
      __typename
    }
  }
`;
const thousandBooks = makeEntries(1000, makeBook);
const tenThousandBooks = makeEntries(10000, makeBook);

const StoresQuery = gql`
  query {
    stores {
      id
      country
      started
      name
      __typename
    }
  }
`;

const thousandStores = makeEntries(1000, makeStore);
const tenThousandStores = makeEntries(10000, makeStore);

const EmployeesQuery = gql`
  query {
    employees {
      id
      dateOfBirth
      name
      origin
      __typename
    }
  }
`;

const thousandEmployees = makeEntries(1000, makeEmployee);
const tenThousandEmployees = makeEntries(10000, makeEmployee);

suite('1000 entries write five entities', () => {
  const urqlStore121 = new urql121.Store();
  const urqlStore122 = new urql122.Store();
  const urqlStoreNew = new urqlNew.Store();

  benchmark('urql (current)', () => {
    urqlNew.write(urqlStoreNew, { query: BooksQuery }, { books: thousandBooks });
    urqlNew.write(
      urqlStoreNew,
      { query: EmployeesQuery },
      { employees: thousandEmployees }
    );
    urqlNew.write(urqlStoreNew, { query: StoresQuery }, { stores: thousandStores });
    urqlNew.write(urqlStoreNew, { query: WritersQuery }, { writers: thousandWriters });
    urqlNew.write(urqlStoreNew, { query: TodosQuery }, { todos: thousandEntries });
  });

  benchmark('urql (1.2.2)', () => {
    urql122.write(urqlStore122, { query: BooksQuery }, { books: thousandBooks });
    urql122.write(
      urqlStore122,
      { query: EmployeesQuery },
      { employees: thousandEmployees }
    );
    urql122.write(urqlStore122, { query: StoresQuery }, { stores: thousandStores });
    urql122.write(urqlStore122, { query: WritersQuery }, { writers: thousandWriters });
    urql122.write(urqlStore122, { query: TodosQuery }, { todos: thousandEntries });
  });

  benchmark('urql (1.2.1)', () => {
    urql121.write(urqlStore121, { query: BooksQuery }, { books: thousandBooks });
    urql121.write(
      urqlStore121,
      { query: EmployeesQuery },
      { employees: thousandEmployees }
    );
    urql121.write(urqlStore121, { query: StoresQuery }, { stores: thousandStores });
    urql121.write(urqlStore121, { query: WritersQuery }, { writers: thousandWriters });
    urql121.write(urqlStore121, { query: TodosQuery }, { todos: thousandEntries });
  });
});

suite('10000 entries write five entities', () => {
  const urqlStore121 = new urql121.Store();
  const urqlStore122 = new urql122.Store();
  const urqlStoreNew = new urqlNew.Store();

  benchmark('urql (current)', () => {
    urqlNew.write(urqlStoreNew, { query: BooksQuery }, { books: tenThousandBooks });
    urqlNew.write(
      urqlStoreNew,
      { query: EmployeesQuery },
      { employees: tenThousandEmployees }
    );
    urqlNew.write(urqlStoreNew, { query: StoresQuery }, { stores: tenThousandStores });
    urqlNew.write(urqlStoreNew, { query: WritersQuery }, { writers: tenThousandWriters });
    urqlNew.write(urqlStoreNew, { query: TodosQuery }, { todos: tenThousandEntries });
  });

  benchmark('urql (1.2.2)', () => {
    urql122.write(urqlStore122, { query: BooksQuery }, { books: tenThousandBooks });
    urql122.write(
      urqlStore122,
      { query: EmployeesQuery },
      { employees: tenThousandEmployees }
    );
    urql122.write(urqlStore122, { query: StoresQuery }, { stores: tenThousandStores });
    urql122.write(urqlStore122, { query: WritersQuery }, { writers: tenThousandWriters });
    urql122.write(urqlStore122, { query: TodosQuery }, { todos: tenThousandEntries });
  });

  benchmark('urql (1.2.1)', () => {
    urql121.write(urqlStore121, { query: BooksQuery }, { books: tenThousandBooks });
    urql121.write(
      urqlStore121,
      { query: EmployeesQuery },
      { employees: tenThousandEmployees }
    );
    urql121.write(urqlStore121, { query: StoresQuery }, { stores: tenThousandStores });
    urql121.write(urqlStore121, { query: WritersQuery }, { writers: tenThousandWriters });
    urql121.write(urqlStore121, { query: TodosQuery }, { todos: tenThousandEntries });
  });
});

const makeAuthor = i => ({
  id: `${i}`,
  name: `author ${i}`,
  recognised: Boolean(i % 2),
  __typename: 'Author',
  book: {
    id: `${i}`,
    name: `book ${i}`,
    published: Boolean(i % 2),
    __typename: 'Book',
    review: {
      id: `${i}`,
      score: i,
      name: `review ${i}`,
      __typename: 'Review',
      reviewer: {
        id: `${i}`,
        name: `person ${i}`,
        verified: Boolean(i % 2),
        __typename: 'Person',
      },
    },
  },
});

const AuthorQuery = gql`
  query {
    authors {
      id
      name
      recognised
      __typename
      book {
        id
        published
        name
        __typename
        review {
          id
          score
          name
          __typename
          reviewer {
            id
            name
            verified
            __typename
          }
        }
      }
    }
  }
`;

const thousandEntriesComplex = makeEntries(1000, makeAuthor);
const tenThousandEntriesComplex = makeEntries(10000, makeAuthor);

suite('1,000 entries complex write', () => {
  const urqlStore121 = new urql121.Store();
  const urqlStore122 = new urql122.Store();
  const urqlStoreNew = new urqlNew.Store();

  benchmark('urql (current)', () => {
    return urqlNew.write(urqlStoreNew, { query: AuthorQuery }, { todos: thousandEntriesComplex });
  });

  benchmark('urql (1.2.2)', () => {
    return urql122.write(urqlStore122, { query: AuthorQuery }, { todos: thousandEntriesComplex });
  });

  benchmark('urql (1.2.1)', () => {
    return urql121.write(urqlStore121, { query: AuthorQuery }, { todos: thousandEntriesComplex });
  });
});

suite('10,000 entries complex write', () => {
  const urqlStore121 = new urql121.Store();
  const urqlStore122 = new urql122.Store();
  const urqlStoreNew = new urqlNew.Store();

  benchmark('urql (current)', () => {
    return urqlNew.write(
      urqlStoreNew,
      { query: AuthorQuery },
      { todos: tenThousandEntriesComplex }
    );
  });

  benchmark('urql (1.2.2)', () => {
    return urql122.write(
      urqlStore122,
      { query: AuthorQuery },
      { todos: tenThousandEntriesComplex }
    );
  });

  benchmark('urql (1.2.1)', () => {
    return urql121.write(
      urqlStore121,
      { query: AuthorQuery },
      { todos: tenThousandEntriesComplex }
    );
  });
});
