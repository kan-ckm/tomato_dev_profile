import { Redis } from "@upstash/redis";

export interface CachedTikTokData {
  followers: number;
  likes: number;
  fetchedAt: number;
}

const REDIS_CACHE_KEY = "latest_follower";
const REDIS_TTL_SECONDS = 24 * 60 * 60; // 24 giờ

// Bộ nhớ đệm dự phòng trên RAM (In-memory cache) khi chạy local không có biến môi trường Redis
// hoặc để giảm tải số lần gọi/ghi lên Upstash Redis
let memoryCache: CachedTikTokData | null = null;

let redisInstance: Redis | null = null;

/**
 * Khởi tạo kết nối @upstash/redis an toàn (Lazy Initialization).
 * Không làm crash ứng dụng nếu thiếu UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN.
 */
export function getRedisClient(): Redis | null {
  if (redisInstance) return redisInstance;

  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    return null;
  }

  try {
    redisInstance = new Redis({ url, token });
    return redisInstance;
  } catch (err) {
    console.warn("[Redis] Failed to initialize Upstash Redis client:", err);
    return null;
  }
}

/**
 * Đọc dữ liệu TikTok đã lưu trong Upstash Redis (hoặc bộ nhớ RAM dự phòng)
 */
export async function getCachedTikTokStats(): Promise<CachedTikTokData | null> {
  const redis = getRedisClient();

  if (redis) {
    try {
      const data = await redis.get<CachedTikTokData>(REDIS_CACHE_KEY);
      if (data && typeof data === "object" && typeof data.followers === "number") {
        memoryCache = data;
        return data;
      }
    } catch (err) {
      console.warn("[Redis] Error reading cache, falling back to memory cache:", err);
    }
  }

  return memoryCache;
}

/**
 * Lưu dữ liệu TikTok mới vào Upstash Redis (với cơ chế chống ghi lặp quá dày - Write Throttling)
 */
export async function setCachedTikTokStats(followers: number, likes: number): Promise<void> {
  const now = Date.now();

  // Nếu dữ liệu vừa được cập nhật trong vòng 10 phút qua thì không cần ghi đè lại Redis liên tục
  // nhằm bảo vệ hạn mức (quota) của Upstash Redis trước các đợt truy cập lớn.
  if (memoryCache && now - memoryCache.fetchedAt < 10 * 60 * 1000) {
    return;
  }

  const payload: CachedTikTokData = {
    followers,
    likes,
    fetchedAt: now,
  };

  memoryCache = payload;

  const redis = getRedisClient();
  if (redis) {
    try {
      await redis.set(REDIS_CACHE_KEY, payload, { ex: REDIS_TTL_SECONDS });
    } catch (err) {
      console.warn("[Redis] Error writing cache:", err);
    }
  }
}
