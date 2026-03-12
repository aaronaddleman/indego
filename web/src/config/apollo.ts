import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { auth } from './firebase';

const httpLink = createHttpLink({
  uri: import.meta.env.VITE_GRAPHQL_URL || 'https://us-central1-indego-bc76b.cloudfunctions.net/graphql',
});

const authLink = setContext(async (_, { headers }) => {
  const user = auth.currentUser;
  const token = user ? await user.getIdToken() : '';
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    for (const err of graphQLErrors) {
      if (err.extensions?.code === 'UNAUTHENTICATED') {
        auth.signOut();
      }
    }
  }
  if (networkError) {
    console.error('[Network error]:', networkError);
  }
});

const cache = new InMemoryCache({
  typePolicies: {
    Habit: { keyFields: ['id'] },
    User: { keyFields: ['id'] },
  },
});

export const client = new ApolloClient({
  link: errorLink.concat(authLink.concat(httpLink)),
  cache,
});
