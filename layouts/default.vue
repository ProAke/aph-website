<template>
  <div class="app">
    <AppHeader :site="site" :categories="categories" />
    <main>
      <slot />
    </main>
    <AppFooter :site="site" :categories="categories" />
    <CartDrawer />
    <Transition name="fade">
      <div v-if="toastVisible" class="toast is-visible">{{ toastMessage }}</div>
    </Transition>
    <button class="to-top" :class="{ 'is-visible': showTop }" aria-label="กลับขึ้นด้านบน" @click="scrollTop">
      <Icon name="chevronDown" :size="20" :stroke="2" style="transform: rotate(180deg)" />
    </button>
  </div>
</template>

<script setup lang="ts">
const { data } = await useBootstrap()
const site = computed(() => data.value?.site || {})
const categories = computed(() => data.value?.categories || [])

const { message: toastMessage, visible: toastVisible } = useToast()
const showTop = ref(false)
const onScroll = () => { showTop.value = window.scrollY > 600 }
const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
})
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))
</script>

<style scoped>
.app { display: flex; flex-direction: column; min-height: 100vh; }
main { flex: 1; }
.fade-enter-active, .fade-leave-active { transition: opacity .2s; }
</style>
