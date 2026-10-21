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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

// 1. Load .env
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
const publicUrl = process.env.R2_PUBLIC_URL?.replace(/\/+$/, "").trim() || "";

const isR2Enabled = Boolean(accountId && accessKeyId && secretAccessKey && bucketName);
const s3 = isR2Enabled
  ? new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    })
  : null;

const musicDir = path.join(rootDir, "public", "assets", "music");
const coversDir = path.join(musicDir, "covers");
fs.mkdirSync(coversDir, { recursive: true });

function sanitizeFilename(name) {
  return name
    .replace(/[/\\?%*:|"<>~#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function clearCloudAndLocalOldMusic() {
  console.log("\n🗑️  [1/5] Đang xóa các bài nhạc hiện có trên Cloudflare R2 & local...");

  if (s3 && bucketName) {
    try {
      const existing = await s3.send(
        new ListObjectsV2Command({ Bucket: bucketName, Prefix: "music/" })
      );
      const objects = existing.Contents || [];
      for (const obj of objects) {
        if (obj.Key) {
          console.log(`   - Xóa trên R2: ${obj.Key}`);
          await s3.send(new DeleteObjectCommand({ Bucket: bucketName, Key: obj.Key }));
        }
      }
      console.log(`   ✅ Đã dọn dẹp ${objects.length} file cũ trên Cloudflare R2.`);
    } catch (err) {
      console.warn("   ⚠️ Lỗi khi dọn dẹp R2:", err.message);
    }
  }

  // Xóa local
  const localFiles = fs.readdirSync(musicDir);
  for (const f of localFiles) {
    if (f.toLowerCase().endsWith(".mp3")) {
      fs.unlinkSync(path.join(musicDir, f));
      console.log(`   - Xóa local: ${f}`);
    }
  }
  const localCovers = fs.readdirSync(coversDir);
  for (const c of localCovers) {
    if (c.toLowerCase().endsWith(".jpg") || c.toLowerCase().endsWith(".png")) {
      fs.unlinkSync(path.join(coversDir, c));
      console.log(`   - Xóa cover: ${c}`);
    }
  }
  console.log("   ✅ Đã dọn dẹp các file nhạc local cũ.");
}

async function fetchSpotifyPlaylistTracks(limit = 25) {
  console.log("\n🎵 [2/5] Đang lấy danh sách bài hát từ Spotify playlist...");
  const res = await fetch("https://open.spotify.com/embed/playlist/37i9dQZF1E8L31helXXIO2");
  const html = await res.text();
  const nextData = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!nextData) throw new Error("Không thể trích xuất dữ liệu Spotify!");

  const data = JSON.parse(nextData[1]);
  const rawList = data.props?.pageProps?.state?.data?.entity?.trackList || [];
  const selected = rawList.slice(0, limit);
  console.log(`   Đã chọn ${selected.length}/${rawList.length} bài hát tiêu biểu nhất từ playlist.`);

  const tracks = [];
  for (const [idx, t] of selected.entries()) {
    const id = t.uri.split(":").pop();
    let coverUrl = null;
    try {
      const oRes = await fetch(`https://open.spotify.com/oembed?url=https://open.spotify.com/track/${id}`);
      const oData = await oRes.json();
      coverUrl = oData.thumbnail_url
        ? oData.thumbnail_url.replace("ab67616d00001e02", "ab67616d0000b273")
        : null;
    } catch {
      coverUrl = null;
    }

    const cleanArtist = sanitizeFilename(t.subtitle || "Unknown");
    const cleanTitle = sanitizeFilename(t.title || "Track");
    const baseName = `${cleanArtist} - ${cleanTitle}`;

    tracks.push({
      index: idx + 1,
      name: cleanTitle,
      artist: cleanArtist,
      baseName,
      file: `${baseName}.mp3`,
      coverUrl,
    });
  }

  return tracks;
}

async function downloadTrack(track) {
  const mp3Path = path.join(musicDir, track.file);
  const coverPath = path.join(coversDir, `${track.baseName}.jpg`);
  const tempMp3Path = path.join(musicDir, `temp_${track.index}.mp3`);

  console.log(`\n⏳ [${track.index}] Đang tải: "${track.baseName}"`);

  // 1. Tải cover art
  if (track.coverUrl) {
    try {
      const cRes = await fetch(track.coverUrl);
      const buf = Buffer.from(await cRes.arrayBuffer());
      fs.writeFileSync(coverPath, buf);
      console.log(`   🖼️ Cover đã lưu: ${path.basename(coverPath)}`);
    } catch (e) {
      console.warn(`   ⚠️ Không tải được cover: ${e.message}`);
    }
  }

  // 2. Tải audio từ YouTube qua yt-dlp
  const query = `${track.artist} ${track.name} audio`;
  try {
    const cmd = `yt-dlp -x --audio-format mp3 --audio-quality 0 --no-warnings -o "${tempMp3Path}" "ytsearch1:${query.replace(/"/g, '\\"')}"`;
    execSync(cmd, { stdio: "pipe" });

    // 3. Nhúng cover vào MP3 bằng ffmpeg nếu có cover
    if (fs.existsSync(coverPath)) {
      try {
        const ffmpegCmd = `ffmpeg -y -i "${tempMp3Path}" -i "${coverPath}" -map 0:0 -map 1:0 -c copy -id3v2_version 3 -metadata:s:v title="Album cover" -metadata:s:v comment="Cover (front)" -metadata title="${track.name.replace(/"/g, '\\"')}" -metadata artist="${track.artist.replace(/"/g, '\\"')}" "${mp3Path}"`;
        execSync(ffmpegCmd, { stdio: "pipe" });
        if (fs.existsSync(tempMp3Path)) fs.unlinkSync(tempMp3Path);
      } catch {
        // Fallback: giữ file mp3 không nhúng
        if (fs.existsSync(tempMp3Path)) fs.renameSync(tempMp3Path, mp3Path);
      }
    } else if (fs.existsSync(tempMp3Path)) {
      fs.renameSync(tempMp3Path, mp3Path);
    }

    const stat = fs.statSync(mp3Path);
    console.log(`   🎧 Audio hoàn tất (${(stat.size / 1024 / 1024).toFixed(2)} MB): ${track.file}`);
    return true;
  } catch (err) {
    console.error(`   ❌ Lỗi tải audio cho "${track.baseName}":`, err.message);
    if (fs.existsSync(tempMp3Path)) fs.unlinkSync(tempMp3Path);
    return false;
  }
}

async function uploadToCloudflareR2(tracks) {
  if (!s3 || !bucketName) {
    console.log("\n⏩ Bỏ qua upload Cloudflare R2 vì chưa cấu hình.");
    return;
  }

  console.log(`\n☁️  [4/5] Đang upload các bản nhạc và cover lên Cloudflare R2 bucket '${bucketName}'...`);

  for (const track of tracks) {
    const mp3Path = path.join(musicDir, track.file);
    const coverPath = path.join(coversDir, `${track.baseName}.jpg`);

    if (fs.existsSync(mp3Path)) {
      const body = fs.readFileSync(mp3Path);
      const key = `music/${track.file}`;
      await s3.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          Body: body,
          ContentType: "audio/mpeg",
          CacheControl: "public, max-age=31536000, immutable",
        })
      );
      console.log(`   ⬆️ [R2] Uploaded: ${key}`);
    }

    if (fs.existsSync(coverPath)) {
      const coverBody = fs.readFileSync(coverPath);
      const coverKey = `music/covers/${track.baseName}.jpg`;
      await s3.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: coverKey,
          Body: coverBody,
          ContentType: "image/jpeg",
          CacheControl: "public, max-age=31536000, immutable",
        })
      );
      console.log(`   ⬆️ [R2] Uploaded cover: ${coverKey}`);
    }
  }

  console.log("   ✅ Đã upload toàn bộ nhạc và ảnh bìa lên Cloudflare R2.");
}

async function updateMusicConfig(successfulTracks) {
  console.log("\n📝 [5/5] Cập nhật src/config/music.config.ts...");
  const configPath = path.join(rootDir, "src", "config", "music.config.ts");

  const defaultTrack = successfulTracks[0];
  const playlistItems = successfulTracks.map((t) => {
    return `  {\n    name: ${JSON.stringify(t.name)},\n    artist: ${JSON.stringify(t.artist)},\n    file: ${JSON.stringify(t.file)},\n    cover: ${JSON.stringify(`/assets/music/covers/${encodeURIComponent(t.baseName)}.jpg`)},\n  },`;
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
  console.log("   SPOTIFY PLAYLIST SYNC & CLOUD CLEANUP - TOMATODEVS");
  console.log("========================================================");

  await clearCloudAndLocalOldMusic();
  const tracks = await fetchSpotifyPlaylistTracks(20);

  console.log("\n📥 [3/5] Bắt đầu tải các bản nhạc...");
  const successfulTracks = [];
  for (const track of tracks) {
    const ok = await downloadTrack(track);
    if (ok) successfulTracks.push(track);
  }

  if (successfulTracks.length > 0) {
    await uploadToCloudflareR2(successfulTracks);
    await updateMusicConfig(successfulTracks);
  }

  console.log("\n========================================================");
  console.log(`🎉 HOÀN TẤT: Đã đồng bộ thành công ${successfulTracks.length} bài hát!`);
  console.log("========================================================\n");
}

main().catch(console.error);
