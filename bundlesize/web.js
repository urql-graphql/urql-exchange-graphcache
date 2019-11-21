import gql from 'graphql-tag';
import { render } from 'react-dom';
import { cacheExchange } from '@urql/exchange-graphcache';

import {
  Provider,
  Client,
  dedupExchange,
  fetchExchange,
  useQuery,
  useMutation
} from 'urql';

const client = new Client({
  url: '/graphql',
  exchanges: [
    dedupExchange,
    cacheExchange(),
    fetchExchange
  ]
});

const query = gql`{ test }`;
const mutation = gql`mutation { setTest }`;

const Example = () => {
  useQuery({ query });
  useMutation(mutation);
  return <div />;
};

const App = () => (
  <Provider value={client}>
    <Example />
  </Provider>
);

render(<App />, document.getElementById('root'));
