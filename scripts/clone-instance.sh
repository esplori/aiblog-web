#!/usr/bin/env bash
# aiblog 多实例一键创建器
# 给每个客户克隆一套完全隔离的实例（网络/数据卷/端口/主题/内容）。
# 支持两种 flavor:
#   enterprise (默认)  企业版镜像 ubuntu-aiblog-enterprise[-java]:latest
#   web                开源版镜像 ubuntu-aiblog-java / ubuntu-aiblog-web:latest
# 每个实例: 独立 compose project(aiblog-<name>) + 独立网络 + 独立 pgdata/redis/minio/uploads/initdb。
# 新实例 DB 由 initdb SQL 全新初始化(仅管理员账号+基础结构, 无业务内容), 首次登录走向导。
set -euo pipefail

usage() {
  cat >&2 <<'USAGE'
用法: clone-instance.sh <实例名> [--flavor web|enterprise] [--with-demo] [--dry-run]
       [--web PORT] [--api PORT] [--db PORT] [--redis PORT]
       [--minio PORT] [--minio-console PORT]

默认克隆出"干净空站"：仅管理员账号 + 后台菜单 + 角色，无分类/标签/站点设置，
由站点初始化向导填写。加 --with-demo 则带入源仓库的演示种子数据。
默认端口(冲突时自动顺延): web=3001 api=8081 db=5435 redis=6380 minio=9100 minio-console=9101
环境变量可覆盖: INSTANCES_ROOT / IMG_JAVA / IMG_WEB / INITDB_SOURCE / CLEAN_SEED / DB_USER / DB_PASSWORD
USAGE
}
log() { printf '[clone] %s\n' "$*"; }
die() { printf '错误: %s\n' "$*" >&2; exit 2; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# 中性种子：默认克隆出"干净空站"（仅管理员+菜单+角色，无业务/演示内容）
CLEAN_SEED="${CLEAN_SEED:-$SCRIPT_DIR/init-data-clean.sql}"

NAME="${1:-}"
[[ -n "$NAME" ]] || { usage; exit 2; }
shift
[[ "$NAME" =~ ^[a-z][a-z0-9_-]*$ ]] || die "实例名须以小写字母开头，只能含小写字母/数字/-/_"

FLAVOR="${FLAVOR:-enterprise}"
declare -A P=([web]=3001 [api]=8081 [db]=5435 [redis]=6380 [minio]=9100 [minio_console]=9101)
declare -A EXPLICIT=()
DRY_RUN=false
WITH_DEMO=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --flavor) [[ $# -ge 2 ]] || die "--flavor 需要参数"; FLAVOR="$2"; shift 2 ;;
    --with-demo) WITH_DEMO=true; shift ;;
    --web|--api|--db|--redis|--minio|--minio-console)
      [[ $# -ge 2 && "$2" =~ ^[0-9]+$ ]] || die "$1 需要数字端口"
      key="${1#--}"; key="${key//-/_}"; P[$key]="$2"; EXPLICIT[$key]=1; shift 2 ;;
    --dry-run) DRY_RUN=true; shift ;;
    -h|--help) usage; exit 0 ;;
    *) die "未知参数 $1" ;;
  esac
done

case "$FLAVOR" in
  enterprise)
    IMG_JAVA="${IMG_JAVA:-ubuntu-aiblog-enterprise-java:latest}"
    IMG_WEB="${IMG_WEB:-ubuntu-aiblog-enterprise:latest}"
    INITDB_SOURCE="${INITDB_SOURCE:-$HOME/aiblog-enterprise-java/src/main/resources}"
    DB_USER="${DB_USER:-aiblog}"; DB_PASSWORD="${DB_PASSWORD:-aiblog}"
    JAVA_INTERNAL_PORT=8081; JAVA_UPLOADS=/app/uploads ;;
  web)
    IMG_JAVA="${IMG_JAVA:-ubuntu-aiblog-java:latest}"
    IMG_WEB="${IMG_WEB:-ubuntu-aiblog-web:latest}"
    INITDB_SOURCE="${INITDB_SOURCE:-$HOME/aiblog-java/docker/initdb}"
    DB_USER="${DB_USER:-postgres}"; DB_PASSWORD="${DB_PASSWORD:-postgres}"
    JAVA_INTERNAL_PORT=8080; JAVA_UPLOADS=/home/ubuntu/aiblog-java/uploads ;;
  *) die "未知 flavor: $FLAVOR (可选 web|enterprise)" ;;
esac

ROOT="${INSTANCES_ROOT:-$HOME/instances}"
BASE_DIR="$ROOT/$NAME"
PORT_FILE="$ROOT/.ports"

port_in_use() {
  local port="$1" other
  while read -r other; do [[ "$other" == "$port" ]] && return 0; done \
    < <(awk '{for (i=2;i<=NF;i++) print $i}' "$PORT_FILE" 2>/dev/null || true)
  if command -v ss >/dev/null 2>&1 && ss -ltnH 2>/dev/null | awk '{print $4}' | grep -Eq ":${port}$"; then
    return 0
  fi
  return 1
}
# 未显式指定任何端口时，自动整体顺延直到全部空闲
if [[ ! -v EXPLICIT[web] && ! -v EXPLICIT[api] && ! -v EXPLICIT[db] && ! -v EXPLICIT[redis] && ! -v EXPLICIT[minio] && ! -v EXPLICIT[minio_console] ]]; then
  while :; do
    busy=false
    for key in web api db redis minio minio_console; do
      if port_in_use "${P[$key]}"; then busy=true; fi
    done
    if ! $busy; then break; fi
    for key in web api db redis minio minio_console; do P[$key]=$((P[$key]+1)); done
  done
fi
for key in web api db redis minio minio_console; do
  if (( P[$key] < 1 || P[$key] > 65535 )); then die "${key} 端口无效: ${P[$key]}"; fi
done
if [[ -e "$BASE_DIR" && "$DRY_RUN" == false ]]; then die "实例目录已存在: $BASE_DIR"; fi

log "创建实例 [$NAME] flavor=$FLAVOR web=${P[web]} api=${P[api]} db=${P[db]} redis=${P[redis]} minio=${P[minio]}/${P[minio_console]}"
mkdir -p "$BASE_DIR"/{pgdata,uploads,minio-data,initdb}

if [[ -f "$INITDB_SOURCE/schema.sql" ]]; then
  SCHEMA_FILE="$INITDB_SOURCE/schema.sql"
else
  SCHEMA_FILE="$INITDB_SOURCE/01-schema.sql"
fi
[[ -f "$SCHEMA_FILE" ]] || die "找不到 schema.sql: $INITDB_SOURCE"
cp "$SCHEMA_FILE" "$BASE_DIR/initdb/01-schema.sql"

if $WITH_DEMO; then
  if [[ -f "$INITDB_SOURCE/init-data.sql" ]]; then
    SEED_FILE="$INITDB_SOURCE/init-data.sql"
  else
    SEED_FILE="$INITDB_SOURCE/02-init-data.sql"
  fi
  [[ -f "$SEED_FILE" ]] || die "找不到演示种子: $INITDB_SOURCE"
  log "种子: 演示内容 (--with-demo)"
else
  SEED_FILE="$CLEAN_SEED"
  [[ -f "$SEED_FILE" ]] || die "找不到中性种子: $SEED_FILE"
  log "种子: 中性空站 (默认，仅管理员+菜单+角色)"
fi
cp "$SEED_FILE" "$BASE_DIR/initdb/02-init-data.sql"
log "已复制初始化 SQL: 01-schema.sql 02-init-data.sql"

JWT="$(openssl rand -hex 32)"

cat > "$BASE_DIR/docker-compose.yml" <<YML
services:
  java:
    image: $IMG_JAVA
    container_name: ${NAME}-java
    ports: ["${P[api]}:${JAVA_INTERNAL_PORT}"]
    environment:
      SPRING_PROFILES_ACTIVE: prod
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/aiblog
      SPRING_DATASOURCE_USERNAME: $DB_USER
      SPRING_DATASOURCE_PASSWORD: $DB_PASSWORD
      SPRING_JPA_HIBERNATE_DDL_AUTO: none
      SPRING_SQL_INIT_MODE: never
      REDIS_HOST: redis
      REDIS_PORT: 6379
      MINIO_HOST: minio
      MINIO_ACCESS_KEY: minioadmin
      MINIO_SECRET_KEY: minioadmin
      MINIO_BUCKET: aiblog
      JWT_SECRET: $JWT
      NUXT_API_BASE_INTERNAL: http://java:${JAVA_INTERNAL_PORT}
    volumes: ["$BASE_DIR/uploads:$JAVA_UPLOADS"]
    depends_on:
      postgres: {condition: service_healthy}
      redis: {condition: service_healthy}
      minio: {condition: service_healthy}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "nc", "-z", "127.0.0.1", "${JAVA_INTERNAL_PORT}"]
      interval: 15s
      timeout: 3s
      retries: 5
      start_period: 60s
  web:
    image: $IMG_WEB
    container_name: ${NAME}-web
    ports: ["${P[web]}:3000"]
    environment:
      API_BACKEND_HOST: java
      NUXT_API_BASE_INTERNAL: http://java:${JAVA_INTERNAL_PORT}
    volumes: ["$BASE_DIR/uploads:/app/uploads:ro"]
    depends_on:
      java: {condition: service_healthy}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "nc", "-z", "127.0.0.1", "3000"]
      interval: 15s
      timeout: 3s
      retries: 5
      start_period: 60s
  postgres:
    image: postgres:16-alpine
    container_name: ${NAME}-postgres
    ports: ["${P[db]}:5432"]
    environment:
      POSTGRES_DB: aiblog
      POSTGRES_USER: $DB_USER
      POSTGRES_PASSWORD: $DB_PASSWORD
    volumes:
      - "$BASE_DIR/pgdata:/var/lib/postgresql/data"
      - "$BASE_DIR/initdb:/docker-entrypoint-initdb.d:ro"
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $DB_USER -d aiblog"]
      interval: 10s
      timeout: 3s
      retries: 5
  redis:
    image: redis:7-alpine
    container_name: ${NAME}-redis
    ports: ["${P[redis]}:6379"]
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5
  minio:
    image: minio/minio:latest
    container_name: ${NAME}-minio
    ports: ["${P[minio]}:9000", "${P[minio_console]}:9001"]
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    volumes: ["$BASE_DIR/minio-data:/data"]
    command: server /data --console-address :9001
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://127.0.0.1:9000/minio/health/live || exit 1"]
      interval: 15s
      timeout: 3s
      retries: 5
      start_period: 20s
YML

if [[ "$DRY_RUN" == false ]]; then
  command -v docker >/dev/null 2>&1 || die "未找到 docker"
  docker compose -p "aiblog-$NAME" -f "$BASE_DIR/docker-compose.yml" config >/dev/null \
    || die "compose 配置校验失败"
  log "compose 配置校验通过"
  [[ -f "$PORT_FILE" ]] || : > "$PORT_FILE"
  printf '%s %s %s %s %s %s %s\n' \
    "$NAME" "${P[web]}" "${P[api]}" "${P[db]}" "${P[redis]}" "${P[minio]}" "${P[minio_console]}" \
    >> "$PORT_FILE"
fi

cat <<EOF
实例 [$NAME] 已就绪 (flavor=$FLAVOR)
  前端  http://localhost:${P[web]}
  接口  http://localhost:${P[api]}
  PG    localhost:${P[db]} (库 aiblog / ${DB_USER})
  MinIO localhost:${P[minio]} (控制台 ${P[minio_console]})
  数据目录 $BASE_DIR
启动: docker compose -p aiblog-$NAME -f $BASE_DIR/docker-compose.yml up -d
EOF
