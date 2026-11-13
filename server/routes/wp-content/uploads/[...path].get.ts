/**
 * Keeps historical WordPress media URLs alive:
 *   /wp-content/uploads/2026/08/AC3F-1.jpg
 *
 * Resolution order:
 *   1. local mirror in /public (when the importer ran with --images)
 *   2. proxy to the legacy WordPress origin  (NUXT_LEGACY_ORIGIN)
 * This is what makes the switch invisible for Google Images and for images inside old e-mails.
 */
export default defineEventHandler(async (event) => {
  const path = getRouterParam(event, 'path') || ''
  const cfg = useRuntimeConfig()

  // 1) local mirror first
  const local = await useStorage('assets:server').getItemRaw(`images/wp-content/uploads/${path}`)
  if (local) {
    setHeader(event, 'cache-control', 'public, max-age=31536000, immutable')
    return local
  }

  // 2) fall back to the still-running WordPress site
  if (cfg.legacyOrigin) {
    const origin = String(cfg.legacyOrigin).replace(/\/$/, '')
    setHeader(event, 'cache-control', 'public, max-age=86400')
    return proxyRequest(event, `${origin}/wp-content/uploads/${path}`)
  }

  throw createError({ statusCode: 404, statusMessage: 'ไม่พบไฟล์นี้' })
})
