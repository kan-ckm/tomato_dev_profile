import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectCommand,
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

export async function clearMusicFromCloudAndLocal(s3, bucketName) {
  fs.mkdirSync(coversDir, { recursive: true });

  if (s3 && bucketName) {
    try {
      const existing = await s3.send(
        new ListObjectsV2Command({ Bucket: bucketName, Prefix: "music/" })
      );
      const objects = existing.Contents || [];
      for (const obj of objects) {
        if (obj.Key) {
          console.log(`   - Xóa R2: ${obj.Key}`);
          await s3.send(
            new DeleteObjectCommand({ Bucket: bucketName, Key: obj.Key })
          );
        }
      }
      console.log(`   ✅ Đã xóa ${objects.length} file trên Cloudflare R2.`);
    } catch (e) {
      console.warn("   ⚠️ Lỗi xóa R2:", e.message);
    }
  }

  await invalidateRedisMusicCache();

  for (const f of fs.readdirSync(musicDir)) {
    if (f.toLowerCase().endsWith(".mp3")) {
      fs.unlinkSync(path.join(musicDir, f));
      console.log(`   - Xóa local mp3: ${f}`);
    }
  }
  for (const c of fs.readdirSync(coversDir)) {
    if (c.toLowerCase().endsWith(".jpg") || c.toLowerCase().endsWith(".png")) {
      fs.unlinkSync(path.join(coversDir, c));
      console.log(`   - Xóa local cover: ${c}`);
    }
  }
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
  const defaultTrack = tracks[0];
  const playlistItems = tracks.map((t) => {
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
