import type { Banner, Catalog, CategoryNode } from '~/server/utils/types'

export interface Bootstrap {
  site: Record<string, any>
  categories: CategoryNode[]
  banners: { hero: Banner[]; promo: Banner[]; service: Banner[] }
  catalogs: Catalog[]
  source: string
}

export function useBootstrap() {
  return useAsyncData<Bootstrap>('bootstrap', () => $fetch('/api/bootstrap'), {
    default: () => ({ site: {}, categories: [], banners: { hero: [], promo: [], service: [] }, catalogs: [], source: 'snapshot' })
  })
}

export const THB = (n: number) =>
  n > 0 ? '฿' + n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'สอบถามราคา'

export const thaiDate = (d?: string | null) =>
  d ? new Date(d.replace(' ', 'T')).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }) : ''
