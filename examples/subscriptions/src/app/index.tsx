import React, { FC } from 'react';
import * as ReactDOM from 'react-dom';
import { SubscriptionClient } from 'subscriptions-transport-ws';
import {
  createClient,
  fetchExchange,
  Provider,
  subscriptionExchange,
} from 'urql';
import { cacheExchange } from '@urql/exchange-graphcache';
import './index.css';
import { Messages } from './Messages';
import gql from 'graphql-tag';

const subscriptionClient = new SubscriptionClient(
  'ws://localhost:4001/graphql',
  {}
);

const client = createClient({
  url: 'http://localhost:4000/graphql',
  exchanges: [
    // @ts-ignore
    cacheExchange({
      updates: {
        Subscription: {
          newMessages: ({ newMessages }, _, cache) => {
            cache.updateQuery(
              gql`
                query {
                  messages {
                    id
                    message
                  }
                }
              `,
              data => {
                return {
                  ...data,
                  messages: [
                    // @ts-ignore
                    ...data.messages,
                    {
                      ...newMessages,
                      __typename: 'Message',
                    },
                  ],
                };
              }
            );
          },
        },
      },
    }),
    fetchExchange,
    subscriptionExchange({
      forwardSubscription: operation => subscriptionClient.request(operation),
    }),
  ],
});

export const App: FC = () => (
  <Provider value={client}>
    <main>
      <h1>New messages</h1>
      <Messages />
    </main>
  </Provider>
);

App.displayName = 'App';

ReactDOM.render(<App />, document.getElementById('root'));
