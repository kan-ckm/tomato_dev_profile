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
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (url && token && !url.includes("your-redis-instance")) {
    try {
      const redis = new Redis({ url, token });
      await redis.del("tomato:r2:music_playlist");
      console.log("   ✅ Đã làm mới Redis cache (tomato:r2:music_playlist).");
    } catch (e) {
      console.warn("   ⚠️ Lỗi xóa Redis cache:", e.message);
    }
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

export function writeMusicConfigFile(tracks) {
  if (!tracks || tracks.length === 0) return;
  const configPath = path.join(rootDir, "src", "config", "music.config.ts");
  const preferredDefault = "dracodraco - through the light.mp3";
  const defaultTrack =
    tracks.find((t) => t.file.toLowerCase() === preferredDefault) || tracks[0];

  // Sắp xếp bài hát mặc định lên đầu
  const sortedTracks = [...tracks].sort((a, b) => {
    if (a.file.toLowerCase() === defaultTrack.file.toLowerCase()) return -1;
    if (b.file.toLowerCase() === defaultTrack.file.toLowerCase()) return 1;
    return a.file.localeCompare(b.file, undefined, { sensitivity: "base" });
  });

  const playlistItems = sortedTracks.map((t) => {
    const coverUrl =
      t.cover || `/assets/music/covers/${encodeURIComponent(t.baseName)}.jpg`;
    return `  {\n    name: ${JSON.stringify(t.name)},\n    artist: ${JSON.stringify(t.artist)},\n    file: ${JSON.stringify(t.file)},\n    cover: ${JSON.stringify(coverUrl)},\n  },`;
  });

  const content = `import { MusicTrack } from "@/types";

export const DEFAULT_TRACK_FILE = ${JSON.stringify(defaultTrack.file)};
export const DEFAULT_VOLUME = 0.5;

/**
 * Danh sách nhạc dự phòng (fallback) khi API /api/music chưa phản hồi.
 * Khi chạy thực tế, API /api/music sẽ tự động đọc từ Cloudflare R2 hoặc quét \`public/assets/music\`.
 */
export const fallbackPlaylist: MusicTrack[] = [
${playlistItems.join("\n")}
];
`;

  fs.writeFileSync(configPath, content, "utf-8");
  console.log("   ✅ Đã cập nhật src/config/music.config.ts.");
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
