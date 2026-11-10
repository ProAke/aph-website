<template>
  <article class="pcard">
    <div class="pcard__media">
      <NuxtLink :to="`/product/${product.slug}`" :aria-label="product.name" style="display: contents">
        <img
          v-if="product.image && !broken" :src="product.image" :alt="product.name"
          loading="lazy" referrerpolicy="no-referrer" @error="broken = true"
        />
        <div v-else class="pcard__media--empty">
          <Icon name="headphones" :size="34" style="margin: 0 auto 8px; color: #c9ceda" />
          {{ product.name }}
        </div>
      </NuxtLink>
      <div class="pcard__badges">
        <span v-if="product.isFeatured" class="badge badge--featured">แนะนำ</span>
        <span v-if="product.inStock" class="badge badge--stock">พร้อมส่ง</span>
        <span v-else class="badge badge--out">สอบถามสต็อก</span>
      </div>
      <div class="pcard__quick">
        <NuxtLink :to="`/product/${product.slug}`" title="ดูรายละเอียด"><Icon name="search" :size="15" /></NuxtLink>
        <button title="เพิ่มในรายการโปรด" @click="wishlist"><Icon name="heart" :size="15" /></button>
      </div>
    </div>

    <div class="pcard__body">
      <div class="pcard__cats">
        <template v-for="(c, i) in product.categories.slice(0, 2)" :key="c.path">
          <NuxtLink :to="`/product-category/${c.path}`">{{ c.name }}</NuxtLink>
          <span v-if="i < Math.min(2, product.categories.length) - 1">,</span>
        </template>
      </div>
      <h3 class="pcard__name">
        <NuxtLink :to="`/product/${product.slug}`">{{ product.name }}</NuxtLink>
      </h3>
      <div class="pcard__sku">SKU: {{ product.sku || '-' }}</div>
      <div class="pcard__foot">
        <span class="price" :class="{ 'price--quote': product.price <= 0 }">{{ THB(product.price) }}</span>
        <button class="add-cart" @click="addToCart">
          <Icon name="cart" :size="14" /> เพิ่ม
        </button>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { ProductCard } from '~/server/utils/types'

const props = defineProps<{ product: ProductCard }>()
const broken = ref(false)
const { add } = useCart()
const toast = useToast()

function addToCart() {
  add({
    productId: props.product.id,
    slug: props.product.slug,
    name: props.product.name,
    sku: props.product.sku,
    price: props.product.price,
    image: props.product.image
  })
  toast.show(`เพิ่ม ${props.product.name} ลงตะกร้าแล้ว`)
}

function wishlist() {
  toast.show('บันทึกในรายการโปรดแล้ว (ตัวอย่าง)')
}
</script>
