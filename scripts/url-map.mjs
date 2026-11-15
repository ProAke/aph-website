#!/usr/bin/env node
/**
 * Prints (and optionally probes) every URL this project will publish.
 *
 *   npm run urls                 # the map, derived from deploy/environments.json
 *   npm run urls -- --check      # probe each public URL: status, redirect, noindex, auth
 *   npm run urls -- --check-local  # probe the local ports (:3000 :3010 :3020 …) instead
 *
 * Exit 0 = everything behaves as designed, 1 = at least one URL is wrong.
 */
import { readFile } from 'node:fs/promises'

const argv = process.argv.slice(2)
const CHECK = argv.includes('--check')
const CHECK_LOCAL = argv.includes('--check-local')
const TIMEOUT = Number((argv.find((a) => a.startsWith('--timeout=')) || '--timeout=15').split('=')[1]) * 1000

const map = JSON.parse(await readFile(new URL('../deploy/environments.json', import.meta.url), 'utf8'))
const domain = map.domain
const prod = map.environments.find((e) => e.mode === 'production') || { host: `www.${domain}` }
const others = map.environments.filter((e) => e.mode !== 'production')

const bold = (s) => `\x1b[1m${s}\x1b[0m`
const dim = (s) => `\x1b[2m${s}\x1b[0m`

console.log(`\n${bold('── URL map ─────────────────────────────────────────────────────────')}`)
console.log(`${bold('PRODUCTION  ผู้ใช้จริง (indexable)')}`)
console.log(`  https://${prod.host.padEnd(28)} WordPress จนถึง cut-over → Nuxt  ${dim(`(blue/green :${prod.port}/${prod.portAlt || '-'})`)}`)
console.log(`  https://${domain.padEnd(28)} 301 → https://${prod.host}`)

console.log(`\n${bold('REHEARSAL  ห้าม Google เห็น (noindex 4 ชั้น)')}`)
for (const e of others) {
  const gate = e.auth ? 'Basic Auth' : 'แชร์ลิงก์ได้'
  console.log(`  https://${e.host.padEnd(28)} ${gate} · ${e.mode}  ${dim(`→ :${e.port} · db ${e.db}`)}`)
}

console.log(`\n${bold('ON THIS HOST')}`)
for (const e of map.environments) {
  const ports = e.mode === 'production' ? `${e.port} (blue) · ${e.portAlt} (green)` : `${e.port}`
  console.log(`  ${e.name.padEnd(9)} port ${ports.toString().padEnd(20)} db ${e.db}`)
}

console.log(`\n${bold('CANONICAL')}  https://${prod.host}   ${dim('— ทุกหน้าอ้าง URL นี้ (canonical + sitemap + og:url)')}`)
console.log(`${bold('EMAIL / LINE / ADS')}  ต้องชี้ https://${prod.host}/… เท่านั้น ${dim('(ห้ามลิงก์ staging/uat)')}\n`)

if (!CHECK && !CHECK_LOCAL) process.exit(0)

// ── probing ───────────────────────────────────────────────────────────────
async function probe(url) {
  const started = Date.now()
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; APH-UrlCheck/1.0)' },
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT)
    })
    return {
      url, status: res.status, location: res.headers.get('location') || '',
      robots: res.headers.get('x-robots-tag') || '', ms: Date.now() - started
    }
  } catch (err) {
    return { url, status: 0, error: err.message, location: '', robots: '', ms: Date.now() - started }
  }
}

const targets = []
if (CHECK_LOCAL) {
  for (const e of others) {
    targets.push({ label: `${e.name} :${e.port}`, url: `http://127.0.0.1:${e.port}/`, expect: e.auth ? 'any' : 'noindex' })
  }
  targets.push({ label: `www blue :${prod.port}`, url: `http://127.0.0.1:${prod.port}/`, expect: 'indexable' })
} else {
  targets.push({ label: 'apex', url: `https://${domain}/`, expect: 'redirect-www' })
  for (const e of others) {
    targets.push({ label: e.name, url: `https://${e.host}/`, expect: e.auth ? 'auth' : 'noindex' })
  }
  targets.push({ label: 'www', url: `https://${prod.host}/`, expect: 'ok' })
}

const results = []
for (const t of targets) {
  const r = await probe(t.url)
  let ok = false
  let detail = ''
  switch (t.expect) {
    case 'auth':
      ok = r.status === 401
      detail = r.status === 401 ? '401 → ป้องกันด้วยรหัส ✔' : `${r.status} — ควรเป็น 401 (ยังไม่ได้เปิด Basic Auth?)`
      break
    case 'noindex':
      ok = r.status === 200 && r.robots.toLowerCase().includes('noindex')
      detail = `${r.status} · ${r.robots || 'ไม่มี X-Robots-Tag'}`
      break
    case 'indexable':
      ok = r.status === 200 && !r.robots.toLowerCase().includes('noindex')
      detail = `${r.status} · ${r.robots || 'ไม่มี X-Robots-Tag (ถูกต้อง)'}`
      break
    case 'redirect-www':
      ok = r.status >= 300 && r.status < 400 && (r.location || '').includes(prod.host)
      detail = `${r.status} → ${r.location || '(ไม่มี Location)'}`
      break
    default:
      ok = r.status >= 200 && r.status < 400
      detail = `${r.status}${r.location ? ` → ${r.location}` : ''}`
  }
  if (r.status === 0) detail = `เข้าถึงไม่ได้: ${r.error}`
  results.push({ ...t, ...r, ok, detail })
}

console.log(bold('── probe ───────────────────────────────────────────────────────────'))
for (const r of results) {
  console.log(`  ${r.ok ? '\x1b[32m✔\x1b[0m' : '\x1b[31m✖\x1b[0m'} ${r.label.padEnd(12)} ${r.url.padEnd(38)} ${dim(r.detail)}`)
}
const bad = results.filter((r) => !r.ok)
console.log('')
console.log(bad.length ? `\x1b[31m${bad.length} URL ไม่เป็นไปตามที่ออกแบบ\x1b[0m\n` : '\x1b[32mทุก URL ตรงตามแผน\x1b[0m\n')
process.exit(bad.length ? 1 : 0)
