import { Resolver } from '../types';

export type MergeMode = 'outwards' | 'inwards';
export interface PaginationParams {
  mergeMode?: MergeMode;
}

export const simplePagination = (): Resolver => {
  return (_parent, _fieldArgs, cache, info) => {
    const { parentKey: key, fieldName, parentKey } = info;
    const connections = cache.resolveConnections(key, fieldName);
    const size = connections.length;
    const result: string[] = [];
    if (size === 0) return undefined;

    for (let i = 0; i < size; i++) {
      const [, linkKey] = connections[i];
      const links = cache.resolveValueOrLink(linkKey) as string[];
      if (links.length === 0) return undefined;
      result.push(...links);
    }

    return {
      __typename: parentKey,
      [fieldName]: result,
    };
  };
};
