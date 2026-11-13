export default defineEventHandler((event) => {
  const cfg = useRuntimeConfig()
  const base = String(cfg.public.siteUrl || '').replace(/\/$/, '')
  setHeader(event, 'content-type', 'text/plain; charset=utf-8')
  return `User-agent: *
Allow: /
Disallow: /cart
Disallow: /checkout
Disallow: /api/

Sitemap: ${base}/sitemap.xml
`
})
