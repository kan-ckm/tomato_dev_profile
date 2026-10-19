import { NextRequest } from "next/server";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Giới hạn tần suất gọi API (Rate Limiting) theo địa chỉ IP
 * Giúp bảo vệ API khỏi bị spam hoặc lạm dụng băng thông/Redis quota.
 */
export function checkRateLimit(
  request: NextRequest,
  limit = 60,
  windowMs = 60_000
): { allowed: boolean; remaining: number } {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "127.0.0.1";
  const now = Date.now();

  // Dọn dẹp định kỳ nếu map quá lớn
  if (rateLimitStore.size > 5000) {
    for (const [key, val] of rateLimitStore.entries()) {
      if (now > val.resetAt) rateLimitStore.delete(key);
    }
  }

  const entry = rateLimitStore.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  entry.count += 1;
  return { allowed: true, remaining: limit - entry.count };
}

/**
 * Tạo CORS Headers an toàn dựa trên biến môi trường ALLOWED_ORIGIN
 */
export function getCorsHeaders(request?: NextRequest): Record<string, string> {
  const allowedOriginEnv = process.env.ALLOWED_ORIGIN;
  const requestOrigin = request?.headers.get("origin") || "";

  let allowOrigin = "*";
  if (allowedOriginEnv) {
    const allowedList = allowedOriginEnv.split(",").map((o) => o.trim());
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
  };
}

/**
 * Kiểm tra tên file nhạc hợp lệ, chống Path Traversal (../) và file ẩn
 */
export function isSafeMp3Filename(filename: string): boolean {
  if (!filename || typeof filename !== "string") return false;
  if (filename.startsWith(".")) return false;
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return false;
  }
  return filename.toLowerCase().endsWith(".mp3");
}
