<template>
  <div>
    <Breadcrumbs :items="[{ label: 'สินค้าทั้งหมด' }]" />
    <ProductBrowser
      :result="(data as any) || { items: [], total: 0, page: 1, totalPages: 1, perPage: 24 }"
      :categories="categories"
      base="/products"
      :query="cleanQuery"
      :sort="sort"
      :pending="pending"
      title="สินค้าทั้งหมด"
      kicker="Product Catalog"
      description="รวมหัวต่อสัญญาณ Amphenol ทุกกลุ่มสินค้า เลือกดูตามหมวดหมู่ หรือค้นหาด้วยรุ่น/SKU"
    />
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const { data: boot } = await useBootstrap()
const categories = computed(() => boot.value?.categories || [])

const sort = computed(() => String(route.query.sort || 'newest'))
const cleanQuery = computed(() => {
  const q: Record<string, any> = {}
  if (route.query.search) q.search = route.query.search
  if (route.query.sort) q.sort = route.query.sort
  return q
})

const url = computed(() => {
  const params = new URLSearchParams()
  params.set('perPage', '24')
  params.set('sort', sort.value)
  if (route.query.page) params.set('page', String(route.query.page))
  if (route.query.search) params.set('search', String(route.query.search))
  return `/api/products?${params.toString()}`
})
const { data, pending } = await useFetch(url)

useHead({ title: 'สินค้าทั้งหมด' })
</script>
