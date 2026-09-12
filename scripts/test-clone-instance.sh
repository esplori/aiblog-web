#!/usr/bin/env bash
# clone-instance.sh 回归测试：全部 dry-run，不触碰 docker 与真实实例。
set -euo pipefail
SCRIPT="${1:?用法: test-clone-instance.sh <clone-instance.sh 路径>}"
SCRIPT="$(readlink -f "$SCRIPT")"
ENT_INIT="${ENT_INIT:-$HOME/aiblog-enterprise-java/src/main/resources}"
WEB_INIT="${WEB_INIT:-$HOME/aiblog-java/docker/initdb}"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT

clone() { # $1=initsrc, 其余为 clone-instance.sh 参数
  local initsrc="$1"; shift
  INSTANCES_ROOT="$TMP/instances" INITDB_SOURCE="$initsrc" bash "$SCRIPT" "$@"
}
fail() { echo "FAIL: $*" >&2; exit 1; }

# 1) enterprise 默认 flavor
out=$(clone "$ENT_INIT" demo --dry-run)
grep -qF '实例 [demo] 已就绪 (flavor=enterprise)' <<<"$out" || fail "缺少就绪输出"
grep -Eq '前端  http://localhost:[0-9]+' <<<"$out" || fail "缺少前端地址"
grep -Eq '接口  http://localhost:[0-9]+' <<<"$out" || fail "缺少接口地址"
grep -qF 'ubuntu-aiblog-enterprise-java:latest' "$TMP/instances/demo/docker-compose.yml" || fail "企业版 java 镜像错误"
grep -qF 'SPRING_DATASOURCE_USERNAME: aiblog' "$TMP/instances/demo/docker-compose.yml" || fail "企业版 DB 用户错误"
grep -qF '8081' "$TMP/instances/demo/docker-compose.yml" || fail "企业版内部端口错误"
# 默认种子必须是"干净空站"：无业务/演示内容，保留系统结构
SEED="$TMP/instances/demo/initdb/02-init-data.sql"
grep -qi 'insert into categories' "$SEED" && fail "默认种子含业务分类"
grep -qi 'insert into tags' "$SEED" && fail "默认种子含业务标签"
grep -qi 'enterprise_settings' "$SEED" && fail "默认种子含站点设置"
grep -qi 'insert into users' "$SEED" || fail "默认种子缺管理员账号"
grep -qi 'insert into menus' "$SEED" || fail "默认种子缺后台菜单"
grep -qi 'insert into roles' "$SEED" || fail "默认种子缺角色"

# 1b) --with-demo 才带入演示内容
clone "$ENT_INIT" demod --with-demo --dry-run >/dev/null
grep -qi 'insert into categories' "$TMP/instances/demod/initdb/02-init-data.sql" || fail "--with-demo 未带入演示内容"

# 2) 非法实例名必须被拒绝
if clone "$ENT_INIT" BadName --dry-run >/dev/null 2>&1; then fail "非法实例名被接受"; fi

# 3) web flavor + 自定义端口
out=$(clone "$WEB_INIT" demo2 --flavor web --web 3010 --api 8090 --db 5440 \
  --redis 6390 --minio 9200 --minio-console 9201 --dry-run)
grep -qF '(flavor=web)' <<<"$out" || fail "web flavor 未生效"
grep -qF '前端  http://localhost:3010' <<<"$out" || fail "web 自定义端口未生效"
grep -qF 'ubuntu-aiblog-java:latest' "$TMP/instances/demo2/docker-compose.yml" || fail "开源版 java 镜像错误"
grep -qF 'SPRING_DATASOURCE_USERNAME: postgres' "$TMP/instances/demo2/docker-compose.yml" || fail "开源版 DB 用户错误"
grep -qF '8080' "$TMP/instances/demo2/docker-compose.yml" || fail "开源版内部端口错误"

# 4) 端口占用时自动顺延（用 .ports 占位默认端口）
printf 'busy 3001 8081 5435 6380 9100 9101\n' > "$TMP/instances/.ports"
out=$(clone "$ENT_INIT" demo3 --dry-run)
webport=$(sed -n 's/.*前端  http:\/\/localhost:\([0-9]*\).*/\1/p' <<<"$out")
[[ -n "$webport" && "$webport" != 3001 ]] || fail "端口未顺延 (webport=$webport)"

# 5) 未知 flavor 必须被拒绝
if clone "$ENT_INIT" demo4 --flavor nope --dry-run >/dev/null 2>&1; then fail "未知 flavor 被接受"; fi

echo 'clone-instance tests passed'
