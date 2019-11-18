import { stringifyVariables } from 'urql';
import { Resolver, Variables, NullArray } from '../types';

export interface PaginationParams {
  offsetArgument?: string;
  limitArgument?: string;
}

export const simplePagination = ({
  offsetArgument = 'from',
  limitArgument = 'limit',
}: PaginationParams = {}): Resolver => {
  const compareArgs = (
    fieldArgs: Variables,
    connectionArgs: Variables
  ): boolean => {
    for (const key in connectionArgs) {
      if (key === offsetArgument || key === limitArgument) {
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
    let result: NullArray<string> = [];
    const visited = new Set();
    let prevOffset: number | null = null;
    if (size === 0) return undefined;

    for (let i = 0; i < size; i++) {
      const [args, linkKey] = connections[i];
      if (!compareArgs(fieldArgs, args)) continue;
      const links = cache.resolveValueOrLink(linkKey) as string[];
      if (links === null || links.length === 0) continue;

      if (!prevOffset || (args as any)[offsetArgument] > prevOffset) {
        for (let j = 0; j < links.length; j++) {
          const link = links[j];
          if (visited.has(link)) continue;
          result.push(link);
          visited.add(link);
        }
      } else {
        const tempResult: NullArray<string> = [];
        for (let j = 0; j < links.length; j++) {
          const link = links[j];
          if (visited.has(link)) continue;
          tempResult.push(link);
          visited.add(link);
        }
        result = [...tempResult, ...result];
      }

      prevOffset = (args as any)[offsetArgument];
    }

    return result;
  };
};
