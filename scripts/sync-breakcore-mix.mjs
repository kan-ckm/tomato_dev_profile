#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
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
const rootDir = path.resolve(__dirname, "..");

function loadEnv() {
  const envFiles = [".env.local", ".env"];
  for (const envFile of envFiles) {
    const fullPath = path.join(rootDir, envFile);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, "utf-8");
      content.split("\n").forEach((line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#")) {
          const eqIdx = trimmed.indexOf("=");
          if (eqIdx !== -1) {
            const key = trimmed.slice(0, eqIdx).trim();
            const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
            if (!process.env[key]) {
              process.env[key] = val;
            }
          }
        }
      });
    }
  }
}

loadEnv();

const rawAccountId = process.env.R2_ACCOUNT_ID?.trim() || "";
const accountId = rawAccountId
  .replace(/^https?:\/\//i, "")
  .replace(/\.r2\.cloudflarestorage\.com.*$/i, "")
  .replace(/\/+$/, "")
  .trim();
const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
const bucketName = process.env.R2_BUCKET_NAME?.trim();

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
});

const musicDir = path.join(rootDir, "public", "assets", "music");
const coversDir = path.join(musicDir, "covers");
fs.mkdirSync(coversDir, { recursive: true });

const mixMp3Path = path.join(
  rootDir,
  "..",
  "..",
  "..",
  "..",
  ".gemini/antigravity-cli/brain/f9bde350-167f-4047-8897-8470bf26c804/scratch/breakcore_dl/mix.mp3"
);

function sanitizeFilename(name) {
  return name
    .replace(/[/\\?%*:|"<>~#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const TRACKS_METADATA = [
  {
    start: 0,
    end: 97,
    artist: "dracodraco",
    title: "through the light",
    searchTerm: "dracodraco through the light",
  },
  {
    start: 97,
    end: 289,
    artist: "Blksmiith",
    title: "GORE-TEX COVERS MY SOUL",
    searchTerm: "Blksmiith GORE-TEX COVERS MY SOUL",
  },
  {
    start: 289,
    end: 435,
    artist: "DXRKWRLD",
    title: "Face The Future",
    searchTerm: "DXRKWRLD Face The Future",
  },
  {
    start: 435,
    end: 562,
    artist: "ooxygen",
    title: "Final wish",
    searchTerm: "ooxygen Final wish",
  },
  {
    start: 562,
    end: 714,
    artist: "GnB Chili",
    title: "Blazing in the Dark",
    searchTerm: "GnB Chili Blazing in the Dark",
  },
  {
    start: 714,
    end: 806,
    artist: "Ftlframe",
    title: "Shine or Die",
    searchTerm: "Ftlframe Shine or Die",
  },
  {
    start: 806,
    end: 962,
    artist: "TOKYOPILL",
    title: "Emptiness",
    searchTerm: "TOKYOPILL Emptiness",
  },
  {
    start: 962,
    end: 1023,
    artist: "Blksmiith",
    title: "F R A G M E N T",
    searchTerm: "Blksmiith FRAGMENT",
  },
  {
    start: 1023,
    end: 1288,
    artist: "amore",
    title: "Pure Judgement",
    searchTerm: "amore Pure Judgement",
  },
  {
    start: 1288,
    end: 1469,
    artist: "In Explosions",
    title: "amnesia",
    searchTerm: "In Explosions amnesia",
  },
  {
    start: 1469,
    end: 1569,
    artist: "FlowerBoyDeMii",
    title: "Subject : Haise",
    searchTerm: "FlowerBoyDeMii Subject : Haise",
  },
];

async function clearCloudAndLocal() {
  console.log("\n🗑️  [1/5] Xóa các file nhạc & cover hiện tại trên Cloudflare R2 & Local...");

  if (s3 && bucketName) {
    try {
      const existing = await s3.send(
        new ListObjectsV2Command({ Bucket: bucketName, Prefix: "music/" })
      );
      const objects = existing.Contents || [];
      for (const obj of objects) {
        if (obj.Key) {
          console.log(`   - Xóa R2: ${obj.Key}`);
          await s3.send(new DeleteObjectCommand({ Bucket: bucketName, Key: obj.Key }));
        }
      }
      console.log(`   ✅ Đã xóa ${objects.length} file trên Cloudflare R2.`);
    } catch (e) {
      console.warn("   ⚠️ Lỗi xóa R2:", e.message);
    }
  }

  // Clear Redis
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
      await redis.del("tomato:r2:music_playlist");
      console.log("   ✅ Đã xóa Redis cache.");
    } catch (e) {
      console.warn("   ⚠️ Lỗi xóa Redis:", e.message);
    }
  }

  // Xóa local
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
  console.log("   ✅ Đã dọn dẹp local.");
}

async function fetchArtwork(searchTerm) {
  try {
    const res = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&entity=song&limit=1`
    );
    const data = await res.json();
    const art = data.results?.[0]?.artworkUrl100?.replace("100x100bb.jpg", "600x600bb.jpg");
    return art || null;
  } catch {
    return null;
  }
}

async function processTracks() {
  console.log("\n✂️  [2/5] Cắt 11 bài nhạc từ mix và tải ảnh bìa tương ứng...");
  const processed = [];

  for (const [idx, item] of TRACKS_METADATA.entries()) {
    const cleanArtist = sanitizeFilename(item.artist);
    const cleanTitle = sanitizeFilename(item.title);
    const baseName = `${cleanArtist} - ${cleanTitle}`;
    const mp3File = `${baseName}.mp3`;
    const coverFile = `${baseName}.jpg`;

    const mp3Path = path.join(musicDir, mp3File);
    const coverPath = path.join(coversDir, coverFile);
    const tempCutPath = path.join(musicDir, `temp_cut_${idx}.mp3`);

    console.log(`\n⏳ [${idx + 1}/11] Xử lý: "${baseName}" (${item.start}s -> ${item.end}s)`);

    // 1. Tải Artwork
    const artUrl = await fetchArtwork(item.searchTerm);
    if (artUrl) {
      try {
        const cRes = await fetch(artUrl);
        const buf = Buffer.from(await cRes.arrayBuffer());
        fs.writeFileSync(coverPath, buf);
        console.log(`   🖼️ Cover tải thành công: ${coverFile}`);
      } catch (e) {
        console.warn(`   ⚠️ Lỗi tải cover: ${e.message}`);
      }
    }

    // 2. Cắt audio từ mix
    const duration = item.end - item.start;
    const cutCmd = `ffmpeg -y -ss ${item.start} -t ${duration} -i "${mixMp3Path}" -acodec copy "${tempCutPath}"`;
    execSync(cutCmd, { stdio: "pipe" });

    // 3. Nhúng artwork vào MP3
    if (fs.existsSync(coverPath)) {
      try {
        const tagCmd = `ffmpeg -y -i "${tempCutPath}" -i "${coverPath}" -map 0:0 -map 1:0 -c copy -id3v2_version 3 -metadata:s:v title="Album cover" -metadata:s:v comment="Cover (front)" -metadata title="${cleanTitle.replace(/"/g, '\\"')}" -metadata artist="${cleanArtist.replace(/"/g, '\\"')}" "${mp3Path}"`;
        execSync(tagCmd, { stdio: "pipe" });
        if (fs.existsSync(tempCutPath)) fs.unlinkSync(tempCutPath);
      } catch {
        if (fs.existsSync(tempCutPath)) fs.renameSync(tempCutPath, mp3Path);
      }
    } else if (fs.existsSync(tempCutPath)) {
      fs.renameSync(tempCutPath, mp3Path);
    }

    const stat = fs.statSync(mp3Path);
    console.log(`   🎧 Track hoàn tất (${(stat.size / 1024 / 1024).toFixed(2)} MB): ${mp3File}`);

    processed.push({
      name: cleanTitle,
      artist: cleanArtist,
      baseName,
      file: mp3File,
      cover: `/assets/music/covers/${encodeURIComponent(baseName)}.jpg`,
    });
  }

  return processed;
}

async function uploadToR2(tracks) {
  console.log(`\n☁️  [3/5] Upload 11 bài nhạc & ảnh bìa lên Cloudflare R2 '${bucketName}'...`);

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

  console.log("   ✅ Đã upload toàn bộ lên Cloudflare R2.");
}

async function updateConfig(tracks) {
  console.log("\n📝 [4/5] Cập nhật src/config/music.config.ts...");
  const configPath = path.join(rootDir, "src", "config", "music.config.ts");

  const defaultTrack = tracks[0];
  const playlistItems = tracks.map((t) => {
    return `  {\n    name: ${JSON.stringify(t.name)},\n    artist: ${JSON.stringify(t.artist)},\n    file: ${JSON.stringify(t.file)},\n    cover: ${JSON.stringify(t.cover)},\n  },`;
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

async function main() {
  console.log("========================================================");
  console.log("   BREAKCORE MIX SYNC & CLOUD UPDATE - TOMATODEVS");
  console.log("========================================================");

  await clearCloudAndLocal();
  const tracks = await processTracks();
  await uploadToR2(tracks);
  await updateConfig(tracks);

  console.log("\n========================================================");
  console.log(`🎉 HOÀN TẤT: Đã cập nhật trọn vẹn 11 bài breakcore & ảnh bìa!`);
  console.log("========================================================\n");
}

main().catch(console.error);
