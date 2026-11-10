<template>
  <header>
    <div class="topbar">
      <div class="container">
        <div class="topbar__meta">
          <span><Icon name="phone" :size="13" /> {{ site.phones?.[0] }}</span>
          <span><Icon name="mail" :size="13" /> {{ site.email }}</span>
          <span><Icon name="clock" :size="13" /> {{ site.hours }}</span>
        </div>
        <div class="topbar__links">
          <a :href="site.line?.url" target="_blank" rel="noopener"><Icon name="chat" :size="13" /> LINE {{ site.line?.label }}</a>
          <NuxtLink to="/dealers">ตัวแทนจำหน่าย</NuxtLink>
          <NuxtLink to="/contact">ติดต่อเรา</NuxtLink>
        </div>
      </div>
    </div>

    <div class="header">
      <div class="container header__main">
        <button class="icon-btn burger" aria-label="เปิดเมนู" @click="mobileOpen = true">
          <Icon name="menu" :size="22" />
        </button>

        <NuxtLink to="/" class="logo" aria-label="APH Interactive หน้าแรก">
          <span class="logo__mark">APH</span>
          <span class="logo__text">
            <span class="logo__name">APH <span style="color: var(--brand)">Interactive</span></span>
            <span class="logo__sub">Amphenol Distributor</span>
          </span>
        </NuxtLink>

        <div class="search">
          <form class="search__form" @submit.prevent="submitSearch">
            <input
              v-model="term" type="search" placeholder="ค้นหาสินค้า รุ่น หรือ SKU เช่น XLR, SP-4, XLRnet…"
              aria-label="ค้นหาสินค้า" @input="onInput" @focus="suggestOpen = true" @blur="closeLater"
            />
            <button type="submit" aria-label="ค้นหา"><Icon name="search" :size="18" :stroke="2.2" /></button>
          </form>
          <div v-if="suggestOpen && (suggest.items.length || suggest.categories.length)" class="search__suggest">
            <NuxtLink v-for="c in suggest.categories" :key="'c' + c.path" :to="`/product-category/${c.path}`">
              <Icon name="grid" :size="15" /> <span>{{ c.name }}</span>
            </NuxtLink>
            <NuxtLink v-for="p in suggest.items" :key="p.id" :to="`/product/${p.slug}`">
              <img v-if="p.image" :src="p.image" :alt="p.name" loading="lazy" referrerpolicy="no-referrer" />
              <span>{{ p.name }}</span>
            </NuxtLink>
          </div>
        </div>

        <div class="header__actions">
          <NuxtLink to="/articles" class="icon-btn"><Icon name="spark" :size="20" /><span>บทความ</span></NuxtLink>
          <NuxtLink to="/cart" class="icon-btn">
            <Icon name="cart" :size="20" />
            <span v-if="count" class="icon-btn__count">{{ count }}</span>
            <span>ตะกร้า</span>
          </NuxtLink>
        </div>
      </div>

      <nav class="nav" aria-label="หมวดหมู่สินค้า">
        <div class="container nav__inner">
          <NuxtLink to="/products" class="nav__link nav__link--all">
            <Icon name="grid" :size="16" /> สินค้าทั้งหมด
          </NuxtLink>
          <div
            v-for="(cat, i) in categories" :key="cat.id" class="nav__item"
            :class="{ 'is-open': openIndex === i }" @mouseenter="openIndex = i" @mouseleave="openIndex = -1"
          >
            <NuxtLink :to="`/product-category/${cat.path}`" class="nav__link">
              {{ cat.name }}
              <Icon v-if="cat.children.length" name="chevronDown" :size="14" />
            </NuxtLink>
            <div v-if="cat.children.length" class="mega">
              <div v-for="child in cat.children.slice(0, 8)" :key="child.id" class="mega__col">
                <h5><NuxtLink :to="`/product-category/${child.path}`">{{ child.name }}</NuxtLink></h5>
                <NuxtLink
                  v-for="g in child.children.slice(0, 6)" :key="g.id"
                  :to="`/product-category/${g.path}`"
                >{{ g.name }}</NuxtLink>
              </div>
            </div>
          </div>
          <NuxtLink to="/catalogs" class="nav__link">แคตตาล็อก</NuxtLink>
        </div>
      </nav>
    </div>

    <!-- mobile -->
    <div class="mobile-menu" :class="{ 'is-open': mobileOpen }">
      <div class="mobile-menu__backdrop" @click="mobileOpen = false" />
      <div class="mobile-menu__panel">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px">
          <strong>เมนูสินค้า</strong>
          <button class="icon-btn" aria-label="ปิด" @click="mobileOpen = false"><Icon name="close" :size="20" /></button>
        </div>
        <form class="search__form" style="margin-bottom: 16px" @submit.prevent="submitSearch">
          <input v-model="term" type="search" placeholder="ค้นหาสินค้า…" />
          <button type="submit" aria-label="ค้นหา"><Icon name="search" :size="17" /></button>
        </form>
        <div class="footer__links" style="gap: 4px">
          <NuxtLink to="/products" @click="mobileOpen = false"><strong>สินค้าทั้งหมด</strong></NuxtLink>
          <NuxtLink
            v-for="cat in categories" :key="cat.id" :to="`/product-category/${cat.path}`"
            style="padding-left: 12px" @click="mobileOpen = false"
          >{{ cat.name }}</NuxtLink>
          <hr style="margin: 10px 0" />
          <NuxtLink to="/articles" @click="mobileOpen = false">บทความและสาระน่ารู้</NuxtLink>
          <NuxtLink to="/catalogs" @click="mobileOpen = false">แคตตาล็อก</NuxtLink>
          <NuxtLink to="/dealers" @click="mobileOpen = false">ตัวแทนจำหน่าย</NuxtLink>
          <NuxtLink to="/about" @click="mobileOpen = false">เกี่ยวกับเรา</NuxtLink>
          <NuxtLink to="/contact" @click="mobileOpen = false">ติดต่อเรา</NuxtLink>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import type { CategoryNode, ProductCard } from '~/server/utils/types'

const props = defineProps<{ site: Record<string, any>; categories: CategoryNode[] }>()
const { count } = useCart()

const openIndex = ref(-1)
const mobileOpen = ref(false)
const term = ref('')
const suggestOpen = ref(false)
const suggest = ref<{ items: ProductCard[]; categories: { name: string; path: string }[] }>({ items: [], categories: [] })
let blurTimer: ReturnType<typeof setTimeout> | null = null
let searchTimer: ReturnType<typeof setTimeout> | null = null

function onInput() {
  if (searchTimer) clearTimeout(searchTimer)
  const q = term.value.trim()
  if (q.length < 2) { suggest.value = { items: [], categories: [] }; return }
  searchTimer = setTimeout(async () => {
    try {
      suggest.value = await $fetch('/api/search', { query: { q } })
      suggestOpen.value = true
    } catch { /* ignore */ }
  }, 220)
}

function closeLater() {
  blurTimer = setTimeout(() => (suggestOpen.value = false), 160)
}

function submitSearch() {
  const q = term.value.trim()
  mobileOpen.value = false
  suggestOpen.value = false
  if (q) navigateTo({ path: '/search', query: { q } })
}

watch(() => props.categories, () => { openIndex.value = -1 })
</script>
