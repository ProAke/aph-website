import { execute, query } from './db'
import type {
  Banner, Catalog, CategoryNode, CategoryRef, Dealer, OrderPayload, Paginated,
  Post, ProductCard, ProductDetail, ProductQuery, Store
} from './types'

type Row = Record<string, any>

let catCache: { at: number; rows: Row[] } = { at: 0, rows: [] }

async function allCategories(): Promise<Row[]> {
  if (Date.now() - catCache.at < 30_000 && catCache.rows.length) return catCache.rows
  const rows = await query(
    'SELECT id, parent_id, slug, name, description, product_count, sort_order FROM categories ORDER BY parent_id, sort_order, name'
  )
  catCache = { at: Date.now(), rows }
  return rows
}

function pathOf(id: number, rows: Row[]): string {
  const byId = new Map(rows.map((r) => [r.id, r]))
  const parts: string[] = []
  let cur = byId.get(id)
  while (cur) {
    parts.unshift(cur.slug)
    cur = byId.get(cur.parent_id)
  }
  return parts.join('/')
}

function buildTree(rows: Row[]): CategoryNode[] {
  const nodes = new Map<number, CategoryNode>()
  for (const r of rows) {
    nodes.set(r.id, {
      id: r.id, parentId: r.parent_id, slug: r.slug, name: r.name, path: pathOf(r.id, rows),
      depth: pathOf(r.id, rows).split('/').length - 1,
      description: r.description || null, productCount: Number(r.product_count || 0), children: []
    })
  }
  const roots: CategoryNode[] = []
  for (const n of nodes.values()) {
    if (n.parentId && nodes.has(n.parentId)) nodes.get(n.parentId)!.children.push(n)
    else roots.push(n)
  }
  for (const n of nodes.values()) n.children.sort((a, b) => a.id - b.id)
  return roots
}

async function categoryIdSet(path: string): Promise<{ ids: number[]; cat: Row | null }> {
  const rows = await allCategories()
  const cat = rows.find((r) => pathOf(r.id, rows) === path) || null
  if (!cat) return { ids: [], cat: null }
  const base = pathOf(cat.id, rows)
  const ids = rows.filter((r) => r.id === cat.id || pathOf(r.id, rows).startsWith(base + '/')).map((r) => r.id)
  return { ids, cat }
}

const cardSelect = `
  SELECT p.id, p.slug, p.name, p.sku, p.price, p.currency, p.in_stock, p.is_featured,
         p.short_description, p.created_at,
         (SELECT url FROM product_images i WHERE i.product_id = p.id ORDER BY i.position, i.id LIMIT 1) AS image_url
  FROM products p`

async function attachCategories(cards: ProductCard[]): Promise<ProductCard[]> {
  if (!cards.length) return cards
  const rows = await allCategories()
  const maps = await query(
    `SELECT pc.product_id, c.id, c.slug, c.name FROM product_categories pc
     JOIN categories c ON c.id = pc.category_id
     WHERE pc.product_id IN (${cards.map(() => '?').join(',')})`,
    cards.map((c) => c.id)
  )
  const byProduct = new Map<number, CategoryRef[]>()
  for (const m of maps) {
    const list = byProduct.get(m.product_id) || []
    list.push({ slug: m.slug, name: m.name, path: pathOf(m.id, rows) })
    byProduct.set(m.product_id, list)
  }
  for (const card of cards) card.categories = byProduct.get(card.id) || []
  return cards
}

const toCard = (r: Row): ProductCard => ({
  id: r.id, slug: r.slug, name: r.name, sku: r.sku, series: null,
  price: Number(r.price || 0), currency: r.currency || 'THB',
  inStock: !!r.in_stock, isFeatured: !!r.is_featured,
  image: r.image_url || null, categories: [], shortDescription: r.short_description || null
})

const ORDER: Record<string, string> = {
  'newest': 'p.id DESC',
  'name-asc': 'p.name ASC',
  'name-desc': 'p.name DESC',
  'price-asc': 'p.price ASC, p.id DESC',
  'price-desc': 'p.price DESC, p.id DESC'
}

export const sqlStore: Store = {
  name: 'db',

  async categoriesTree() {
    return buildTree(await allCategories())
  },

  async categoryByPath(path: string) {
    const find = (nodes: CategoryNode[]): CategoryNode | null => {
      for (const n of nodes) {
        if (n.path === path) return n
        const hit = find(n.children)
        if (hit) return hit
      }
      return null
    }
    return find(await this.categoriesTree())
  },

  async listProducts(q: ProductQuery): Promise<Paginated<ProductCard>> {
    const page = Math.max(1, q.page || 1)
    const perPage = Math.min(96, Math.max(1, q.perPage || 24))
    const where: string[] = ['p.is_published = 1']
    const params: unknown[] = []

    if (q.categoryPath) {
      const { ids } = await categoryIdSet(q.categoryPath)
      if (!ids.length) return { items: [], total: 0, page, perPage, totalPages: 1 }
      where.push(`EXISTS (SELECT 1 FROM product_categories pc WHERE pc.product_id = p.id AND pc.category_id IN (${ids.map(() => '?').join(',')}))`)
      params.push(...ids)
    }
    if (q.featured) where.push('p.is_featured = 1')
    if (q.inStock) where.push('p.in_stock = 1')
    if (q.search) {
      const terms = q.search.trim().split(/\s+/).slice(0, 6)
      for (const t of terms) {
        where.push('(p.name LIKE ? OR p.sku LIKE ? OR p.short_description LIKE ?)')
        params.push(`%${t}%`, `%${t}%`, `%${t}%`)
      }
    }

    const whereSql = 'WHERE ' + where.join(' AND ')
    const countRows = await query<Row>(`SELECT COUNT(*) AS total FROM products p ${whereSql}`, params)
    const total = Number(countRows[0]?.total || 0)
    const rows = await query<Row>(
      `${cardSelect} ${whereSql} ORDER BY ${ORDER[q.sort || 'newest'] || ORDER.newest} LIMIT ? OFFSET ?`,
      [...params, perPage, (page - 1) * perPage]
    )
    const items = await attachCategories(rows.map(toCard))
    return { items, total, page, perPage, totalPages: Math.max(1, Math.ceil(total / perPage)) }
  },

  async productBySlug(slug: string) {
    const rows = await query<Row>(
      `SELECT p.*, (SELECT url FROM product_images i WHERE i.product_id = p.id ORDER BY i.position, i.id LIMIT 1) AS image_url
       FROM products p WHERE p.slug = ? AND p.is_published = 1 LIMIT 1`,
      [slug]
    )
    if (!rows.length) return null
    const r = rows[0]
    const images = await query<Row>('SELECT url FROM product_images WHERE product_id = ? ORDER BY position, id', [r.id])
    const [card] = await attachCategories([toCard(r)])
    const product: ProductDetail = {
      ...card,
      description: r.description || null,
      images: images.map((i) => i.url),
      datasheetUrl: r.datasheet_url || null,
      wpPermalink: r.wp_permalink || null,
      specs: { SKU: r.sku, Series: card.categories[0]?.name || '' } as Record<string, string>
    }
    return product
  },

  async relatedProducts(p: ProductDetail, limit = 5) {
    const catIds = p.categories.length
      ? (await allCategories()).filter((c) => p.categories.some((ref) => ref.slug === c.slug)).map((c) => c.id)
      : []
    if (!catIds.length) return []
    const rows = await query<Row>(
      `${cardSelect}
       WHERE p.is_published = 1 AND p.id <> ?
         AND EXISTS (SELECT 1 FROM product_categories pc WHERE pc.product_id = p.id AND pc.category_id IN (${catIds.map(() => '?').join(',')}))
       ORDER BY p.id DESC LIMIT ?`,
      [p.id, ...catIds, limit]
    )
    return attachCategories(rows.map(toCard))
  },

  async posts(opts: { kind?: 'news' | 'article'; limit?: number } = {}) {
    const where = opts.kind ? 'WHERE kind = ?' : ''
    const params: unknown[] = opts.kind ? [opts.kind] : []
    const rows = await query<Row>(
      `SELECT id, slug, title, excerpt, image_url, category, kind, published_at, content FROM posts ${where}
       ORDER BY published_at DESC ${opts.limit ? 'LIMIT ' + Number(opts.limit) : ''}`,
      params
    )
    return rows.map((p): Post => ({
      id: p.id, slug: p.slug, title: p.title, excerpt: p.excerpt, content: p.content,
      image: p.image_url, category: p.category, kind: p.kind, publishedAt: p.published_at
    }))
  },

  async postBySlug(slug: string) {
    const rows = await query<Row>('SELECT * FROM posts WHERE slug = ? LIMIT 1', [slug])
    if (!rows.length) return null
    const p = rows[0]
    return {
      id: p.id, slug: p.slug, title: p.title, excerpt: p.excerpt, content: p.content,
      image: p.image_url, category: p.category, kind: p.kind, publishedAt: p.published_at
    } as Post
  },

  async catalogs(): Promise<Catalog[]> {
    const rows = await query<Row>('SELECT title, series, image_url, file_url FROM catalogs ORDER BY sort_order, id')
    return rows.map((c) => ({ title: c.title, series: c.series, image: c.image_url, file: c.file_url }))
  },

  async dealers(): Promise<Dealer[]> {
    const rows = await query<Row>('SELECT name, province, region, phone, address FROM dealers ORDER BY region, name')
    return rows.map((d) => ({ name: d.name, province: d.province, region: d.region, phone: d.phone, address: d.address }))
  },

  async banners() {
    const rows = await query<Row>('SELECT * FROM banners WHERE is_active = 1 ORDER BY slot, sort_order, id')
    const map = (b: Row): Banner => ({
      title: b.title, subtitle: b.subtitle, image: b.image_url,
      link: b.link_url, linkLabel: b.link_label || 'ดูรายละเอียด', sort_order: b.sort_order
    })
    return {
      hero: rows.filter((r) => r.slot === 'hero').map(map),
      promo: rows.filter((r) => r.slot === 'promo').map(map),
      service: rows.filter((r) => r.slot === 'service').map(map)
    }
  },

  async createOrder(payload: OrderPayload) {
    const code = 'APH' + Date.now().toString().slice(-9)
    const subtotal = payload.items.reduce((s, i) => s + i.price * i.qty, 0)
    await execute(
      `INSERT INTO orders (code, customer_name, email, phone, address, note, subtotal, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [code, payload.customerName, payload.email || null, payload.phone, payload.address || null, payload.note || null, subtotal]
    )
    const [row] = await query<Row>('SELECT id FROM orders WHERE code = ?', [code])
    for (const item of payload.items) {
      await execute(
        `INSERT INTO order_items (order_id, product_id, product_name, sku, qty, unit_price) VALUES (?, ?, ?, ?, ?, ?)`,
        [row.id, item.productId || null, item.name, item.sku || null, item.qty, item.price]
      )
    }
    return { code, stored: true }
  }
}
