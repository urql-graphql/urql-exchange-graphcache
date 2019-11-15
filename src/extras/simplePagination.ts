import { Resolver } from '../types';

export type MergeMode = 'outwards' | 'inwards';
export interface PaginationParams {
  mergeMode?: MergeMode;
}

interface Base {
  __typename: any;
}

export const simplePagination = (): Resolver => {
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
