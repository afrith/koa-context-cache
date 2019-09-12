/* eslint-env jest */

import contextCache from '../src/index'

test('inner middleware is applied on first call', async () => {
  const middleware = jest.fn((ctx, next) => next())
  const next = jest.fn()

  const cc = contextCache({
    middleware,
    getKeyFromContext: () => null
  })

  await cc({}, next)

  expect(middleware).toHaveBeenCalledTimes(1)
  expect(next).toHaveBeenCalledTimes(1)
})

test('value is cached and used', async () => {
  const middleware = jest.fn(async (ctx, next) => {
    ctx.value = 'hello'
    await next()
  })
  const next = jest.fn()

  const cc = contextCache({
    middleware,
    getKeyFromContext: ctx => ctx.key,
    contextPropName: 'value',
    ttl: 3000
  })

  const ctx1 = { key: 'value' }
  await cc(ctx1, next)

  expect(middleware).toHaveBeenCalledTimes(1)
  expect(next).toHaveBeenCalledTimes(1)
  expect(ctx1.value).toEqual('hello')

  const ctx2 = { key: 'value' }
  await cc(ctx2, next)

  expect(middleware).toHaveBeenCalledTimes(1)
  expect(next).toHaveBeenCalledTimes(2)
  expect(ctx2.value).toEqual('hello')
})

test('value is not cached when key differs', async () => {
  const middleware = jest.fn(async (ctx, next) => {
    ctx.value = ctx.key
    await next()
  })
  const next = jest.fn()

  const cc = contextCache({
    middleware,
    getKeyFromContext: ctx => ctx.key,
    contextPropName: 'value',
    ttl: 3000
  })

  const ctx1 = { key: 'value' }
  await cc(ctx1, next)

  expect(middleware).toHaveBeenCalledTimes(1)
  expect(next).toHaveBeenCalledTimes(1)
  expect(ctx1.value).toEqual('value')

  const ctx2 = { key: 'different-value' }
  await cc(ctx2, next)

  expect(middleware).toHaveBeenCalledTimes(2)
  expect(next).toHaveBeenCalledTimes(2)
  expect(ctx2.value).toEqual('different-value')
})

test('TTL is respected', async () => {
  const middleware = jest.fn(async (ctx, next) => {
    ctx.value = 'hello'
    await next()
  })
  const next = jest.fn()

  const cc = contextCache({
    middleware,
    getKeyFromContext: ctx => ctx.key,
    contextPropName: 'value',
    ttl: 1
  })

  const ctx1 = { key: 'value' }
  await cc(ctx1, next)

  expect(middleware).toHaveBeenCalledTimes(1)
  expect(next).toHaveBeenCalledTimes(1)
  expect(ctx1.value).toEqual('hello')

  // wait 1.5 seconds
  await new Promise(resolve => setTimeout(resolve, 1500))

  const ctx2 = { key: 'value' }
  await cc(ctx2, next)

  expect(middleware).toHaveBeenCalledTimes(2)
  expect(next).toHaveBeenCalledTimes(2)
  expect(ctx2.value).toEqual('hello')
})
