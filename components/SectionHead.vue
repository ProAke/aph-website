<template>
  <div class="section__head">
    <div>
      <div v-if="kicker" class="section__kicker">{{ kicker }}</div>
      <h2 class="section__title">{{ title }}</h2>
      <p v-if="description" class="muted" style="margin: 6px 0 0; max-width: 62ch">{{ description }}</p>
    </div>
    <NuxtLink v-if="link" :to="link" class="section__link">
      {{ linkLabel || 'ดูทั้งหมด' }} <Icon name="arrowRight" :size="15" />
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
defineProps<{ title: string; kicker?: string; description?: string; link?: string; linkLabel?: string }>()
</script>
