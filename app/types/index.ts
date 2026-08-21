// 通用响应类型
export interface ApiResponse<T> {
  code: number
  message: string
  data: T
  timestamp: number
}

// 分页响应
export interface PageResult<T> {
  records: T[]
  total: number
  current: number
  size: number
}

// 用户
export interface User {
  id: number
  username: string
  email: string
  displayName: string
  avatarUrl?: string
  bio?: string
  role: string
}

// 登录响应
export interface LoginData {
  accessToken: string
  refreshToken: string
  expiresIn: number
  userInfo: User
}

// 文章
export interface Article {
  id: number
  title: string
  content: string
  excerpt?: string
  slug: string
  coverImage?: string
  status: string
  isTop: boolean
  isOriginal: boolean
  viewCount: number
  likeCount: number
  commentCount: number
  authorId: number
  categoryId?: number
  tags?: string[]
  author?: User
  category?: Category
  createdAt: string
  updatedAt: string
}

// 文章列表项
export interface ArticleItem {
  id: number
  title: string
  excerpt?: string
  slug: string
  coverImage?: string
  status: string
  isTop: boolean
  viewCount: number
  likeCount: number
  commentCount: number
  authorId: number
  categoryId?: number
  tags?: string[]
  author?: User
  category?: Category
  createdAt: string
}

// 分类
export interface Category {
  id: number
  name: string
  slug: string
  description?: string
  articleCount: number
}

// 标签
export interface Tag {
  id: number
  name: string
  slug: string
  color?: string
  articleCount: number
}

// 评论
export interface Comment {
  id: number
  articleId: number
  userId?: number
  parentId?: number
  content: string
  nickname?: string
  status: string
  likeCount: number
  userInfo?: User
  createdAt: string
}

// 文件
export interface FileInfo {
  id: number
  originalFilename: string
  fileUrl: string
  fileSize: number
  mimeType: string
  fileType: string
  createdAt: string
}

// 文章请求
export interface ArticleRequest {
  title: string
  content: string
  excerpt?: string
  slug: string
  coverImage?: string
  status?: string
  isTop?: boolean
  isOriginal?: boolean
  sourceUrl?: string
  categoryId: number
  tagIds?: number[]
}

// 评论请求
export interface CommentRequest {
  articleId: number
  content: string
  parentId?: number
}
