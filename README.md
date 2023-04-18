# koa-context-cache

Middleware for [koa](https://koajs.com/) that caches values applied to the context state by other middleware.

## Example use case

You have an API endpoint and want to control access to that endpoint based on the `Authorization` header. To implement thhis, you have a middleware `ensureAuth` which checks the header and stores the result in `ctx.state`, something like the following.

```js
const ensureAuth = async (ctx, next) => {
  const authToken = ctx.headers.authorization
  if (!authToken) return ctx.throw(401) // Unauthorized
  ctx.state.userinfo = await getUserFromToken(authToken)
  if (!ctx.state.userinfo.isAuthorized) return ctx.throw(403) // Forbidden
  await next()
}

router.get('/protected-endpoint', ensureAuth, async ctx => {
  // ...
})
```

However, that `getUserFromToken` function is slow or expensive - it has to make a request to another service, or to a database. Clients might be hitting the API frequently, so you want to cache the value of `ctx.state.userinfo` for a short period for each token.

> Sidenote: in this contrived example you could just wrap a cache around `getUserFromToken`. But let's say `ensureAuth` is actually from a third-party library and you don't want to hack around in its internals.

This package allows you to wrap `ensureAuth` in a cache in the following way:

```js
import koaContextCache from 'koa-context-cache'

const cachedAuth = koaContextCache({
  middleware: ensureAuth,
  getKeyFromContext: ctx => ctx.headers.Authorization,
  contextPropName: 'userinfo',
  ttl: 60 // seconds
})

router.get('/protected-endpoint', cachedAuth, async ctx => {
  // ...
})
```

When the first request comes in with a particular `Authorization` header, the `ensureAuth` middleware will be applied and when the request completes the resulting value of `ctx.state.userinfo` will be stored in a cache.

Any subsequent requests (within the TTL) that present the same `Authorization` header will have the cached value added to the context as `ctx.state.userinfo` without the `ensureAuth` middleware running.

## API

The module exports a function which returns a middleware. The function accepts an `options` object with the following properties. See the example code above.

* `getKeyFromContext`: a function that derives the cache key from the context. It will be passed the Koa context and should return a String.
* `middleware`: middleware which will be applied if there is no cached value for the given key.
* `contextPropName`: the name of the property of `ctx.state` which is to be cached; i.e. what is cached is the value of `ctx.state[contextPropName]`.
* `ttl`: time-to-live of the cache, in seconds.
