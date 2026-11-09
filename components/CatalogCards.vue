<template>
  <div class="catalog-grid">
    <a v-for="c in items" :key="c.file" :href="c.file" target="_blank" rel="noopener" class="catalog-card">
      <div class="catalog-card__img">
        <img v-if="c.image" :src="c.image" :alt="c.title" loading="lazy" referrerpolicy="no-referrer" />
      </div>
      <h4>{{ c.title }}</h4>
      <span>{{ c.series }}</span>
      <div class="catalog-card__cta">ดาวน์โหลด PDF <Icon name="download" :size="14" /></div>
    </a>
  </div>
</template>

<script setup lang="ts">
import type { Catalog } from '~/server/utils/types'
withDefaults(defineProps<{ items: Catalog[]; limit?: number }>(), { limit: 10 })
</script>
