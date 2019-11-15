import { Resolver } from '../types';

export type MergeMode = 'outwards' | 'inwards';
export interface PaginationParams {
  fromName?: string;
  limitName?: string;
}

interface Base {
  __typename: any;
}

export const simplePagination = (_params?: PaginationParams): Resolver => {
  //const _from = params && params.fromName || 'from';
  //const _limit = params && params.limitName || 'limit';

  return (_parent, _fieldArgs, cache, info) => {
    const { parentKey: key, fieldName } = info;
    const connections = cache.resolveConnections(key, fieldName);
    const size = connections.length;
    const result: Base[] = [];
    if (size === 0) return undefined;

    for (let i = 0; i < size; i++) {
      const [, linkKey] = connections[i];
      const links = cache.resolveValueOrLink(linkKey) as string[];
      if (links.length === 0) return undefined;
      result.push(
        ...links.map(lk => ({
          id: cache.resolveValueOrLink(`${lk}.id`),
          _id: cache.resolveValueOrLink(`${lk}._id`),
          __typename: cache.resolveValueOrLink(`${lk}.__typename`),
        }))
      );
    }

    return result;
  };
};
