export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isFinite(id)) throw createError({ statusCode: 400, statusMessage: 'invalid id' })
  const store = await getStore()
  const product = await store.productById(id)
  if (!product) throw createError({ statusCode: 404, statusMessage: 'ไม่พบสินค้านี้' })
  return { product }
})
