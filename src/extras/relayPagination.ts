import invariant from 'invariant';
import { Resolver, NullArray, Data, Variables } from '../types';

interface ConnectionArgs {
  first?: number;
  last?: number;
  before?: string;
  after?: string;
}

interface Edge {
  cursor?: string;
  node?: Data | null;
}

interface PageInfo {
  hasNextPage?: boolean;
  startCursor?: string;
  endCursor?: string;
}

interface ConnectionData {
  edges: NullArray<Edge>;
  pageInfo?: PageInfo;
}

export const relayPagination = (): Resolver => {
  return (_, args, cache, info) => {
    const { first, last } = args as ConnectionArgs;

    invariant(
      typeof first !== 'number' || typeof last !== 'number',
      'relayPagination(...) was used with both a `first` and `last` argument,\n' +
        'but it must not be used with both at the same time.'
    );

    invariant(
      typeof first === 'number' || typeof last === 'number',
      'relayPagination(...) was used without a `first` and `last` argument,\n' +
        'but it must not be used with at least one of them.'
    );

    const isForwardPagination = typeof first === 'number';
    const size = (isForwardPagination ? first : last) || 0;

    invariant(
      size > 0,
      'relayPagination(...) was used with a `first` or `last` argument that is less than zero.'
    );

    const childArgs: Variables = {};
    if (typeof first === 'number') childArgs.first = first;
    if (typeof last === 'number') childArgs.last = last;

    const mergedEdges: NullArray<Edge> = [];

    let data = cache.resolve(
      info.parentKey,
      info.fieldName,
      childArgs
    ) as ConnectionData;
    while (data && Array.isArray(data.edges)) {
      const { edges, pageInfo } = data;

      // Add the receives nodes to the list of nodes
      if (isForwardPagination) {
        for (let i = 0; i < size; i++) mergedEdges.push(edges[i]);
      } else {
        for (let i = size - 1; i >= 0; i--) mergedEdges.unshift(edges[i]);
      }

      // Stop traversing pages when no next page is expected
      if (pageInfo && pageInfo.hasNextPage === false) break;

      // Retrive the cursor from PageInfo
      let nextCursor =
        pageInfo &&
        (isForwardPagination ? pageInfo.endCursor : pageInfo.startCursor);

      // If no cursor is on PageInfo then fall back to edges.cursor
      const edge = isForwardPagination ? mergedEdges[size - 1] : mergedEdges[0];
      if (!nextCursor && edge && edge.cursor) {
        nextCursor = edge.cursor;
      }

      invariant(
        typeof nextCursor !== 'string',
        'relayPagination(...) tried to receive the next cursor for the pagination, but ' +
          'neither the `pageInfo.' +
          (isForwardPagination ? 'endCursor' : 'startCursor') +
          '` nor the `edges.cursor` fields were valid cursors.'
      );

      // Update the cursor on the child arguments
      if (isForwardPagination) {
        childArgs.after = nextCursor || null;
      } else {
        childArgs.before = nextCursor || null;
      }

      // Retrive the next page of data
      data = cache.resolve(
        info.parentKey,
        info.fieldName,
        childArgs
      ) as ConnectionData;
    }

    return { ...data, edges: mergedEdges } as ConnectionData;
  };
};
