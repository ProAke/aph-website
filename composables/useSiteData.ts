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

/**
 * WooCommerce prints ฿0.00 for products without a price; the redesign shows “สอบถามราคา”.
 * On cut-over day set NUXT_PUBLIC_ZERO_PRICE_STYLE=woo to keep the exact old rendering,
 * then flip it back to 'quote' after the migration window.
 */
export const THB = (n: number) => {
  const style = String(useRuntimeConfig().public.zeroPriceStyle || 'quote')
  if (n > 0 || style === 'woo') {
    return '฿' + n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  return 'สอบถามราคา'
}

export const thaiDate = (d?: string | null) =>
  d ? new Date(d.replace(' ', 'T')).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }) : ''
