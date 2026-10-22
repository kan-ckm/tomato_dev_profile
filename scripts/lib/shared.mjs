import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execFileSync } from "child_process";
import {
  S3Client,
  ListObjectsV2Command,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { Redis } from "@upstash/redis";
import { neon } from "@neondatabase/serverless";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const rootDir = path.resolve(__dirname, "..", "..");
export const musicDir = path.join(rootDir, "public", "assets", "music");
export const coversDir = path.join(musicDir, "covers");

export function loadProjectEnv() {
  for (const envFile of [".env.local", ".env"]) {
    const fullPath = path.join(rootDir, envFile);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, "utf-8");
      content.split("\n").forEach((line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#")) {
          const eqIdx = trimmed.indexOf("=");
          if (eqIdx !== -1) {
            const key = trimmed.slice(0, eqIdx).trim();
            const val = trimmed
              .slice(eqIdx + 1)
              .trim()
              .replace(/^["']|["']$/g, "");
            if (!process.env[key]) {
              process.env[key] = val;
            }
          }
        }
      });
    }
  }
}

export function getR2Config() {
  loadProjectEnv();
  const rawAccountId = process.env.R2_ACCOUNT_ID?.trim() || "";
  const accountId = rawAccountId
    .replace(/^https?:\/\//i, "")
    .replace(/\.r2\.cloudflarestorage\.com.*$/i, "")
    .replace(/\/+$/, "")
    .trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim() || "";
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim() || "";
  const bucketName = process.env.R2_BUCKET_NAME?.trim() || "";
  const publicUrl = process.env.R2_PUBLIC_URL?.replace(/\/+$/, "").trim() || "";

  const isEnabled = Boolean(
    accountId && accessKeyId && secretAccessKey && bucketName
  );
  const s3 = isEnabled
    ? new S3Client({
        region: "auto",
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId, secretAccessKey },
      })
    : null;

  return { s3, accountId, bucketName, publicUrl, isEnabled };
}

export function sanitizeFilename(name) {
  return String(name || "")
    .replace(/[/\\?%*:|"<>~#\0]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Tham số chuẩn tối ưu hóa âm thanh cho yt-dlp:
 * - Chuyển đổi sang MP3 VBR Quality 2 (~190kbps, ngưỡng tai người đạt độ trong suốt - transparent)
 * - Tần số lấy mẫu chuẩn hóa 44.1 kHz (chuẩn audio, loại bỏ các dải tần thừa của video 48kHz)
 * - Giảm 40-50% dung lượng so với 320kbps mà không suy hao chất lượng nghe được.
 */
export const OPTIMAL_AUDIO_ARGS = [
  "--js-runtimes",
  "node",
  "-x",
  "--audio-format",
  "mp3",
  "--audio-quality",
  "2",
  "--postprocessor-args",
  "ffmpeg:-ar 44100",
  "--no-warnings",
];

/**
 * Tối ưu hóa nhúng ảnh bìa và ID3 metadata vào MP3 bằng ffmpeg:
 * - Nén ảnh bìa nhúng bằng mjpeg chất lượng cao (q=3), giữ kích thước bìa nhỏ gọn (< 80KB)
 * - Sao chép luồng audio nguyên bản (-c:a copy) không encode lần hai gây suy giảm chất lượng
 * - Tự động dọn dẹp file tạm sau khi hoàn tất
 */
export function embedCoverWithFfmpeg(
  tempAudioPath,
  coverPath,
  finalMp3Path,
  metadata = {}
) {
  const args = ["-y", "-i", tempAudioPath];
  const hasCover = coverPath && fs.existsSync(coverPath);

  if (hasCover) {
    args.push(
      "-i",
      coverPath,
      "-map",
      "0:a:0",
      "-map",
      "1:0",
      "-c:a",
      "copy",
      "-c:v",
      "mjpeg",
      "-q:v",
      "3",
      "-id3v2_version",
      "3",
      "-metadata:s:v",
      "title=Album cover",
      "-metadata:s:v",
      "comment=Cover (front)"
    );
  } else {
    args.push("-c", "copy");
  }

  if (metadata.title) args.push("-metadata", `title=${metadata.title}`);
  if (metadata.artist) args.push("-metadata", `artist=${metadata.artist}`);

  args.push(finalMp3Path);

  try {
    execFileSync("ffmpeg", args, { stdio: "ignore" });
  } catch {
    // Fallback nếu không có cover hoặc lỗi stream copy
    if (fs.existsSync(tempAudioPath)) {
      fs.renameSync(tempAudioPath, finalMp3Path);
      return;
    }
  }

  if (fs.existsSync(tempAudioPath)) {
    fs.unlinkSync(tempAudioPath);
  }
}

/**
 * Đã vô hiệu hóa tính năng tự động xóa nhạc để bảo vệ thư viện nhạc
 * và nhường quyền quản lý thủ công cho Admin Dashboard.
 */
export async function clearMusicFromCloudAndLocal() {
  console.log(
    "🔒 [BẢO VỆ] Tính năng tự động xóa nhạc đã bị vô hiệu hóa (quản lý qua Admin Dashboard)."
  );
}

export async function invalidateRedisMusicCache() {
  loadProjectEnv();
  const endpoints = [
    { url: process.env.UPSTASH_REDIS_REST_URL?.trim(), token: process.env.UPSTASH_REDIS_REST_TOKEN?.trim() },
    { url: "http://100.119.185.5:8079", token: "tomato_local_redis_secret_token" },
    { url: "http://127.0.0.1:8079", token: "tomato_local_redis_secret_token" },
  ];

  for (const ep of endpoints) {
    if (ep.url && ep.token && !ep.url.includes("your-redis-instance")) {
      try {
        const redis = new Redis({ url: ep.url, token: ep.token });
        await redis.del("tomato:r2:music_playlist", "tomato:r2:music_refresh_lock");
        console.log(`   ✅ Đã làm mới Redis cache (${ep.url}).`);
      } catch {
        // ignore
      }
    }
  }
}

/**
 * Đồng bộ trực tiếp bài hát mới vào Neon PostgreSQL Database (Single Source of Truth)
 */
export async function syncTrackToDatabase(track) {
  loadProjectEnv();
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return false;

  try {
    const sql = neon(dbUrl);
    const r2Key = `music/${track.file}`;
    const r2Base = process.env.R2_PUBLIC_URL?.replace(/\/+$/, "") || "https://pub-971f8c3413884a3699ded2d04761153b.r2.dev";
    const audioUrl = `${r2Base}/${r2Key}`;
    const baseName = track.baseName || track.file.replace(/\.mp3$/i, "").trim();
    const coverUrl = `${r2Base}/music/covers/${encodeURIComponent(baseName)}.jpg`;

    // Lấy sort_order cao nhất hiện tại
    const maxOrderRow = await sql`SELECT MAX(sort_order) as max_order FROM music_tracks`;
    const nextSortOrder = (Number(maxOrderRow[0]?.max_order) || 0) + 1;
    const trackId = `track_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;

    await sql`
      INSERT INTO music_tracks (
        id, title, artist, r2_key, audio_url, cover_url, sort_order, is_active, metadata, created_at, updated_at
      ) VALUES (
        ${trackId},
        ${track.name || track.title || baseName},
        ${track.artist || "Unknown"},
        ${r2Key},
        ${audioUrl},
        ${coverUrl},
        ${nextSortOrder},
        true,
        ${JSON.stringify({ source: "script_automation", base_name: baseName })},
        NOW(),
        NOW()
      )
      ON CONFLICT (r2_key) DO UPDATE
      SET audio_url = EXCLUDED.audio_url,
          cover_url = EXCLUDED.cover_url,
          updated_at = NOW()
    `;
    console.log(`   🗄️  [Neon DB] Đã đồng bộ bài hát vào SQL Database: "${track.name || baseName}" (sort: #${nextSortOrder})`);
    return true;
  } catch (err) {
    console.warn(`   ⚠️  [Neon DB] Không thể đồng bộ bài hát vào SQL:`, err.message);
    return false;
  }
}

export async function uploadTracksAndCoversToR2(s3, bucketName, tracks) {
  if (!s3 || !bucketName) {
    console.log("\n⏩ Bỏ qua upload Cloudflare R2 vì chưa cấu hình.");
    return;
  }

  for (const t of tracks) {
    const mp3Path = path.join(musicDir, t.file);
    const coverPath = path.join(coversDir, `${t.baseName}.jpg`);

    if (fs.existsSync(mp3Path)) {
      const body = fs.readFileSync(mp3Path);
      const key = `music/${t.file}`;
      await s3.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          Body: body,
          ContentType: "audio/mpeg",
          CacheControl: "public, max-age=31536000, immutable",
        })
      );
      console.log(`   ⬆️ [R2] MP3: ${key}`);
    }

    if (fs.existsSync(coverPath)) {
      const coverBody = fs.readFileSync(coverPath);
      const coverKey = `music/covers/${t.baseName}.jpg`;
      await s3.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: coverKey,
          Body: coverBody,
          ContentType: "image/jpeg",
          CacheControl: "public, max-age=31536000, immutable",
        })
      );
      console.log(`   ⬆️ [R2] Cover: ${coverKey}`);
    }
  }

  await invalidateRedisMusicCache();
}

export const MAX_PLAYLIST_LIMIT = 70;

/**
 * Kiểm tra giới hạn số lượng bài hát tối đa trong thư viện (70 bài).
 * Nếu vượt quá 70 bài, xuất log cảnh báo yêu cầu xóa bớt bài khác.
 */
export function checkPlaylistLimit(currentCount, addingCount = 1) {
  if (currentCount + addingCount > MAX_PLAYLIST_LIMIT) {
    console.error("\n========================================================");
    console.error("❌ [GIỚI HẠN THƯ VIỆN] ĐÃ ĐẠT GIỚI HẠN TỐI ĐA 70 BÀI HÁT!");
    console.error("========================================================");
    console.error(
      `  - Số lượng hiện tại:  ${currentCount} / ${MAX_PLAYLIST_LIMIT} bài`
    );
    console.error(`  - Số lượng muốn thêm: ${addingCount} bài`);
    console.error(
      `  - Tổng dự kiến:       ${currentCount + addingCount} bài (Vượt quá ${
        currentCount + addingCount - MAX_PLAYLIST_LIMIT
      } bài)`
    );
    console.error(
      "\n⚠️  BẠN CẦN XÓA BỚT BÀI HÁT KHÁC TRONG THƯ VIỆN ĐỂ CÓ THỂ THÊM BÀI MỚI."
    );
    console.error("   (Quản lý và xóa bài hát thông qua Admin Dashboard)");
    console.error("========================================================\n");
    return false;
  }
  return true;
}

export function writeMusicConfigFile(tracks, preserveOrder = false) {
  if (!tracks || tracks.length === 0) return;
  const configPath = path.join(rootDir, "src", "config", "music.config.ts");
  const r2Base = process.env.R2_PUBLIC_URL?.replace(/\/+$/, "") || "https://pub-971f8c3413884a3699ded2d04761153b.r2.dev";

  let sortedTracks = [...tracks];
  if (!preserveOrder) {
    sortedTracks.sort((a, b) => a.file.localeCompare(b.file, undefined, { sensitivity: "base" }));
  }

  const defaultTrack = sortedTracks[0];

  const playlistItems = sortedTracks.map((t) => {
    const baseName = t.baseName || t.file.replace(/\.mp3$/i, "").trim();
    const audioUrl = t.url || `${r2Base}/music/${encodeURIComponent(t.file)}`;
    const coverUrl = t.cover && t.cover.startsWith("http")
      ? t.cover
      : `${r2Base}/music/covers/${encodeURIComponent(baseName)}.jpg`;

    return `  {\n    name: ${JSON.stringify(t.name)},\n    artist: ${JSON.stringify(t.artist)},\n    file: ${JSON.stringify(t.file)},\n    url: ${JSON.stringify(audioUrl)},\n    cover: ${JSON.stringify(coverUrl)},\n  },`;
  });

  const content = `import { MusicTrack } from "@/types";

export const DEFAULT_TRACK_FILE = ${JSON.stringify(defaultTrack.file)};
export const DEFAULT_VOLUME = 0.5;

/**
 * Danh sách nhạc dự phòng (fallback) tự động đồng bộ từ Cloudflare R2 CDN & Neon SQL Database.
 * Không phụ thuộc vào file MP3 nội bộ trên máy chủ.
 */
export const fallbackPlaylist: MusicTrack[] = [
${playlistItems.join("\n")}
];
`;

  fs.writeFileSync(configPath, content, "utf-8");
  console.log(`   ✅ Đã cập nhật src/config/music.config.ts (Default track: "${defaultTrack.name}").`);
}

/**
 * Đồng bộ toàn diện file music.config.ts trực tiếp từ Neon SQL Database (Single Source of Truth)
 * Luôn đảm bảo thứ tự chính xác từng bài hát khớp 100% với Admin Dashboard.
 */
export async function syncMusicConfigFromDatabase() {
  loadProjectEnv();
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return false;

  try {
    const sql = neon(dbUrl);
    const rows = await sql`
      SELECT title, artist, r2_key, audio_url, cover_url, sort_order
      FROM music_tracks
      WHERE is_active = true
      ORDER BY sort_order ASC, created_at ASC
    `;
    if (!rows || rows.length === 0) return false;

    const configPath = path.join(rootDir, "src", "config", "music.config.ts");
    const r2Base = process.env.R2_PUBLIC_URL?.replace(/\/+$/, "") || "https://pub-971f8c3413884a3699ded2d04761153b.r2.dev";
    const defaultTrackFile = rows[0].r2_key ? rows[0].r2_key.replace(/^music\//i, "") : `${rows[0].artist} - ${rows[0].title}.mp3`;

    const playlistItems = rows.map((r) => {
      const file = r.r2_key ? r.r2_key.replace(/^music\//i, "") : `${r.artist} - ${r.title}.mp3`;
      const baseName = file.replace(/\.mp3$/i, "").trim();
      const audioUrl = r.audio_url || `${r2Base}/music/${encodeURIComponent(file)}`;
      const coverUrl = r.cover_url || `${r2Base}/music/covers/${encodeURIComponent(baseName)}.jpg`;

      return `  {\n    name: ${JSON.stringify(r.title)},\n    artist: ${JSON.stringify(r.artist)},\n    file: ${JSON.stringify(file)},\n    url: ${JSON.stringify(audioUrl)},\n    cover: ${JSON.stringify(coverUrl)},\n  },`;
    });

    const content = `import { MusicTrack } from "@/types";

export const DEFAULT_TRACK_FILE = ${JSON.stringify(defaultTrackFile)};
export const DEFAULT_VOLUME = 0.5;

/**
 * Danh sách nhạc dự phòng (fallback) tự động đồng bộ từ Neon PostgreSQL Database & Cloudflare R2 CDN.
 * Thứ tự phát luôn đồng bộ theo thời gian thực với Admin Dashboard (Single Source of Truth).
 */
export const fallbackPlaylist: MusicTrack[] = [
${playlistItems.join("\n")}
];
`;

    fs.writeFileSync(configPath, content, "utf-8");
    console.log(`   ✅ Đã cập nhật src/config/music.config.ts từ Neon DB (Bài đầu tiên: "${rows[0].title}").`);
    return true;
  } catch (err) {
    console.warn("   ⚠️ Không thể đồng bộ music.config.ts từ Neon DB:", err.message);
    return false;
  }
}

export function readLocalTracks() {
  if (!fs.existsSync(musicDir)) return [];
  const files = fs
    .readdirSync(musicDir)
    .filter((f) => f.toLowerCase().endsWith(".mp3"));

  return files.map((file) => {
    const baseName = file.replace(/\.mp3$/i, "").trim();
    let artist = "Unknown";
    let name = baseName;
    if (baseName.includes(" - ")) {
      const parts = baseName.split(" - ");
      artist = parts[0].trim();
      name = parts.slice(1).join(" - ").trim();
    } else if (baseName.includes(" x ")) {
      const parts = baseName.split(" x ");
      artist = parts[0].trim();
      name = parts.slice(1).join(" x ").trim();
    }
    const coverPath = path.join(coversDir, `${baseName}.jpg`);
    const hasCover = fs.existsSync(coverPath);
    return {
      name,
      artist,
      baseName,
      file,
      cover: hasCover
        ? `/assets/music/covers/${encodeURIComponent(baseName)}.jpg`
        : undefined,
    };
  });
}
