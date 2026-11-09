<template>
  <div v-if="pending" class="grid-products">
    <div v-for="i in skeletonCount" :key="i" class="pcard" style="padding: 14px">
      <div class="skeleton" style="aspect-ratio: 1/1; width: 100%" />
      <div class="skeleton" style="height: 12px; margin-top: 12px; width: 60%" />
      <div class="skeleton" style="height: 16px; margin-top: 8px; width: 90%" />
      <div class="skeleton" style="height: 30px; margin-top: 14px; width: 100%" />
    </div>
  </div>
  <div v-else-if="!products.length" class="empty">
    <Icon name="search" :size="34" style="margin: 0 auto 10px" />
    <p>ไม่พบสินค้าที่ตรงกับเงื่อนไข</p>
  </div>
  <div v-else class="grid-products" :class="{ 'grid-products--5': dense }">
    <ProductCard v-for="p in products" :key="p.id" :product="p" />
  </div>
</template>

<script setup lang="ts">
import type { ProductCard as TProductCard } from '~/server/utils/types'
withDefaults(defineProps<{ products: TProductCard[]; pending?: boolean; dense?: boolean; skeletonCount?: number }>(), {
  pending: false, dense: false, skeletonCount: 8
})
</script>
