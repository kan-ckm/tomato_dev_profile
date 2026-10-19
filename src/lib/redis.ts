import { Redis } from "@upstash/redis";
import type { MusicTrack } from "../types";

export interface CachedTikTokData {
  followers: number;
  likes: number;
  fetchedAt: number;
}

export interface RedisHealthStatus {
  connected: boolean;
  mode: "docker-local" | "upstash-cloud" | "memory-fallback";
  latencyMs: number | null;
  url: string | null;
  error?: string;
}

// Các khóa Cache chuẩn hóa trong Redis
export const REDIS_KEYS = {
  TIKTOK_STATS: "tomato:tiktok:stats",
  TIKTOK_LEGACY: "latest_follower",
  TIKTOK_LOCK: "tomato:tiktok:refresh_lock",
  MUSIC_PLAYLIST: "tomato:r2:music_playlist",
} as const;

const TIKTOK_TTL_SECONDS = 24 * 60 * 60; // 24 giờ lưu trữ bền vững
const TIKTOK_FRESH_MS = 30 * 60 * 1000;  // 30 phút coi là dữ liệu mới (Fresh)
const MUSIC_TTL_SECONDS = 10 * 60;       // 10 phút cache danh sách nhạc R2
const L1_MEMORY_TTL_MS = 60 * 1000;      // 60 giây cache siêu tốc trên RAM (L1)

interface L1CacheEntry<T> {
  value: T;
  expiresAt: number;
}

// L1 In-Memory Cache (Giúp phản hồi < 0.01ms cho các request liên tiếp)
const l1Cache = new Map<string, L1CacheEntry<unknown>>();
let memoryTikTokFallback: CachedTikTokData | null = null;
let memoryMusicFallback: MusicTrack[] | null = null;

let redisInstance: Redis | null = null;

/**
 * Kiểm tra xem URL cấu hình có phải là placeholder mẫu hay không
 */
function isValidRedisConfig(url?: string, token?: string): boolean {
  if (!url || !token) return false;
  const cleanUrl = url.trim();
  const cleanToken = token.trim();
  if (
    !cleanUrl ||
    !cleanToken ||
    cleanUrl.includes("your-redis-instance") ||
    cleanToken === "your-upstash-redis-rest-token"
  ) {
    return false;
  }
  return true;
}

/**
 * Khởi tạo kết nối Redis an toàn (Hỗ trợ cả Docker Redis cục bộ qua cổng 8079 và Upstash Cloud).
 */
export function getRedisClient(): Redis | null {
  if (redisInstance) return redisInstance;

  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  if (!isValidRedisConfig(url, token)) {
    return null;
  }

  try {
    redisInstance = new Redis({
      url: url!.trim(),
      token: token!.trim(),
      retry: {
        retries: 1,
        backoff: () => 100,
      },
    });
    return redisInstance;
  } catch (err) {
    console.warn("[Redis] Failed to initialize Redis client:", err);
    return null;
  }
}

/**
 * Đọc từ L1 Memory Cache
 */
function getL1<T>(key: string): T | null {
  const entry = l1Cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    l1Cache.delete(key);
    return null;
  }
  return entry.value as T;
}

/**
 * Ghi vào L1 Memory Cache
 */
function setL1<T>(key: string, value: T, ttlMs = L1_MEMORY_TTL_MS): void {
  l1Cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

// ============================================================================
// 1. TIKTOK STATS CACHE (Cache-First + Stale-While-Revalidate + Stampede Lock)
// ============================================================================

/**
 * Kiểm tra xem dữ liệu TikTok trong cache còn mới (dưới 30 phút) hay không
 */
export function isTikTokCacheFresh(data: CachedTikTokData | null): boolean {
  if (!data || typeof data.fetchedAt !== "number") return false;
  return Date.now() - data.fetchedAt < TIKTOK_FRESH_MS;
}

/**
 * Đọc dữ liệu TikTok từ L1 RAM -> L2 Docker/Upstash Redis -> Memory Fallback
 */
export async function getCachedTikTokStats(): Promise<CachedTikTokData | null> {
  // 1. Kiểm tra L1 RAM Cache (< 0.01ms)
  const l1Data = getL1<CachedTikTokData>(REDIS_KEYS.TIKTOK_STATS);
  if (l1Data) return l1Data;

  // 2. Kiểm tra L2 Redis (Docker hoặc Upstash)
  const redis = getRedisClient();
  if (redis) {
    try {
      const data =
        (await redis.get<CachedTikTokData>(REDIS_KEYS.TIKTOK_STATS)) ||
        (await redis.get<CachedTikTokData>(REDIS_KEYS.TIKTOK_LEGACY));

      if (data && typeof data === "object" && typeof data.followers === "number") {
        memoryTikTokFallback = data;
        setL1(REDIS_KEYS.TIKTOK_STATS, data);
        return data;
      }
    } catch (err) {
      console.warn("[Redis] Error reading TikTok cache, using memory fallback:", err);
    }
  }

  return memoryTikTokFallback;
}

/**
 * Lưu dữ liệu TikTok mới vào cả L1 RAM và L2 Redis
 */
export async function setCachedTikTokStats(
  followers: number,
  likes: number,
  forceWrite = false
): Promise<void> {
  const now = Date.now();

  // Chống ghi lặp quá dày (Write Throttling 60 giây) trừ khi forceWrite
  if (
    !forceWrite &&
    memoryTikTokFallback &&
    now - memoryTikTokFallback.fetchedAt < 60 * 1000
  ) {
    return;
  }

  const payload: CachedTikTokData = {
    followers,
    likes,
    fetchedAt: now,
  };

  memoryTikTokFallback = payload;
  setL1(REDIS_KEYS.TIKTOK_STATS, payload);

  const redis = getRedisClient();
  if (redis) {
    try {
      await Promise.all([
        redis.set(REDIS_KEYS.TIKTOK_STATS, payload, { ex: TIKTOK_TTL_SECONDS }),
        redis.set(REDIS_KEYS.TIKTOK_LEGACY, payload, { ex: TIKTOK_TTL_SECONDS }),
      ]);
    } catch (err) {
      console.warn("[Redis] Error writing TikTok cache:", err);
    }
  }
}

/**
 * Khóa phân tán (Distributed Lock) chống Cache Stampede khi nhiều người cùng mở trang
 * Chỉ cho phép 1 tiến trình cào dữ liệu TikTok tại một thời điểm (TTL khóa: 15 giây)
 */
export async function acquireTikTokRefreshLock(): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) return true;

  try {
    const result = await redis.set(REDIS_KEYS.TIKTOK_LOCK, "locked", {
      nx: true,
      ex: 15,
    });
    return result === "OK";
  } catch {
    return true;
  }
}

// ============================================================================
// 2. CLOUDFLARE R2 MUSIC PLAYLIST CACHE (Giảm 99.9% thời gian chờ S3 API)
// ============================================================================

/**
 * Đọc danh sách nhạc R2 đã được cache trong L1 RAM hoặc L2 Redis
 */
export async function getCachedMusicPlaylist(): Promise<MusicTrack[] | null> {
  const l1List = getL1<MusicTrack[]>(REDIS_KEYS.MUSIC_PLAYLIST);
  if (l1List && Array.isArray(l1List) && l1List.length > 0) {
    return l1List;
  }

  const redis = getRedisClient();
  if (redis) {
    try {
      const cached = await redis.get<MusicTrack[]>(REDIS_KEYS.MUSIC_PLAYLIST);
      if (cached && Array.isArray(cached) && cached.length > 0) {
        memoryMusicFallback = cached;
        setL1(REDIS_KEYS.MUSIC_PLAYLIST, cached);
        return cached;
      }
    } catch (err) {
      console.warn("[Redis] Error reading music playlist cache:", err);
    }
  }

  return memoryMusicFallback;
}

/**
 * Lưu danh sách nhạc R2 vào L1 RAM và L2 Redis (TTL: 10 phút)
 */
export async function setCachedMusicPlaylist(tracks: MusicTrack[]): Promise<void> {
  if (!tracks || tracks.length === 0) return;

  memoryMusicFallback = tracks;
  setL1(REDIS_KEYS.MUSIC_PLAYLIST, tracks);

  const redis = getRedisClient();
  if (redis) {
    try {
      await redis.set(REDIS_KEYS.MUSIC_PLAYLIST, tracks, { ex: MUSIC_TTL_SECONDS });
    } catch (err) {
      console.warn("[Redis] Error writing music playlist cache:", err);
    }
  }
}

/**
 * Xóa cache danh sách nhạc (Gọi tự động sau khi upload/xóa nhạc trên Cloudflare R2)
 */
export async function invalidateMusicPlaylistCache(): Promise<void> {
  memoryMusicFallback = null;
  l1Cache.delete(REDIS_KEYS.MUSIC_PLAYLIST);

  const redis = getRedisClient();
  if (redis) {
    try {
      await redis.del(REDIS_KEYS.MUSIC_PLAYLIST);
    } catch (err) {
      console.warn("[Redis] Error invalidating music playlist cache:", err);
    }
  }
}

// ============================================================================
// 3. REDIS DIAGNOSTICS & HEALTH CHECK
// ============================================================================

/**
 * Kiểm tra trạng thái kết nối và độ trễ (latency) của Redis
 */
export async function checkRedisHealth(): Promise<RedisHealthStatus> {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || null;
  const redis = getRedisClient();

  if (!redis || !url) {
    return {
      connected: false,
      mode: "memory-fallback",
      latencyMs: null,
      url: null,
    };
  }

  const isLocal = url.includes("127.0.0.1") || url.includes("localhost");
  const mode = isLocal ? "docker-local" : "upstash-cloud";

  const start = performance.now();
  try {
    const pong = await redis.ping();
    const latencyMs = Math.round((performance.now() - start) * 100) / 100;
    return {
      connected: pong === "PONG",
      mode,
      latencyMs,
      url,
    };
  } catch (err) {
    return {
      connected: false,
      mode: "memory-fallback",
      latencyMs: null,
      url,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
