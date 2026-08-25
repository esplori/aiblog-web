# 多阶段构建：Node构建 + Node运行（SSR模式）
FROM node:22-alpine AS builder

# 安装pnpm
RUN npm install -g pnpm

# 设置工作目录
WORKDIR /app

# 复制依赖文件与工作区配置（含 allowBuilds: esbuild: true）
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# 安装依赖（pnpm-workspace.yaml 中已配置 allowBuilds: esbuild: true）
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY . .

# Nuxt 3 支持 srcDir 配置，在 /app 目录下构建（package.json 和 nuxt.config.ts 所在位置）
# Nuxt 会根据 srcDir: 'app' 自动找到源码目录
# 修复了 tsconfig.json，不再需要 nuxt prepare 生成类型文件
RUN pnpm build

# 运行阶段
FROM node:22-alpine

# 安装必要工具 + nginx
RUN apk add --no-cache curl tzdata nginx

# 设置时区
ENV TZ=Asia/Shanghai
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# 设置工作目录
WORKDIR /app

# 从构建阶段复制构建产物
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/package.json ./

# 复制 nginx 配置
COPY nginx.conf /etc/nginx/nginx.conf

# 创建 nginx 运行目录
RUN mkdir -p /var/lib/nginx/tmp/client_body \
    /var/lib/nginx/tmp/proxy \
    /var/lib/nginx/tmp/fastcgi \
    /var/lib/nginx/tmp/uwsgi \
    /var/lib/nginx/tmp/scgi \
    /var/log/nginx \
    /var/run/nginx && \
    chown -R nobody:nogroup /var/lib/nginx /var/log/nginx /var/run/nginx

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000 || exit 1

# 启动命令：先启动 Nuxt 服务器（内部端口 3001），再启动 nginx（前台端口 3000）
CMD ["sh", "-c", "PORT=3001 node .output/server/index.mjs & nginx -g 'daemon off;'"]