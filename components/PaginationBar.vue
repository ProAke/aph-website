<template>
  <nav v-if="totalPages > 1" class="pagination" aria-label="แบ่งหน้า">
    <NuxtLink v-if="page > 1" :to="href(page - 1)" aria-label="ก่อนหน้า">
      <Icon name="chevronLeft" :size="16" />
    </NuxtLink>
    <template v-for="(p, i) in pages" :key="i">
      <span v-if="p === '…'" class="muted">…</span>
      <NuxtLink v-else :to="href(p as number)" :class="{ 'is-active': p === page }">{{ p }}</NuxtLink>
    </template>
    <NuxtLink v-if="page < totalPages" :to="href(page + 1)" aria-label="ถัดไป">
      <Icon name="chevronRight" :size="16" />
    </NuxtLink>
  </nav>
</template>

<script setup lang="ts">
const props = defineProps<{ page: number; totalPages: number; base: string; query?: Record<string, any> }>()

const pages = computed(() => {
  const out: (number | string)[] = []
  const total = props.totalPages
  const cur = props.page
  const push = (n: number) => { if (!out.includes(n)) out.push(n) }
  push(1)
  for (let n = cur - 1; n <= cur + 1; n++) if (n > 1 && n < total) push(n)
  if (total > 1) push(total)
  out.sort((a, b) => Number(a) - Number(b))
  const withDots: (number | string)[] = []
  out.forEach((n, i) => {
    if (i && Number(n) - Number(out[i - 1]) > 1) withDots.push('…')
    withDots.push(n)
  })
  return withDots
})

function href(p: number) {
  const q = { ...(props.query || {}), page: p > 1 ? String(p) : undefined }
  const search = Object.entries(q).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&')
  return search ? `${props.base}?${search}` : props.base
}
</script>
