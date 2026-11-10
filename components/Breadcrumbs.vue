<template>
  <nav class="breadcrumb" aria-label="breadcrumb">
    <div class="container">
      <ol>
        <li><NuxtLink to="/">หน้าแรก</NuxtLink></li>
        <li v-for="(c, i) in items" :key="i">
          <NuxtLink v-if="c.link && i < items.length - 1" :to="c.link">{{ c.label }}</NuxtLink>
          <span v-else>{{ c.label }}</span>
        </li>
      </ol>
    </div>
  </nav>
</template>

<script setup lang="ts">
defineProps<{ items: { label: string; link?: string }[] }>()
</script>
