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

  /**
   * 页面缓存：内容型列表页走 SWR（stale-while-revalidate），
   * 过期后先返回旧 HTML、后台再生成新的 —— 访客不等，后端压力也小。
   *
   * 刻意不加缓存的：
   *  - /post/** 文章详情：埋点要在每次真实阅读时落库，缓存 HTML 会让后面的访客不触发埋点；
   *  - /workbench、/admin、/login：渲染带用户态，缓存会串号；
   *  - 题库详情页（interview 下的 slug 页）：含用户进度等交互态，先不缓存。
   */
  routeRules: {
    '/': { swr: 300 },
    '/articles': { swr: 300 },
    '/articles/**': { swr: 300 },
    '/interview': { swr: 300 },
    '/interview/companies': { swr: 300 },
    '/interview/topics': { swr: 300 },
    '/ai': { swr: 300 },
  },

  // 运行时配置
  runtimeConfig: {
    // 服务器端（SSR）访问后端的内部地址，浏览器不可见
    apiBaseInternal: process.env.NUXT_API_BASE_INTERNAL || 'http://localhost:8080',
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:8080',
      // 站点品牌配置（可换肤换名：不同客户部署时只需在 .env 覆盖，无需改代码）
      site: {
        name: process.env.NUXT_PUBLIC_SITE_NAME || 'javascript技术分享',
        tagline: process.env.NUXT_PUBLIC_SITE_TAGLINE || 'AI 驱动的现代化博客系统',
        description: process.env.NUXT_PUBLIC_SITE_DESCRIPTION || 'javascript技术分享 — AI 驱动的现代化博客系统，分享技术、生活与思考',
        // 品牌主色（十六进制），供 CSS 变量渲染，覆盖后整体换肤
        brandColor: process.env.NUXT_PUBLIC_SITE_BRAND_COLOR || '#2563eb',
        // 白标外观（可选，.env 覆盖作部署级默认；运行时可在后台站点设置覆盖）
        logoUrl: process.env.NUXT_PUBLIC_SITE_LOGO_URL || '',
        faviconUrl: process.env.NUXT_PUBLIC_SITE_FAVICON_URL || '',
        footerText: process.env.NUXT_PUBLIC_SITE_FOOTER_TEXT || '',
        copyright: process.env.NUXT_PUBLIC_SITE_COPYRIGHT || '',
        icp: process.env.NUXT_PUBLIC_SITE_ICP || '',
      },
      // 登录页开关(docs/login-redesign-plan.md §7.6):全部可在 .env 覆盖,便于按部署/客户差异化
      auth: {
        // 品牌侧是否展示。false ⇒ 退化为单卡片居中(接近改造前形态),也是**无需发版的回滚手段**
        brandPanel: process.env.NUXT_PUBLIC_AUTH_BRAND_PANEL !== 'false',
        // 后端目前**没有**「忘记密码」端点 ⇒ 默认空、不渲染入口(不发死链接)
        forgotPasswordUrl: process.env.NUXT_PUBLIC_AUTH_FORGOT_URL || '',
        // 后端目前**没有**验证码接口 ⇒ 默认关;后端就位后再置 true
        captchaEnabled: process.env.NUXT_PUBLIC_AUTH_CAPTCHA_ENABLED === 'true',
      },
      // 功能开关(部署级,默认全开;显式置 false 才关闭 → 无需发版即可关模块)
      features: {
        // 股票(持仓/盈亏)模块:关掉后侧边栏入口收起、/finance 重定向首页
        stockEnabled: process.env.NUXT_PUBLIC_STOCK_ENABLED !== 'false',
        // 登录入口 / 评论功能:默认关,后台「站点设置」可开;.env 只作后端不可达时的兜底
        loginEnabled: process.env.NUXT_PUBLIC_LOGIN_ENABLED === 'true',
        commentEnabled: process.env.NUXT_PUBLIC_COMMENT_ENABLED === 'true',
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
