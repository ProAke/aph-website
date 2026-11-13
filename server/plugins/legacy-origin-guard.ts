/**
 * Loud startup warning instead of a silent 404 on cut-over day.
 *
 * Without NUXT_LEGACY_ORIGIN the compatibility layer has nowhere to send /my-account, /wishlist,
 * /compare, /wp-admin and /wp-json — visitors would suddenly hit a 404, which is exactly the
 * "the site changed" moment the migration is supposed to avoid.
 */
export default defineNitroPlugin(() => {
  const cfg = useRuntimeConfig()
  if (String(cfg.legacyOrigin || '').trim()) return
  const msg = [
    '',
    '⚠  NUXT_LEGACY_ORIGIN is empty.',
    '   /my-account, /wishlist, /compare, /wp-admin and /wp-json will return 404 until WordPress is retired.',
    '   Set it to the WordPress origin, e.g. NUXT_LEGACY_ORIGIN=https://www.aph-ita.co.th',
    ''
  ].join('\n')
  if (process.env.NODE_ENV === 'production') console.warn(msg)
  else console.info(msg)
})
