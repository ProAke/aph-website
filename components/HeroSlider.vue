<template>
  <section class="hero" aria-label="โปรโมชัน">
    <div class="hero__viewport">
      <div
        v-for="(slide, i) in slides" :key="i"
        class="hero__slide" :class="[{ 'is-active': i === current }, slide.theme === 'light' ? 'hero__slide--light' : '']"
      >
        <div class="hero__bg">
          <img :src="slide.image" :alt="slide.title" referrerpolicy="no-referrer" loading="eager" />
        </div>
        <div class="container">
          <div class="hero__copy">
            <span class="hero__kicker">{{ slide.kicker }}</span>
            <h1 class="hero__title">{{ slide.title }}</h1>
            <p class="hero__subtitle">{{ slide.subtitle }}</p>
            <NuxtLink v-if="slide.link" :to="slide.link" class="btn">
              {{ slide.linkLabel }} <Icon name="arrowRight" :size="16" />
            </NuxtLink>
          </div>
        </div>
      </div>

      <div class="container hero__nav">
        <div class="hero__dots">
          <button
            v-for="(s, i) in slides" :key="i" :class="{ 'is-active': i === current }"
            :aria-label="`สไลด์ ${i + 1}`" @click="go(i)"
          />
        </div>
      </div>
      <button class="hero__arrow hero__arrow--prev" aria-label="ก่อนหน้า" @click="go(current - 1)">
        <Icon name="chevronLeft" :size="20" />
      </button>
      <button class="hero__arrow hero__arrow--next" aria-label="ถัดไป" @click="go(current + 1)">
        <Icon name="chevronRight" :size="20" />
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { Banner } from '~/server/utils/types'
const props = defineProps<{ slides: Banner[] }>()
const current = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

function go(i: number) {
  const len = props.slides.length || 1
  current.value = (i + len) % len
}
onMounted(() => {
  if (props.slides.length > 1) timer = setInterval(() => go(current.value + 1), 6500)
})
onBeforeUnmount(() => { if (timer) clearInterval(timer) })
</script>
