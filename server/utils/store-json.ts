import dataset from '../data/catalog.json'
import type {
  Banner, Catalog, CategoryNode, CategoryRef, Dealer, OrderPayload, Paginated,
  Post, ProductCard, ProductDetail, ProductQuery, Store
} from './types'

type Row = Record<string, any>
const data = dataset as unknown as {
  site: Row; categories: Row[]; products: Row[]; posts: Row[]
  banners: { hero: Row[]; promo: Row[]; service: Row[] }; catalogs: Row[]; dealers: Row[]
}

const catById = new Map<number, Row>(data.categories.map((c) => [c.id, c]))
const descendantsOf = (id: number): number[] => {
  const base = catById.get(id)?.path
  if (!base) return [id]
  return data.categories.filter((c) => c.path === base || String(c.path).startsWith(base + '/')).map((c) => c.id)
}

function buildTree(): CategoryNode[] {
  const nodes = new Map<number, CategoryNode>()
  for (const c of data.categories) {
    nodes.set(c.id, {
      id: c.id, parentId: c.parent_id, slug: c.slug, name: c.name, path: c.path, depth: c.depth,
      description: c.description || null, productCount: c.product_count || 0, children: []
    })
  }
  const roots: CategoryNode[] = []
  for (const node of nodes.values()) {
    if (node.parentId && nodes.has(node.parentId)) nodes.get(node.parentId)!.children.push(node)
    else roots.push(node)
  }
  roots.sort((a, b) => a.id - b.id)
  for (const n of nodes.values()) n.children.sort((a, b) => a.id - b.id)
  return roots
}

const catRefs = (p: Row): CategoryRef[] =>
  (p.category_ids as number[]).map((id) => catById.get(id)).filter(Boolean)
    .map((c: Row) => ({ slug: c.slug, name: c.name, path: c.path }))

function toCard(p: Row): ProductCard {
  return {
    id: p.id, slug: p.slug, name: p.name, sku: p.sku || null, series: p.series || null,
    price: Number(p.price || 0), currency: p.currency || 'THB',
    inStock: !!p.in_stock, isFeatured: !!p.is_featured,
    image: p.images?.[0]?.url || null, categories: catRefs(p),
    shortDescription: p.short_description || null
  }
}

function toDetail(p: Row): ProductDetail {
  return {
    ...toCard(p),
    description: p.description || null,
    images: (p.images || []).map((i: Row) => i.url),
    datasheetUrl: p.datasheet_url || null,
    wpPermalink: p.wp_permalink || null,
    specs: { SKU: p.sku, Series: p.series, ...(p.specs || {}) } as Record<string, string>
  }
}

const matchPath = (p: Row, path: string) => {
  const cat = data.categories.find((c) => c.path === path)
  if (!cat) return false
  const ids = new Set(descendantsOf(cat.id))
  return (p.category_ids as number[]).some((id) => ids.has(id))
}

const norm = (s: string) => s.toLowerCase().trim()

export const jsonStore: Store = {
  name: 'json',

  async categoriesTree() {
    return buildTree()
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
    let rows = data.products.slice()

    if (q.categoryPath) rows = rows.filter((p) => matchPath(p, q.categoryPath!))
    if (q.featured) rows = rows.filter((p) => p.is_featured)
    if (q.inStock) rows = rows.filter((p) => p.in_stock)
    if (q.search) {
      const terms = norm(q.search).split(/\s+/).filter(Boolean)
      rows = rows.filter((p) => {
        const hay = norm([p.name, p.sku, p.series, p.short_description].filter(Boolean).join(' '))
        return terms.every((t) => hay.includes(t))
      })
    }
    switch (q.sort) {
      case 'name-asc': rows.sort((a, b) => a.name.localeCompare(b.name)); break
      case 'name-desc': rows.sort((a, b) => b.name.localeCompare(a.name)); break
      case 'price-asc': rows.sort((a, b) => a.price - b.price || b.id - a.id); break
      case 'price-desc': rows.sort((a, b) => b.price - a.price || b.id - a.id); break
      default: rows.sort((a, b) => b.id - a.id)
    }

    const total = rows.length
    const start = (page - 1) * perPage
    return {
      items: rows.slice(start, start + perPage).map(toCard),
      total, page, perPage, totalPages: Math.max(1, Math.ceil(total / perPage))
    }
  },

  async productBySlug(slug: string) {
    const row = data.products.find((p) => p.slug === slug)
    return row ? toDetail(row) : null
  },

  async productById(id: number) {
    const row = data.products.find((p) => p.id === id)
    return row ? toDetail(row) : null
  },

  async relatedProducts(p: ProductDetail, limit = 5) {
    const row = data.products.find((r) => r.id === p.id)
    if (!row) return []
    const ids = new Set(row.category_ids as number[])
    const scored = data.products
      .filter((r) => r.id !== row.id)
      .map((r) => ({ r, score: (r.category_ids as number[]).filter((id) => ids.has(id)).length }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || b.r.id - a.r.id)
    return scored.slice(0, limit).map((x) => toCard(x.r))
  },

  async posts(opts: { kind?: 'news' | 'article'; limit?: number } = {}) {
    let rows = data.posts.slice()
    if (opts.kind) rows = rows.filter((p) => p.kind === opts.kind)
    rows.sort((a, b) => String(b.published_at).localeCompare(String(a.published_at)))
    if (opts.limit) rows = rows.slice(0, opts.limit)
    return rows.map((p): Post => ({
      id: p.id, slug: p.slug, title: p.title, excerpt: p.excerpt, content: null,
      image: p.image, category: p.category, kind: p.kind, publishedAt: p.published_at
    }))
  },

  async postBySlug(slug: string) {
    const list = await this.posts()
    return list.find((p) => p.slug === slug) || null
  },

  async catalogs(): Promise<Catalog[]> {
    return data.catalogs.map((c) => ({ title: c.title, series: c.series, image: c.image, file: c.file }))
  },

  async dealers(): Promise<Dealer[]> {
    return data.dealers.map((d) => ({ name: d.name, province: d.province, region: d.region, phone: d.phone, address: d.address }))
  },

  async banners() {
    const map = (b: Row): Banner => ({
      title: b.title, kicker: b.kicker, subtitle: b.subtitle, image: b.image,
      link: b.link, linkLabel: b.linkLabel, theme: b.theme, sort_order: b.sort_order
    })
    return {
      hero: (data.banners.hero || []).map(map),
      promo: (data.banners.promo || []).map(map),
      service: (data.banners.service || []).map(map)
    }
  },

  async createOrder(_payload: OrderPayload) {
    // Snapshot mode has no writable storage – return a reference number so the
    // checkout flow is testable, and let the UI explain the limitation.
    const code = 'APH-' + Date.now().toString(36).toUpperCase().slice(-6)
    return { code, stored: false }
  }
}
