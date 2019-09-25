import invariant from 'invariant';
import { Resolver, NullArray, Variables } from '../types';

interface ConnectionArgs {
  first?: number;
  last?: number;
  before?: string;
  after?: string;
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

    const mergedEdges: NullArray<string> = [];

    let dataKey = cache.resolve(
      info.parentKey,
      info.fieldName,
      childArgs
    ) as string;
    let edgesKeys = cache.resolve(dataKey, 'edges') as string;
    let infoKey = cache.resolve(dataKey, 'pageInfo') as string;
    let prevInfoKey: string | null = null;

    const connectionType = cache.resolve(dataKey, '__typename');
    if (!connectionType) {
      return undefined;
    }

    while (Array.isArray(edgesKeys) && infoKey !== null) {
      // Store the last valid info key
      prevInfoKey = infoKey;

      // Add the receives nodes to the list of nodes
      if (isForwardPagination) {
        for (let i = 0; i < size; i++) mergedEdges.push(edgesKeys[i]);
      } else {
        for (let i = size - 1; i >= 0; i--) mergedEdges.unshift(edgesKeys[i]);
      }

      // Stop traversing pages when no next page is expected
      const hasNextPage = cache.resolve(infoKey, 'hasNextPage');
      if (hasNextPage === false) break;

      // Retrive the cursor from PageInfo
      let nextCursor = infoKey
        ? cache.resolve(
            infoKey,
            isForwardPagination ? 'endCursor' : 'startCursor'
          )
        : null;

      // If no cursor is on PageInfo then fall back to edges.cursor
      const edge = isForwardPagination ? mergedEdges[size - 1] : mergedEdges[0];
      const edgeCursor = edge ? cache.resolve(edge, 'cursor') : null;
      if (!nextCursor && edgeCursor) nextCursor = edgeCursor;

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
      dataKey = cache.resolve(
        info.parentKey,
        info.fieldName,
        childArgs
      ) as string;
      edgesKeys = cache.resolve(dataKey, 'edges') as string;
      infoKey = cache.resolve(dataKey, 'pageInfo') as string;
    }

    return {
      __typename: connectionType,
      edges: mergedEdges,
      pageInfo: prevInfoKey,
    } as any;
  };
};
