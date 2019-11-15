import { stringifyVariables } from 'urql';
import { Resolver, Variables } from '../types';

export interface PaginationParams {
  fromName?: string;
  limitName?: string;
}

export const simplePagination = (params?: PaginationParams): Resolver => {
  const from = (params && params.fromName) || 'from';
  const limit = (params && params.limitName) || 'limit';

  const compareArgs = (
    fieldArgs: Variables,
    connectionArgs: Variables
  ): boolean => {
    for (const key in connectionArgs) {
      if (key === from || key === limit) {
        continue;
      } else if (!(key in fieldArgs)) {
        return false;
      }

      const argA = fieldArgs[key];
      const argB = connectionArgs[key];

      if (
        typeof argA !== typeof argB || typeof argA !== 'object'
          ? argA !== argB
          : stringifyVariables(argA) !== stringifyVariables(argB)
      ) {
        return false;
      }
    }

    return true;
  };

  return (_parent, fieldArgs, cache, info) => {
    const { parentKey: key, fieldName } = info;
    const connections = cache.resolveConnections(key, fieldName);
    const size = connections.length;
    const result: string[] = [];
    const visited = new Set();
    if (size === 0) return undefined;

    for (let i = 0; i < size; i++) {
      const [args, linkKey] = connections[i];
      if (!compareArgs(fieldArgs, args)) continue;
      const links = cache.resolveValueOrLink(linkKey) as string[];
      if (links.length === 0) return undefined;
      result.push(
        ...links.reduce<string[]>((acc, lk) => {
          if (visited.has(lk)) return acc;
          visited.add(lk);
          return [...acc, lk];
        }, [])
      );
    }

    return result;
  };
};
