// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  devtools: { enabled: true },

  // 指定源码目录（Docker 构建时 WORKDIR /app/app）
  srcDir: 'app',

  vite: {
    vue: {
      script: {
        // 禁用宏变换以避免 TypeScript 配置文件缺失问题
        defineModel: false,
        propsDestructure: false,
      },
    },
    // 开发环境代理配置
    server: {
      proxy: {
        '/api': {
          target: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:8080',
          changeOrigin: true,
        },
      },
    },
  },

  modules: [
    '@nuxtjs/tailwindcss',
    '@element-plus/nuxt',
    '@pinia/nuxt',
    '@nuxt/icon',
  ],

  // SSR 模式
  ssr: true,

  // 运行时配置
  runtimeConfig: {
    // 服务器端（SSR）访问后端的内部地址，浏览器不可见
    apiBaseInternal: process.env.NUXT_API_BASE_INTERNAL || 'http://localhost:8080',
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:8080',
      // 站点品牌配置（可换肤换名：不同客户部署时只需在 .env 覆盖，无需改代码）
      site: {
        name: process.env.NUXT_PUBLIC_SITE_NAME || 'Pylox',
        tagline: process.env.NUXT_PUBLIC_SITE_TAGLINE || 'AI 驱动的现代化博客系统',
        description: process.env.NUXT_PUBLIC_SITE_DESCRIPTION || 'Pylox — AI 驱动的现代化博客系统，分享技术、生活与思考',
        // 品牌主色（十六进制），供 CSS 变量渲染，覆盖后整体换肤
        brandColor: process.env.NUXT_PUBLIC_SITE_BRAND_COLOR || '#2563eb',
        // 白标外观（可选，.env 覆盖作部署级默认；运行时可在后台站点设置覆盖）
        logoUrl: process.env.NUXT_PUBLIC_SITE_LOGO_URL || '',
        faviconUrl: process.env.NUXT_PUBLIC_SITE_FAVICON_URL || '',
        footerText: process.env.NUXT_PUBLIC_SITE_FOOTER_TEXT || '',
        copyright: process.env.NUXT_PUBLIC_SITE_COPYRIGHT || '',
        icp: process.env.NUXT_PUBLIC_SITE_ICP || '',
        // 前台模板：blog / corporate（企业官网）
        template: process.env.NUXT_PUBLIC_SITE_TEMPLATE || 'blog',
        // 企业模板联系方式
        contactPhone: process.env.NUXT_PUBLIC_SITE_CONTACT_PHONE || '',
        contactEmail: process.env.NUXT_PUBLIC_SITE_CONTACT_EMAIL || '',
        contactAddress: process.env.NUXT_PUBLIC_SITE_CONTACT_ADDRESS || '',
      },
    },
  },

  // Element Plus 配置
  elementPlus: {
    importStyle: 'css',
  },

  // Tailwind CSS 配置
  tailwindcss: {
    cssPath: '~/assets/css/main.css',
  },

  // 应用配置
  // 注意：title / description 等品牌相关 head 不在此静态配置，统一由
  // app.vue 的 useHead 在运行时读取 runtimeConfig 生成（避免构建期写死，
  // 使 .output 启动时注入 env 即可换名，无需重新构建）。
  app: {
    head: {
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
      // favicon 不在此静态配置，统一由 app.vue 按生效配置（DB 优先 > .env）注入，
      // 避免与运行时 favicon 重复导致浏览器取错。
    },
  },
})