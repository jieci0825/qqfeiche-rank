#!/usr/bin/env bash
set -euo pipefail
umask 077

cd -- "$1"
release=$2
mode=$3
release_dir=".releases/$release"

exec 9>.releases/lock
flock --exclusive 9

if [[ $mode == deploy ]]; then
    trap 'rm -f -- "$release_dir/images.tar.gz"' EXIT
fi

compose_release() {
    local version=$1
    shift
    RELEASE_TAG="$version" docker compose --project-name qqfeiche-rank --project-directory "$PWD" \
        --file ".releases/$version/compose.yaml" "$@"
}

set_current_release() {
    ln -sfn -- "$1" "$release_dir/.current-link"
    mv -Tf -- "$release_dir/.current-link" .releases/current
    ln -sfn -- .releases/current/compose.yaml "$release_dir/.compose-link"
    mv -Tf -- "$release_dir/.compose-link" compose.yaml
}

previous_image() {
    local container
    container=$(docker ps --all --quiet \
        --filter label=com.docker.compose.project=qqfeiche-rank \
        --filter "label=com.docker.compose.service=$1" \
        --filter label=com.docker.compose.oneoff=False)
    if [[ -n $container ]]; then
        docker inspect --format '{{.Image}}' "$container"
    fi
}

if [[ ! -r .env.production ]]; then
    echo "无法读取生产配置 $PWD/.env.production。" >&2
    exit 1
fi
docker network inspect gateway-net >/dev/null
compose_release "$release" config --quiet

if [[ $mode == deploy ]]; then
    started=$SECONDS
    echo '生产机开始导入镜像'
    docker image load --input "$release_dir/images.tar.gz"
    rm -- "$release_dir/images.tar.gz"
    echo "生产机导入镜像完成（$((SECONDS - started)) 秒）"
fi

for service in nginx api; do
    platform=$(docker image inspect --format '{{.Os}}/{{.Architecture}}' "qqfeiche-rank-$service:$release")
    if [[ $platform != linux/amd64 ]]; then
        echo "qqfeiche-rank-$service:$release 的架构为 $platform，生产环境需要 linux/amd64。" >&2
        exit 1
    fi
done

previous=$(readlink .releases/current || true)
if [[ $mode == deploy && -z $previous ]]; then
    nginx_image=$(previous_image qqfeiche-nginx)
    api_image=$(previous_image qqfeiche-api)
    if [[ -n $nginx_image && -n $api_image ]]; then
        previous="before-$release"
        mkdir -- ".releases/$previous"
        cp -- "$release_dir/compose.yaml" ".releases/$previous/compose.yaml"
        docker image tag "$nginx_image" "qqfeiche-rank-nginx:$previous"
        docker image tag "$api_image" "qqfeiche-rank-api:$previous"
        set_current_release "$previous"
    fi
fi

if [[ -n $previous && $previous != "$release" ]]; then
    echo "上一版本：$previous。确认数据库兼容后可执行 pnpm deploy:prod --rollback $previous"
fi

started=$SECONDS
echo '生产机开始启动容器并等待 API 就绪'
if ! compose_release "$release" up -d --no-build --pull never --wait --wait-timeout 60; then
    printf '容器未通过启动检查。在服务器上执行以下命令查看日志。\n' >&2
    printf 'cd %q && RELEASE_TAG=%q docker compose --project-directory "$PWD" -p qqfeiche-rank -f %q logs --tail 100\n' \
        "$PWD" "$release" "$release_dir/compose.yaml" >&2
    exit 1
fi
set_current_release "$release"
echo "生产机启动检查通过（$((SECONDS - started)) 秒）"
