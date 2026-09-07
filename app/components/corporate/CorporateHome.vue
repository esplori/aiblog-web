<script setup lang="ts">
import type { ArticleItem, PageResult } from '~/types'

// 企业官网首页：内容完全由后台"按分类的文章"驱动，无需另造内容模型。
// 约定分类名：核心服务(solutions) / 客户案例(cases) / 新闻资讯(news)。
const site = useSiteConfig()
const { name, tagline, description, brandColor, logoUrl } = site
const { contactPhone, contactEmail, contactAddress } = site

useSeoMeta({
  title: `${name} - ${tagline || '企业官网'}`,
  description: description,
})

const { get } = useApi()

// 拉取已发布文章，按分类归类到首页各板块
const { data: articlesData, pending } = useAsyncData(
  'corp-home-articles',
  () => get<PageResult<ArticleItem>>('/api/articles', { page: 1, size: 50, status: 'published' }),
  { default: () => ({ records: [] }) }
)

const articles = computed(() => (articlesData.value?.data as any)?.records || [])

const solutions = computed(() =>
  articles.value.filter((a) => a.category && ['核心服务', '解决方案'].includes(a.category.name)))
const cases = computed(() =>
  articles.value.filter((a) => a.category && ['客户案例', '成功案例'].includes(a.category.name)))
const news = computed(() =>
  articles.value.filter((a) => a.category && ['新闻资讯', '公司动态'].includes(a.category.name)).slice(0, 6))
// 关于：若配置了 description 用 description，否则取最新文章摘要占位（可后续配置化）
const heroStatement = tagline || description || `${name}，值得信赖的合作伙伴`
</script>

<template>
  <div class="bg-white text-gray-800">
    <!-- ══════════ Hero ══════════ -->
    <section id="home" class="relative overflow-hidden">
      <div
        class="absolute inset-0"
        :style="{
          background: `linear-gradient(135deg, ${brandColor} 0%, ${brandColor}33 55%, #ffffff 100%)`,
        }"
      />
      <div class="container relative py-24 lg:py-32 max-w-5xl">
        <div class="flex items-center gap-2 mb-6">
          <img v-if="logoUrl" :src="logoUrl" :alt="name" class="h-10 object-contain" />
          <span class="text-white/90 font-semibold tracking-wide">{{ name }}</span>
        </div>
        <h1 class="text-4xl md:text-5xl font-extrabold leading-tight text-gray-900 max-w-3xl">
          {{ heroStatement }}
        </h1>
        <p class="mt-6 text-lg text-gray-700 max-w-2xl">
          {{ description }}
        </p>
        <div class="mt-10 flex flex-wrap gap-4">
          <NuxtLink
            to="/#contact"
            class="px-6 py-3 rounded-lg font-semibold text-white shadow hover:opacity-90 transition-opacity"
            :style="{ backgroundColor: brandColor }"
          >获取方案咨询</NuxtLink>
          <NuxtLink
            v-if="solutions.length"
            to="/#solutions"
            class="px-6 py-3 rounded-lg font-semibold border border-gray-300 text-gray-800 hover:border-brand-500 hover:text-brand-600 transition-colors"
          >查看核心服务</NuxtLink>
        </div>
      </div>
    </section>

    <!-- ══════════ 核心服务(解决方案) ══════════ -->
    <section v-if="solutions.length" id="solutions" class="py-20">
      <div class="container max-w-6xl">
        <div class="text-center mb-12">
          <h2 class="text-3xl font-bold text-gray-900">核心服务</h2>
          <div class="mx-auto mt-3 h-1 w-12 rounded" :style="{ backgroundColor: brandColor }" />
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <NuxtLink
            v-for="s in solutions.slice(0, 3)"
            :key="s.id"
            :to="`/post/${s.uuid}`"
            class="group rounded-xl border border-gray-100 bg-gray-50 hover:shadow-lg transition-shadow p-6"
          >
            <div class="w-12 h-12 rounded-lg flex items-center justify-center text-white text-lg font-bold mb-4"
              :style="{ backgroundColor: brandColor }"
            >{{ s.title.charAt(0) }}</div>
            <h3 class="text-lg font-semibold text-gray-900 group-hover:text-brand-600 transition-colors">{{ s.title }}</h3>
            <p class="mt-2 text-sm text-gray-500 line-clamp-3">{{ s.excerpt }}</p>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- ══════════ 客户案例 ══════════ -->
    <section v-if="cases.length" id="cases" class="py-20 bg-gray-50">
      <div class="container max-w-6xl">
        <div class="text-center mb-12">
          <h2 class="text-3xl font-bold text-gray-900">客户案例</h2>
          <div class="mx-auto mt-3 h-1 w-12 rounded" :style="{ backgroundColor: brandColor }" />
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <NuxtLink
            v-for="c in cases.slice(0, 3)"
            :key="c.id"
            :to="`/post/${c.uuid}`"
            class="group rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-lg transition-shadow"
          >
            <div v-if="c.coverImage" class="aspect-video overflow-hidden bg-gray-100">
              <img :src="c.coverImage" :alt="c.title" class="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
            </div>
            <div v-else class="aspect-video flex items-center justify-center text-4xl text-white" :style="{ backgroundColor: brandColor }">
              {{ c.title.charAt(0) }}
            </div>
            <div class="p-5">
              <h3 class="font-semibold text-gray-900 group-hover:text-brand-600 transition-colors">{{ c.title }}</h3>
              <p class="mt-1 text-sm text-gray-500 line-clamp-2">{{ c.excerpt }}</p>
            </div>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- ══════════ 新闻资讯 ══════════ -->
    <section v-if="news.length" id="news" class="py-20">
      <div class="container max-w-6xl">
        <div class="text-center mb-12">
          <h2 class="text-3xl font-bold text-gray-900">新闻资讯</h2>
          <div class="mx-auto mt-3 h-1 w-12 rounded" :style="{ backgroundColor: brandColor }" />
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <NuxtLink
            v-for="n in news"
            :key="n.id"
            :to="`/post/${n.uuid}`"
            class="group p-5 rounded-lg border border-gray-100 hover:border-brand-300 transition-colors"
          >
            <span class="text-xs text-gray-400">{{ new Date(n.createdAt).toLocaleDateString() }}</span>
            <h3 class="mt-1 font-semibold text-gray-900 group-hover:text-brand-600 transition-colors line-clamp-2">{{ n.title }}</h3>
            <p class="mt-2 text-sm text-gray-500 line-clamp-2">{{ n.excerpt }}</p>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- ══════════ 关于我们 ══════════ -->
    <section id="about" class="py-20 bg-gray-50">
      <div class="container max-w-4xl text-center">
        <h2 class="text-3xl font-bold text-gray-900">关于我们</h2>
        <div class="mx-auto mt-3 h-1 w-12 rounded" :style="{ backgroundColor: brandColor }" />
        <p class="mt-6 text-gray-600 leading-relaxed">{{ description }}</p>
      </div>
    </section>

    <!-- ══════════ 联系我们 ══════════ -->
    <section id="contact" class="py-20">
      <div class="container max-w-5xl">
        <div class="rounded-2xl overflow-hidden shadow-lg">
          <div class="grid grid-cols-1 md:grid-cols-2">
            <div class="p-10 text-white flex flex-col justify-center gap-5"
              :style="{ background: `linear-gradient(135deg, ${brandColor}, ${brandColor}99)` }"
            >
              <h2 class="text-2xl font-bold">联系我们</h2>
              <p class="text-white/85">{{ name }} 期待为您服务，欢迎来电或留言咨询。</p>
            </div>
            <div class="p-10 bg-gray-50 space-y-4 text-gray-700">
              <div v-if="contactPhone" class="flex items-center gap-3">
                <span class="w-8 text-center" :style="{ color: brandColor }">☎</span>
                <a :href="`tel:${contactPhone}`" class="font-medium hover:text-brand-600">{{ contactPhone }}</a>
              </div>
              <div v-if="contactEmail" class="flex items-center gap-3">
                <span class="w-8 text-center" :style="{ color: brandColor }">✉</span>
                <a :href="`mailto:${contactEmail}`" class="hover:text-brand-600">{{ contactEmail }}</a>
              </div>
              <div v-if="contactAddress" class="flex items-center gap-3">
                <span class="w-8 text-center" :style="{ color: brandColor }">⌖</span>
                <span>{{ contactAddress }}</span>
              </div>
              <p v-if="!contactPhone && !contactEmail && !contactAddress" class="text-sm text-gray-400">
                请在后台"站点设置"中填写联系电话/邮箱，即可在此展示。
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
