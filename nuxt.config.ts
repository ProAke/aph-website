// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: false },

  css: ['~/assets/css/main.css'],

  app: {
    head: {
      htmlAttrs: { lang: 'th' },
      title: 'APH Interactive | จำหน่ายสินค้า Electronic',
      titleTemplate: '%s | APH Interactive',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content:
            'APH Interactive ผู้นำเข้าและจัดจำหน่ายหัวต่อสัญญาณ Amphenol XLR, Ethernet, Loudspeaker, Power, Multipin, Mini XLR และ Dante สำหรับงานเสียงมืออาชีพ'
        },
        { name: 'theme-color', content: '#0f1b2d' },
        { property: 'og:site_name', content: 'APH Interactive' },
        { property: 'og:type', content: 'website' }
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@300;400;500;600;700&family=Inter:wght@400;500;600;700&display=swap'
        }
      ]
    }
  },

  runtimeConfig: {
    // NUXT_DB_HOST / NUXT_DB_PORT / NUXT_DB_USER / NUXT_DB_PASSWORD / NUXT_DB_NAME
    db: {
      host: process.env.NUXT_DB_HOST || '127.0.0.1',
      port: Number(process.env.NUXT_DB_PORT || 3306),
      user: process.env.NUXT_DB_USER || 'aph',
      password: process.env.NUXT_DB_PASSWORD || '',
      database: process.env.NUXT_DB_NAME || 'aph_website'
    },
    // set APH_DATA_SOURCE=json to force the bundled snapshot (no database)
    dataSource: process.env.APH_DATA_SOURCE || 'auto'
  },

  nitro: {
    compressPublicAssets: true
  },

  vite: {
    server: {
      allowedHosts: true
    }
  },

  experimental: {
    payloadExtraction: false
  }
})
