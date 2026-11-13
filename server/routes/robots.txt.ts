export default defineEventHandler((event) => {
  const cfg = useRuntimeConfig()
  const base = String(cfg.public.siteUrl || '').replace(/\/$/, '')
  setHeader(event, 'content-type', 'text/plain; charset=utf-8')

  // staging sub-domain: block everything, advertise nothing
  if (cfg.public.robotsNoindex) {
    return `# staging deployment — not for indexing
User-agent: *
Disallow: /
`
  }

  return `User-agent: *
Allow: /
Disallow: /cart
Disallow: /checkout
Disallow: /api/

Sitemap: ${base}/sitemap.xml
`
})
