/**
 * Staging guard for the sub-domain deployment (e.g. new.aph-ita.co.th).
 *
 * Set NUXT_PUBLIC_ROBOTS_NOINDEX=1 and every response carries X-Robots-Tag, in addition to the
 * meta robots tag (app.vue) and the "Disallow: /" robots.txt — three independent layers, so a
 * half-finished staging site can never compete with the production WordPress site in Google.
 */
const STATIC = /\.(?:js|mjs|css|map|png|jpe?g|gif|svg|webp|avif|ico|woff2?|ttf|otf|mp4|webm|pdf)$/i

export default defineEventHandler((event) => {
  const { robotsNoindex } = useRuntimeConfig().public
  if (!robotsNoindex) return
  if (STATIC.test(getRequestURL(event).pathname)) return
  setHeader(event, 'x-robots-tag', 'noindex, nofollow, noarchive, nosnippet')
})
