/**
 * Cloudflare Worker variant of the edge router (use this when DNS is on Cloudflare and
 * you do not want to run your own nginx).
 *
 *  ROLLOUT  0–100 → percentage of visitors routed to the new Nuxt origin (sticky by cookie)
 *  Roll back = change ROLLOUT to 0 and deploy (or flip LEGACY_PASSTHROUGH to true).
 *
 * Deploy:  wrangler deploy  (bind the two origins as environment variables)
 */
const ROLLOUT = 0               // ← single knob: 0 = all WordPress, 100 = all Nuxt
const STICKY_COOKIE = 'aph_edge'
const LEGACY_PASSTHROUGH = [
  /^\/wp-admin/, /^\/wp-login\.php/, /^\/wp-json/, /^\/wp-includes/, /^\/xmlrpc\.php/,
  /^\/my-account/, /^\/wishlist/, /^\/compare/, /^\/feed/
]

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const legacy = env.LEGACY_ORIGIN   // e.g. https://wordpress-origin.internal
    const modern = env.NUXT_ORIGIN     // e.g. https://nuxt-origin.internal

    const cookies = Object.fromEntries(
      (request.headers.get('cookie') || '').split(';').map((c) => c.trim().split('=')).filter((p) => p[0])
    )

    const forced = cookies[STICKY_COOKIE]
    const bucket = hash(`${request.headers.get('cf-connecting-ip') || ''}${request.headers.get('user-agent') || ''}`) % 100
    const toNuxt =
      LEGACY_PASSTHROUGH.every((re) => !re.test(url.pathname)) &&
      (forced === 'new' || (ROLLOUT > 0 && bucket < ROLLOUT))

    const origin = toNuxt ? modern : legacy
    const target = new URL(url.pathname + url.search, origin)

    // WordPress likes trailing slashes; Nuxt strips them internally, so nothing to rewrite.
    const res = await fetch(target.toString(), { request, redirect: 'manual' })

    // automatic rollback: only for idempotent requests, so orders are never replayed
    const idempotent = request.method === 'GET' || request.method === 'HEAD'
    if (toNuxt && idempotent && res.status >= 500) {
      const fallback = await fetch(new URL(url.pathname + url.search, legacy).toString(), { request })
      return new Response(fallback.body, { status: fallback.status, headers: fallback.headers })
    }

    const out = new Response(res.body, res)
    out.headers.append('set-cookie', `${STICKY_COOKIE}=${toNuxt ? 'new' : 'legacy'}; Path=/; SameSite=Lax; Max-Age=86400`)
    out.headers.set('x-aph-backend', toNuxt ? 'nuxt' : 'wordpress')
    return out
  }
}

function hash(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0
  return h
}
