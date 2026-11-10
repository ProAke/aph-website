export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const store = await getStore()
  const kind = q.kind === 'news' || q.kind === 'article' ? q.kind : undefined
  return { items: await store.posts({ kind, limit: q.limit ? Number(q.limit) : undefined }) }
})
