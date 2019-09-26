import gql from 'graphql-tag';
import { query, write } from '../operations';
import { Store } from '../store';
import { relayPagination } from './relayPagination';

it('works with forward pagination', () => {
  const Pagination = gql`
    query($cursor: String) {
      items(first: 1, after: $cursor) {
        __typename
        edges {
          __typename
          node {
            __typename
            id
          }
        }
        pageInfo {
          __typename
          hasNextPage
          endCursor
        }
      }
    }
  `;

  const store = new Store(undefined, {
    Query: {
      items: relayPagination(),
    },
  });

  const pageOne = {
    __typename: 'Query',
    items: {
      __typename: 'ItemsConnection',
      edges: [
        {
          __typename: 'ItemEdge',
          node: {
            __typename: 'Item',
            id: '1',
          },
        },
      ],
      pageInfo: {
        __typename: 'PageInfo',
        hasNextPage: true,
        endCursor: '1',
      },
    },
  };

  const pageTwo = {
    __typename: 'Query',
    items: {
      __typename: 'ItemsConnection',
      edges: [
        {
          __typename: 'ItemEdge',
          node: {
            __typename: 'Item',
            id: '2',
          },
        },
      ],
      pageInfo: {
        __typename: 'PageInfo',
        hasNextPage: false,
        endCursor: null,
      },
    },
  };

  write(store, { query: Pagination, variables: { cursor: null } }, pageOne);
  write(store, { query: Pagination, variables: { cursor: '1' } }, pageTwo);

  const res = query(store, { query: Pagination });

  expect(res.partial).toBe(false);
  expect(res.data).toEqual({
    ...pageTwo,
    items: {
      ...pageTwo.items,
      edges: [pageOne.items.edges[0], pageTwo.items.edges[0]],
    },
  });
});

it('works with backwards pagination', () => {
  const Pagination = gql`
    query($cursor: String) {
      items(last: 1, before: $cursor) {
        __typename
        edges {
          __typename
          node {
            __typename
            id
          }
        }
        pageInfo {
          __typename
          hasPreviousPage
          startCursor
        }
      }
    }
  `;

  const store = new Store(undefined, {
    Query: {
      items: relayPagination(),
    },
  });

  const pageOne = {
    __typename: 'Query',
    items: {
      __typename: 'ItemsConnection',
      edges: [
        {
          __typename: 'ItemEdge',
          node: {
            __typename: 'Item',
            id: '2',
          },
        },
      ],
      pageInfo: {
        __typename: 'PageInfo',
        hasPreviousPage: true,
        startCursor: '2',
      },
    },
  };

  const pageTwo = {
    __typename: 'Query',
    items: {
      __typename: 'ItemsConnection',
      edges: [
        {
          __typename: 'ItemEdge',
          node: {
            __typename: 'Item',
            id: '1',
          },
        },
      ],
      pageInfo: {
        __typename: 'PageInfo',
        hasPreviousPage: false,
        startCursor: null,
      },
    },
  };

  write(store, { query: Pagination, variables: { cursor: null } }, pageOne);
  write(store, { query: Pagination, variables: { cursor: '2' } }, pageTwo);

  const res = query(store, { query: Pagination });

  expect(res.partial).toBe(false);
  expect(res.data).toEqual({
    ...pageTwo,
    items: {
      ...pageTwo.items,
      edges: [pageTwo.items.edges[0], pageOne.items.edges[0]],
    },
  });
});

it('handles duplicate edges', () => {
  const Pagination = gql`
    query($cursor: String) {
      items(first: 2, after: $cursor) {
        __typename
        edges {
          __typename
          node {
            __typename
            id
          }
        }
        pageInfo {
          __typename
          hasNextPage
          endCursor
        }
      }
    }
  `;

  const store = new Store(undefined, {
    Query: {
      items: relayPagination(),
    },
  });

  const pageOne = {
    __typename: 'Query',
    items: {
      __typename: 'ItemsConnection',
      edges: [
        {
          __typename: 'ItemEdge',
          node: {
            __typename: 'Item',
            id: '1',
          },
        },
        {
          __typename: 'ItemEdge',
          node: {
            __typename: 'Item',
            id: '2',
          },
        },
      ],
      pageInfo: {
        __typename: 'PageInfo',
        hasNextPage: true,
        endCursor: '2',
      },
    },
  };

  const pageTwo = {
    __typename: 'Query',
    items: {
      __typename: 'ItemsConnection',
      edges: [
        {
          __typename: 'ItemEdge',
          node: {
            __typename: 'Item',
            id: '2',
          },
        },
        {
          __typename: 'ItemEdge',
          node: {
            __typename: 'Item',
            id: '3',
          },
        },
      ],
      pageInfo: {
        __typename: 'PageInfo',
        hasNextPage: false,
        endCursor: null,
      },
    },
  };

  write(store, { query: Pagination, variables: { cursor: null } }, pageOne);
  write(store, { query: Pagination, variables: { cursor: '1' } }, pageTwo);

  const res = query(store, { query: Pagination });

  expect(res.partial).toBe(false);
  expect(res.data).toEqual({
    ...pageTwo,
    items: {
      ...pageTwo.items,
      edges: [
        pageOne.items.edges[0],
        pageTwo.items.edges[0],
        pageTwo.items.edges[1],
      ],
    },
  });
});

it('works with simultaneous forward and backward pagination', () => {
  const Pagination = gql`
    query($first: Int, $last: Int, $before: String, $after: String) {
      items(first: $first, last: $last, before: $before, after: $after) {
        __typename
        edges {
          __typename
          node {
            __typename
            id
          }
        }
        pageInfo {
          __typename
          hasNextPage
          endCursor
        }
      }
    }
  `;

  const store = new Store(undefined, {
    Query: {
      items: relayPagination(),
    },
  });

  const pageOne = {
    __typename: 'Query',
    items: {
      __typename: 'ItemsConnection',
      edges: [
        {
          __typename: 'ItemEdge',
          node: {
            __typename: 'Item',
            id: '1',
          },
        },
      ],
      pageInfo: {
        __typename: 'PageInfo',
        hasNextPage: true,
        hasPreviousPage: false,
        startCursor: null,
        endCursor: '1',
      },
    },
  };

  const pageTwo = {
    __typename: 'Query',
    items: {
      __typename: 'ItemsConnection',
      edges: [
        {
          __typename: 'ItemEdge',
          node: {
            __typename: 'Item',
            id: '2',
          },
        },
      ],
      pageInfo: {
        __typename: 'PageInfo',
        hasNextPage: true,
        hasPreviousPage: true,
        startCursor: '2',
        endCursor: '2',
      },
    },
  };

  const pageThree = {
    __typename: 'Query',
    items: {
      __typename: 'ItemsConnection',
      edges: [
        {
          __typename: 'ItemEdge',
          node: {
            __typename: 'Item',
            id: '3',
          },
        },
      ],
      pageInfo: {
        __typename: 'PageInfo',
        hasNextPage: false,
        hasPreviousPage: true,
        endCursor: null,
        startCursor: '3',
      },
    },
  };

  write(
    store,
    { query: Pagination, variables: { after: '1', first: 1 } },
    pageTwo
  );
  write(
    store,
    { query: Pagination, variables: { after: '2', first: 1 } },
    pageThree
  );
  write(
    store,
    { query: Pagination, variables: { before: '1', last: 1 } },
    pageOne
  );

  const firstRes = query(store, {
    query: Pagination,
    variables: { before: '1', last: 1 },
  });
  const secondRes = query(store, {
    query: Pagination,
    variables: { first: 1, after: '1' },
  });
  const thirdRes = query(store, {
    query: Pagination,
    variables: { first: 1, after: '2' },
  });

  expect(firstRes.partial).toBe(false);
  expect(secondRes.partial).toBe(false);
  expect(thirdRes.partial).toBe(false);
  expect(firstRes.data).toEqual({
    ...pageOne,
    items: {
      ...pageOne.items,
      edges: [pageOne.items.edges[0]],
    },
  });
  expect(secondRes.data).toEqual({
    ...pageTwo,
    items: {
      ...pageTwo.items,
      edges: [pageTwo.items.edges[0]],
    },
  });
  expect(thirdRes.data).toEqual({
    ...pageThree,
    items: {
      ...pageThree.items,
      edges: [pageThree.items.edges[0]],
    },
  });
});
