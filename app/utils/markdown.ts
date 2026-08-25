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