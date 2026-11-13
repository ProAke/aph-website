#!/usr/bin/env node
/**
 * Incremental WordPress → MariaDB delta sync (the backbone of the zero-downtime migration).
 *
 * WordPress stays the source of truth until cut-over; this script keeps the new database
 * a few minutes behind it so the switch is a routing decision, not a data migration.
 *
 *   npm run sync                 # products + prices/stock + posts + categories (incremental)
 *   npm run sync -- --full       # ignore watermarks, re-read everything
 *   npm run sync -- --content   # only titles/descriptions/posts (cheap, every 5 min)
 *   npm run sync -- --prices    # only price / stock / images (WC Store API sweep)
 *   npm run sync -- --images    # also mirror new images into public/images/products
 *   npm run sync -- --dry-run   # report only, no writes
 *   npm run sync -- --json      # machine-readable report (for monitoring / cron alerts)
 *
 * Exit codes: 0 = success, 1 = failure (so cron/monitoring can alert), 2 = completed with warnings.
 */
import mysql from 'mysql2/promise'
import { readFileSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { createWriteStream } from 'node:fs'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { extname } from 'node:path'
import { dbConfig, WP_BASE } from './env.mjs'

const argv = process.argv.slice(2)
const flag = (name) => argv.includes(`--${name}`)
function value(name, fallback = '') {
  const eq = argv.find((a) => a.startsWith(`--${name}=`))
  if (eq) return eq.split('=').slice(1).join('=')
  const idx = argv.indexOf(`--${name}`)
  if (idx !== -1 && argv[idx + 1] && !argv[idx + 1].startsWith('--')) return argv[idx + 1]
  return fallback
}

const FULL = flag('full')
const DRY = flag('dry-run')
const JSON_OUT = flag('json')
const IMAGES = flag('images')
const ONLY_CONTENT = flag('content')
const ONLY_PRICES = flag('prices')
const VERBOSE = flag('verbose')
const MAX_RUNTIME_MS = Number(value('max-runtime', '600')) * 1000
const PER_PAGE = 100

const startedAt = Date.now()
const report = {
  startedAt: new Date().toISOString(),
  source: WP_BASE,
  db: `${dbConfig.host}/${dbConfig.database}`,
  mode: FULL ? 'full' : ONLY_CONTENT ? 'content' : ONLY_PRICES ? 'prices' : 'incremental',
  categories: 0, products: 0, productsUnpublished: 0, posts: 0, postsUnpublished: 0,
  images: 0, warnings: [], errors: [], durationMs: 0
}
const log = (...args) => { if (!JSON_OUT) console.log(...args) }
const warn = (msg) => { report.warnings.push(msg); if (!JSON_OUT) console.warn('  ! ' + msg) }

// ─────────────────────────── HTTP ───────────────────────────
async function api(path, { retries = 4, raw = false } = {}) {
  const url = path.startsWith('http') ? path : `${WP_BASE}${path}`
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'user-agent': 'APH-Nuxt-Sync/1.0', accept: 'application/json' },
        signal: AbortSignal.timeout(30_000)
      })
      if (res.status === 400 || res.status === 404) return { data: null, total: 0, totalPages: 0, status: res.status }
      if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`)
      return {
        data: await res.json(),
        total: Number(res.headers.get('x-wp-total') || 0),
        totalPages: Number(res.headers.get('x-wp-totalpages') || 0),
        status: res.status
      }
    } catch (err) {
      if (attempt === retries) throw err
      await new Promise((r) => setTimeout(r, 500 * 2 ** attempt))
    }
  }
  return { data: null, total: 0, totalPages: 0, status: 0 }
}

async function paginate(path, onPage) {
  const out = []
  let page = 1
  let totalPages = 1
  do {
    const sep = path.includes('?') ? '&' : '?'
    const { data, totalPages: tp } = await api(`${path}${sep}per_page=${PER_PAGE}&page=${page}`)
    if (!data || !Array.isArray(data) || !data.length) break
    out.push(...data)
    totalPages = tp || totalPages
    if (onPage) await onPage(data, page)
    page++
    if (Date.now() - startedAt > MAX_RUNTIME_MS) { warn('max-runtime reached, stopping pagination'); break }
    if (page > 500) break
  } while (page <= totalPages)
  return out
}

// ─────────────────────────── helpers ───────────────────────────
const stripHtml = (html = '') =>
  String(html).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&(#\d+);/g, ' ').replace(/\s+/g, ' ').trim()

const slugFrom = (v) => decodeURIComponent(String(v || '').replace(/\/$/, '').split('/').filter(Boolean).pop() || '')
const pathFromLink = (link) => {
  const m = String(link || '').match(/\/product-category\/(.+?)\/?$/)
  return m ? m[1].split('/').map(decodeURIComponent).join('/') : ''
}
// WooCommerce Store API returns integer minor units (1299 = ฿12.99)
const money = (prices) => Number(prices?.price || 0) / 10 ** Number(prices?.currency_minor_unit ?? 2)

/**
 * Watermarks are stored exactly as WordPress reports them (`modified`, site-local time) and sent
 * back verbatim, so comparisons always happen in the same timezone. --since=<ISO> overrides them,
 * which is what you use to re-run a window after fixing data.
 */
// ─────────────────────────── main ───────────────────────────
const conn = await mysql.createConnection({ ...dbConfig, multipleStatements: true })
log(`→ sync ${WP_BASE} → ${dbConfig.host}/${dbConfig.database}  (mode: ${report.mode}${DRY ? ', dry-run' : ''})`)

// 0) schema objects used by the sync (idempotent)
if (!DRY) {
  const migration = readFileSync(new URL('../database/migrations/001-sync.sql', import.meta.url), 'utf8')
  await conn.query(migration)
}

let runId = 0
if (!DRY) {
  const [ins] = await conn.query(
    `INSERT INTO import_runs (source, status, message) VALUES (?, 'running', ?)`,
    [WP_BASE, `delta sync (${report.mode})`]
  )
  runId = ins.insertId
}

async function getState(key) {
  if (DRY) return null
  const [rows] = await conn.query('SELECT `value` FROM sync_state WHERE `key` = ?', [key])
  return rows[0]?.value || null
}
async function setState(key, val) {
  if (DRY) return
  await conn.query(
    'INSERT INTO sync_state (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)',
    [key, String(val)]
  )
}

// ── 1) categories (small, always refreshed: names/parents change rarely but cheaply) ──
if (!ONLY_PRICES && !ONLY_CONTENT) {
  const raw = await paginate('/wp-json/wc/store/v1/products/categories')
  const cats = raw.map((c) => {
    const path = pathFromLink(c.permalink || c.link) || c.slug
    const parentPath = path.split('/').slice(0, -1).join('/')
    const parent = raw.find((p) => (pathFromLink(p.permalink || p.link) || p.slug) === parentPath)
    return {
      id: Number(c.id),
      slug: slugFrom(path),
      name: c.name,
      path,
      parent_id: parent ? Number(parent.id) : 0,
      count: Number(c.count ?? 0),
      description: stripHtml(c.description || ''),
      image: c.image?.src || null
    }
  })
  for (const c of cats.sort((a, b) => a.path.split('/').length - b.path.split('/').length)) {
    if (DRY) continue
    await conn.query(
      `INSERT INTO categories (id, parent_id, slug, path, name, description, image_url, sort_order, wp_count, product_count)
       VALUES (?,?,?,?,?,?,?,0,?,0)
       ON DUPLICATE KEY UPDATE parent_id=VALUES(parent_id), slug=VALUES(slug), path=VALUES(path),
         name=VALUES(name), description=VALUES(description), image_url=VALUES(image_url), wp_count=VALUES(wp_count)`,
      [c.id, c.parent_id, c.slug, c.path, c.name, c.description || null, c.image, c.count]
    )
  }
  report.categories = cats.length
  await setState('categories:synced', new Date().toISOString())
  log(`  ✔ categories: ${cats.length}`)
}

// ── 2) products + prices/stock/images via the WooCommerce Store API ──
let touchedProductIds = []
if (!ONLY_CONTENT) {
  const watermark = FULL ? null : await getState('products:modified')
  if (watermark) log(`  · previous watermark: ${watermark}`)
  const products = await paginate('/wp-json/wc/store/v1/products', async (items) => {
    for (const p of items) {
      touchedProductIds.push(Number(p.id))
      if (DRY) continue
      await conn.query(
        `INSERT INTO products (id, slug, name, sku, short_description, description, price, regular_price,
           currency, in_stock, is_featured, rating_avg, rating_count, wp_permalink, wp_status, is_published, wp_modified)
         VALUES (?,?,?,?,?,?,?,?,?,?,0,?,?,?,'publish',1,NOW())
         ON DUPLICATE KEY UPDATE slug=VALUES(slug), name=VALUES(name), sku=VALUES(sku),
           short_description=VALUES(short_description), description=VALUES(description),
           price=VALUES(price), regular_price=VALUES(regular_price), currency=VALUES(currency),
           in_stock=VALUES(in_stock), rating_avg=VALUES(rating_avg), rating_count=VALUES(rating_count),
           wp_permalink=VALUES(wp_permalink), wp_status='publish', is_published=1`,
        [
          Number(p.id), p.slug, p.name, p.sku || p.name,
          stripHtml(p.short_description || ''),
          p.description || p.short_description || '',
          money(p.prices), money({ ...p.prices, price: p.prices?.regular_price }),
          p.prices?.currency_code || 'THB',
          p.is_in_stock ? 1 : 0,
          Number(p.average_rating || 0), Number(p.review_count || 0), p.permalink || null
        ]
      )

      await conn.query('DELETE FROM product_categories WHERE product_id = ?', [Number(p.id)])
      for (const c of p.categories || []) {
        await conn.query('INSERT IGNORE INTO product_categories (product_id, category_id) VALUES (?,?)', [Number(p.id), Number(c.id)])
      }

      await conn.query('DELETE FROM product_images WHERE product_id = ?', [Number(p.id)])
      let pos = 0
      for (const img of p.images || []) {
        let url = img.src
        if (IMAGES && url && !url.startsWith('/')) {
          try {
            const res = await fetch(url, { headers: { 'user-agent': 'APH-Nuxt-Sync/1.0' }, signal: AbortSignal.timeout(60_000) })
            if (res.ok) {
              await mkdir(new URL('../public/images/products/', import.meta.url), { recursive: true })
              const file = `${p.slug}-${pos}${extname(new URL(url).pathname) || '.jpg'}`
              await pipeline(Readable.fromWeb(res.body), createWriteStream(new URL(`../public/images/products/${file}`, import.meta.url)))
              url = `/images/products/${file}`
              report.images++
            }
          } catch (err) { warn(`image ${img.src}: ${err.message}`) }
        }
        await conn.query(
          'INSERT INTO product_images (product_id, url, alt, position, wp_media_id) VALUES (?,?,?,?,?)',
          [Number(p.id), url, img.alt || p.name, pos++, img.id || null]
        )
      }
      report.products++
    }
  })
  log(`  ✔ products (price/stock/content): ${products.length}${IMAGES ? `, images: ${report.images}` : ''}`)
  report.watermarkBefore = watermark || null
}

// ── 3) incremental content pass (titles / descriptions / status) ──
if (!ONLY_PRICES) {
  const since = FULL ? null : value('since') || (await getState('products:modified')) || null
  const query = `/wp-json/wp/v2/product?_fields=id,slug,title,content,excerpt,modified&orderby=modified&order=asc${since ? `&modified_after=${encodeURIComponent(since)}` : ''}`
  const changed = await paginate(query)
  for (const p of changed) {
    if (DRY) continue
    await conn.query(
      `UPDATE products SET slug=?, name=?, short_description=?, description=?, wp_modified=?, wp_status='publish', is_published=1
       WHERE id=?`,
      [
        p.slug, stripHtml(p.title?.rendered || ''), stripHtml(p.excerpt?.rendered || ''),
        p.content?.rendered || '', p.modified ? p.modified.replace('T', ' ') : null, Number(p.id)
      ]
    )
  }
  log(`  ✔ product content changed since ${since || 'beginning'}: ${changed.length}`)
  if (!DRY && changed.length) {
    const last = changed[changed.length - 1].modified
    if (last) await setState('products:modified', last.replace('T', ' '))
  }
}

// ── 4) posts (news / articles) ──
if (!ONLY_PRICES) {
  const since = FULL ? null : value('since') || (await getState('posts:modified')) || null
  const changed = await paginate(`/wp-json/wp/v2/posts?_embed=1&orderby=modified&order=asc${since ? `&modified_after=${encodeURIComponent(since)}` : ''}`)
  for (const post of changed) {
    const media = post._embedded?.['wp:featuredmedia']?.[0]
    const kind = /news|กิจกรรม/i.test(post.title?.rendered || '') ? 'news' : 'article'
    if (DRY) continue
    await conn.query(
      `INSERT INTO posts (id, slug, title, excerpt, content, image_url, category, kind, is_published, published_at, wp_modified, wp_status)
       VALUES (?,?,?,?,?,?,?,?,1,?,?,'publish')
       ON DUPLICATE KEY UPDATE slug=VALUES(slug), title=VALUES(title), excerpt=VALUES(excerpt),
         content=VALUES(content), image_url=VALUES(image_url), kind=VALUES(kind),
         is_published=1, published_at=VALUES(published_at), wp_modified=VALUES(wp_modified), wp_status='publish'`,
      [
        Number(post.id), slugFrom(post.link), stripHtml(post.title?.rendered || ''),
        stripHtml(post.excerpt?.rendered || ''), post.content?.rendered || '',
        media?.source_url || null, null, kind,
        post.date ? post.date.replace('T', ' ') : null,
        post.modified ? post.modified.replace('T', ' ') : null
      ]
    )
    report.posts++
  }
  log(`  ✔ posts changed since ${since || 'beginning'}: ${changed.length}`)
  if (!DRY && changed.length) {
    const last = changed[changed.length - 1].modified
    if (last) await setState('posts:modified', last.replace('T', ' '))
  }
}

// ── 5) soft deletes: anything that vanished in WordPress becomes unpublished (never a 404 spike) ──
if (!DRY && !ONLY_PRICES) {
  const liveProductIds = (await paginate('/wp-json/wp/v2/product?_fields=id')).map((p) => Number(p.id))
  if (liveProductIds.length) {
    const [res] = await conn.query(
      `UPDATE products SET is_published = 0, wp_status = 'missing'
       WHERE is_published = 1 AND id NOT IN (${liveProductIds.map(() => '?').join(',')})`,
      liveProductIds
    )
    report.productsUnpublished = res.affectedRows || 0
  }
  const livePostIds = (await paginate('/wp-json/wp/v2/posts?_fields=id')).map((p) => Number(p.id))
  if (livePostIds.length) {
    const [res] = await conn.query(
      `UPDATE posts SET is_published = 0, wp_status = 'missing'
       WHERE is_published = 1 AND id NOT IN (${livePostIds.map(() => '?').join(',')})`,
      livePostIds
    )
    report.postsUnpublished = res.affectedRows || 0
  }

  // recompute category counters (parent categories include descendants, like WooCommerce)
  const [cats] = await conn.query('SELECT id, path FROM categories')
  for (const c of cats) {
    const [counts] = await conn.query(
      `SELECT COUNT(DISTINCT p.id) AS n FROM products p
       JOIN product_categories pc ON pc.product_id = p.id
       JOIN categories cc ON cc.id = pc.category_id
       WHERE p.is_published = 1 AND (cc.id = ? OR cc.path LIKE ?)`,
      [c.id, `${c.path}/%`]
    )
    await conn.query('UPDATE categories SET product_count = ? WHERE id = ?', [Number(counts[0]?.n || 0), c.id])
  }
  log(`  ✔ soft-deleted: ${report.productsUnpublished} products, ${report.postsUnpublished} posts`)
}

// ── 6) finish ──
report.durationMs = Date.now() - startedAt
const failed = report.errors.length > 0
if (!DRY) {
  await conn.query(
    `UPDATE import_runs SET finished_at = NOW(), products = ?, posts = ?, status = ?, message = ? WHERE id = ?`,
    [report.products, report.posts, failed ? 'failed' : 'ok', JSON.stringify({ mode: report.mode, warnings: report.warnings.length, durationMs: report.durationMs }), runId]
  )
  await setState('sync:last_run', new Date().toISOString())
  await setState('sync:last_status', failed ? 'failed' : 'ok')
}
await conn.end()

if (JSON_OUT) {
  console.log(JSON.stringify(report, null, 2))
} else {
  log(`✔ sync finished in ${(report.durationMs / 1000).toFixed(1)}s`)
}
process.exit(failed ? 1 : report.warnings.length ? 2 : 0)
