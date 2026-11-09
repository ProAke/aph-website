<template>
  <aside class="sidebar">
    <div class="sidebar__group">
      <NuxtLink to="/products" class="sidebar__title" style="display: block" :class="{ 'is-active': !activePath }">
        สินค้าทั้งหมด
      </NuxtLink>
    </div>
    <div v-for="cat in categories" :key="cat.id" class="sidebar__group">
      <NuxtLink
        :to="`/product-category/${cat.path}`" class="sidebar__title"
        :class="{ 'is-active': activePath === cat.path }"
      >
        <span>{{ cat.name }}</span>
        <span class="count">{{ cat.productCount }}</span>
      </NuxtLink>
      <ul v-if="cat.children.length && (activePath || '').startsWith(cat.path)" class="sidebar__list">
        <li v-for="child in cat.children" :key="child.id">
          <NuxtLink :to="`/product-category/${child.path}`" :class="{ 'is-active': activePath === child.path }">
            <span>{{ child.name }}</span>
            <span class="count">{{ child.productCount }}</span>
          </NuxtLink>
          <ul v-if="child.children.length && (activePath === child.path)" class="sidebar__sublist">
            <li v-for="g in child.children" :key="g.id">
              <NuxtLink :to="`/product-category/${g.path}`" :class="{ 'is-active': activePath === g.path }">
                <span>{{ g.name }}</span>
                <span class="count">{{ g.productCount }}</span>
              </NuxtLink>
            </li>
          </ul>
        </li>
      </ul>
    </div>
  </aside>
</template>

<script setup lang="ts">
import type { CategoryNode } from '~/server/utils/types'
defineProps<{ categories: CategoryNode[]; activePath?: string }>()
</script>
