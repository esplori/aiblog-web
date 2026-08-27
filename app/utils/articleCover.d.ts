export interface ArticleCoverTheme {
  key: string
  label: string
  icon: string
  background: string
  surface: string
  foreground: string
  muted: string
  accent: string
  grid: string
}

export function getArticleCoverTheme(categoryName?: string, articleId?: number): ArticleCoverTheme
export function formatArticleNumber(articleId: number): string
export function formatCompactCount(value: number): string
export function reportCoverImageFailure(
  logger: Pick<Console, 'warn'>,
  article: { id: number; coverImage?: string },
): void
