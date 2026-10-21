#!/usr/bin/env node

/**
 * Công cụ kiểm tra trạng thái, độ trễ (latency), xem dữ liệu Cache và quản lý Redis.
 *
 * Cách dùng:
 *   npm run redis:status         (Kiểm tra trạng thái & xem dữ liệu đang cache)
 *   npm run redis:flush          (Xóa toàn bộ cache trên Redis để làm mới)
 */

import { Redis } from "@upstash/redis";
import { loadProjectEnv } from "./lib/shared.mjs";

loadProjectEnv();

const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
const isFlush = process.argv.includes("--flush");

console.log("\n========================================================");
console.log("   REDIS DOCKER & CACHE DIAGNOSTICS - TOMATODEVS");
console.log("========================================================\n");

if (!url || !token || url.includes("your-redis-instance")) {
  console.error(
    "❌ Chưa cấu hình UPSTASH_REDIS_REST_URL hoặc UPSTASH_REDIS_REST_TOKEN trong .env!"
  );
  process.exit(1);
}

const redis = new Redis({ url, token });

async function main() {
  try {
    // Khởi động kết nối HTTP Keep-Alive trước khi đo độ trễ thực tế
    await redis.ping();
    const start = performance.now();
    const pong = await redis.ping();
    const latency = (performance.now() - start).toFixed(2);

    const isLocal = url.includes("127.0.0.1") || url.includes("localhost");
    console.log(`✅ Kết nối Redis : THÀNH CÔNG (${pong})`);
    console.log(
      `🌐 Chế độ        : ${isLocal ? "Docker Local (Serverless HTTP Proxy)" : "Upstash Cloud"}`
    );
    console.log(`🔗 Endpoint      : ${url}`);
    console.log(`⚡ Độ trễ (Ping) : ${latency} ms\n`);

    if (isFlush) {
      await redis.del(
        "tomato:tiktok:stats",
        "latest_follower",
        "tomato:tiktok:refresh_lock",
        "tomato:r2:music_playlist",
        "tomato:r2:music_refresh_lock"
      );
      console.log(
        "🧹 Đã xóa sạch toàn bộ khóa Cache (TikTok & Music Playlist) trên Redis!\n"
      );
      return;
    }

    // Kiểm tra Cache TikTok
    const tiktokStats = await redis.get("tomato:tiktok:stats");
    const tiktokTtl = await redis.ttl("tomato:tiktok:stats");
    console.log("📊 [CACHE 1] TikTok Stats (tomato:tiktok:stats):");
    if (tiktokStats) {
      console.log(`   - Followers : ${tiktokStats.followers}`);
      console.log(`   - Likes     : ${tiktokStats.likes}`);
      console.log(
        `   - Cập nhật  : ${new Date(tiktokStats.fetchedAt).toLocaleString("vi-VN")}`
      );
      console.log(`   - TTL còn   : ${tiktokTtl} giây`);
    } else {
      console.log(
        "   - Trạng thái: Chưa có cache (Sẽ tự động lưu ở lần gọi API đầu tiên)"
      );
    }

    console.log("");

    // Kiểm tra Cache Danh sách nhạc R2
    const musicList = await redis.get("tomato:r2:music_playlist");
    const musicTtl = await redis.ttl("tomato:r2:music_playlist");
    console.log("🎵 [CACHE 2] R2 Music Playlist (tomato:r2:music_playlist):");
    if (musicList && Array.isArray(musicList)) {
      console.log(`   - Số bài hát: ${musicList.length} bài`);
      console.log(`   - TTL còn   : ${musicTtl} giây`);
      musicList.forEach((t, idx) => {
        console.log(`     ${idx + 1}. ${t.artist} - ${t.name}`);
      });
    } else {
      console.log(
        "   - Trạng thái: Chưa có cache (Sẽ tự động lưu khi gọi /api/music)"
      );
    }

    console.log("\n========================================================\n");
  } catch (err) {
    console.error("❌ Lỗi kết nối tới Redis:", err.message);
    console.error(
      "💡 Gợi ý: Hãy chắc chắn Docker đang chạy bằng lệnh: npm run redis:up\n"
    );
    process.exit(1);
  }
}

main();
