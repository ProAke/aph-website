<template>
  <div>
    <Breadcrumbs :items="[{ label: 'ค้นหาสินค้า' }]" />
    <div class="container">
      <div class="page-head">
        <div class="section__kicker">ผลการค้นหา</div>
        <h1 class="page-head__title">“{{ q }}”</h1>
        <p class="page-head__desc">
          พบ {{ (data?.total || 0).toLocaleString('th-TH') }} รายการ
          <template v-if="data?.categories?.length"> · หมวดหมู่ที่เกี่ยวข้อง: {{ data.categories.map((c: any) => c.name).join(', ') }}</template>
        </p>
      </div>
      <div style="padding-bottom: 56px">
        <ProductGrid :products="(data as any)?.items || []" :pending="pending" />
        <PaginationBar
          v-if="data" :page="data.page" :total-pages="data.totalPages"
          base="/search" :query="{ q }"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const q = computed(() => String(route.query.q || ''))
const page = computed(() => String(route.query.page || '1'))

const url = computed(() => `/api/search?q=${encodeURIComponent(q.value)}&page=${page.value}`)
const { data, pending } = await useFetch<any>(url, { watch: [url] })

useHead(() => ({ title: `ค้นหา: ${q.value}` }))
</script>
