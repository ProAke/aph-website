export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')!
  const store = await getStore()
  const product = await store.productBySlug(slug)
  if (!product) {
    throw createError({ statusCode: 404, statusMessage: 'ไม่พบสินค้านี้' })
  }
  const related = await store.relatedProducts(product, 5)
  return { product, related, source: store.name }
})
