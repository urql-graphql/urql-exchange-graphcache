# 📃 Documentation

You can currently configure:

- `resolvers`: A nested `['__typename'][fieldName]` map to resolve results from cache
- `updates`: A Mutation/Subscription field map to apply side-effect updates to the cache
- `optimistic`: A mutation field map to supply optimistic mutation responses
- `keys`: A `__typename` map of functions to generate keys with
- `schema`: An introspected GraphQL schema in JSON format. When it's passed the cache will
  deliver partial results and enable deterministic fragment matching.

> If you're looking for a [Get Started guide instead, please read our main README](../README.md).

## Keys

Keys are used when you need a slight alteration to the value of your identifier or
when the identifier is a non-traditional property.

[Read more](./keys.md)

## Resolvers

Resolvers are needed when you want to do additional resolving, for example do some
custom date formatting.

[Read more](./resolvers.md)

## Updates

The graph cache will automatically handle updates but some things are quite hard to
incorporate. Let's say you delete/add an item, it's hard for us to know you wanted to
delete or where to add an item in a list.

[Read more](./updates.md)

## Optimistic

Here you can configure optimistic responses, this means that we don't wait for the server
to respond but offer the user to instantly replace the data with the variables from the
mutation.

[Read more](./optimistic.md)

## Schema

Our way to see what your backend schema looks like, this offers additional functionality.

[Read more](./schema.md)
