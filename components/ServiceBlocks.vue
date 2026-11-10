<template>
  <div class="services">
    <NuxtLink v-for="s in items" :key="s.title" :to="s.link" class="service-card">
      <img :src="s.image" alt="" loading="lazy" referrerpolicy="no-referrer" />
      <h4>{{ s.title }}</h4>
      <p>{{ s.subtitle }}</p>
      <span class="cat-tile__cta">{{ s.linkLabel }} <Icon name="arrowRight" :size="14" /></span>
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
import type { Banner } from '~/server/utils/types'
defineProps<{ items: Banner[] }>()
</script>
