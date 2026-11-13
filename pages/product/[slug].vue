<template>
  <div v-if="product">
    <Breadcrumbs :items="crumbs" />

    <div class="container">
      <div class="pdp">
        <div>
          <div class="gallery__main">
            <img v-if="activeImage" :src="activeImage" :alt="product.name" referrerpolicy="no-referrer" />
            <div v-else class="muted" style="text-align: center">
              <Icon name="headphones" :size="48" style="margin: 0 auto 10px; color: #c9ceda" />
              ยังไม่มีรูปสินค้า
            </div>
          </div>
          <div v-if="product.images.length > 1" class="gallery__thumbs">
            <button
              v-for="(img, i) in product.images" :key="i" :class="{ 'is-active': activeImage === img }"
              @click="activeImage = img"
            ><img :src="img" :alt="`${product.name} ${i + 1}`" referrerpolicy="no-referrer" /></button>
          </div>
        </div>

        <div>
          <div class="pcard__cats" style="font-size: 12.5px">
            <template v-for="(c, i) in product.categories" :key="c.path">
              <NuxtLink :to="`/product-category/${c.path}`">{{ c.name }}</NuxtLink>
              <span v-if="i < product.categories.length - 1">,</span>
            </template>
          </div>
          <h1 class="pdp__title" style="margin-top: 6px">{{ product.name }}</h1>

          <div class="pdp__meta">
            <span>SKU: <strong style="color: var(--ink)">{{ product.sku || '-' }}</strong></span>
            <span v-if="product.series">ซีรีส์: {{ product.series }}</span>
            <span class="badge" :class="product.inStock ? 'badge--stock' : 'badge--out'">
              {{ product.inStock ? 'พร้อมส่ง' : 'สอบถามสต็อก' }}
            </span>
          </div>

          <div class="pdp__price">
            <span class="price" :class="{ 'price--quote': product.price <= 0 }" style="font-size: 26px">{{ THB(product.price) }}</span>
            <span class="small muted">{{ product.price > 0 ? 'ราคารวม VAT แล้ว' : 'ราคาสำหรับงานโครงการ กรุณาสอบถาม' }}</span>
          </div>

          <p class="pdp__short">{{ product.shortDescription }}</p>

          <div class="pdp__buy">
            <div class="qty">
              <button aria-label="ลดจำนวน" @click="qty = Math.max(1, qty - 1)"><Icon name="minus" :size="14" /></button>
              <input v-model.number="qty" type="number" min="1" max="999" aria-label="จำนวน" />
              <button aria-label="เพิ่มจำนวน" @click="qty = Math.min(999, qty + 1)"><Icon name="plus" :size="14" /></button>
            </div>
            <button class="btn" @click="addToCart"><Icon name="cart" :size="17" /> เพิ่มลงตะกร้า</button>
            <button class="btn btn--ghost" @click="requestQuote"><Icon name="mail" :size="16" /> ขอใบเสนอราคา</button>
          </div>

          <div class="pdp__facts">
            <div><Icon name="truck" :size="16" /><span><strong>การจัดส่ง</strong> ส่งฟรีเมื่อครบยอด · จัดส่ง 1–3 วันทำการ</span></div>
            <div><Icon name="shield" :size="16" /><span><strong>รับประกัน</strong> สินค้าของแท้จาก Amphenol</span></div>
            <div><Icon name="phone" :size="16" /><span><strong>ปรึกษา</strong> {{ site.phones?.[0] }} · {{ site.hours }}</span></div>
          </div>

          <div v-if="product.datasheetUrl" style="margin-top: 18px">
            <a :href="product.datasheetUrl" target="_blank" rel="noopener" class="btn btn--soft btn--sm">
              <Icon name="download" :size="15" /> ดาวน์โหลด Datasheet (PDF)
            </a>
          </div>
        </div>
      </div>

      <div class="tabs">
        <div class="tabs__nav">
          <button
            v-for="tab in tabs" :key="tab.key" class="tabs__btn"
            :class="{ 'is-active': activeTab === tab.key }" @click="activeTab = tab.key"
          >{{ tab.label }}</button>
        </div>
        <div class="tabs__panel">
          <div v-if="activeTab === 'desc'" v-html="product.description || '<p>ไม่มีรายละเอียดสินค้า</p>'" />
          <div v-else-if="activeTab === 'specs'">
            <table style="width: 100%; border-collapse: collapse">
              <tbody>
                <tr v-for="(v, k) in product.specs" :key="k" style="border-bottom: 1px solid var(--line-2)">
                  <th style="text-align: left; padding: 10px 12px 10px 0; width: 180px; color: var(--ink)">{{ k }}</th>
                  <td style="padding: 10px 0">{{ v || '-' }}</td>
                </tr>
                <tr style="border-bottom: 1px solid var(--line-2)">
                  <th style="text-align: left; padding: 10px 12px 10px 0; color: var(--ink)">แบรนด์</th>
                  <td style="padding: 10px 0">Amphenol</td>
                </tr>
                <tr>
                  <th style="text-align: left; padding: 10px 12px 10px 0; color: var(--ink)">หมวดหมู่</th>
                  <td style="padding: 10px 0">{{ product.categories.map((c) => c.name).join(', ') }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else>
            <p>เอกสารและไฟล์ดาวน์โหลดสำหรับรุ่น {{ product.sku }}</p>
            <ul>
              <li v-if="product.datasheetUrl"><a :href="product.datasheetUrl" target="_blank" rel="noopener">แคตตาล็อกซีรีส์ (PDF)</a></li>
              <li v-if="product.wpPermalink"><a :href="product.wpPermalink" target="_blank" rel="noopener">หน้าเดิมบน aph-ita.co.th</a></li>
              <li><NuxtLink to="/catalogs">แคตตาล็อกทั้งหมด</NuxtLink></li>
            </ul>
          </div>
        </div>
      </div>

      <section v-if="related.length" class="section" style="padding-top: 10px">
        <SectionHead kicker="สินค้าที่เกี่ยวข้อง" title="สินค้าในกลุ่มเดียวกัน" :link="`/product-category/${product.categories[0]?.path || ''}`" link-label="ดูทั้งหมด" />
        <ProductGrid :products="related" dense />
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ProductDetail, ProductCard } from '~/server/utils/types'

const route = useRoute()
const slug = computed(() => String(route.params.slug || '').replace(/\/+$/, ''))

const { data, error } = await useFetch<{ product: ProductDetail; related: ProductCard[] }>(
  () => `/api/products/${slug.value}`
)

if (error.value) {
  throw createError({ statusCode: 404, statusMessage: 'ไม่พบสินค้านี้', fatal: true })
}

const product = computed(() => data.value?.product)
const related = computed(() => data.value?.related || [])
const activeImage = ref<string | null>(null)
const qty = ref(1)
const activeTab = ref('desc')
const tabs = [
  { key: 'desc', label: 'รายละเอียดสินค้า' },
  { key: 'specs', label: 'ข้อมูลทางเทคนิค' },
  { key: 'docs', label: 'เอกสารดาวน์โหลด' }
]

watchEffect(() => {
  if (product.value && !activeImage.value) activeImage.value = product.value.images[0] || null
})

const { add } = useCart()
const toast = useToast()

function addToCart() {
  if (!product.value) return
  add(
    {
      productId: product.value.id,
      slug: product.value.slug,
      name: product.value.name,
      sku: product.value.sku,
      price: product.value.price,
      image: product.value.image
    },
    qty.value
  )
  toast.show(`เพิ่ม ${product.value.name} จำนวน ${qty.value} ลงตะกร้าแล้ว`)
}

function requestQuote() {
  if (!product.value) return
  navigateTo({ path: '/contact', query: { product: product.value.name, sku: product.value.sku || '' } })
}

const { data: boot } = await useBootstrap()
const site = computed(() => boot.value?.site || {})

const crumbs = computed(() => {
  const parts = product.value?.categories[0]?.path?.split('/') || []
  const list = parts.map((_, i) => {
    const p = parts.slice(0, i + 1).join('/')
    const name = product.value?.categories.find((c) => c.path === p)?.name || p
    return { label: name, link: `/product-category/${p}` }
  })
  list.push({ label: product.value?.name || '' })
  return list
})

useHead(() => ({
  title: product.value?.name || 'สินค้า',
  meta: [
    { name: 'description', content: product.value?.shortDescription || '' },
    { property: 'og:title', content: product.value?.name || '' },
    { property: 'og:image', content: product.value?.image || '' }
  ]
}))
</script>
