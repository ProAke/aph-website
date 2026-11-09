<template>
  <div class="container">
    <div class="page-head">
      <div v-if="kicker" class="section__kicker">{{ kicker }}</div>
      <h1 class="page-head__title">{{ title }}</h1>
      <p v-if="description" class="page-head__desc">{{ description }}</p>
    </div>

    <div class="with-sidebar">
      <SidebarCategories :categories="categories" :active-path="activePath" />

      <div>
        <div class="toolbar">
          <div class="toolbar__count">
            แสดง <strong>{{ (result.items || []).length }}</strong> จาก <strong>{{ result.total.toLocaleString('th-TH') }}</strong> รายการ
            <span v-if="result.source === 'db'" class="badge" style="margin-left: 8px">MariaDB</span>
          </div>
          <div class="toolbar__right">
            <select class="select" :value="sort" aria-label="เรียงลำดับ" @change="changeSort">
              <option value="newest">ใหม่ล่าสุด</option>
              <option value="name-asc">ชื่อ ก → ฮ</option>
              <option value="name-desc">ชื่อ ฮ → ก</option>
              <option value="price-asc">ราคา ต่ำ → สูง</option>
              <option value="price-desc">ราคา สูง → ต่ำ</option>
            </select>
          </div>
        </div>

        <div v-if="subcategories.length && !activePath" style="margin-bottom: 20px; display: flex; flex-wrap: wrap; gap: 8px">
          <NuxtLink
            v-for="c in subcategories" :key="c.id" :to="`/product-category/${c.path}`"
            class="badge" style="padding: 6px 12px; font-size: 12px; text-transform: none; letter-spacing: 0"
          >{{ c.name }} <span class="muted">({{ c.productCount }})</span></NuxtLink>
        </div>

        <ProductGrid :products="result.items" :pending="pending" />
        <PaginationBar :page="result.page" :total-pages="result.totalPages" :base="base" :query="query" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CategoryNode, Paginated, ProductCard } from '~/server/utils/types'

const props = withDefaults(defineProps<{
  result: Paginated<ProductCard> & { source?: string }
  categories?: CategoryNode[]
  activePath?: string
  base: string
  query?: Record<string, any>
  title: string
  description?: string
  kicker?: string
  sort?: string
  pending?: boolean
  subcategories?: CategoryNode[]
}>(), {
  categories: () => [],
  subcategories: () => [],
  query: () => ({}),
  sort: 'newest',
  pending: false,
  activePath: ''
})

const router = useRouter()

function changeSort(e: Event) {
  const value = (e.target as HTMLSelectElement).value
  router.push({ path: props.base, query: { ...props.query, page: undefined, sort: value === 'newest' ? undefined : value } })
}
</script>
