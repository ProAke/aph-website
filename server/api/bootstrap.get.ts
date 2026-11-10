import { site } from '../../shared/site'

export default defineEventHandler(async () => {
  const store = await getStore()
  const [categories, banners, catalogs] = await Promise.all([
    store.categoriesTree(),
    store.banners(),
    store.catalogs()
  ])
  return { site, categories, banners, catalogs, source: store.name }
})
