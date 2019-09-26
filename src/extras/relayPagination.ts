import { Store } from '../store';
import { Resolver, NullArray } from '../types';

interface PageInfo {
  endCursor: null | string;
  startCursor: null | string;
  hasNextPage: null | boolean;
  hasPreviousPage: null | boolean;
}

interface Page {
  __typename: string;
  edges: NullArray<string>;
  pageInfo: PageInfo;
}

const getPage = (cache: Store, linkKey: string): Page | null => {
  const link = cache.getLink(linkKey);
  if (!link || Array.isArray(link)) return null;

  const typename = cache.resolve(link, '__typename');
  const edges = cache.resolve(link, 'edges');

  if (
    typeof typename !== 'string' ||
    !Array.isArray(edges) ||
    !edges.every(x => x === null || typeof x === 'string')
  ) {
    return null;
  }

  const pageInfo = cache.resolve(link, 'pageInfo');
  const page: Page = {
    __typename: typename,
    edges: edges as NullArray<string>,
    pageInfo: {
      endCursor: null,
      startCursor: null,
      hasNextPage: null,
      hasPreviousPage: null,
    },
  };

  if (typeof pageInfo === 'string') {
    const endCursor = cache.resolve(pageInfo, 'endCursor');
    const startCursor = cache.resolve(pageInfo, 'startCursor');
    const hasNextPage = cache.resolve(pageInfo, 'hasNextPage');
    const hasPreviousPage = cache.resolve(pageInfo, 'hasPreviousPage');
    page.pageInfo.endCursor = typeof endCursor === 'string' ? endCursor : null;
    page.pageInfo.startCursor =
      typeof startCursor === 'string' ? startCursor : null;
    page.pageInfo.hasNextPage =
      typeof hasNextPage === 'boolean' ? hasNextPage : null;
    page.pageInfo.hasPreviousPage =
      typeof hasPreviousPage === 'boolean' ? hasPreviousPage : null;
  }

  return page;
};

export const relayPagination = (): Resolver => {
  return (_parent, _args, cache, info) => {
    const { parentKey: key, fieldName } = info;
    const connections = cache.resolveConnections(key, fieldName);
    if (connections.length === 0) return undefined;

    // TODO
    const page = getPage(cache, connections[0][1]);
    return page ? (page as any) : undefined;
  };
};
