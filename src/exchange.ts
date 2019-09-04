import {
  Exchange,
  formatDocument,
  Operation,
  OperationResult,
  RequestPolicy,
  CacheOutcome,
} from 'urql';

import { filter, map, merge, pipe, share, tap } from 'wonka';
import { query, write, writeOptimistic, readOperation } from './operations';
import { Store } from './store';

import {
  Completeness,
  UpdatesConfig,
  ResolverConfig,
  OptimisticMutationConfig,
  KeyingConfig,
} from './types';
import { SchemaPredicates } from './ast/schemaPredicates';

type OperationResultWithMeta = OperationResult & {
  completeness: Completeness;
};

type OperationMap = Map<number, Operation>;

interface DependentOperations {
  [key: string]: number[];
}

// Returns the given operation result with added cacheOutcome meta field
const addCacheOutcome = (outcome: CacheOutcome) => (res: OperationResult) => ({
  data: res.data,
  error: res.error,
  extensions: res.extensions,
  operation: {
    ...res.operation,
    context: {
      ...res.operation.context,
      meta: {
        ...res.operation.context.meta,
        cacheOutcome: outcome,
      },
    },
  },
});

// Returns the given operation with added __typename fields on its query
const addTypeNames = (op: Operation): Operation => ({
  ...op,
  query: formatDocument(op.query),
});

// Retrieves the requestPolicy from an operation
const getRequestPolicy = (op: Operation) => op.context.requestPolicy;

// Returns whether an operation is a query
const isQueryOperation = (op: Operation): boolean =>
  op.operationName === 'query';

// Returns whether an operation is a mutation
const isMutationOperation = (op: Operation): boolean =>
  op.operationName === 'mutation';

// Returns whether an operation can potentially be read from cache
const isCacheableQuery = (op: Operation): boolean => {
  const policy = getRequestPolicy(op);
  return isQueryOperation(op) && policy !== 'network-only';
};

// Returns whether an operation potentially triggers an optimistic update
const isOptimisticMutation = (op: Operation): boolean => {
  const policy = getRequestPolicy(op);
  return isMutationOperation(op) && policy !== 'network-only';
};

// Copy an operation and change the requestPolicy to skip the cache
const toRequestPolicy = (
  operation: Operation,
  requestPolicy: RequestPolicy
): Operation => ({
  ...operation,
  context: {
    ...operation.context,
    requestPolicy,
  },
});

export interface CacheExchangeOpts {
  updates?: Partial<UpdatesConfig>;
  resolvers?: ResolverConfig;
  optimistic?: OptimisticMutationConfig;
  keys?: KeyingConfig;
  /**
   * We can use queryType, mutationType and subscriptionType to
   * improve the check in /ast.
   *
   * We need to know what fields are mandatory (non-nullable), this
   * would allow for partial data returning.
   *
   * A second plan would be use this schema as a base to (de-)serialize
   * the cached data. Allthough I'm not sure if we can afford just saving
   * this into some cache...
   *
   * I think in essence the most important part would be to support modern browsers
   * since these are meant for PWA's.
   *
   * https://caniuse.com/#feat=indexeddb
   *
   * A worrying part about this is what do we do when a user does not supply a schema
   * do we offer x amounts of alternative codepaths? Do we disable cache-persistance?
   * ...?
   *
   * Another problem that presents itself is how optimistic data is serialized, this
   * would probably be the hardest part to recover. It would require some kind of priority
   * to correctly restore all layers and be bound to their correct operation since when
   * we are working offline and we come online we should be able to dispatch these operations.
   * --> future thoughts
   *
   * A priority before offline should be to serialize our data without any optimistic responses
   * since we have no idea how long it will take to write everything to indexeddb, huge
   * data amounts could be a huge blocker for this feature.
   *
   * And last but not least partial results could be achieved. We see that our query method
   * results in some data but not everything, normally we would just indicate this as EMPTY
   * but in theory this is PARTIAL. If there are no non-nullable fields missing we can just
   * return this to the user and send a query to the server to update the other fields and then
   * return the full result.
   *
   * In theory (with the premise) that a query is correctly formed we could already do partial
   * results. Since we could check the selection further and see all other fields are optional
   * --> return and fetch
   */
  schema?: object;
}

export const cacheExchange = (opts?: CacheExchangeOpts): Exchange => ({
  forward,
  client,
}) => {
  if (!opts) opts = {};

  const schemaPredicates = new SchemaPredicates(opts.schema);
  const store = new Store(
    schemaPredicates,
    opts.resolvers,
    opts.updates,
    opts.optimistic,
    opts.keys
  );

  const optimisticKeys = new Set();
  const ops: OperationMap = new Map();
  const deps = Object.create(null) as DependentOperations;

  // This accepts an array of dependencies and reexecutes all known operations
  // against the mapping of dependencies to operations
  // The passed triggerOp is ignored however
  const processDependencies = (
    triggerOp: Operation,
    dependencies: Set<string>
  ) => {
    const pendingOperations = new Set<number>();

    // Collect operations that will be updated due to cache changes
    dependencies.forEach(dep => {
      const keys = deps[dep];
      if (keys !== undefined) {
        deps[dep] = [];
        keys.forEach(key => pendingOperations.add(key));
      }
    });

    // Reexecute collected operations and delete them from the mapping
    pendingOperations.forEach(key => {
      if (key !== triggerOp.key) {
        const op = ops.get(key) as Operation;
        ops.delete(key);
        client.reexecuteOperation(op);
      }
    });
  };

  // This executes an optimistic update for mutations and registers it if necessary
  const optimisticUpdate = (operation: Operation) => {
    if (isOptimisticMutation(operation)) {
      const { key } = operation;
      const { dependencies } = writeOptimistic(store, operation, key);
      if (dependencies.size !== 0) {
        optimisticKeys.add(key);
        processDependencies(operation, dependencies);
      }
    }
  };

  // This updates the known dependencies for the passed operation
  const updateDependencies = (op: Operation, dependencies: Set<string>) => {
    dependencies.forEach(dep => {
      const keys = deps[dep] || (deps[dep] = []);
      keys.push(op.key);

      if (!ops.has(op.key)) {
        const isNetworkOnly = op.context.requestPolicy === 'network-only';
        ops.set(
          op.key,
          isNetworkOnly ? toRequestPolicy(op, 'cache-and-network') : op
        );
      }
    });
  };

  // Retrieves a query result from cache and adds an `isComplete` hint
  // This hint indicates whether the result is "complete" or not
  const operationResultFromCache = (
    operation: Operation
  ): OperationResultWithMeta => {
    const policy = getRequestPolicy(operation);
    const res = query(store, operation);
    const isComplete = policy === 'cache-only' || res.completeness === 'FULL';
    if (isComplete) {
      updateDependencies(operation, res.dependencies);
    } else if (res.completeness === 'PARTIAL') {
      updateDependencies(operation, res.dependencies);
      client.reexecuteOperation(operation);
    }

    // Here we make a distinction we'll have to partially update the deps in case of partial AND
    // continue the chain leading towards the fetchExchange.
    return {
      operation,
      completeness: isComplete ? 'FULL' : 'EMPTY',
      data: res.data,
    };
  };

  // Take any OperationResult and update the cache with it
  const updateCacheWithResult = (result: OperationResult): OperationResult => {
    const { operation, error, extensions } = result;
    const isQuery = isQueryOperation(operation);
    let { data } = result;

    // Clear old optimistic values from the store
    const { key } = operation;
    if (optimisticKeys.has(key)) {
      optimisticKeys.delete(key);
      store.clearOptimistic(key);
    }

    let writeDependencies, queryDependencies;
    if (data !== null && data !== undefined) {
      writeDependencies = write(store, operation, data).dependencies;

      if (isQuery) {
        const queryResult = query(store, operation);
        data = queryResult.data;
        queryDependencies = queryResult.dependencies;
      } else {
        data = readOperation(store, operation, data).data;
      }
    }

    if (writeDependencies !== undefined) {
      // Update operations that depend on the updated data (except the current one)
      processDependencies(result.operation, writeDependencies);
    }

    // Update this operation's dependencies if it's a query
    if (isQuery && queryDependencies !== undefined) {
      updateDependencies(result.operation, queryDependencies);
    }

    return { data, error, extensions, operation };
  };

  return ops$ => {
    const sharedOps$ = pipe(
      ops$,
      map(addTypeNames),
      tap(optimisticUpdate),
      share
    );

    // Filter by operations that are cacheable and attempt to query them from the cache
    const cache$ = pipe(
      sharedOps$,
      filter(op => isCacheableQuery(op)),
      map(operationResultFromCache),
      share
    );

    // Rebound operations that are incomplete, i.e. couldn't be queried just from the cache
    const cacheOps$ = pipe(
      cache$,
      // When it's partial we'll see this continue through to the fetchExchange.
      filter(
        res => res.completeness === 'PARTIAL' || res.completeness !== 'FULL'
      ),
      map(res => res.operation)
    );

    // Resolve OperationResults that the cache was able to assemble completely and trigger
    // a network request if the current operation's policy is cache-and-network
    const cacheResult$ = pipe(
      cache$,
      filter(res => res.completeness === 'FULL'),
      tap(({ operation }) => {
        const policy = getRequestPolicy(operation);
        if (policy === 'cache-and-network') {
          const networkOnly = toRequestPolicy(operation, 'network-only');
          client.reexecuteOperation(networkOnly);
        }
      }),
      map(addCacheOutcome('hit'))
    );

    // Forward operations that aren't cacheable and rebound operations
    // Also update the cache with any network results
    const result$ = pipe(
      forward(
        merge([
          pipe(
            sharedOps$,
            filter(op => !isCacheableQuery(op))
          ),
          cacheOps$,
        ])
      ),
      map(updateCacheWithResult),
      map(addCacheOutcome('miss'))
    );

    return merge([result$, cacheResult$]);
  };
};
