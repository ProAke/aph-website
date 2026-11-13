/**
 * Canonical + robots policy, matching what Yoast emitted on WordPress.
 *
 * - one canonical per page, absolute, pointing at NUXT_PUBLIC_SITE_URL (never the staging
 *   sub-domain, even when the app is served from it)
 * - /cart, /checkout, /search are noindex,follow like WooCommerce; everything else stays indexable
 * - WordPress-style "/x/" URLs resolve to the same page, so both forms collapse onto one canonical
 */
const NOINDEX_PATHS = [/^\/cart(\/|$)/, /^\/checkout(\/|$)/, /^\/search(\/|$)/]

export default defineNuxtPlugin(() => {
  const cfg = useRuntimeConfig().public
  const route = useRoute()
  const base = String(cfg.siteUrl || '').replace(/\/$/, '')

  const cleanPath = (p: string) => {
    const trimmed = p.replace(/\/+$/, '')
    return trimmed === '' ? '/' : trimmed
  }

  useHead({
    link: [{ rel: 'canonical', href: computed(() => `${base}${cleanPath(route.path)}`) }]
  })

  if (cfg.robotsNoindex) return // staging guard already sets a global noindex

  const isPrivate = computed(() => NOINDEX_PATHS.some((re) => re.test(route.path)))
  useHead({
    meta: computed(() => (isPrivate.value ? [{ name: 'robots', content: 'noindex, follow' }] : []))
  })
})
