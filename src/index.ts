import type Koa from 'koa'
import NodeCache from 'node-cache'

interface ContextCacheOptions {
  middleware: Koa.Middleware<Koa.DefaultState, Koa.Context>
  getKeyFromContext: (ctx: Koa.Context) => string | undefined
  contextPropName: string
  ttl: number
}

export default function contextCache (options: ContextCacheOptions): Koa.Middleware {
  const { middleware, getKeyFromContext, contextPropName, ttl } = options
  const cache = new NodeCache()

  const applyAndStore = async (ctx: Koa.Context, next: Koa.Next): Promise<void> => {
    await middleware(ctx, next)
    const key = getKeyFromContext(ctx)
    const valueToStore = ctx.state[contextPropName]
    if (key != null && valueToStore != null) {
      cache.set(key, valueToStore, ttl)
    }
  }

  return async (ctx, next) => {
    const key = getKeyFromContext(ctx)

    if (key != null) {
      const cachedValue = cache.get(key)
      if (cachedValue != null) {
        ctx.state[contextPropName] = cachedValue
        await next()
      } else {
        await applyAndStore(ctx, next)
      }
    } else {
      await applyAndStore(ctx, next)
    }
  }
}
