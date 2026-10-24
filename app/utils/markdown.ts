import MarkdownIt from 'markdown-it'

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
})

/**
 * 将 Markdown 转换为 HTML
 */
export function renderMarkdown(content: string): string {
  if (!content) return ''
  return md.render(content)
}
/**
 * 对话气泡里的 Markdown。
 *
 * 和文章正文用**两套配置**，这点很关键：文章 `html: true` 是安全的（作者可控），
 * 而这里渲染的是模型输出 —— 可能被提示注入、也可能照抄用户贴给它的 HTML。
 * 直接 v-html 出去就是现成的 XSS 面，所以关掉原始 HTML，只保留 Markdown 语法。
 */
const chatMd = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,   // 对话里换行就该换行，不像文章那样要空行才分段
})

export function renderChatMarkdown(content: string): string {
  if (!content) return ''
  return chatMd.render(content)
}
