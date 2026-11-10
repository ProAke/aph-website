<template>
  <div>
    <HeroSlider :slides="banners.hero" />

    <section class="section">
      <div class="container">
        <SectionHead kicker="หมวดหมู่สินค้า" title="กลุ่มสินค้า Amphenol" description="หัวต่อสัญญาณคุณภาพสูงสำหรับงานเสียงมืออาชีพ ครบทุกกลุ่มการใช้งาน" link="/products" link-label="สินค้าทั้งหมด" />
        <CategoryTiles />
      </div>
    </section>

    <section class="section section--soft">
      <div class="container">
        <div class="promo" style="grid-template-columns: 1.55fr 1fr">
          <NuxtLink :to="banners.promo[1]?.link || '/product-category/dante'" class="promo__card">
            <img v-if="banners.promo[1]?.image" :src="banners.promo[1].image" alt="" loading="lazy" referrerpolicy="no-referrer" />
            <div class="promo__copy">
              <div class="promo__title">{{ banners.promo[1]?.title || 'Amphenol Dante' }}</div>
              <p class="promo__sub">{{ banners.promo[1]?.subtitle }}</p>
              <span class="btn btn--light btn--sm">{{ banners.promo[1]?.linkLabel || 'ดูข้อมูลเพิ่มเติม' }} <Icon name="arrowRight" :size="15" /></span>
            </div>
          </NuxtLink>
          <NuxtLink to="/catalogs" class="promo__card">
            <img v-if="banners.promo[0]?.image" :src="banners.promo[0].image" alt="" loading="lazy" referrerpolicy="no-referrer" />
            <div class="promo__copy">
              <div class="promo__title">{{ banners.promo[0]?.title || 'สินค้าแนะนำ' }}</div>
              <p class="promo__sub">{{ banners.promo[0]?.subtitle }}</p>
              <span class="btn btn--light btn--sm">{{ banners.promo[0]?.linkLabel || 'ดาวน์โหลด' }} <Icon name="download" :size="15" /></span>
            </div>
          </NuxtLink>
        </div>
      </div>
    </section>

    <section class="section section--soft">
      <div class="container">
        <SectionHead kicker="APH Interactive" title="บริการของเรา" />
        <ServiceBlocks :items="banners.service" />
      </div>
    </section>

    <section class="section">
      <div class="container">
        <SectionHead kicker="ดาวน์โหลด" title="สินค้าแนะนำ / แคตตาล็อก" description="แคตตาล็อกและใบข้อมูลสินค้า (Datasheet) ของ Amphenol ทุกกลุ่มสินค้า" link="/catalogs" link-label="ดูแคตตาล็อกทั้งหมด" />
        <CatalogCards :items="catalogs.slice(0, 10)" />
      </div>
    </section>

    <section class="section section--soft" style="padding-bottom: 0">
      <div class="container">
        <div class="section__head">
          <div>
            <div class="section__kicker">สินค้าน่าสนใจ</div>
            <h2 class="section__title">Amphenol Connectors</h2>
          </div>
          <NuxtLink to="/products" class="section__link">
            สินค้าทั้งหมด <Icon name="chevronRight" :size="15" />
          </NuxtLink>
        </div>
        <ProductGrid :products="featured.items" :pending="featuredPending" :dense="true" />
      </div>
    </section>

    <section class="section section--soft">
      <div class="container">
        <div class="posts-2">
          <div>
            <SectionHead kicker="ข่าวสาร" title="ข่าวสารและกิจกรรม" link="/articles?kind=news" link-label="ดูทั้งหมด" />
            <PostList :posts="news" />
          </div>
          <div>
            <SectionHead kicker="สาระน่ารู้" title="บทความและรีวิว" link="/articles" link-label="ดูทั้งหมด" />
            <PostList :posts="articles" />
          </div>
        </div>
      </div>
    </section>

    <section class="section" style="padding-top: 0">
      <div class="container">
        <div class="promo__card" style="min-height: 170px">
          <img src="https://www.aph-ita.co.th/wp-content/uploads/2026/08/bg_block.png" alt="" loading="lazy" referrerpolicy="no-referrer" />
          <div class="promo__copy" style="max-width: 620px">
            <div class="promo__title">ตัวแทนจำหน่ายทั่วประเทศ</div>
            <p class="promo__sub">ค้นหาร้านค้าตัวแทนจำหน่าย APH Interactive ในจังหวัดของคุณ หรือสั่งซื้อออนไลน์ได้ตลอด 24 ชั่วโมง</p>
            <NuxtLink to="/dealers" class="btn btn--light btn--sm">ค้นหาร้านค้า <Icon name="arrowRight" :size="15" /></NuxtLink>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { Post } from '~/server/utils/types'

useHead({ title: 'APH Interactive | จำหน่ายสินค้า Electronic' })

const { data: boot } = await useBootstrap()
const banners = computed(() => boot.value?.banners || { hero: [], promo: [], service: [] })
const catalogs = computed(() => boot.value?.catalogs || [])

const { data: featured, pending: featuredPending } = await useFetch<{ items: any[] }>('/api/products', {
  query: { featured: '1', perPage: 10, sort: 'newest' }
})

const { data: postData } = await useFetch<{ items: Post[] }>('/api/posts', { query: { limit: 12 } })
const news = computed(() => (postData.value?.items || []).filter((p) => p.kind === 'news').slice(0, 3))
const articles = computed(() => (postData.value?.items || []).filter((p) => p.kind === 'article').slice(0, 3))
</script>
