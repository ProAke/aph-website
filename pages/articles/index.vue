<template>
  <div>
    <Breadcrumbs :items="[{ label: 'บทความและข่าวสาร' }]" />
    <div class="container">
      <div class="page-head">
        <div class="section__kicker">Knowledge & News</div>
        <h1 class="page-head__title">บทความและข่าวสาร</h1>
        <p class="page-head__desc">สาระน่ารู้เกี่ยวกับหัวต่อสัญญาณ และข่าวสารจาก Amphenol / APH Interactive</p>
      </div>

      <div style="display: flex; gap: 8px; margin-bottom: 24px; flex-wrap: wrap">
        <NuxtLink
          v-for="t in tabs" :key="t.key" :to="t.to"
          class="btn btn--sm" :class="active === t.key ? '' : 'btn--ghost'"
        >{{ t.label }}</NuxtLink>
      </div>

      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px; padding-bottom: 56px" class="posts-grid">
        <NuxtLink v-for="p in filtered" :key="p.id" :to="`/articles/${p.slug}`" class="card" style="padding: 0; overflow: hidden">
          <div style="aspect-ratio: 16/9; background: var(--bg-soft)">
            <img v-if="p.image" :src="p.image" :alt="p.title" loading="lazy" referrerpolicy="no-referrer" style="width: 100%; height: 100%; object-fit: cover" />
          </div>
          <div style="padding: 16px 18px 20px">
            <div class="post-card__meta">
              <span class="badge" style="text-transform: none">{{ p.kind === 'news' ? 'ข่าวสาร' : p.category || 'บทความ' }}</span>
              <span>{{ thaiDate(p.publishedAt) }}</span>
            </div>
            <h3 style="font-size: 15.5px; margin: 8px 0 6px; line-height: 1.45">{{ p.title }}</h3>
            <p class="small muted" style="margin: 0; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden">{{ p.excerpt }}</p>
          </div>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Post } from '~/server/utils/types'

const route = useRoute()
const { data } = await useFetch<{ items: Post[] }>('/api/posts')
const active = computed(() => String(route.query.kind || 'all'))
const tabs = [
  { key: 'all', label: 'ทั้งหมด', to: '/articles' },
  { key: 'news', label: 'ข่าวสารและกิจกรรม', to: '/articles?kind=news' },
  { key: 'article', label: 'สาระน่ารู้', to: '/articles?kind=article' }
]
const filtered = computed(() => {
  const items = data.value?.items || []
  return active.value === 'all' ? items : items.filter((p) => p.kind === active.value)
})

useHead({ title: 'บทความและข่าวสาร' })
</script>

<style scoped>
@media (max-width: 1024px) { .posts-grid { grid-template-columns: repeat(2, 1fr) !important; } }
@media (max-width: 700px) { .posts-grid { grid-template-columns: 1fr !important; } }
</style>
