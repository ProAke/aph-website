#!/usr/bin/env node
/**
 * Builds the shipping dataset used by the Nuxt app (server/data/catalog.json)
 * and a plain MariaDB dump (database/seed.sql) from the harvested WP files:
 *   database/seed/categories.txt  id|parent|slug|name|sort
 *   database/seed/products.txt    id|slug|name|cat_ids|media_id|image_override
 *   database/seed/media.txt       id|source_url
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { site, heroSlides, serviceBlocks, catalogs, posts, dealers, categoryCopy } from './content.mjs'

const read = (f) => readFileSync(new URL(`../database/seed/${f}`, import.meta.url), 'utf8')
  .split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))

const DATA_SHEET = {
  xlr: 'Amphenol_XLR_3.pdf',
  loudspeaker: 'Amphenol_Loader_speaker.pdf',
  power: 'Amphenol_Power_Cable-Connector_Mounts.pdf',
  ethernet: 'Amphenol_Ethernet_Cable_Connectors.pdf',
  '1-4-3-5mm': 'Amphenol_Phone_1-4And3.5mm_accessories.pdf',
  rca: 'Amphenol_RCA.pdf',
  'mini-xlr': 'Amphenol_Mini_XLR_1.pdf',
  multipin: 'Amphenol_multipin.pdf',
  data: 'Amphenol_USB.pdf',
  dante: 'Amphenol_Dante.pdf'
}
const PDF_BASE = 'https://www.aph-ita.co.th/wp-content/uploads/2026/03/'

// ---------- media ----------
const media = new Map(read('media.txt').map((l) => { const [id, url] = l.split('|'); return [Number(id), url] }))

// ---------- categories ----------
const categories = read('categories.txt').map((l) => {
  const [id, parent, slug, name, sort] = l.split('|')
  return {
    id: Number(id), parent_id: Number(parent), slug, name,
    sort_order: Number(sort || 0), description: '', image_url: null, product_count: 0
  }
})
const catById = new Map(categories.map((c) => [c.id, c]))
const catPath = (id) => {
  const parts = []
  let cur = catById.get(id)
  while (cur) { parts.unshift(cur.slug); cur = catById.get(cur.parent_id) }
  return parts.join('/')
}
for (const c of categories) {
  c.path = catPath(c.id)
  c.depth = c.path.split('/').length - 1
  const copy = categoryCopy[c.slug] || categoryCopy[catPath(c.id).split('/')[0]]
  c.description = copy?.summary || ''
  c.bullets = copy?.bullets || []
}

// ---------- products ----------
const pickImage = (slug, name) => `${site.sourceSite}/wp-content/uploads/2026/08/${name}.jpg`

const products = read('products.txt').map((line, idx) => {
  const [id, slug, name, cats, mediaId, override] = line.split('|')
  const catIds = cats.split(',').map(Number)
  const primary = catById.get(catIds[0])
  const rootSlug = catPath(catIds[0]).split('/')[0]
  const copy = categoryCopy[rootSlug] || {}
  const image = override || media.get(Number(mediaId)) || null
  const sku = name.includes(' – ') ? name.split(' – ').pop().trim() : name.trim()
  const bullets = (copy.bullets || []).map((b) => `<li>${b}</li>`).join('')
  const series = primary ? primary.name : ''
  return {
    id: Number(id),
    slug,
    name: name.trim(),
    sku,
    series,
    short_description: copy.summary ? copy.summary.slice(0, 180) + '…' : `สินค้า ${name} จาก Amphenol`,
    description:
      `<p>${copy.summary || ''}</p>` +
      (series ? `<p><strong>ซีรีส์:</strong> ${series}</p>` : '') +
      (bullets ? `<h3>คุณสมบัติเด่น</h3><ul>${bullets}</ul>` : '') +
      `<p class="muted">ข้อมูลเพิ่มเติมและแบบวาด (Drawing) / ไฟล์ 3D: ${sku} — ดูได้จากแคตตาล็อกสินค้าด้านล่าง</p>`,
    price: 0,
    currency: 'THB',
    in_stock: true,
    is_featured: idx % 6 === 0 || ['ac3fa', 'ac3fah', 'sp-4-mdvt-8', 'rjd2203-0050', 'xlrnet-ip65-range-vuueb', 'hpt-3-mdw'].includes(slug),
    images: image ? [{ url: image, alt: name.trim(), position: 0 }] : [],
    category_ids: catIds,
    root_category: rootSlug,
    datasheet_url: DATA_SHEET[rootSlug] ? PDF_BASE + DATA_SHEET[rootSlug] : null,
    wp_permalink: `${site.sourceSite}/product/${slug}/`
  }
})

// direct + descendant counts
const descendants = (id) => categories.filter((c) => c.id !== id && c.path.startsWith(catById.get(id).path + '/')).map((c) => c.id)
for (const c of categories) {
  const ids = new Set([c.id, ...descendants(c.id)])
  c.product_count = products.filter((p) => p.category_ids.some((id) => ids.has(id))).length
}

// ---------- posts / banners ----------
const banners = {
  hero: heroSlides.map((s, i) => ({ ...s, sort_order: i })),
  service: serviceBlocks.map((s, i) => ({ ...s, sort_order: i })),
  promo: [
    { title: 'สินค้าแนะนำ', subtitle: 'แคตตาล็อก Amphenol ครบทุกกลุ่มสินค้า', image: `${site.sourceSite}/wp-content/uploads/2026/08/bg_block.png`, link: '/catalogs', linkLabel: 'ดาวน์โหลดแคตตาล็อก' },
    { title: 'Amphenol Dante', subtitle: 'AMPHENOL AMPHE-DANTE ADAPTERS — Professional 1-Channel & 2-Channel Dante Audio Solutions', image: `${site.sourceSite}/wp-content/uploads/2026/08/Amphenol_Date-scaled.jpeg`, link: '/product-category/dante', linkLabel: 'ดูข้อมูลเพิ่มเติม' }
  ]
}

const dataset = {
  generated_at: new Date().toISOString(),
  source: site.sourceSite,
  site,
  categories,
  products,
  posts,
  banners,
  catalogs: catalogs.map((c, i) => ({ ...c, sort_order: i })),
  dealers
}

writeFileSync(new URL('../server/data/catalog.json', import.meta.url), JSON.stringify(dataset, null, 0))

// ---------- SQL dump ----------
const q = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/\\/g, '\\\\').replace(/'/g, "''")}'`)
const out = []
out.push('-- APH Interactive — MariaDB seed generated from https://www.aph-ita.co.th')
out.push(`-- generated: ${dataset.generated_at}`)
out.push('SET NAMES utf8mb4;')
out.push('SET FOREIGN_KEY_CHECKS = 0;')
for (const t of ['order_items', 'orders', 'product_images', 'product_categories', 'products', 'categories', 'posts', 'banners', 'catalogs', 'dealers']) out.push(`TRUNCATE TABLE \`${t}\`;`)
out.push('SET FOREIGN_KEY_CHECKS = 1;')

for (const c of categories) {
  out.push(`INSERT INTO categories (id,parent_id,slug,name,description,sort_order,product_count) VALUES (${c.id},${c.parent_id},${q(c.slug)},${q(c.name)},${q(c.description)},${c.sort_order},${c.product_count});`)
}
for (const p of products) {
  out.push(`INSERT INTO products (id,slug,name,sku,short_description,description,price,regular_price,currency,in_stock,is_featured,datasheet_url,wp_permalink) VALUES (${p.id},${q(p.slug)},${q(p.name)},${q(p.sku)},${q(p.short_description)},${q(p.description)},${p.price},${p.price},'THB',1,${p.is_featured ? 1 : 0},${q(p.datasheet_url)},${q(p.wp_permalink)});`)
  for (const cid of p.category_ids) out.push(`INSERT INTO product_categories (product_id,category_id) VALUES (${p.id},${cid});`)
  p.images.forEach((img, i) => out.push(`INSERT INTO product_images (product_id,url,alt,position) VALUES (${p.id},${q(img.url)},${q(img.alt)},${i});`))
}
for (const p of posts) out.push(`INSERT INTO posts (id,slug,title,excerpt,image_url,category,kind,published_at) VALUES (${p.id},${q(p.slug)},${q(p.title)},${q(p.excerpt)},${q(p.image)},${q(p.category)},${q(p.kind)},${q(p.published_at)});`)
let bid = 0
for (const [slot, list] of Object.entries(banners)) for (const b of list) out.push(`INSERT INTO banners (id,slot,title,subtitle,image_url,link_url,link_label,sort_order) VALUES (${++bid},'${slot}',${q(b.title)},${q(b.subtitle)},${q(b.image)},${q(b.link)},${q(b.linkLabel)},${b.sort_order || 0});`)
catalogs.forEach((c, i) => out.push(`INSERT INTO catalogs (title,series,image_url,file_url,sort_order) VALUES (${q(c.title)},${q(c.series)},${q(c.image)},${q(c.file)},${i});`))
for (const d of dealers) out.push(`INSERT INTO dealers (name,province,region,phone,address) VALUES (${q(d.name)},${q(d.province)},${q(d.region)},${q(d.phone)},${q(d.address)});`)
writeFileSync(new URL('../database/seed.sql', import.meta.url), out.join('\n') + '\n')

console.log(`✔ catalog.json  products=${products.length} categories=${categories.length} posts=${posts.length}`)
console.log(`✔ seed.sql      statements=${out.length}`)
const noImg = products.filter((p) => !p.images.length)
console.log(`  products without image: ${noImg.length}${noImg.length ? ' (' + noImg.slice(0, 5).map((p) => p.slug).join(', ') + '…)' : ''}`)
