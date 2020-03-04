import { ApolloLink } from 'apollo-link';
import { HttpLink } from 'apollo-link-http';
import { WebSocketLink } from 'apollo-link-ws';
import { setContext } from 'apollo-link-context';
import { getMainDefinition } from 'apollo-utilities';
import { InMemoryCache } from 'apollo-cache-inmemory';
import { globalCacheUpdates, ConflictLogger } from '../helpers';
import { getAuthHeader } from '../auth/keycloakAuth';
import { WebNetworkStatus } from './WebNetworkStatus';

let httpUri = 'http://localhost:4000/graphql';
let wsUri = 'ws://localhost:4000/graphql';

if (process.env.BUILD_TARGET === 'container') {
  httpUri = "/graphql";
  wsUri = ((window.location.protocol === "https:") ? "wss://" : "ws://") + window.location.hostname + "/graphql";
}

/**
 * Create websocket link and
 * define websocket link options
 */
const wsLink = new WebSocketLink({
  uri: wsUri,
  options: {
    reconnect: true,
    lazy: true,
    // returns auth header or empty string
    connectionParams: async () => (await getAuthHeader())
  },
});

const httpLink = new HttpLink({
  uri: httpUri,
});

/**
 * add authorization headers for queries
 * to grapqhql backend
 * 
 */
const authLink = setContext(async (_, { headers }) => {
  return {
    headers: {
      ...headers,
      // returns auth header or empty string
      ...await getAuthHeader()
    }
  }
});

/**
 * split queries and subscriptions.
 * send subscriptions to websocket url &
 * queries to http url
 * 
 */
const splitLink = ApolloLink.split(
  ({ query }) => {
    const { kind, operation }: any = getMainDefinition(query);
    return kind === 'OperationDefinition' && operation === 'subscription';
  },
  wsLink,
  httpLink,
);

/**
 * Instantiate cache object
 * and define cache redirect queries
 * 
 */
const cache = new InMemoryCache({
  // cache redirects are used
  // to query the cache for individual Task item
  cacheRedirects: {
    Query: {
      findTasks: (_, { fields }, { getCacheKey }) => getCacheKey({ __typename: 'Task', id: fields.id }),
    },
  },
});

export const clientConfig = {
  link: authLink.concat(splitLink),
  cache: cache,
  conflictListener: new ConflictLogger(),
  mutationCacheUpdates: globalCacheUpdates,
  networkStatus: new WebNetworkStatus()
};
