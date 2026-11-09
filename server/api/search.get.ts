export default defineEventHandler(async (event) => {
  const q = String(getQuery(event).q || '').trim()
  const page = Math.max(1, Number(getQuery(event).page) || 1)
  if (q.length < 2) {
    return { items: [], categories: [], total: 0, page: 1, perPage: 24, totalPages: 1 }
  }
  const store = await getStore()
  const [products, categories] = await Promise.all([
    store.listProducts({ search: q, page, perPage: 24 }),
    store.categoriesTree()
  ])
  const flat: { slug: string; name: string; path: string }[] = []
  const walk = (nodes: any[]) => nodes.forEach((n) => { flat.push({ slug: n.slug, name: n.name, path: n.path }); walk(n.children) })
  walk(categories)
  const needle = q.toLowerCase()
  return {
    ...products,
    categories: flat.filter((c) => c.name.toLowerCase().includes(needle)).slice(0, 4)
  }
})
