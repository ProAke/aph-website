import type { CategoryNode } from './types'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * Single source of truth for sitemap content. WordPress served /sitemap.xml and
 * /sitemap_index.xml — both keep answering after the migration, from the same generator,
 * so the URL set that search engines already know does not change shape.
 */
export async function buildSitemapXml(): Promise<string> {
  const cfg = useRuntimeConfig()
  const base = String(cfg.public.siteUrl || '').replace(/\/$/, '')
  const store = await getStore()

  const urls: { loc: string; changefreq: string; priority: string }[] = [
    { loc: '/', changefreq: 'daily', priority: '1.0' },
    { loc: '/products', changefreq: 'daily', priority: '0.9' },
    { loc: '/articles', changefreq: 'weekly', priority: '0.6' },
    { loc: '/catalogs', changefreq: 'monthly', priority: '0.5' },
    { loc: '/dealers', changefreq: 'monthly', priority: '0.4' },
    { loc: '/about', changefreq: 'yearly', priority: '0.3' },
    { loc: '/contact', changefreq: 'yearly', priority: '0.4' }
  ]

  const walk = (nodes: CategoryNode[]) => {
    for (const n of nodes) {
      urls.push({ loc: `/product-category/${n.path}`, changefreq: 'weekly', priority: '0.7' })
      walk(n.children)
    }
  }
  walk(await store.categoriesTree())

  let page = 1
  let totalPages = 1
  do {
    const res = await store.listProducts({ page, perPage: 96, sort: 'newest' })
    totalPages = res.totalPages
    for (const p of res.items) urls.push({ loc: `/product/${p.slug}`, changefreq: 'weekly', priority: '0.8' })
    page++
  } while (page <= totalPages && page <= 100)

  for (const post of await store.posts({ limit: 500 })) {
    urls.push({ loc: `/articles/${post.slug}`, changefreq: 'monthly', priority: '0.5' })
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${esc(base + u.loc)}</loc><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`).join('\n')}
</urlset>
`
}
