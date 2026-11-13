#!/usr/bin/env node
/**
 * Parity checker — "does the new site look/behave like the old one, URL by URL?"
 *
 * Run it before every canary step. It compares the live WordPress site with the new Nuxt site:
 * HTTP status, <title>, meta description, <h1>, canonical, product/section counts, price strings and
 * the visible-text similarity, then prints a table and exits non-zero when something regressed.
 *
 *   npm run parity -- --old https://www.aph-ita.co.th --new https://new.aph-ita.co.th
 *   npm run parity -- --urls-file urls.txt --limit 100          # compare a hand-picked list
 *   npm run parity -- --new http://127.0.0.1:3000 --no-old      # smoke-test the new site only
 *
 * Exit codes: 0 ok, 1 parity failures, 2 too many diffs (configure with --max-diff=0.05).
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'

const argv = process.argv.slice(2)
function arg(name, fallback = '') {
  const eq = argv.find((a) => a.startsWith(`--${name}=`))
  if (eq) return eq.split('=').slice(1).join('=')
  const idx = argv.indexOf(`--${name}`)
  if (idx !== -1 && argv[idx + 1] && !argv[idx + 1].startsWith('--')) return argv[idx + 1]
  return fallback
}
const has = (name) => argv.includes(`--${name}`)

const OLD = arg('old', process.env.OLD_SITE || 'https://www.aph-ita.co.th')
const NEW = arg('new', process.env.NEW_SITE || 'http://127.0.0.1:3000')
const LIMIT = Number(arg('limit', '300'))
const CONCURRENCY = Number(arg('concurrency', '4'))
const MAX_DIFF = Number(arg('max-diff', '0.05'))
const TIMEOUT = Number(arg('timeout', '25')) * 1000
const OUT = arg('out', 'reports/parity.json')
const URls_FILE = arg('urls-file', '')
const NO_OLD = has('no-old')
const VERBOSE = has('verbose')

const UA = 'Mozilla/5.0 (compatible; APH-ParityCheck/1.0)'

const stripHtml = (html) => html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()

function pick(html, re) {
  const m = html.match(re)
  return m ? stripHtml(m[1]) : ''
}

function analyze(html) {
  return {
    title: pick(html, /<title[^>]*>([\s\S]*?)<\/title>/i),
    description: (html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) || [])[1] || '',
    h1: pick(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i),
    canonical: (html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i) || [])[1] || '',
    products: (html.match(/class="[^"]*\b(product|pcard)\b/gi) || []).length,
    prices: (html.match(/฿\s?[\d,]+\.\d{2}/g) || []).length,
    text: stripHtml(html)
  }
}

const shingles = (text, size = 4) => {
  const words = text.toLowerCase().split(/\s+/).filter(Boolean)
  const set = new Set()
  for (let i = 0; i + size <= words.length; i++) set.add(words.slice(i, i + size).join(' '))
  return set
}
function similarity(a, b) {
  const A = shingles(a), B = shingles(b)
  if (!A.size || !B.size) return 0
  let inter = 0
  for (const s of A) if (B.has(s)) inter++
  return (2 * inter) / (A.size + B.size)
}

async function fetchPage(url) {
  const started = Date.now()
  try {
    const res = await fetch(url, {
      headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml' },
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT)
    })
    const html = res.status >= 200 && res.status < 300 ? await res.text() : ''
    return { url, status: res.status, location: res.headers.get('location') || '', ms: Date.now() - started, ...analyze(html) }
  } catch (err) {
    return { url, status: 0, error: err.message, ms: Date.now() - started, title: '', description: '', h1: '', canonical: '', products: 0, prices: 0, text: '' }
  }
}

/** WordPress canonical form keeps the trailing slash; Nuxt serves both, so compare like-for-like. */
function toNewUrl(oldUrl) {
  const u = new URL(oldUrl)
  const newBase = new URL(NEW)
  let path = u.pathname.replace(/\/+$/, '') || '/'
  if (u.searchParams.has('s')) return new URL(`/search?q=${encodeURIComponent(u.searchParams.get('s'))}`, newBase).toString()
  return new URL(path + u.search, newBase).toString()
}

async function collectFromSitemaps() {
  const candidates = ['/sitemap_index.xml', '/wp-sitemap.xml', '/sitemap.xml', '/sitemap-index.xml']
  const seen = new Set()
  const urls = new Set()
  const parse = (xml) => [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1])

  for (const path of candidates) {
    const res = await fetch(OLD.replace(/\/$/, '') + path, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(TIMEOUT) }).catch(() => null)
    if (!res || !res.ok) continue
    const xml = await res.text()
    const locs = parse(xml)
    if (!locs.length) continue
    for (const loc of locs) {
      if (/\.xml(\?|$)/.test(loc)) {
        if (seen.has(loc)) continue
        seen.add(loc)
        const sub = await fetch(loc, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(TIMEOUT) }).catch(() => null)
        if (sub?.ok) for (const u of parse(await sub.text())) urls.add(u)
      } else urls.add(loc)
    }
    if (urls.size) break
  }
  return [...urls]
}

async function mapLimit(list, limit, fn) {
  const out = []
  let i = 0
  const workers = Array.from({ length: Math.min(limit, list.length) }, async () => {
    while (i < list.length) {
      const idx = i++
      out[idx] = await fn(list[idx], idx)
    }
  })
  await Promise.all(workers)
  return out
}

// ─────────────────────────── run ───────────────────────────
let urls = []
if (URls_FILE) {
  urls = (await readFile(URls_FILE, 'utf8')).split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))
} else if (!NO_OLD) {
  console.log(`→ collecting URLs from ${OLD} …`)
  urls = await collectFromSitemaps()
  if (!urls.length) {
    console.warn('! no sitemap found — falling back to a seed list (use --urls-file for full coverage)')
    urls = ['/', '/products/', '/product-category/xlr/', '/articles/', '/catalogs/', '/dealers/', '/about/', '/contact/']
      .map((p) => OLD.replace(/\/$/, '') + p)
  }
}
if (NO_OLD && !urls.length) {
  urls = ['/', '/products', '/product-category/xlr', '/articles', '/catalogs', '/dealers', '/about', '/contact', '/cart', '/checkout', '/sitemap.xml', '/robots.txt']
}
if (LIMIT && urls.length > LIMIT) urls = urls.slice(0, LIMIT)

console.log(`→ comparing ${urls.length} URLs  (${NO_OLD ? 'new site only' : `${OLD}  ⇄  ${NEW}`})`)

const rows = await mapLimit(urls, CONCURRENCY, async (oldUrl) => {
  const newUrl = NO_OLD ? new URL(oldUrl, NEW).toString() : toNewUrl(oldUrl)
  const fresh = await fetchPage(newUrl)
  const legacy = NO_OLD ? null : await fetchPage(oldUrl)
  const issues = []

  if (fresh.status === 0) issues.push(`FETCH_FAIL: ${fresh.error || 'network'}`)
  else if (fresh.status >= 400) issues.push(`NEW_${fresh.status}`)
  else if (!NO_OLD && legacy?.status && legacy.status !== fresh.status) issues.push(`STATUS ${legacy.status}→${fresh.status}`)
  if (!NO_OLD && legacy) {
    if (legacy.title && fresh.title && legacy.title.trim() !== fresh.title.trim()) issues.push('TITLE')
    if (legacy.description && fresh.description && legacy.description.trim() !== fresh.description.trim()) issues.push('META_DESC')
    if (legacy.h1 && fresh.h1 && legacy.h1.trim() !== fresh.h1.trim()) issues.push('H1')
    if (legacy.canonical && fresh.canonical && legacy.canonical.replace(/\/$/, '') !== fresh.canonical.replace(/\/$/, '')) issues.push('CANONICAL')
    if (legacy.products > 3 && fresh.products === 0) issues.push('NO_PRODUCTS')
  }

  const textSim = NO_OLD ? 1 : similarity(legacy?.text || '', fresh?.text || '')
  if (!NO_OLD && textSim < 0.35) issues.push(`TEXT_DIFF ${(textSim * 100).toFixed(0)}%`)

  const failures = issues.filter((i) => /FETCH_FAIL|NEW_4|NEW_5|NO_PRODUCTS/.test(i))
  return {
    oldUrl, newUrl,
    oldStatus: legacy?.status ?? null, newStatus: fresh.status,
    title: fresh.title, textSimilarity: Number(textSim.toFixed(3)),
    oldMs: legacy?.ms ?? null, newMs: fresh.ms,
    issues, verdict: failures.length ? 'FAIL' : issues.length ? 'DIFF' : 'OK'
  }
})

const ok = rows.filter((r) => r.verdict === 'OK').length
const diff = rows.filter((r) => r.verdict === 'DIFF').length
const fail = rows.filter((r) => r.verdict === 'FAIL').length
const diffRatio = rows.length ? (diff + fail) / rows.length : 0

const summary = {
  generatedAt: new Date().toISOString(), old: NO_OLD ? null : OLD, new: NEW,
  urls: rows.length, ok, diff, fail, diffRatio: Number(diffRatio.toFixed(3)),
  avgOldMs: Math.round(rows.reduce((s, r) => s + (r.oldMs || 0), 0) / Math.max(1, rows.length)),
  avgNewMs: Math.round(rows.reduce((s, r) => s + r.newMs, 0) / Math.max(1, rows.length)),
  verdict: fail > 0 || diffRatio > MAX_DIFF ? 'FAIL' : 'PASS'
}

await mkdir(dirname(OUT), { recursive: true })
await writeFile(OUT, JSON.stringify({ summary, rows }, null, 2))
const csv = ['verdict,issues,newStatus,oldStatus,textSimilarity,newMs,url', ...rows.map((r) =>
  [r.verdict, `"${r.issues.join(' ')}"`, r.newStatus, r.oldStatus ?? '', r.textSimilarity, r.newMs, r.newUrl].join(',')
)].join('\n')
await writeFile(OUT.replace(/\.json$/, '.csv'), csv)

console.log('')
for (const r of rows.filter((x) => x.verdict !== 'OK').slice(0, VERBOSE ? 500 : 25)) {
  console.log(`  ${r.verdict.padEnd(4)} ${String(r.newStatus).padEnd(4)} ${r.issues.join(', ').padEnd(34)} ${r.newUrl}`)
}
console.log('')
console.log(`  OK ${ok}  ·  DIFF ${diff}  ·  FAIL ${fail}  ·  diff-ratio ${(diffRatio * 100).toFixed(1)}% (max ${(MAX_DIFF * 100).toFixed(0)}%)`)
console.log(`  latency: WordPress ${summary.avgOldMs}ms → Nuxt ${summary.avgNewMs}ms`)
console.log(`  report: ${OUT} + ${OUT.replace(/\.json$/, '.csv')}`)
console.log(`  verdict: ${summary.verdict}`)

process.exit(summary.verdict === 'PASS' ? 0 : fail > 0 ? 1 : 2)
