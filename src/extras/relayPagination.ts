import { warning } from '../helpers/warning';
import { Resolver, NullArray, Variables } from '../types';

interface ConnectionArgs {
  first?: number;
  last?: number;
  before?: string;
  after?: string;
}

export const relayPagination = (): Resolver => {
  return (_, args, cache, info) => {
    const { parentKey: key, fieldName } = info;
    const { first, last } = args as ConnectionArgs;

    if (typeof first === 'number' && typeof last === 'number') {
      warning(
        false,
        'relayPagination(...) was used with both a `first` and `last` argument,\n' +
          'but it must not be used with both at the same time.'
      );

      return null;
    } else if (typeof first !== 'number' && typeof last !== 'number') {
      warning(
        false,
        'relayPagination(...) was used without a `first` and `last` argument,\n' +
          'but it must not be used with at least one of them.'
      );

      return null;
    }

    const isForwardPagination = typeof first === 'number';
    const size = (isForwardPagination ? first : last) || 0;

    if (size <= 0) {
      warning(
        false,
        'relayPagination(...) was used with a `first` or `last` argument that is less than zero.'
      );
    }

    const childArgs: Variables = {};
    if (typeof first === 'number') childArgs.first = first;
    if (typeof last === 'number') childArgs.last = last;

    const mergedEdges: NullArray<string> = [];

    let dataKey = cache.resolve(key, fieldName, childArgs) as string;
    let edgesKeys = cache.resolve(dataKey, 'edges') as string;
    let infoKey = cache.resolve(dataKey, 'pageInfo') as string;
    let prevInfoKey: string | null = null;

    const connectionType = cache.resolve(dataKey, '__typename');
    if (!connectionType) {
      return undefined;
    }

    while (dataKey !== null && Array.isArray(edgesKeys)) {
      // Store the last valid info key
      prevInfoKey = infoKey;

      // Add the receives nodes to the list of nodes
      if (isForwardPagination) {
        for (let i = 0; i < size; i++) mergedEdges.push(edgesKeys[i]);
      } else {
        for (let i = size - 1; i >= 0; i--) mergedEdges.unshift(edgesKeys[i]);
      }

      // Stop traversing pages when no next page is expected
      const hasMore = cache.resolve(
        infoKey,
        isForwardPagination ? 'hasNextPage' : 'hasPreviousPage'
      );
      if (hasMore === false || edgesKeys.length === 0) break;

      // Retrive the cursor from PageInfo
      let nextCursor = infoKey
        ? cache.resolve(
            infoKey,
            isForwardPagination ? 'endCursor' : 'startCursor'
          )
        : null;

      // If no cursor is on PageInfo then fall back to edges.cursor
      if (!nextCursor) {
        const edge = isForwardPagination ? edgesKeys[size - 1] : edgesKeys[0];
        nextCursor = edge ? cache.resolve(edge, 'cursor') : null;
        if (!nextCursor) break;
      }

      // Update the cursor on the child arguments
      if (isForwardPagination) {
        childArgs.after = nextCursor || null;
      } else {
        childArgs.before = nextCursor || null;
      }

      // Retrive the next page of data
      dataKey = cache.resolve(key, fieldName, childArgs) as string;
      edgesKeys = cache.resolve(dataKey, 'edges') as string;
      infoKey = cache.resolve(dataKey, 'pageInfo') as string;
    }

    return {
      __typename: connectionType,
      edges: mergedEdges,
      pageInfo: prevInfoKey || undefined,
    } as any;
  };
};
