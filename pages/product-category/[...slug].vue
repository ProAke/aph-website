<template>
  <div>
    <Breadcrumbs :items="crumbs" />
    <ProductBrowser
      :result="(data as any) || { items: [], total: 0, page: 1, totalPages: 1, perPage: 24 }"
      :categories="categories"
      :active-path="path"
      :subcategories="category?.children || []"
      :base="`/product-category/${path}`"
      :query="cleanQuery"
      :sort="sort"
      :pending="pending"
      :title="category?.name || 'หมวดหมู่สินค้า'"
      :description="category?.description || undefined"
      kicker="หมวดหมู่สินค้า"
    />
  </div>
</template>

<script setup lang="ts">
import type { CategoryNode } from '~/server/utils/types'

const route = useRoute()
// WordPress canonicals end with "/" — Vue Router's catch-all keeps an empty trailing
// segment for those URLs, so normalise here instead of redirecting (address bar stays as-is).
const path = computed(() => {
  const raw = route.params.slug
  const joined = Array.isArray(raw) ? raw.join('/') : String(raw || '')
  return joined.split('/').filter(Boolean).join('/')
})

const { data: boot } = await useBootstrap()
const categories = computed<CategoryNode[]>(() => boot.value?.categories || [])

const findNode = (nodes: CategoryNode[], target: string): CategoryNode | null => {
  for (const n of nodes) {
    if (n.path === target) return n
    const hit = findNode(n.children, target)
    if (hit) return hit
  }
  return null
}
const category = computed(() => findNode(categories.value, path.value))
const crumbs = computed(() => {
  const parts = path.value.split('/')
  return parts.map((_, i) => {
    const p = parts.slice(0, i + 1).join('/')
    const node = findNode(categories.value, p)
    return { label: node?.name || p, link: `/product-category/${p}` }
  })
})

const sort = computed(() => String(route.query.sort || 'newest'))
const cleanQuery = computed(() => {
  const q: Record<string, any> = {}
  if (route.query.sort) q.sort = route.query.sort
  return q
})

const url = computed(() => {
  const params = new URLSearchParams()
  params.set('category', path.value)
  params.set('perPage', '24')
  params.set('sort', sort.value)
  if (route.query.page) params.set('page', String(route.query.page))
  return `/api/products?${params.toString()}`
})
const { data, pending } = await useFetch(url)

useHead(() => ({
  title: category.value?.name || 'หมวดหมู่สินค้า',
  meta: [{ name: 'description', content: category.value?.description || 'หมวดหมู่สินค้า APH Interactive' }]
}))

if (import.meta.server && path.value && !category.value && boot.value?.categories?.length) {
  throw createError({ statusCode: 404, statusMessage: 'ไม่พบหมวดหมู่สินค้านี้' })
}
</script>
