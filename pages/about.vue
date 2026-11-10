<template>
  <div>
    <Breadcrumbs :items="[{ label: 'เกี่ยวกับเรา' }]" />
    <div class="container" style="padding-bottom: 56px">
      <div class="page-head">
        <div class="section__kicker">About APH Interactive</div>
        <h1 class="page-head__title">ผู้นำเข้าและจัดจำหน่ายหัวต่อสัญญาณ Amphenol</h1>
        <p class="page-head__desc">{{ site.description }}</p>
      </div>

      <div class="promo__card" style="min-height: 240px; margin-bottom: 32px">
        <img src="https://www.aph-ita.co.th/wp-content/uploads/2026/08/Amphenol_Date-scaled.jpeg" alt="" referrerpolicy="no-referrer" />
        <div class="promo__copy" style="max-width: 620px">
          <div class="promo__title">{{ site.legalName }}</div>
          <p class="promo__sub">{{ site.addressTh }}</p>
          <NuxtLink to="/contact" class="btn btn--light btn--sm">ติดต่อเรา <Icon name="arrowRight" :size="15" /></NuxtLink>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px" class="value-grid">
        <div v-for="v in values" :key="v.title" class="card">
          <Icon :name="v.icon" :size="26" style="color: var(--brand)" />
          <h3 style="font-size: 16px; margin: 12px 0 6px">{{ v.title }}</h3>
          <p class="small muted" style="margin: 0">{{ v.body }}</p>
        </div>
      </div>

      <section class="section" style="padding-bottom: 0">
        <SectionHead kicker="สินค้าของเรา" title="กลุ่มสินค้าหลัก" link="/products" link-label="สินค้าทั้งหมด" />
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px" class="cat-list">
          <NuxtLink
            v-for="c in categories" :key="c.id" :to="`/product-category/${c.path}`"
            class="card" style="display: flex; justify-content: space-between; align-items: center; padding: 16px 18px"
          >
            <span style="font-weight: 600">{{ c.name }}</span>
            <span class="muted small">{{ c.productCount }}</span>
          </NuxtLink>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
const { data: boot } = await useBootstrap()
const site = computed(() => boot.value?.site || {})
const categories = computed(() => boot.value?.categories || [])

const values = [
  { icon: 'shield', title: 'สินค้าของแท้', body: 'จัดจำหน่ายหัวต่อสัญญาณ Amphenol ของแท้ พร้อมเอกสารและ Datasheet ครบทุกรุ่น' },
  { icon: 'truck', title: 'จัดส่งทั่วประเทศ', body: 'คลังสินค้าในกรุงเทพฯ จัดส่งไว 1–3 วันทำการทั่วประเทศ' },
  { icon: 'headphones', title: 'ที่ปรึกษาด้านเสียง', body: 'ทีมวิศวกรช่วยเลือกหัวต่อให้เหมาะกับงาน ทั้งงานเวที งานติดตั้ง และงานสตูดิโอ' }
]

useHead({ title: 'เกี่ยวกับเรา' })
</script>

<style scoped>
@media (max-width: 1024px) {
  .value-grid { grid-template-columns: 1fr !important; }
  .cat-list { grid-template-columns: repeat(2, 1fr) !important; }
}
</style>
