#!/bin/sh
# 多实例启动入口：用环境变量 API_BACKEND_HOST 生成 nginx 配置（默认 aiblog-java），
# 使同一镜像可克隆出各自指向本实例后端的多个站点。
set -e

API_HOST="${API_BACKEND_HOST:-aiblog-java}"
sed "s|@API_BACKEND_HOST@|${API_HOST}|g" /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

# 启动 Nuxt SSR（内部 3001）+ nginx（前台 3000）
PORT=3001 node .output/server/index.mjs &
nginx -g 'daemon off;'
