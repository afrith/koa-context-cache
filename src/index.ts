import type Koa from 'koa'
import NodeCache from 'node-cache'

interface ContextCacheOptions {
  middleware: Koa.Middleware<Koa.DefaultState, Koa.Context>
  getKeyFromContext: (ctx: Koa.Context) => string | undefined
  cachedStateFields: string[]
  ttl: number
}

export default function contextCache (options: ContextCacheOptions): Koa.Middleware {
  const { middleware, getKeyFromContext, cachedStateFields, ttl } = options
  const cache = new NodeCache()

  const applyAndStore = async (ctx: Koa.Context, next: Koa.Next): Promise<void> => {
    await middleware(ctx, next)
    const key = getKeyFromContext(ctx)
    const valuesToStore = cachedStateFields.map(prop => [prop, ctx.state[prop]]).filter(([_, value]) => value != null)
    if (key != null && valuesToStore.length > 0) {
      cache.set(key, Object.fromEntries(valuesToStore), ttl)
    }
  }

  return async (ctx, next) => {
    const key = getKeyFromContext(ctx)

    if (key != null) {
      const cachedValue = cache.get<object>(key)
      if (cachedValue != null) {
        for (const [name, value] of Object.entries(cachedValue)) {
          ctx.state[name] = value
        }
        await next()
      } else {
        await applyAndStore(ctx, next)
      }
    } else {
      await applyAndStore(ctx, next)
    }
  }
}
