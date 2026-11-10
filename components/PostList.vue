<template>
  <div class="post-list">
    <NuxtLink v-for="p in posts" :key="p.id" :to="`/articles/${p.slug}`" class="post-card">
      <div class="post-card__img">
        <img v-if="p.image" :src="p.image" :alt="p.title" loading="lazy" referrerpolicy="no-referrer" />
      </div>
      <div>
        <div class="post-card__meta">
          <span v-if="p.category">{{ p.category }}</span>
          <span>{{ thaiDate(p.publishedAt) }}</span>
        </div>
        <h4 class="post-card__title">{{ p.title }}</h4>
      </div>
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
import type { Post } from '~/server/utils/types'
defineProps<{ posts: Post[] }>()
</script>
