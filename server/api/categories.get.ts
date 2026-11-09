export default defineEventHandler(async () => {
  const store = await getStore()
  return { items: await store.categoriesTree(), source: store.name }
})
