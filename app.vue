<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
const { init } = useCart()
onMounted(() => init())

// ── analytics continuity ────────────────────────────────────────────────
// The same GTM container / GA4 property as WordPress keeps running, so the
// switch-over does not create a data gap or a "new site" signal.
const cfg = useRuntimeConfig().public
useHead({
  meta: cfg.robotsNoindex ? [{ name: 'robots', content: 'noindex, nofollow, noarchive' }] : [],
  script: [
    cfg.gtmId && {
      hid: 'gtm',
      innerHTML: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${cfg.gtmId}');`,
      type: 'text/javascript'
    },
    cfg.gaId && {
      hid: 'ga4',
      src: `https://www.googletagmanager.com/gtag/js?id=${cfg.gaId}`,
      async: true
    },
    cfg.gaId && {
      hid: 'ga4-init',
      innerHTML: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${cfg.gaId}');`,
      type: 'text/javascript'
    }
  ].filter(Boolean) as any
})
</script>
