export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')!
  const store = await getStore()
  const post = await store.postBySlug(slug)
  if (!post) throw createError({ statusCode: 404, statusMessage: 'ไม่พบบทความนี้' })
  const more = (await store.posts({ limit: 4 })).filter((p) => p.slug !== slug).slice(0, 3)
  return { post, related: more }
})
