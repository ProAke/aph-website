/**
 * WordPress → Nuxt compatibility layer.
 *
 * The migration rule is "no URL, no behaviour, no surprise": every public URL shape that
 * WordPress/WooCommerce exposes keeps working after the switch-over, without a visible redirect
 * (unless a redirect is genuinely required).
 *
 *  1. /?s=keyword            → /search?q=keyword        (WP search links in the wild / old SERPs)
 *  2. ?add-to-cart=<id>      → the product page          (WP "add to cart" deep links)
 *  3. /wp-admin, /wp-json …  → legacy origin (while the old site is still alive)
 *  4. /product/foo/          → served as /product/foo    (no 301: the browser URL keeps WordPress' form)
 */
const LEGACY_REDIRECT_PREFIXES = [
  '/wp-admin',
  '/wp-login.php',
  '/wp-json',
  '/wp-includes',
  '/xmlrpc.php',
  '/wp-cron.php',
  '/feed',
  '/comments/feed',
  '/my-account',
  '/wishlist',
  '/compare',
  '/?wc-ajax'
]

export default defineEventHandler(async (event) => {
  const url = getRequestURL(event)
  const path = url.pathname
  const cfg = useRuntimeConfig()

  // 1) WordPress search URLs
  if (url.searchParams.has('s') && (path === '/' || path === '/index.php')) {
    const q = url.searchParams.get('s') || ''
    return sendRedirect(event, `/search?q=${encodeURIComponent(q)}`, 302)
  }

  // 2) WooCommerce add-to-cart deep links (?add-to-cart=123 / /cart/?add-to-cart=123)
  if (url.searchParams.has('add-to-cart')) {
    const rawId = url.searchParams.get('add-to-cart') || ''
    if (/^\d+$/.test(rawId)) {
      try {
        const store = await getStore()
        const product = await store.productById(Number(rawId))
        if (product) return sendRedirect(event, `/product/${product.slug}`, 302)
      } catch {
        /* database unavailable → fall through to the cart */
      }
    }
    return sendRedirect(event, '/cart', 302)
  }

  // 3) paths that only WordPress can serve (keep them on the old origin until decommission)
  //    /wp-content/uploads/* is deliberately excluded: server/routes proxies it so that
  //    images embedded in old e-mails / Google Images keep resolving.
  const isUploads = path.startsWith('/wp-content/uploads')
  if (cfg.legacyOrigin && !isUploads && LEGACY_REDIRECT_PREFIXES.some((p) => path === p || path.startsWith(p))) {
    const origin = String(cfg.legacyOrigin).replace(/\/$/, '')
    return sendRedirect(event, origin + path + (url.search || ''), 302)
  }

  // 4) trailing-slash tolerance — WordPress canonicals end with "/", Nuxt routes don't.
  //    Rewrite internally instead of redirecting so the address bar never changes.
  if (path.length > 1 && path.endsWith('/')) {
    const stripped = path.replace(/\/+$/, '')
    event.node.req.url = stripped + (url.search || '')
  }
})
