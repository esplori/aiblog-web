const COVER_THEMES = Object.freeze({
  technology: Object.freeze({
    key: 'technology',
    label: 'TECHNOLOGY',
    icon: 'ep:cpu',
    background: '#E7F3F1',
    surface: '#F7FBFA',
    foreground: '#102A2A',
    muted: '#50706D',
    accent: '#087F73',
    grid: 'rgba(8, 127, 115, 0.14)',
  }),
  life: Object.freeze({
    key: 'life',
    label: 'LIFE & WORK',
    icon: 'ep:compass',
    background: '#FBE9E5',
    surface: '#FFF8F6',
    foreground: '#351C24',
    muted: '#7A5961',
    accent: '#D24D40',
    grid: 'rgba(210, 77, 64, 0.14)',
  }),
  thoughts: Object.freeze({
    key: 'thoughts',
    label: 'IDEAS',
    icon: 'ep:reading',
    background: '#F8EDB8',
    surface: '#FFFBEA',
    foreground: '#17233C',
    muted: '#62697A',
    accent: '#2458A6',
    grid: 'rgba(36, 88, 166, 0.14)',
  }),
  studio: Object.freeze({
    key: 'studio',
    label: 'PYLOX JOURNAL',
    icon: 'ep:document',
    background: '#E9ECF2',
    surface: '#F8F9FB',
    foreground: '#20242D',
    muted: '#69707E',
    accent: '#48566A',
    grid: 'rgba(72, 86, 106, 0.14)',
  }),
})

const CATEGORY_THEME_KEYS = Object.freeze({
  技术: 'technology',
  生活: 'life',
  随想: 'thoughts',
})

const FALLBACK_THEME_KEYS = Object.freeze(['technology', 'life', 'thoughts', 'studio'])

export function getArticleCoverTheme(categoryName, articleId = 0) {
  const configuredKey = CATEGORY_THEME_KEYS[String(categoryName || '').trim()]
  const fallbackIndex = Math.abs(Number(articleId) || 0) % FALLBACK_THEME_KEYS.length
  return COVER_THEMES[configuredKey || FALLBACK_THEME_KEYS[fallbackIndex]]
}

export function formatArticleNumber(articleId) {
  const normalizedId = Math.max(0, Math.trunc(Number(articleId) || 0))
  return `NO. ${String(normalizedId).padStart(4, '0')}`
}

export function formatCompactCount(value) {
  const count = Math.max(0, Math.trunc(Number(value) || 0))
  if (count < 1000) return String(count)
  const compact = Math.round(count / 100) / 10
  return `${Number.isInteger(compact) ? compact.toFixed(0) : compact.toFixed(1)}k`
}

export function reportCoverImageFailure(logger, article) {
  logger.warn('[ArticleCover] Cover image failed; using editorial fallback.', {
    articleId: article.id,
    coverImage: article.coverImage,
  })
}
