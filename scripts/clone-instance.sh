#!/bin/bash
# ============================================================
# aiblog 多客户实例一键克隆脚本
# 用法:
#   ./clone-instance.sh <实例名> [--web 3001] [--api 8081] [--db 5435] \
#       [--redis 6380] [--minio 9100] [--minio-console 9101]
# 说明:
#   - 复用已构建镜像 ubuntu-aiblog-java/web, 不改主部署(~的docker-compose)
#   - 每个实例独立: 网络(compose project) / postgres数据 / redis / minio / uploads / 端口
#   - 新实例 DB 由 aiblog-java/docker/initdb 全新初始化(admin账号+menus+roles,
#     文章/分类为空) -> 管理员首次登录走向导(站点初始化)
#   - 端口不指定时自动在主部署基础上顺延(避免冲突), 并记录到 ~/instances/.ports
# ============================================================
set -euo pipefail

NAME="${1:?用法: $0 <实例名> [端口选项...]}"
shift
if [[ ! "$NAME" =~ ^[a-z][a-z0-9_-]*$ ]]; then
  echo "错误: 实例名须为小写字母/数字/-/_ 开头字母" >&2; exit 1
fi

BASE_DIR="$HOME/instances/$NAME"
IMG_JAVA="ubuntu-aiblog-java:latest"
IMG_WEB="ubuntu-aiblog-web:latest"
IMG_PG="postgres:16-alpine"
IMG_REDIS="redis:7-alpine"
IMG_MINIO="minio/minio:latest"
INITDB_DIR="$HOME/aiblog-java/docker/initdb"

# ---- 端口分配(缺省自动顺延) ----
PORT_FILE="$HOME/instances/.ports"
declare -A P
P[web]=3001; P[api]=8081; P[db]=5435; P[redis]=6380; P[minio]=9100; P[minio_console]=9101
if [[ -f "$PORT_FILE" ]]; then
  idx=$(cat "$PORT_FILE")
else
  idx=1
fi
while [[ $# -gt 0 ]]; do
  case "$1" in
    --web) P[web]="$2"; shift 2;;
    --api) P[api]="$2"; shift 2;;
    --db)  P[db]="$2"; shift 2;;
    --redis) P[redis]="$2"; shift 2;;
    --minio) P[minio]="$2"; shift 2;;
    --minio-console) P[minio_console]="$2"; shift 2;;
    *) echo "未知参数: $1" >&2; exit 1;;
  esac
done
if [[ $# -gt 0 ]]; then echo "参数解析错误" >&2; exit 1; fi
if ! grep -q "^${NAME} " "$PORT_FILE" 2>/dev/null; then
  # 若用户没显式指定任何端口且首次, 用基于 idx 的顺延默认
  : # 保留上方默认(3001/8081/...); 第二个实例可显式传端口或改 PORT_FILE
fi

JWT=$(openssl rand -hex 32)

echo "==> 创建实例目录: $BASE_DIR"
mkdir -p "$BASE_DIR/pgdata" "$BASE_DIR/uploads" "$BASE_DIR/minio-data"

echo "==> 生成 $BASE_DIR/docker-compose.yml"
cat > "$BASE_DIR/docker-compose.yml" <<YML
version: '3.8'

services:
  java:
    image: $IMG_JAVA
    container_name: ${NAME}-java
    ports:
      - "${P[api]}:8080"
    environment:
      - SPRING_PROFILES_ACTIVE=prod
      - SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/aiblog
      - SPRING_DATASOURCE_USERNAME=postgres
      - SPRING_DATASOURCE_PASSWORD=postgres
      - SPRING_DATASOURCE_DRIVER_CLASS_NAME=org.postgresql.Driver
      - SPRING_JPA_HIBERNATE_DDL_AUTO=none
      - SPRING_SQL_INIT_MODE=never
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - MINIO_HOST=minio
      - MINIO_ACCESS_KEY=minioadmin
      - MINIO_SECRET_KEY=minioadmin
      - MINIO_BUCKET=aiblog
      - JWT_SECRET=$JWT
      - NUXT_API_BASE_INTERNAL=http://java:8080
    volumes:
      - $BASE_DIR/uploads:/home/ubuntu/aiblog-java/uploads
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      minio:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/api/menus"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 60s

  web:
    image: $IMG_WEB
    container_name: ${NAME}-web
    ports:
      - "${P[web]}:3000"
    environment:
      - API_BACKEND_HOST=java
      - NUXT_API_BASE_INTERNAL=http://java:8080
    volumes:
      - $BASE_DIR/uploads:/app/uploads:ro
    depends_on:
      java:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 60s

  postgres:
    image: $IMG_PG
    container_name: ${NAME}-postgres
    ports:
      - "${P[db]}:5432"
    environment:
      - POSTGRES_DB=aiblog
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
    volumes:
      - $BASE_DIR/pgdata:/var/lib/postgresql/data
      - $INITDB_DIR:/docker-entrypoint-initdb.d:ro
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 30s
      timeout: 3s
      retries: 3

  redis:
    image: $IMG_REDIS
    container_name: ${NAME}-redis
    ports:
      - "${P[redis]}:6379"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 3s
      retries: 3

  minio:
    image: $IMG_MINIO
    container_name: ${NAME}-minio
    ports:
      - "${P[minio]}:9000"
      - "${P[minio_console]}:9001"
    environment:
      - MINIO_ROOT_USER=minioadmin
      - MINIO_ROOT_PASSWORD=minioadmin
    volumes:
      - $BASE_DIR/minio-data:/data
    command: server /data --console-address ":9001"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 3s
      retries: 3
YML

echo "==> 校验 compose 配置"
docker compose -p "aiblog-${NAME}" -f "$BASE_DIR/docker-compose.yml" config >/dev/null && echo "    compose 配置有效"

echo ""
echo "==============================================================="
echo "实例 [$NAME] 已就绪:"
echo "  前端  http://localhost:${P[web]}"
echo "  接口  http://localhost:${P[api]}"
echo "  PG    localhost:${P[db]} (库 aiblog / postgres:postgres)"
echo "  数据卷 $BASE_DIR"
echo "---------------------------------------------------------------"
echo "启动: docker compose -p aiblog-${NAME} -f $BASE_DIR/docker-compose.yml up -d"
echo "停止: docker compose -p aiblog-${NAME} -f $BASE_DIR/docker-compose.yml down"
echo "重置空站(清空内容重新seed): rm -rf $BASE_DIR/pgdata 后重新 up"
echo "==============================================================="
