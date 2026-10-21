# syntax=docker/dockerfile:1
# ==============================================================================
# 🐳 DOCKERFILE TỐI ƯU CHO NEXT.JS 15 STANDALONE (TOMATODEVS PROFILE)
# ==============================================================================
# Thiết kế Multi-Stage Build siêu nhẹ (~140MB) với BuildKit Cache Mount:
#   - Stage 1 (deps):    Cài đặt dependencies với cache /root/.npm (siêu tốc).
#   - Stage 2 (builder): Build Next.js Standalone với cache .next/cache để các
#                        lần cập nhật nội dung profile sau chỉ mất vài giây.
#   - Stage 3 (runner):  Node 22 Alpine + tini (PID 1 Graceful Shutdown) +
#                        User phi root (nextjs:1001) + Healthcheck tự động.
# ==============================================================================

# ------------------------------------------------------------------------------
# 🟢 STAGE 1: DEPS - CÀI ĐẶT THƯ VIỆN VỚI BUILDKIT CACHE
# ------------------------------------------------------------------------------
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN --mount=type=cache,id=tomato-profile-npm,target=/root/.npm \
    npm ci --no-audit --no-fund

# ------------------------------------------------------------------------------
# 🔵 STAGE 2: BUILDER - BIÊN DỊCH NEXT.JS STANDALONE
# ------------------------------------------------------------------------------
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Tận dụng cache .next/cache giữa các lần build để tăng tốc độ cập nhật nội dung
RUN --mount=type=cache,id=tomato-profile-next-cache,target=/app/.next/cache \
    npm run build

# ------------------------------------------------------------------------------
# 🔴 STAGE 3: RUNNER - CONTAINER PRODUCTION SIÊU NHẸ & BẢO MẬT
# ------------------------------------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app

# Cài đặt tini (quản lý tiến trình PID 1) và wget (phục vụ healthcheck)
RUN apk add --no-cache tini wget

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Nguyên tắc Least Privilege: Chạy ứng dụng dưới quyền user phi root (UID 1001)
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy tài nguyên tĩnh và bản dựng standalone từ builder
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/api/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
