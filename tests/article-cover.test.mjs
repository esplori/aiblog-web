import assert from 'node:assert/strict'
import test from 'node:test'

import {
  formatArticleNumber,
  formatCompactCount,
  getArticleCoverTheme,
  reportCoverImageFailure,
} from '../app/utils/articleCover.mjs'

test('maps known categories to distinct editorial themes', () => {
  const technology = getArticleCoverTheme('技术', 1)
  const life = getArticleCoverTheme('生活', 1)
  const thoughts = getArticleCoverTheme('随想', 1)

  assert.equal(technology.key, 'technology')
  assert.equal(life.key, 'life')
  assert.equal(thoughts.key, 'thoughts')
  assert.equal(new Set([technology.accent, life.accent, thoughts.accent]).size, 3)
})

test('uses a stable fallback theme for uncategorized articles', () => {
  const first = getArticleCoverTheme(undefined, 587)
  const second = getArticleCoverTheme('', 587)

  assert.equal(first.key, second.key)
  assert.equal(first.accent, second.accent)
})

test('formats editorial article numbers', () => {
  assert.equal(formatArticleNumber(7), 'NO. 0007')
  assert.equal(formatArticleNumber(587), 'NO. 0587')
  assert.equal(formatArticleNumber(12345), 'NO. 12345')
})

test('formats compact reading counts without fake precision', () => {
  assert.equal(formatCompactCount(0), '0')
  assert.equal(formatCompactCount(999), '999')
  assert.equal(formatCompactCount(1200), '1.2k')
  assert.equal(formatCompactCount(10800), '10.8k')
})

test('logs cover failures with useful article context', () => {
  const calls = []
  const logger = { warn: (...args) => calls.push(args) }

  reportCoverImageFailure(logger, { id: 587, coverImage: '/missing.webp' })

  assert.equal(calls.length, 1)
  assert.match(calls[0][0], /editorial fallback/i)
  assert.deepEqual(calls[0][1], {
    articleId: 587,
    coverImage: '/missing.webp',
  })
})
