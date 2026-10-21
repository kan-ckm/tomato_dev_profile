#!/usr/bin/env bash

# ==============================================================================
# Script điều khiển và triển khai Cụm Docker TomatoDevs Profile lên Homelab qua Tailscale
# Phương án A: Cloudflare Zero-Trust Tunnel + Cloudflare Edge SSL
# Vị trí: scripts/homelab/run.sh
# File cấu hình riêng tư: scripts/homelab/.env
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

if [ -f "${SCRIPT_DIR}/.env" ]; then
    # shellcheck disable=SC1091
    source "${SCRIPT_DIR}/.env"
fi

HOMELAB_HOST="${HOMELAB_HOST:-100.119.185.5}"
HOMELAB_USER="${HOMELAB_USER:-$(whoami)}"
HOMELAB_DIR="${HOMELAB_DIR:-~/profiletomato}"
DOMAIN_NAME="${DOMAIN_NAME:-tomatodev.me}"
REMOTE_TARGET="${HOMELAB_USER}@${HOMELAB_HOST}"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Kiểm tra kết nối SSH tới Homelab (Hỗ trợ phát hiện link xác thực Tailscale SSH)
check_connection() {
    if [ -z "${HOMELAB_HOST}" ]; then
        log_error "Chưa cấu hình HOMELAB_HOST!"
        echo "Vui lòng kiểm tra file cấu hình: ${SCRIPT_DIR}/.env"
        exit 1
    fi

    log_info "Kiểm tra phiên kết nối & đăng nhập tới Homelab (${REMOTE_TARGET})..."

    local auth_link=""
    local auth_needed=false
    local connected=false

    while IFS= read -r line || [ -n "$line" ]; do
        if [[ "$line" =~ (https://login\.tailscale\.com/a/[a-zA-Z0-9_-]+) ]]; then
            auth_needed=true
            auth_link="${BASH_REMATCH[1]}"
            echo ""
            echo -e "${YELLOW}┌────────────────────────────────────────────────────────────────────────┐${NC}"
            echo -e "${YELLOW}│  🔐 PHÁT HIỆN YÊU CẦU XÁC THỰC TAILSCALE SSH                           │${NC}"
            echo -e "${YELLOW}│                                                                        │${NC}"
            echo -e "${YELLOW}│  Vui lòng click hoặc truy cập liên kết sau trên trình duyệt để duyệt:  │${NC}"
            echo -e "${GREEN}│  👉 ${auth_link}${NC}"
            echo -e "${YELLOW}└────────────────────────────────────────────────────────────────────────┘${NC}"
            echo ""

            if command -v xdg-open >/dev/null 2>&1 && { [ -n "${DISPLAY:-}" ] || [ -n "${WAYLAND_DISPLAY:-}" ]; }; then
                log_info "Đang tự động mở liên kết đăng nhập trên trình duyệt của bạn..."
                xdg-open "${auth_link}" >/dev/null 2>&1 &
            fi
            log_info "Đang chờ bạn xác nhận cấp quyền trên trình duyệt..."
        elif [[ "$line" == *"__AUTH_OK__"* ]]; then
            connected=true
        else
            if [[ "$line" =~ "Tailscale SSH requires" ]]; then
                :
            elif [ -n "$line" ]; then
                echo -e "  ${line}"
            fi
        fi
    done < <(ssh -o ConnectTimeout=10 "${REMOTE_TARGET}" "echo '__AUTH_OK__'" 2>&1)

    if [ "$connected" = true ]; then
        if [ "$auth_needed" = true ]; then
            log_success "Xác thực Tailscale SSH thành công! Đã kết nối tới Homelab."
        else
            log_success "Phiên đăng nhập SSH tới Homelab sẵn sàng."
        fi
    else
        log_error "Không thể kết nối SSH tới Homelab (${REMOTE_TARGET})."
        log_warn "Hãy đảm bảo Tailscale đang bật trên cả 2 máy và bạn đã xác thực tài khoản."
        exit 1
    fi

    if ! ssh "${REMOTE_TARGET}" "which rsync" >/dev/null 2>&1; then
        log_warn "Homelab (${HOMELAB_HOST}) chưa được cài gói 'rsync'."
        log_info "Đang kích hoạt cài đặt rsync trên Homelab..."
        ssh -t "${REMOTE_TARGET}" "if which pacman >/dev/null 2>&1; then sudo pacman -S --noconfirm rsync; elif which apt >/dev/null 2>&1; then sudo apt update && sudo apt install -y rsync; fi"
        log_success "Đã cài đặt rsync trên Homelab thành công!"
    fi
}

# Đồng bộ mã nguồn & cấu hình .env từ máy local sang Homelab
sync_code() {
    log_info "Đang đồng bộ mã nguồn sang ${REMOTE_TARGET}:${HOMELAB_DIR}..."
    ssh "${REMOTE_TARGET}" "mkdir -p ${HOMELAB_DIR}"

    rsync -avz --delete \
        --exclude 'node_modules' \
        --exclude '.git' \
        --exclude '.next' \
        --exclude 'out' \
        --exclude 'build' \
        --exclude 'dist' \
        --exclude 'coverage' \
        --exclude '*.log' \
        --exclude '*.tsbuildinfo' \
        --exclude '.vscode' \
        --exclude '.idea' \
        --exclude '.backup' \
        --exclude 'docs' \
        --exclude 'scripts/homelab' \
        "${PROJECT_ROOT}/" "${REMOTE_TARGET}:${HOMELAB_DIR}/"

    log_success "Đã đồng bộ mã nguồn và tài nguyên (public/assets) hoàn tất."
}

# Tự động bật profile tunnel nếu đã có CLOUDFLARE_TUNNEL_TOKEN trong .env
get_compose_profile_args() {
    if [ -f "${PROJECT_ROOT}/.env" ]; then
        local val
        val="$(grep -E '^CLOUDFLARE_TUNNEL_TOKEN=' "${PROJECT_ROOT}/.env" | tail -n 1 | cut -d= -f2- | tr -d '"\r ' || true)"
        if [ -n "${val}" ] && [ "${val}" != "your_cloudflare_tunnel_token" ]; then
            echo "--profile tunnel"
            return
        fi
    fi
    echo ""
}

# Build và khởi chạy cụm Docker trên Homelab
cmd_up() {
    check_connection
    sync_code
    local profile_args
    profile_args="$(get_compose_profile_args)"
    log_info "Bắt đầu build (BuildKit Cache) và khởi động cụm Docker trên Homelab..."
    ssh -t "${REMOTE_TARGET}" "cd ${HOMELAB_DIR} && DOCKER_BUILDKIT=1 COMPOSE_DOCKER_CLI_BUILD=1 docker compose ${profile_args} up -d --build --remove-orphans"
    log_success "Hệ thống TomatoDevs Profile đã được triển khai thành công trên Homelab!"
    cmd_ps
    print_endpoints
}

# Gắn Cloudflare Tunnel Token vào .env và khởi chạy ngay lập tức trên Homelab
cmd_set_tunnel() {
    local token="${1:-}"
    if [ -z "${token}" ]; then
        log_error "Vui lòng truyền CLOUDFLARE_TUNNEL_TOKEN!"
        echo "Cách dùng: ./scripts/homelab/run.sh set-tunnel <TOKEN_CỦA_BẠN>"
        echo "  (Nếu bạn dán cả câu lệnh 'cloudflared service install eyJ...', script cũng tự động lọc lấy đúng phần token eyJ...)"
        exit 1
    fi

    # Tự động trích xuất chuỗi token eyJ... nếu người dùng copy cả câu lệnh từ Cloudflare Dashboard
    if [[ "${token}" =~ (eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]*|[a-zA-Z0-9_-]{80,}) ]]; then
        token="${BASH_REMATCH[1]}"
    fi

    local env_file="${PROJECT_ROOT}/.env"
    touch "${env_file}"

    if grep -q '^CLOUDFLARE_TUNNEL_TOKEN=' "${env_file}"; then
        sed -i "s|^CLOUDFLARE_TUNNEL_TOKEN=.*|CLOUDFLARE_TUNNEL_TOKEN=\"${token}\"|" "${env_file}"
    else
        echo "" >> "${env_file}"
        echo "# Cloudflare Zero-Trust Tunnel Token" >> "${env_file}"
        echo "CLOUDFLARE_TUNNEL_TOKEN=\"${token}\"" >> "${env_file}"
    fi

    log_success "Đã lưu CLOUDFLARE_TUNNEL_TOKEN vào ${env_file}."
    check_connection
    sync_code
    log_info "Đang khởi động container tomatodevs-tunnel trên Homelab..."
    ssh -t "${REMOTE_TARGET}" "cd ${HOMELAB_DIR} && docker compose --profile tunnel up -d --force-recreate cloudflared"
    sleep 3
    log_info "Trạng thái kết nối Cloudflare Tunnel:"
    ssh "${REMOTE_TARGET}" "docker logs --tail=20 tomatodevs-tunnel"
    log_success "Đã kích hoạt Cloudflare Tunnel thành công!"
}

# Dừng cụm Docker trên Homelab
cmd_down() {
    check_connection
    log_info "Đang dừng toàn bộ cụm Docker trên Homelab..."
    ssh -t "${REMOTE_TARGET}" "cd ${HOMELAB_DIR} && docker compose --profile tunnel down"
    log_success "Đã dừng cụm Docker trên Homelab."
}

# Khởi động lại cụm Docker
cmd_restart() {
    check_connection
    log_info "Khởi động lại cụm Docker trên Homelab..."
    ssh -t "${REMOTE_TARGET}" "cd ${HOMELAB_DIR} && docker compose restart"
    log_success "Đã khởi động lại cụm Docker."
}

# Xem logs
cmd_logs() {
    check_connection
    SERVICE="${1:-}"
    if [ -n "$SERVICE" ]; then
        log_info "Theo dõi log của service [${SERVICE}] trên Homelab..."
        ssh -t "${REMOTE_TARGET}" "cd ${HOMELAB_DIR} && docker compose logs -f ${SERVICE}"
    else
        log_info "Theo dõi log của toàn bộ hệ thống trên Homelab..."
        ssh -t "${REMOTE_TARGET}" "cd ${HOMELAB_DIR} && docker compose logs -f --tail=100"
    fi
}

# Xem trạng thái các container
cmd_ps() {
    check_connection
    log_info "Trạng thái các container TomatoDevs Profile trên Homelab:"
    ssh "${REMOTE_TARGET}" "cd ${HOMELAB_DIR} && docker compose ps"
}

# Chế độ tự động theo dõi thay đổi ở máy local và đẩy thẳng lên Homelab
cmd_watch() {
    check_connection
    log_info "Đang theo dõi thay đổi trong src/ và public/ (Nhấn Ctrl+C để dừng)..."
    local last_hash=""
    while true; do
        local current_hash
        current_hash="$(find "${PROJECT_ROOT}/src" "${PROJECT_ROOT}/public" -type f -printf '%T@ %p\n' 2>/dev/null | md5sum | awk '{print $1}')"
        if [ -n "${last_hash}" ] && [ "${current_hash}" != "${last_hash}" ]; then
            log_info "Phát hiện nội dung Profile vừa thay đổi! Đang tự động cập nhật lên Homelab..."
            cmd_up
        fi
        last_hash="${current_hash}"
        sleep 3
    done
}

# Dọn dẹp rác Docker trên Homelab
cmd_clean() {
    check_connection
    log_info "Dọn dẹp build cache và image cũ không dùng trên Homelab..."
    ssh -t "${REMOTE_TARGET}" "docker image prune -f"
    log_success "Đã dọn dẹp sạch dangling images trên Homelab."
}

# In thông tin các địa chỉ truy cập
print_endpoints() {
    echo ""
    echo -e "${GREEN}================================================================${NC}"
    echo -e "${GREEN}   CÁC ĐỊA CHỈ TRUY CẬP HỆ THỐNG TOMATODEVS PROFILE              ${NC}"
    echo -e "${GREEN}================================================================${NC}"
    echo -e "  🌍 Tên miền chính thức (SSL Cloudflare): https://${DOMAIN_NAME}"
    echo -e "  🌐 Gateway HTTP (Qua Tailscale):         http://${HOMELAB_HOST}:8080"
    echo -e "  🩺 Health Check API:                     http://${HOMELAB_HOST}:8080/api/health"
    echo -e "  🎵 Music Playlist API:                   http://${HOMELAB_HOST}:8080/api/music"
    echo -e "  📊 TikTok Stats API:                     http://${HOMELAB_HOST}:8080/api/tiktok-stats"
    echo -e "${GREEN}================================================================${NC}"
    echo ""
}

show_help() {
    echo "Sử dụng: ./scripts/homelab/run.sh <lệnh> [tham số]"
    echo ""
    echo "Các lệnh hỗ trợ:"
    echo "  up / deploy             : Đồng bộ code/assets mới nhất và build/chạy trên Homelab"
    echo "  set-tunnel <TOKEN>      : Lưu Cloudflare Tunnel Token và kích hoạt kết nối tới ${DOMAIN_NAME}"
    echo "  sync                    : Chỉ đồng bộ nhanh tài nguyên (public/assets) không cần build lại"
    echo "  watch                   : Tự động phát hiện khi bạn sửa nội dung và đẩy lên Homelab"
    echo "  down                    : Dừng toàn bộ các container trên Homelab"
    echo "  restart                 : Khởi động lại các container trên Homelab"
    echo "  logs [service]          : Xem log real-time (profile-app, nginx, cloudflared, redis)"
    echo "  ps / status             : Kiểm tra trạng thái các container trên Homelab"
    echo "  clean                   : Dọn dẹp dangling images trên Homelab"
    echo "  endpoints               : In danh sách URL truy cập"
    echo ""
    echo "Cấu hình hiện tại (${SCRIPT_DIR}/.env):"
    echo "  HOMELAB_HOST=${HOMELAB_HOST}"
    echo "  HOMELAB_USER=${HOMELAB_USER}"
    echo "  HOMELAB_DIR=${HOMELAB_DIR}"
    echo "  DOMAIN_NAME=${DOMAIN_NAME}"
}

COMMAND="${1:-help}"
case "${COMMAND}" in
    up|deploy)
        cmd_up
        ;;
    set-tunnel|tunnel)
        cmd_set_tunnel "${2:-}"
        ;;
    down)
        cmd_down
        ;;
    restart)
        cmd_restart
        ;;
    sync)
        check_connection
        sync_code
        ;;
    watch)
        cmd_watch
        ;;
    logs)
        cmd_logs "${2:-}"
        ;;
    ps|status)
        cmd_ps
        ;;
    clean)
        cmd_clean
        ;;
    endpoints)
        print_endpoints
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        log_error "Lệnh không hợp lệ: ${COMMAND}"
        show_help
        exit 1
        ;;
esac
