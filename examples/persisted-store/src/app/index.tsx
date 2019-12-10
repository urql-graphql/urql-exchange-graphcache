import React, { FC } from 'react';
import * as ReactDOM from 'react-dom';
import { openDB } from 'idb';
import { createClient, fetchExchange, Provider, dedupExchange } from 'urql';
import { cacheExchange, SerializedEntries } from '@urql/exchange-graphcache';
import './index.css';
import Messages from './components/Messages';

let db;
const client = createClient({
  url: 'http://localhost:4000/graphql',
  exchanges: [
    dedupExchange,
    cacheExchange({
      storage: {
        read: async () => {
          db = await openDB('myApplication', 1, {
            upgrade: db => db.createObjectStore('keyval'),
          });
          const result = (await db.getAll('keyval')) as SerializedEntries;
          await db.clear('keyval');
          return result;
        },
        write: async batch => {
          for (const key in batch) {
            const value = batch[key];
            db.put('keyval', value, key);
          }
        },
      },
    }),
    fetchExchange,
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
