import NodeCache from 'node-cache'

const contextCache = ({ middleware, getKeyFromContext, contextPropName, ttl }) => {
  const cache = new NodeCache()

  const applyAndStore = async (ctx, next) => {
    await middleware(ctx, next)
    const key = getKeyFromContext(ctx)
    const valueToStore = ctx[contextPropName]
    if (key && valueToStore) {
      cache.set(key, valueToStore, ttl)
    }
  }

  return async (ctx, next) => {
    const key = getKeyFromContext(ctx)

    if (key) {
      const cachedValue = cache.get(key)
      if (cachedValue) {
        ctx[contextPropName] = cachedValue
        await next()
      } else {
        await applyAndStore(ctx, next)
      }
    } else {
      await applyAndStore(ctx, next)
    }
  }
}

export default contextCache
