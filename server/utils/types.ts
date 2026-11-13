export interface CategoryNode {
  id: number
  parentId: number
  slug: string
  name: string
  path: string
  depth: number
  description: string | null
  productCount: number
  children: CategoryNode[]
}

export interface CategoryRef { slug: string; name: string; path: string }

export interface ProductCard {
  id: number
  slug: string
  name: string
  sku: string | null
  series: string | null
  price: number
  currency: string
  inStock: boolean
  isFeatured: boolean
  image: string | null
  categories: CategoryRef[]
  shortDescription: string | null
}

export interface ProductDetail extends ProductCard {
  description: string | null
  images: string[]
  datasheetUrl: string | null
  wpPermalink: string | null
  specs: Record<string, string> | null
}

export interface ProductQuery {
  categoryPath?: string
  search?: string
  page?: number
  perPage?: number
  sort?: 'newest' | 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc'
  featured?: boolean
  inStock?: boolean
}

export interface Paginated<T> { items: T[]; total: number; page: number; perPage: number; totalPages: number }

export interface Post {
  id: number
  slug: string
  title: string
  excerpt: string | null
  content?: string | null
  image: string | null
  category: string | null
  kind: 'news' | 'article'
  publishedAt: string | null
}

export interface Catalog { title: string; series: string | null; image: string | null; file: string }
export interface Dealer { name: string; province: string; region: string; phone: string | null; address: string | null }
export interface Banner {
  title: string; kicker?: string; subtitle?: string; image: string | null
  link: string | null; linkLabel: string; theme?: string; sort_order?: number
}

export interface Store {
  name: 'db' | 'json'
  categoriesTree(): Promise<CategoryNode[]>
  categoryByPath(path: string): Promise<CategoryNode | null>
  listProducts(q: ProductQuery): Promise<Paginated<ProductCard>>
  productBySlug(slug: string): Promise<ProductDetail | null>
  productById(id: number): Promise<ProductDetail | null>
  relatedProducts(p: ProductDetail, limit?: number): Promise<ProductCard[]>
  posts(opts?: { kind?: 'news' | 'article'; limit?: number }): Promise<Post[]>
  postBySlug(slug: string): Promise<Post | null>
  catalogs(): Promise<Catalog[]>
  dealers(): Promise<Dealer[]>
  banners(): Promise<{ hero: Banner[]; promo: Banner[]; service: Banner[] }>
  createOrder(payload: OrderPayload): Promise<{ code: string; stored: boolean }>
}

export interface OrderPayload {
  customerName: string
  phone: string
  email?: string
  address?: string
  note?: string
  items: { productId?: number; name: string; sku?: string; qty: number; price: number }[]
}
