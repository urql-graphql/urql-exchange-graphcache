import { Store } from '../store';
import { Resolver, NullArray } from '../types';
import { joinKeys, keyOfField } from '../helpers';

interface PageInfo {
  endCursor: null | string;
  startCursor: null | string;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface Page {
  edges: NullArray<string>;
  pageInfo: PageInfo;
}

const defaultPageInfo: PageInfo = {
  endCursor: null,
  startCursor: null,
  hasNextPage: false,
  hasPreviousPage: false,
};

const ensureKey = (x: any): string | null => (typeof x === 'string' ? x : null);

const getPage = (cache: Store, linkKey: string): Page | null => {
  const link = cache.getLink(linkKey);
  if (!link || Array.isArray(link)) return null;

  const edges = cache.resolve(link, 'edges') as NullArray<string>;
  if (
    !Array.isArray(edges) ||
    !edges.every(x => x === null || typeof x === 'string')
  ) {
    return null;
  }

  const page: Page = { edges, pageInfo: defaultPageInfo };
  const pageInfoKey = cache.resolve(link, 'pageInfo');
  if (typeof pageInfoKey === 'string') {
    const endCursor = ensureKey(cache.resolve(pageInfoKey, 'endCursor'));
    const startCursor = ensureKey(cache.resolve(pageInfoKey, 'startCursor'));
    const hasNextPage = cache.resolve(pageInfoKey, 'hasNextPage');
    const hasPreviousPage = cache.resolve(pageInfoKey, 'hasPreviousPage');

    const pageInfo: PageInfo = (page.pageInfo = {
      hasNextPage: typeof hasNextPage === 'boolean' ? hasNextPage : !!endCursor,
      hasPreviousPage:
        typeof hasPreviousPage === 'boolean' ? hasPreviousPage : !!startCursor,
      endCursor,
      startCursor,
    });

    if (pageInfo.endCursor === null) {
      const edge = edges[edges.length - 1];
      if (edge) {
        const endCursor = cache.resolve(edge, 'cursor');
        pageInfo.endCursor = ensureKey(endCursor);
      }
    }

    if (pageInfo.startCursor === null) {
      const edge = edges[0];
      if (edge) {
        const startCursor = cache.resolve(edge, 'cursor');
        pageInfo.startCursor = ensureKey(startCursor);
      }
    }
  }

  return page;
};

export const relayPagination = (): Resolver => {
  return (_parent, args, cache, info) => {
    const { parentKey: key, fieldName } = info;
    const fieldKey = joinKeys(key, keyOfField(fieldName, args));
    const connections = cache.resolveConnections(key, fieldName);
    const size = connections.length;

    let hasCachedConnection = false;
    for (let i = 0; i < size; i++) {
      if (connections[i][1] === fieldKey) {
        hasCachedConnection = true;
        break;
      }
    }

    const entityKey = cache.resolveValueOrLink(fieldKey);
    if (!hasCachedConnection || typeof entityKey !== 'string') {
      return undefined;
    }

    const typename = cache.resolve(entityKey, '__typename');

    const pageInfoKey = ensureKey(cache.resolve(entityKey, 'pageInfo'));
    const pageInfoTypename = cache.resolve(pageInfoKey, '__typename');
    if (typeof typename !== 'string' || typeof pageInfoTypename !== 'string') {
      return undefined;
    }

    let edges: NullArray<string> = [];
    let pageInfo: PageInfo = { ...defaultPageInfo };

    for (let i = 0; i < size; i++) {
      const [args, linkKey] = connections[i];
      const page = getPage(cache, linkKey);
      if (page === null) {
        continue;
      } else if (args.after) {
        edges = edges.concat(page.edges);
        pageInfo.endCursor = page.pageInfo.endCursor;
        pageInfo.hasNextPage = page.pageInfo.hasNextPage;
      } else if (args.before) {
        edges = page.edges.concat(edges);
        pageInfo.startCursor = page.pageInfo.startCursor;
        pageInfo.hasPreviousPage = page.pageInfo.hasPreviousPage;
      } else if (!args.before && !args.after) {
        edges = edges.concat(page.edges);
        pageInfo = page.pageInfo;
      }
    }

    return {
      __typename: typename,
      edges,
      pageInfo: {
        __typename: pageInfoTypename,
        endCursor: pageInfo.endCursor,
        startCursor: pageInfo.startCursor,
        hasNextPage: pageInfo.hasNextPage,
        hasPreviousPage: pageInfo.hasPreviousPage,
      },
    };
  };
};
