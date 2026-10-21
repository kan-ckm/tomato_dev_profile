#!/usr/bin/env bash

# ==============================================================================
# BỘ CÔNG CỤ TEST TẢI TOÀN DIỆN CHO TOMATODEVS PROFILE
# Vị trí: scripts/load-test/run-load-test.sh
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Màu sắc hiển thị
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${CYAN}${BOLD}"
echo "======================================================================"
echo "    ⚡ TOMATODEVS LOAD & STRESS TESTING SUITE (k6 + Autocannon)       "
echo "======================================================================"
echo -e "${NC}"

# 1. Phát hiện target đang chạy
DEFAULT_TARGET="http://localhost:3000"
if curl -s -f -m 2 http://localhost:3000/api/health >/dev/null 2>&1; then
    TARGET_STATUS="${GREEN}Đang hoạt động trên cổng 3000 (Next.js Trực tiếp)${NC}"
    DEFAULT_TARGET="http://localhost:3000"
elif curl -s -f -m 2 http://localhost:8080/nginx-health >/dev/null 2>&1; then
    TARGET_STATUS="${GREEN}Đang hoạt động trên cổng 8080 (Qua Nginx Gateway)${NC}"
    DEFAULT_TARGET="http://localhost:8080"
elif curl -s -f -m 3 https://tomatodev.me/api/health >/dev/null 2>&1; then
    TARGET_STATUS="${GREEN}Đang hoạt động trên domain https://tomatodev.me (Cloudflare)${NC}"
    DEFAULT_TARGET="https://tomatodev.me"
else
    TARGET_STATUS="${YELLOW}Chưa phát hiện server nào đang bật trên cổng 3000 hoặc 8080!${NC}"
fi

echo -e "Trạng thái phát hiện: ${TARGET_STATUS}"
echo -e "Target URL mặc định: ${BOLD}${DEFAULT_TARGET}${NC}\n"

# Nhận tham số dòng lệnh nếu có
SELECTED_TARGET="${1:-$DEFAULT_TARGET}"
TEST_MODE="${2:-}"

if [ -z "$TEST_MODE" ]; then
    echo -e "${BOLD}Chọn mục tiêu kiểm thử (Target URL):${NC}"
    echo "1) Localhost Direct App (http://localhost:3000)  [Khuyên dùng để đo năng lực code]"
    echo "2) Localhost Nginx Gateway (http://localhost:8080) [Đo năng lực qua Reverse Proxy]"
    echo "3) Domain Thực tế (https://tomatodev.me)          [Đo qua Cloudflare Edge]"
    echo "4) Nhập URL tùy chọn"
    read -rp "Lựa chọn [1-4] (Mặc định 1): " target_choice
    target_choice="${target_choice:-1}"

    case "$target_choice" in
        1) SELECTED_TARGET="http://localhost:3000" ;;
        2) SELECTED_TARGET="http://localhost:8080" ;;
        3) SELECTED_TARGET="https://tomatodev.me" ;;
        4) 
            read -rp "Nhập Target URL: " input_url
            SELECTED_TARGET="${input_url:-http://localhost:3000}"
            ;;
        *) SELECTED_TARGET="http://localhost:3000" ;;
    esac

    echo ""
    echo -e "${BOLD}Chọn kịch bản kiểm thử (Test Scenario):${NC}"
    echo "1) [Nhanh] Quick Benchmark (Autocannon - 15s, 50 kết nối) -> Đo RPS tức thì"
    echo "2) [k6] Smoke Test (5 người dùng đồng thời, 30s) -> Kiểm tra tính ổn định"
    echo "3) [k6] Standard Load Test (Ramping 0 -> 200 users, 3 phút) -> Giờ cao điểm"
    echo "4) [k6] Stress Test (Ramping 0 -> 800 users, 4 phút) -> Tìm điểm gãy (Breaking point)"
    echo "5) [k6] Spike Test (Tăng vọt từ 10 lên 600 users trong 10s) -> Sốc tải"
    read -rp "Lựa chọn [1-5] (Mặc định 1): " scenario_choice
    scenario_choice="${scenario_choice:-1}"
else
    scenario_choice="$TEST_MODE"
fi

echo ""
echo -e "${CYAN}----------------------------------------------------------------------${NC}"
echo -e "🚀 BẮT ĐẦU TEST: ${BOLD}${SELECTED_TARGET}${NC}"
echo -e "${CYAN}----------------------------------------------------------------------${NC}"

# Pre-flight Check: Kiểm tra xem target có đang phản hồi không trước khi dội tải
echo -e "${BLUE}🔍 Đang kiểm tra kết nối tới target ${SELECTED_TARGET}...${NC}"
if ! curl -s -f -m 5 -k "${SELECTED_TARGET}" >/dev/null 2>&1 && ! curl -s -m 5 -k "${SELECTED_TARGET}" >/dev/null 2>&1; then
    echo -e "${RED}${BOLD}❌ LỖI: Không thể kết nối tới ${SELECTED_TARGET} (Connection Refused / Timeout)!${NC}"
    echo -e "${YELLOW}Nguyên nhân:${NC} Website hoặc dịch vụ chưa được khởi động trên địa chỉ này."
    echo ""
    echo -e "${BOLD}👉 Hướng dẫn khắc phục:${NC}"
    echo -e "  1. Nếu muốn test môi trường Local Next.js:"
    echo -e "     Hãy mở một terminal khác và chạy: ${GREEN}npm run dev${NC} hoặc ${GREEN}npm run start${NC}"
    echo -e "  2. Nếu muốn test môi trường Docker Homelab:"
    echo -e "     Hãy chạy: ${GREEN}docker compose up -d${NC}"
    echo -e "  3. Nếu muốn test website đang online trên Cloudflare:"
    echo -e "     Hãy chọn target là domain thực tế: ${GREEN}https://tomatodev.me${NC}"
    echo ""
    echo -e "${YELLOW}Thử lại với lệnh:${NC} bash scripts/load-test/run-load-test.sh https://tomatodev.me ${scenario_choice}"
    exit 1
fi
echo -e "${GREEN}✓ Kết nối thành công tới ${SELECTED_TARGET}.${NC}\n"

# Hàm chạy k6 bằng Docker
run_k6() {
    local scenario_type="$1"
    echo -e "${BLUE}Đang chuẩn bị môi trường Docker k6...${NC}"
    
    # Nếu target là localhost trên máy host Linux, map qua host.docker.internal hoặc IP host
    local k6_target="$SELECTED_TARGET"
    local net_arg=""

    if [[ "$k6_target" =~ "localhost" ]] || [[ "$k6_target" =~ "127.0.0.1" ]]; then
        # Sử dụng network host để k6 trong container gọi trực tiếp cổng localhost của máy host
        net_arg="--net=host"
    fi

    docker run --rm -i $net_arg \
        -e TARGET_URL="$k6_target" \
        -e TEST_TYPE="$scenario_type" \
        -v "${SCRIPT_DIR}/k6-scenario.js:/k6-scenario.js:ro" \
        grafana/k6:latest run /k6-scenario.js
}

case "$scenario_choice" in
    1|quick)
        TARGET_URL="$SELECTED_TARGET" CONNECTIONS=50 DURATION=15 node "${SCRIPT_DIR}/autocannon-quick.mjs"
        ;;
    2|smoke)
        run_k6 "smoke"
        ;;
    3|load)
        run_k6 "load"
        ;;
    4|stress)
        run_k6 "stress"
        ;;
    5|spike)
        run_k6 "spike"
        ;;
    *)
        echo -e "${RED}Lựa chọn không hợp lệ!${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}${BOLD}======================================================================${NC}"
echo -e "${GREEN}${BOLD}🎉 Hoàn tất phiên kiểm thử tải!${NC}"
echo -e "${GREEN}${BOLD}======================================================================${NC}"
