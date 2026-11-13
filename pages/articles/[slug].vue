<template>
  <div v-if="post">
    <Breadcrumbs :items="[{ label: 'บทความและข่าวสาร', link: '/articles' }, { label: post.title }]" />
    <article class="container" style="max-width: 860px; padding-bottom: 56px">
      <div class="page-head">
        <div class="post-card__meta" style="margin-bottom: 10px">
          <span class="badge" style="text-transform: none">{{ post.kind === 'news' ? 'ข่าวสาร' : post.category || 'บทความ' }}</span>
          <span>{{ thaiDate(post.publishedAt) }}</span>
          <span>โดย {{ 'admin' }}</span>
        </div>
        <h1 class="page-head__title">{{ post.title }}</h1>
      </div>
      <div v-if="post.image" style="border-radius: var(--radius); overflow: hidden; margin-bottom: 26px">
        <img :src="post.image" :alt="post.title" referrerpolicy="no-referrer" style="width: 100%" />
      </div>
      <div class="tabs__panel" style="max-width: none; padding-top: 0">
        <div v-if="post.content" v-html="post.content" />
        <template v-else>
          <p><strong>{{ post.excerpt }}</strong></p>
          <p>
            บทความนี้เป็นข้อมูลตัวอย่างที่ดึงมาจากเว็บไซต์เดิม (aph-ita.co.th)
            เนื้อหาแบบเต็มสามารถนำเข้ามาได้ด้วยสคริปต์ <code>npm run import:wp</code> ซึ่งจะดึงเนื้อหาโพสต์ทั้งหมดจาก WordPress REST API เข้าตาราง <code>posts</code>
          </p>
        </template>
      </div>

      <section v-if="related.length" style="margin-top: 40px">
        <h2 style="font-size: 18px; margin-bottom: 16px">บทความที่เกี่ยวข้อง</h2>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px" class="rel-grid">
          <NuxtLink v-for="p in related" :key="p.id" :to="`/articles/${p.slug}`" class="card" style="padding: 0; overflow: hidden">
            <div style="aspect-ratio: 16/9; background: var(--bg-soft)">
              <img v-if="p.image" :src="p.image" :alt="p.title" loading="lazy" referrerpolicy="no-referrer" style="width: 100%; height: 100%; object-fit: cover" />
            </div>
            <div style="padding: 12px 14px 16px">
              <div class="small muted">{{ thaiDate(p.publishedAt) }}</div>
              <h3 style="font-size: 14px; margin-top: 4px; line-height: 1.45">{{ p.title }}</h3>
            </div>
          </NuxtLink>
        </div>
      </section>
    </article>
  </div>
</template>

<script setup lang="ts">
import type { Post } from '~/server/utils/types'

const route = useRoute()
const { data, error } = await useFetch<{ post: Post; related: Post[] }>(() => `/api/posts/${String(route.params.slug || '').replace(/\/+$/, '')}`)
if (error.value) throw createError({ statusCode: 404, statusMessage: 'ไม่พบบทความนี้', fatal: true })

const post = computed(() => data.value?.post)
const related = computed(() => data.value?.related || [])

useHead(() => ({ title: post.value?.title || 'บทความ' }))
</script>

<style scoped>
@media (max-width: 760px) { .rel-grid { grid-template-columns: 1fr !important; } }
</style>
