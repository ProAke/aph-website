const SORTS = ['newest', 'name-asc', 'name-desc', 'price-asc', 'price-desc'] as const

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const sort = SORTS.includes(String(q.sort) as any) ? (String(q.sort) as (typeof SORTS)[number]) : 'newest'
  const store = await getStore()
  const result = await store.listProducts({
    categoryPath: q.category ? String(q.category) : undefined,
    search: q.search ? String(q.search) : undefined,
    page: Number(q.page) || 1,
    perPage: Number(q.perPage) || 24,
    sort,
    featured: q.featured === '1' || q.featured === 'true',
    inStock: q.inStock === '1'
  })
  return { ...result, source: store.name }
})
