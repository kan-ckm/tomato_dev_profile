import { NextRequest } from "next/server";
import { env } from "./env";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const MAX_RATE_LIMIT_ENTRIES = 2000;
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Trích xuất địa chỉ IP của client một cách an toàn từ các Reverse Proxy chuẩn (Cloudflare, Vercel, Nginx)
 */
export function getClientIp(request: NextRequest): string {
  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const firstIp = forwarded.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }

  return "127.0.0.1";
}

/**
 * Giới hạn tần suất gọi API (Rate Limiting) theo địa chỉ IP + Namespace
 * Sử dụng cơ chế giới hạn kích thước Map (Bounded LRU Eviction O(1)) chống tấn công tràn bộ nhớ (Memory Exhaustion DoS).
 */
export function checkRateLimit(
  request: NextRequest,
  limit = 60,
  windowMs = 60_000,
  namespace = "global"
): { allowed: boolean; remaining: number; resetAt: number } {
  const ip = getClientIp(request);
  const key = `${namespace}:${ip}`;
  const now = Date.now();

  const existing = rateLimitStore.get(key);
  if (existing && now <= existing.resetAt) {
    if (existing.count >= limit) {
      return { allowed: false, remaining: 0, resetAt: existing.resetAt };
    }
    existing.count += 1;
    // Cập nhật vị trí LRU
    rateLimitStore.delete(key);
    rateLimitStore.set(key, existing);
    return {
      allowed: true,
      remaining: limit - existing.count,
      resetAt: existing.resetAt,
    };
  }

  // Nếu kho lưu trữ vượt ngưỡng an toàn, xóa bớt bản ghi cũ nhất (O(1))
  if (rateLimitStore.size >= MAX_RATE_LIMIT_ENTRIES) {
    const oldestKey = rateLimitStore.keys().next().value;
    if (oldestKey !== undefined) {
      rateLimitStore.delete(oldestKey);
    }
  }

  const resetAt = now + windowMs;
  rateLimitStore.set(key, { count: 1, resetAt });
  return { allowed: true, remaining: limit - 1, resetAt };
}

/**
 * Tạo CORS Headers an toàn dựa trên biến môi trường ALLOWED_ORIGIN
 */
export function getCorsHeaders(request?: NextRequest): Record<string, string> {
  const allowedList = env.allowedOrigins;
  const requestOrigin = request?.headers.get("origin") || "";

  let allowOrigin = "*";
  if (allowedList.length > 0) {
    if (requestOrigin && allowedList.includes(requestOrigin)) {
      allowOrigin = requestOrigin;
    } else {
      allowOrigin = allowedList[0];
    }
  }

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "X-Content-Type-Options": "nosniff",
  };
}

/**
 * Kiểm tra tên file nhạc hợp lệ, chống Path Traversal (../), Null Byte và file ẩn
 */
export function isSafeMp3Filename(filename: string): boolean {
  if (!filename || typeof filename !== "string") return false;
  if (filename.length > 255 || filename.includes("\0")) return false;
  if (filename.startsWith(".")) return false;
  if (
    filename.includes("..") ||
    filename.includes("/") ||
    filename.includes("\\")
  ) {
    return false;
  }
  return filename.toLowerCase().endsWith(".mp3");
}

/**
 * Kiểm tra URL liên kết ngoài an toàn (chỉ cho phép http://, https://, hoặc đường dẫn nội bộ /)
 * Chống tấn công XSS qua giao thức `javascript:` hoặc `data:`
 */
export function isSafeUrl(url: string | undefined | null): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (trimmed.startsWith("/")) return !trimmed.startsWith("//");
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}
