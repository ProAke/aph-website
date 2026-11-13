#!/usr/bin/env node
/**
 * Clones the live WordPress/WooCommerce catalogue of aph-ita.co.th into MariaDB.
 *
 *   npm run import:wp                      # products + categories + posts
 *   npm run import:wp -- --images          # also mirrors product images to public/images/products
 *   npm run import:wp -- --dump-json       # also rewrites server/data/catalog.json snapshot
 *   WP_BASE=https://staging.example.com npm run import:wp
 *
 * Uses the public WooCommerce Store API (/wp-json/wc/store/v1) and the WP REST API,
 * so no application passwords are required. Re-running is safe: rows are upserted.
 */
import mysql from 'mysql2/promise'
import { mkdir, writeFile } from 'node:fs/promises'
import { createWriteStream, existsSync } from 'node:fs'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { extname, join } from 'node:path'
import { dbConfig, WP_BASE } from './env.mjs'

const args = process.argv.slice(2)
const DOWNLOAD_IMAGES = args.includes('--images')
const DUMP_JSON = args.includes('--dump-json')
const PER_PAGE = 100
const IMG_DIR = new URL('../public/images/products/', import.meta.url)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function api(path, { retries = 4 } = {}) {
  const url = path.startsWith('http') ? path : `${WP_BASE}${path}`
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'user-agent': 'APH-Nuxt-Migrator/1.0', accept: 'application/json' }
      })
      if (res.status === 404) return { data: null, total: 0, totalPages: 0 }
      if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`)
      const totalPages = Number(res.headers.get('x-wp-totalpages') || 0)
      const total = Number(res.headers.get('x-wp-total') || 0)
      return { data: await res.json(), total, totalPages }
    } catch (err) {
      if (attempt === retries) throw err
      const wait = 500 * 2 ** attempt
      console.warn(`  ! ${err.message} — retry in ${wait}ms`)
      await sleep(wait)
    }
  }
}

async function paginate(path, { onPage } = {}) {
  const out = []
  let page = 1
  let totalPages = 1
  do {
    const sep = path.includes('?') ? '&' : '?'
    const { data, totalPages: tp } = await api(`${path}${sep}per_page=${PER_PAGE}&page=${page}`)
    if (!data || !Array.isArray(data) || !data.length) break
    out.push(...data)
    totalPages = tp || totalPages
    if (onPage) await onPage(data, page, totalPages)
    console.log(`  · ${path.split('?')[0]} page ${page}/${totalPages || '?'} (${out.length} items)`)
    page++
    if (page > 200) break
  } while (page <= totalPages)
  return out
}

// WooCommerce Store API returns integer minor units (1299 = ฿12.99)
const money = (prices, key = 'price') => Number(prices?.[key] || 0) / 10 ** Number(prices?.currency_minor_unit ?? 2)

const stripHtml = (html = '') =>
  html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()

const slugFrom = (value) => decodeURIComponent(String(value || '').replace(/\/$/, '').split('/').filter(Boolean).pop() || '')
const pathFromLink = (link) => {
  const m = String(link || '').match(/\/product-category\/(.+?)\/?$/)
  return m ? m[1].split('/').map(decodeURIComponent).join('/') : ''
}

async function main() {
  console.log(`→ source: ${WP_BASE}`)
  const conn = await mysql.createConnection(dbConfig)
  await conn.query(
    `INSERT INTO import_runs (source, status, message) VALUES (?, 'running', ?)`,
    [WP_BASE, 'initial import']
  )
  const [[runRow]] = await conn.query('SELECT LAST_INSERT_ID() AS id')
  console.log(`  import run #${runRow.id}`)

  // ---------- categories ----------
  console.log('→ categories')
  const rawCats = await paginate('/wp-json/wc/store/v1/products/categories')
  const cats = rawCats.map((c) => {
    const path = pathFromLink(c.permalink || c.link) || c.slug
    const parentPath = path.split('/').slice(0, -1).join('/')
    const parent = rawCats.find((p) => (pathFromLink(p.permalink || p.link) || p.slug) === parentPath)
    return {
      id: Number(c.id),
      slug: slugFrom(path),
      name: c.name,
      path,
      parent_id: parent ? Number(parent.id) : 0,
      count: Number(c.count ?? c.product_count ?? 0),
      description: stripHtml(c.description || ''),
      image: c.image?.src || null
    }
  })
  cats.sort((a, b) => a.path.split('/').length - b.path.split('/').length)
  for (const c of cats) {
    await conn.execute(
      `INSERT INTO categories (id, parent_id, slug, name, description, image_url, sort_order, product_count)
       VALUES (?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE parent_id=VALUES(parent_id), slug=VALUES(slug), name=VALUES(name),
         description=VALUES(description), image_url=VALUES(image_url), product_count=VALUES(product_count)`,
      [c.id, c.parent_id, c.slug, c.name, c.description || null, c.image, 0, c.count]
    )
  }
  console.log(`  ✔ ${cats.length} categories`)

  // ---------- products ----------
  console.log('→ products')
  await mkdir(IMG_DIR, { recursive: true })
  let productCount = 0
  let imageCount = 0

  await paginate('/wp-json/wc/store/v1/products', {
    onPage: async (items) => {
      for (const p of items) {
        await conn.execute(
          `INSERT INTO products (id, slug, name, sku, short_description, description, price, regular_price,
             currency, in_stock, is_featured, rating_avg, rating_count, wp_permalink)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
           ON DUPLICATE KEY UPDATE slug=VALUES(slug), name=VALUES(name), sku=VALUES(sku),
             short_description=VALUES(short_description), description=VALUES(description),
             price=VALUES(price), regular_price=VALUES(regular_price), currency=VALUES(currency),
             in_stock=VALUES(in_stock), is_featured=VALUES(is_featured),
             rating_avg=VALUES(rating_avg), rating_count=VALUES(rating_count), wp_permalink=VALUES(wp_permalink)`,
          [
            Number(p.id), p.slug, p.name, p.sku || p.name,
            stripHtml(p.short_description || ''),
            p.description || p.short_description || '',
            money(p.prices, 'price'), money(p.prices, 'regular_price'),
            p.prices?.currency_code || 'THB',
            p.is_in_stock ? 1 : 0, p.on_sale ? 1 : 0,
            Number(p.average_rating || 0), Number(p.review_count || 0), p.permalink || null
          ]
        )
        productCount++

        await conn.execute('DELETE FROM product_categories WHERE product_id = ?', [Number(p.id)])
        for (const c of p.categories || []) {
          const cat = cats.find((x) => Number(x.id) === Number(c.id))
          if (!cat) continue
          await conn.execute(
            'INSERT IGNORE INTO product_categories (product_id, category_id) VALUES (?,?)',
            [Number(p.id), Number(c.id)]
          )
        }

        await conn.execute('DELETE FROM product_images WHERE product_id = ?', [Number(p.id)])
        let pos = 0
        for (const img of p.images || []) {
          let url = img.src
          if (DOWNLOAD_IMAGES && url) {
            try {
              const res = await fetch(url, { headers: { 'user-agent': 'APH-Nuxt-Migrator/1.0' } })
              if (res.ok) {
                const ext = extname(new URL(url).pathname) || '.jpg'
                const file = `${p.slug}-${pos}${ext}`
                await pipeline(Readable.fromWeb(res.body), createWriteStream(new URL(file, IMG_DIR)))
                url = `/images/products/${file}`
                imageCount++
              }
            } catch (err) {
              console.warn(`  ! image ${img.src}: ${err.message}`)
            }
          }
          await conn.execute(
            'INSERT INTO product_images (product_id, url, alt, position, wp_media_id) VALUES (?,?,?,?,?)',
            [Number(p.id), url, img.alt || p.name, pos++, img.id || null]
          )
        }
      }
    }
  })
  console.log(`  ✔ ${productCount} products, ${imageCount} images mirrored`)

  // ---------- posts ----------
  console.log('→ posts')
  const posts = await paginate('/wp-json/wp/v2/posts?_embed=1')
  for (const post of posts) {
    const media = post._embedded?.['wp:featuredmedia']?.[0]
    const kind = /news|กิจกรรม/i.test(post.title?.rendered || '') ? 'news' : 'article'
    await conn.execute(
      `INSERT INTO posts (id, slug, title, excerpt, content, image_url, category, kind, published_at)
       VALUES (?,?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE slug=VALUES(slug), title=VALUES(title), excerpt=VALUES(excerpt),
         content=VALUES(content), image_url=VALUES(image_url), category=VALUES(category),
         kind=VALUES(kind), published_at=VALUES(published_at)`,
      [
        Number(post.id), slugFrom(post.link), stripHtml(post.title?.rendered || ''),
        stripHtml(post.excerpt?.rendered || ''), post.content?.rendered || '',
        media?.source_url || null, null, kind,
        post.date ? post.date.replace('T', ' ') : null
      ]
    )
  }
  console.log(`  ✔ ${posts.length} posts`)

  // ---------- optional JSON snapshot ----------
  if (DUMP_JSON) {
    const [rows] = await conn.query(
      `SELECT p.*, (SELECT url FROM product_images i WHERE i.product_id = p.id ORDER BY position LIMIT 1) AS image
       FROM products p WHERE p.is_published = 1`
    )
    const [catRows] = await conn.query('SELECT * FROM categories')
    const outFile = new URL('../server/data/catalog-imported.json', import.meta.url)
    await writeFile(outFile, JSON.stringify({ generated_at: new Date().toISOString(), source: WP_BASE, categories: catRows, products: rows }, null, 0))
    console.log('  ✔ snapshot written to server/data/catalog-imported.json')
  }

  await conn.execute(
    `UPDATE import_runs SET finished_at = NOW(), products = ?, posts = ?, status = 'ok', message = ? WHERE id = ?`,
    [productCount, posts.length, `${cats.length} categories`, runRow.id]
  )
  await conn.end()
  console.log('✔ import finished')
}

main().catch((err) => {
  console.error('✖ import failed:', err)
  process.exit(1)
})
