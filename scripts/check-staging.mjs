#!/usr/bin/env node
/**
 * Verifies that a staging sub-domain is: alive, fast, and invisible to search engines.
 * Run it right after nginx/certbot and again before you invite anyone to test.
 *
 *   npm run check:staging -- --url https://new.aph-ita.co.th
 *   npm run check:staging -- --url https://new.aph-ita.co.th --auth aph:secret --prod https://www.aph-ita.co.th
 *
 * Exit 0 = staging is safe to share, 1 = at least one check failed.
 */
const argv = process.argv.slice(2)
function arg(name, fallback = '') {
  const eq = argv.find((a) => a.startsWith(`--${name}=`))
  if (eq) return eq.split('=').slice(1).join('=')
  const idx = argv.indexOf(`--${name}`)
  if (idx !== -1 && argv[idx + 1] && !argv[idx + 1].startsWith('--')) return argv[idx + 1]
  return fallback
}

const BASE = arg('url', process.env.STAGING_URL || '').replace(/\/$/, '')
const AUTH = arg('auth', process.env.STAGING_AUTH || '')       // user:password
const PROD = arg('prod', process.env.PROD_URL || 'https://www.aph-ita.co.th').replace(/\/$/, '')

if (!BASE) {
  console.error('✖ --url is required, e.g. --url https://new.aph-ita.co.th')
  process.exit(1)
}

const UA = 'Mozilla/5.0 (compatible; APH-StagingCheck/1.0)'
const authHeader = AUTH ? { authorization: 'Basic ' + Buffer.from(AUTH).toString('base64') } : {}

async function get(path, withAuth = true) {
  const started = Date.now()
  try {
    const res = await fetch(BASE + path, {
      headers: { 'user-agent': UA, accept: 'text/html,text/plain,*/*', ...(withAuth ? authHeader : {}) },
      redirect: 'manual',
      signal: AbortSignal.timeout(20000)
    })
    const type = res.headers.get('content-type') || ''
    const body = /text|xml|json|javascript/.test(type) ? await res.text() : ''
    return { status: res.status, headers: res.headers, body, ms: Date.now() - started }
  } catch (err) {
    return { status: 0, error: err.message, headers: new Headers(), body: '', ms: Date.now() - started }
  }
}

const checks = []
const add = (name, ok, detail) => { checks.push({ name, ok, detail }) }

// ── 1. is it protected (when auth is configured)? ──────────────────────────
if (AUTH) {
  const anon = await get('/', false)
  add('ล็อกอินขั้นแรก (Basic Auth)', anon.status === 401, anon.status === 401 ? '401 เมื่อไม่มีรหัส — ดี' : `ได้ ${anon.status} — ควรเป็น 401`)
}

// ── 2. four-layer noindex ──────────────────────────────────────────────────
const home = await get('/')
add('หน้าแรกตอบสนอง', home.status === 200, `HTTP ${home.status} · ${home.ms}ms`)
const robotsTag = (home.headers.get('x-robots-tag') || '').toLowerCase()
add('header X-Robots-Tag', robotsTag.includes('noindex'), robotsTag || '(ไม่มี header — ยังไม่ได้ตั้ง NUXT_PUBLIC_ROBOTS_NOINDEX=1)')
add('meta robots noindex', /<meta[^>]+name="robots"[^>]*noindex/i.test(home.body), /<meta[^>]+name="robots"[^>]*noindex/i.test(home.body) ? 'พบใน HTML' : 'ไม่พบ meta robots (โหมด staging ปิดอยู่?)')

const robots = await get('/robots.txt')
const blocksAll = /Disallow:\s*\/\s*($|\n)/i.test(robots.body)
add('robots.txt ปิดทั้งเว็บ', robots.status === 200 && blocksAll, blocksAll ? 'Disallow: /' : `HTTP ${robots.status} · ${robots.body.slice(0, 60).replace(/\n/g, ' ')}`)

// ── 3. canonical must not leak the staging host ────────────────────────────
const canonical = (home.body.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i) || [])[1] || ''
const canonicalOk = canonical === '' || !canonical.includes(new URL(BASE).host)
add('canonical ไม่ชี้เข้า staging', canonicalOk, canonical ? canonical : '(ไม่มี canonical — ยอมรับได้ แต่ควรมี)')

// ── 4. the pages that must work before you invite testers ─────────────────
const pages = ['/', '/products', '/product-category/xlr', '/articles', '/catalogs', '/dealers', '/about', '/contact', '/cart', '/checkout', '/search?q=xlr']
for (const p of pages) {
  const r = p === '/' ? home : await get(p)
  const title = (r.body.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]?.trim() || ''
  add(`หน้า ${p}`, r.status === 200 && !/หน้า 404|not found/i.test(title), `HTTP ${r.status}${title ? ` · ${title.slice(0, 48)}` : ''}`)
}

// ── 4b. paths that must still hand off to WordPress (needs NUXT_LEGACY_ORIGIN) ──
for (const p of ['/my-account', '/wp-admin']) {
  const r = await get(p)
  const ok = r.status >= 300 && r.status < 400
  add(`legacy ${p} → WordPress`, ok, ok ? `${r.status} → ${r.headers.get('location') || ''}` : `${r.status} — ตั้ง NUXT_LEGACY_ORIGIN ก่อน cut-over`)
}

// ── 5. SEO plumbing ────────────────────────────────────────────────────────
const sitemap = await get('/sitemap.xml')
const urlCount = (sitemap.body.match(/<url>/g) || []).length
const sitemapUsesProd = PROD ? sitemap.body.includes(PROD) : true
add('/sitemap.xml', sitemap.status === 200 && urlCount > 0, `${urlCount} URL · ${sitemapUsesProd ? 'ชี้ production host ✓' : '⚠ ชี้ host ของ staging'}`)

// ── report ─────────────────────────────────────────────────────────────────
console.log(`\n  Staging: ${BASE}${AUTH ? '  (มี Basic Auth)' : '  (เปิดสาธารณะ)'}\n`)
for (const c of checks) console.log(`  ${c.ok ? '✔' : '✖'} ${c.name.padEnd(34)} ${c.detail}`)
const failed = checks.filter((c) => !c.ok)
console.log(`\n  ${failed.length === 0 ? '✅ ผ่านทุกข้อ — ปลอดภัยพอจะให้คนนอกเข้ามาทดลอง' : `❌ ไม่ผ่าน ${failed.length} ข้อ`}\n`)
process.exit(failed.length ? 1 : 0)
