<script setup lang="ts">
/**
 * 工作台 AI 对话。
 *
 * 聊天记录不在本站：两个用户体系没有合并，这里只做一层转发
 * （aiblog 登录用户 → pi 侧的 accountId = bl_<userId>），
 * 会话和消息都存在 pi-agent-web 那边。
 */
definePageMeta({ layout: 'workbench' })

import { renderChatMarkdown } from '~/utils/markdown'

const { get, post } = useApi()
const auth = useAuthStore()

interface Conv { id: string; title?: string | null; last_active_at?: number }
interface Msg { entryId?: string; role: string; text: string; at?: number | null; images?: string[]; tools?: string[] }
interface Artifact { path: string; name: string; bytes: number; kind: 'image' | 'file' }

/**
 * 渲染缓存：流式时每个 delta 都会触发重渲染，命中缓存就不用反复解析同一段文本。
 * 上限 200 条，超了整体清空 —— 对话里活不过这么多条，简单够用。
 */
const mdCache = new Map<string, string>()
const md = (text: string) => {
  let html = mdCache.get(text)
  if (html === undefined) {
    html = renderChatMarkdown(text)
    if (mdCache.size > 200) mdCache.clear()
    mdCache.set(text, html)
  }
  return html
}

const artifacts = ref<Artifact[]>([])
/** 图片的 blob 地址：Java 侧只认 Authorization 头，<img src> 带不了，只能 fetch 出来再显示 */
const blobUrls = reactive<Record<string, string>>({})

const artifactUrl = (p: string) =>
  `/api/agent/files/${encodeURIComponent(currentId.value)}/${p.split('/').map(encodeURIComponent).join('/')}`

const token = () => useCookie('token').value

const loadArtifacts = async (id: string) => {
  if (!id) { artifacts.value = []; return }
  try {
    const r = await get<any>(`/api/agent/conversations/${encodeURIComponent(id)}/artifacts`)
    artifacts.value = r.code === 200 ? (r.data?.items || []) : []
    // 只预取图片；其余等点击时再取，避免一进页面就拉一堆大文件
    for (const a of artifacts.value) {
      if (a.kind !== 'image' || blobUrls[a.path]) continue
      void fetchBlob(a.path)
    }
  } catch { artifacts.value = [] }
}

const fetchBlob = async (p: string): Promise<string> => {
  if (blobUrls[p]) return blobUrls[p]!
  const t = token()
  const res = await fetch(artifactUrl(p), { headers: t ? { authorization: `Bearer ${t}` } : {} })
  if (!res.ok) return ''
  const url = URL.createObjectURL(await res.blob())
  blobUrls[p] = url
  return url
}

/** 非图片：先取 blob 再触发下载，否则 <a href> 打不开（缺认证头） */
const download = async (a: Artifact) => {
  const url = await fetchBlob(a.path)
  if (!url) return
  const el = document.createElement('a')
  el.href = url
  el.download = a.name
  el.click()
}

const convs = ref<Conv[]>([])
const msgs = ref<Msg[]>([])
const currentId = ref('')
const input = ref('')
const sending = ref(false)
const err = ref('')
const listErr = ref('')
const bottom = ref<HTMLElement | null>(null)

const scrollDown = async () => {
  await nextTick()
  bottom.value?.scrollIntoView({ block: 'end' })
}

const loadConvs = async () => {
  listErr.value = ''
  try {
    const r = await get<any>('/api/agent/conversations', { limit: 50 })
    if (r.code !== 200) { listErr.value = r.message || '加载失败'; return }
    convs.value = r.data?.items || []
    if (!currentId.value && convs.value.length) await openConv(convs.value[0].id)
  } catch {
    listErr.value = '会话列表加载失败'
  }
}

const openConv = async (id: string) => {
  currentId.value = id
  err.value = ''
  try {
    const r = await get<any>(`/api/agent/conversations/${encodeURIComponent(id)}/messages`)
    if (r.code !== 200) { err.value = r.message || '历史加载失败'; msgs.value = []; return }
    msgs.value = (r.data?.items || []).filter((m: Msg) => m.role !== 'tool')
    void loadArtifacts(id)
    await scrollDown()
  } catch {
    err.value = '历史加载失败'
  }
}

const newConv = () => {
  currentId.value = ''; msgs.value = []; input.value = ''; err.value = ''
  artifacts.value = []
}

const send = async () => {
  const text = input.value.trim()
  if (!text || sending.value) return
  sending.value = true
  err.value = ''
  msgs.value.push({ role: 'user', text })
  input.value = ''
  await scrollDown()

  // 占位消息：delta 一路往里追加，用户能看到字一个个出来
  const answer = reactive<Msg>({ role: 'assistant', text: '' })
  msgs.value.push(answer)
  let gotAny = false

  try {
    const token = useCookie('token').value
    const res = await fetch('/api/agent/chat/stream', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ conversationId: currentId.value || undefined, text }),
    })
    if (!res.ok || !res.body) {
      err.value = res.status === 403 ? '登录已失效，请重新登录' : `请求失败（${res.status}）`
      return
    }
    const reader = res.body.getReader()
    const dec = new TextDecoder()
    let buf = ''
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buf += dec.decode(value, { stream: true })
      // SSE 以空行分隔事件；最后一段可能不完整，留到下一轮
      const chunks = buf.split('\n\n')
      buf = chunks.pop() ?? ''
      for (const chunk of chunks) {
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data:')) continue
          const raw = line.slice(5).trim()
          if (!raw) continue
          let ev: any
          try { ev = JSON.parse(raw) } catch { continue }
          if (ev.type === 'meta' && ev.conversationId) { currentId.value = ev.conversationId; continue }
          if (ev.type === 'delta' && ev.text) { answer.text += ev.text; gotAny = true; void scrollDown(); continue }
          if (ev.type === 'tool' && ev.name) {
            answer.tools = [...(answer.tools || []), `${ev.name} · ${ev.status}`]
            continue
          }
          if (ev.type === 'turn.end') {
            if (ev.status === 'error') err.value = ev.error || '模型没有返回内容'
            else if (!gotAny && !answer.text) err.value = '（空回复）'
            continue
          }
        }
      }
    }
    await scrollDown()
    void loadConvsTitle()
    void loadArtifacts(currentId.value)
  } catch {
    err.value = '发送失败，检查网络后重试'
  } finally {
    sending.value = false
  }
}

/** 新会话在第一轮之后才有标题，静默刷新列表但别把当前会话切走 */
const loadConvsTitle = async () => {
  try {
    const r = await get<any>('/api/agent/conversations', { limit: 50 })
    if (r.code === 200) convs.value = r.data?.items || []
  } catch { /* 标题刷新失败不影响对话 */ }
}

onMounted(() => {
  if (!auth.isLoggedIn) { navigateTo('/login'); return }
  void loadConvs()
})
</script>

<template>
  <div class="flex h-[calc(100vh-9rem)] gap-4">
    <!-- 会话列表 -->
    <aside class="hidden w-56 shrink-0 flex-col rounded-lg border border-slate-200 bg-white md:flex">
      <div class="flex items-center justify-between border-b border-slate-100 px-3 py-2">
        <span class="text-sm font-medium text-slate-700">会话</span>
        <button class="rounded px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50" @click="newConv">新建</button>
      </div>
      <div class="min-h-0 flex-1 overflow-y-auto p-1.5">
        <p v-if="listErr" class="px-2 py-3 text-xs text-rose-600">{{ listErr }}</p>
        <p v-else-if="!convs.length" class="px-2 py-3 text-xs text-slate-400">还没有会话</p>
        <button
          v-for="c in convs" :key="c.id"
          class="mb-0.5 block w-full truncate rounded px-2 py-1.5 text-left text-sm transition-colors"
          :class="c.id === currentId ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'"
          @click="openConv(c.id)"
        >{{ c.title || '未命名会话' }}</button>
      </div>
    </aside>

    <!-- 对话区 -->
    <section class="flex min-w-0 flex-1 flex-col rounded-lg border border-slate-200 bg-white">
      <header class="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
        <h1 class="text-sm font-semibold text-slate-800">AI 对话</h1>
        <span class="text-xs text-slate-400">{{ currentId || '新会话' }}</span>
      </header>

      <div class="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <p v-if="!msgs.length" class="mt-10 text-center text-sm text-slate-400">
          问点什么吧，比如「帮我总结今天的 AI 新闻」
        </p>
        <div v-for="(m, i) in msgs" :key="m.entryId || i" class="mb-3">
          <!-- 工具调用单独一行，放气泡外面：混在气泡里会和正文分不清哪句是回答 -->
          <div
            v-if="m.tools?.length"
            class="mb-1 flex flex-wrap gap-1.5"
            :class="m.role === 'user' ? 'justify-end' : 'justify-start'"
          >
            <span
              v-for="(t, k) in m.tools" :key="k"
              class="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500"
            >🔧 {{ t }}</span>
          </div>
          <div class="flex" :class="m.role === 'user' ? 'justify-end' : 'justify-start'">
            <div
              class="max-w-[80%] rounded-2xl px-3.5 py-2 text-sm"
              :class="m.role === 'user'
                ? 'whitespace-pre-wrap bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-800'"
            >
              <img v-for="(src, k) in m.images || []" :key="k" :src="src" alt="附件" class="mb-1.5 max-h-40 rounded">
              <div v-if="m.role === 'user'" class="whitespace-pre-wrap">{{ m.text }}</div>
              <div v-else class="bubble-md" v-html="md(m.text)" />
              <span v-if="m.role === 'assistant' && sending && !m.text" class="text-slate-400">…</span>
            </div>
          </div>
        </div>
        <div v-if="sending" class="text-xs text-slate-400">正在思考…</div>
        <p v-if="err" class="mt-2 rounded bg-rose-50 px-3 py-2 text-xs text-rose-700">{{ err }}</p>
        <div v-if="artifacts.length" class="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
          <div class="mb-1.5 text-[11px] text-slate-400">会话产物 · {{ artifacts.length }} 个文件</div>
          <div class="flex flex-wrap gap-2">
            <div
              v-for="a in artifacts" :key="a.path"
              class="max-w-[200px] cursor-pointer rounded-lg border border-slate-200 bg-white p-1.5 transition-colors hover:border-slate-300"
              @click="download(a)"
            >
              <img
                v-if="a.kind === 'image' && blobUrls[a.path]"
                :src="blobUrls[a.path]" :alt="a.name" class="mb-1 max-h-32 rounded object-cover"
              />
              <div v-else class="mb-1 grid h-14 place-items-center rounded bg-slate-100 text-[10px] text-slate-400">
                {{ (a.name.split('.').pop() || '').toUpperCase() }}
              </div>
              <div class="truncate text-[11px] text-slate-600" :title="a.name">{{ a.name }}</div>
              <div class="text-[10px] text-slate-400">{{ Math.max(1, Math.round(a.bytes / 1024)) }}KB</div>
            </div>
          </div>
        </div>

        <div ref="bottom" />
      </div>

      <footer class="border-t border-slate-100 p-3">
        <div class="flex items-end gap-2 rounded-lg border border-slate-200 p-1.5 focus-within:border-indigo-400">
          <textarea
            v-model="input" rows="2" placeholder="Enter 发送 · Shift+Enter 换行"
            class="max-h-32 min-h-[2.5rem] flex-1 resize-none border-0 px-2 py-1 text-sm outline-none"
            @keydown.enter.exact.prevent="send"
          />
          <button
            class="rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
            :disabled="sending || !input.trim()" @click="send"
          >发送</button>
        </div>
      </footer>
    </section>
  </div>
</template>

<style scoped>
/* 模型输出是 v-html 插入的，子元素不带 scoped 属性，必须 :deep() 穿透。
   对话气泡里的排版要紧凑：文章那套 2.5em 段距在这里会把气泡撑得很空。 */
.bubble-md :deep(p) { margin: 0 0 0.5em; }
.bubble-md :deep(p:last-child) { margin-bottom: 0; }
.bubble-md :deep(ul),
.bubble-md :deep(ol) { margin: 0.25em 0 0.5em; padding-left: 1.25em; }
.bubble-md :deep(ul) { list-style: disc; }
.bubble-md :deep(ol) { list-style: decimal; }
.bubble-md :deep(li) { margin: 0.15em 0; }
.bubble-md :deep(h1),
.bubble-md :deep(h2),
.bubble-md :deep(h3) { margin: 0.6em 0 0.3em; font-weight: 600; line-height: 1.35; }
.bubble-md :deep(h1) { font-size: 1.05em; }
.bubble-md :deep(h2) { font-size: 1em; }
.bubble-md :deep(h3) { font-size: 0.95em; }
.bubble-md :deep(code) {
  border-radius: 0.25rem; background: rgb(226 232 240); padding: 0.1em 0.3em;
  font-size: 0.9em; font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.bubble-md :deep(pre) {
  margin: 0.4em 0 0.5em; overflow-x: auto; border-radius: 0.375rem;
  background: rgb(30 41 59); padding: 0.6em 0.75em; color: rgb(226 232 240);
}
.bubble-md :deep(pre code) { background: transparent; padding: 0; color: inherit; }
.bubble-md :deep(blockquote) {
  margin: 0.4em 0; border-left: 3px solid rgb(203 213 225); padding-left: 0.7em; color: rgb(71 85 105);
}
.bubble-md :deep(a) { color: rgb(79 70 229); text-decoration: underline; text-underline-offset: 2px; }
.bubble-md :deep(table) { margin: 0.4em 0; border-collapse: collapse; font-size: 0.92em; display: block; overflow-x: auto; }
.bubble-md :deep(th),
.bubble-md :deep(td) { border: 1px solid rgb(203 213 225); padding: 0.25em 0.5em; }
.bubble-md :deep(th) { background: rgb(241 245 249); font-weight: 600; }
.bubble-md :deep(hr) { margin: 0.6em 0; border: 0; border-top: 1px solid rgb(203 213 225); }
</style>
