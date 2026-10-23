/**
 * robots.txt 动态生成：Sitemap 一行必须是绝对地址，而站点域名只有请求进来才知道
 *（部署时没人手工改过域名，静态文件写死迟早写错）。
 */
export default defineEventHandler((event) => {
  const proto = getRequestHeader(event, 'x-forwarded-proto') || 'http'
  const host = getRequestHeader(event, 'x-forwarded-host') || getRequestHeader(event, 'host') || 'localhost'
  setHeader(event, 'content-type', 'text/plain; charset=utf-8')
  setHeader(event, 'cache-control', 'public, max-age=3600')
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /workbench',
    'Disallow: /login',
    '',
    `Sitemap: ${proto}://${host}/sitemap.xml`,
    '',
  ].join('\n')
})
