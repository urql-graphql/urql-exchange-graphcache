<h2 align="center">@urql/exchange-graphcache</h2>
<p align="center">
<strong>Extensions for normalized caching and other modern GraphQL patterns in <code>urql</code></strong>
<br /><br />
<a href="https://npmjs.com/package/@urql/exchange-graphcache">
  <img alt="NPM Version" src="https://img.shields.io/npm/v/@urql/exchange-graphcache.svg" />
</a>
<a href="https://travis-ci.org/FormidableLabs/urql-exchange-graphcache">
  <img alt="Test Status" src="https://api.travis-ci.org/FormidableLabs/urql-exchange-graphcache.svg?branch=master" />
</a>
<a href="https://codecov.io/gh/formidablelabs/urql-exchange-graphcache">
  <img alt="Test Coverage" src="https://codecov.io/gh/formidablelabs/urql-exchange-graphcache/branch/master/graph/badge.svg" />
</a>
<a href="https://bundlephobia.com/result?p=@urql/exchange-graphcache">
  <img alt="Minified gzip size" src="https://img.shields.io/bundlephobia/minzip/@urql/exchange-graphcache.svg?label=gzip%20size" />
</a>
<a href="https://github.com/FormidableLabs/urql-exchange-graphcache#maintenance-status">
  <img alt="Maintenance Status" src="https://img.shields.io/badge/maintenance-active-green.svg" />
</a>
<a href="https://spectrum.chat/urql">
  <img alt="Spectrum badge" src="https://withspectrum.github.io/badge/badge.svg" />
</a>
</p>

## ✨ Features

- 📦 A fast & small extension package
- 🌱 Normalized caching support
- 🗂 The `@populate` directive pattern
- 📱 Offline support _(Coming soon!)_

`@urql/exchange-graphcache` is an extension for the [`urql`](https://github.com/FormidableLabs/urql) GraphQL client
that adds normalized caching and other modern GraphQL patterns to it.

`urql` is already quite a comprehensive GraphQL client. But once you've built a basic app using it
you may need a couple of extensions to use solid and modern GraphQL patterns and to optimise your
app. **Optimistic updates** and **normalized resolvers** are parts to making your app more consistent
and reducing the number of requests it takes to update your app. **Auto-populating** mutations help
you to keep your mutations easy to understand while updating your normalized data.

## 📃 [Documentation](./docs/README.md)

This documentation provides more details on how to configure and use `@urql/exchange-graphcache`.
If you'd rather learn more about it first, read on instead.

During development, this package may output **warnings and errors**. Further explanation for each of
those can be found in [the "Help" section of our documentation](./docs/help.md).

- [Keys](./docs/keys.md)
- [Resolvers](./docs/resolvers.md)
- [Updates](./docs/updates.md)
- [Optimistic Updates](./docs/optimistic.md)
- [Schema](./docs/schema.md)
- [Help](./docs/help.md)

> ⚠️ Note: Documentation for some parts of `@urql/exchange-graphcache` are still being worked on!
> For help for features requests, please join our [Spectrum](https://spectrum.chat/urql).

## 🏎️ Intro & Showcase

### Installation

Assuming you've installed `urql` and `graphql` already, install `@urql/exchange-graphcache` alongside them:

```sh
yarn add @urql/exchange-graphcache
# or
npm install --save @urql/exchange-graphcache
```

You'll then need to add the `cacheExchange`, that this package exposes, to your `urql` Client,
by replacing the default cache exchange with it:

```js
import { createClient, dedupExchange, fetchExchange } from 'urql';
import { cacheExchange } from '@urql/exchange-graphcache';

const client = createClient({
  url: 'http://localhost:1234/graphql',
  exchanges: [
    dedupExchange,
    cacheExchange({
      /* config */
    }),
    fetchExchange,
  ],
});
```

If you'd like to use the `@populate` directive you'll then need to add the `populateExchange` to your
`urql` Client as well. Make sure that you add it in front of the `cacheExchange`:

```js
import { createClient, dedupExchange, fetchExchange } from 'urql';
import { populateExchange, cacheExchange } from '@urql/exchange-graphcache';

const client = createClient({
  url: 'http://localhost:1234/graphql',
  exchanges: [
    dedupExchange,
    populateExchange,
    cacheExchange({
      /* config */
    }),
    fetchExchange,
  ],
});
```

### Normalized Caching

> What is normalized caching?
> Explain keys!
> Explain how to customize keys!

### Local Resolvers

> What can I resolve from the cache?
> Explain how to resolve data locally!
> Explain pagination!
> Introduce `Cache` interface!
> Introduce `simplePagination` and `relayPagination`!

### Local Cache Updates

> What are updates?
> When can I do an update?
> Explain how to use updates to change the cache after mutations and subscriptions!

### Optimistic Updates

> What are optimistic updates?
> When do I use them? (small interactions rather than large ones)
> Explain how to set them up!
> Explain when they're reverted (after mutations complete, error or not)

### Schema Awareness

> How do I add a schema?
> How does Graphcache change when I add a schema?
> Explain the schema awareness!
> Explain "@populate" and the populateExchange!

## Maintenance Status

**Active:** Formidable is actively working on this project, and we expect to continue for work for the foreseeable future. Bug reports, feature requests and pull requests are welcome.
