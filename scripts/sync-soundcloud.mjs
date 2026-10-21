#!/usr/bin/env node

/**
 * Script tải và đồng bộ nhạc MP3 + ảnh bìa chất lượng cao từ SoundCloud.
 * Hỗ trợ:
 *   - 1 bài hát đơn lẻ (Track URL): https://soundcloud.com/artist/track-name
 *   - Playlist / Set / Album: https://soundcloud.com/artist/sets/set-name
 *   - Trang cá nhân nghệ sĩ: https://soundcloud.com/artist/tracks
 *   - Tìm kiếm trực tiếp: "tên nghệ sĩ tên bài hát" hoặc scsearch1:...
 *
 * Cách sử dụng:
 *   npm run soundcloud:sync <SoundCloud_URL_hoặc_Từ_khóa> [--append | --clean] [--limit <N>]
 *
 * Mặc định:
 *   - Với bài hát lẻ: Tự động chạy chế độ --append (thêm vào playlist hiện có, không xóa bài cũ).
 *   - Với Playlist: Mặc định đồng bộ toàn bộ (hoặc thêm cờ --append nếu muốn gộp thêm).
 */

import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import {
  musicDir,
  coversDir,
  getR2Config,
  sanitizeFilename,
  uploadTracksAndCoversToR2,
  writeMusicConfigFile,
  readLocalTracks,
  invalidateRedisMusicCache,
  OPTIMAL_AUDIO_ARGS,
  embedCoverWithFfmpeg,
} from "./lib/shared.mjs";

const { s3, bucketName } = getR2Config();
fs.mkdirSync(coversDir, { recursive: true });

function printUsageAndExit() {
  console.log("========================================================");
  console.log("   SOUNDCLOUD MUSIC SYNC - TOMATODEVS");
  console.log("========================================================");
  console.log("\n📖 Hướng dẫn sử dụng:\n");
  console.log(
    "  npm run soundcloud:sync <SoundCloud_URL_hoặc_Từ_khóa> [tùy_chọn]\n"
  );
  console.log("📌 Ví dụ:");
  console.log("  1. Tải 1 bài hát lẻ (tự động thêm vào playlist hiện tại):");
  console.log(
    '     npm run soundcloud:sync "https://soundcloud.com/clarion-885508548/hello-juliet-3"\n'
  );
  console.log("  2. Tải toàn bộ Playlist/Set từ SoundCloud:");
  console.log(
    '     npm run soundcloud:sync "https://soundcloud.com/clarion-885508548/sets/clarion"\n'
  );
  console.log("  3. Tìm kiếm bài hát theo tên trên SoundCloud:");
  console.log('     npm run soundcloud:sync "dracodraco through the light"\n');
  console.log("⚙️  Các cờ tùy chọn (Flags):");
  console.log(
    "  --limit <N>  Giới hạn số bài tối đa khi tải Playlist (mặc định: 20)."
  );
  console.log("\n🔒 Lưu ý: Tính năng tự động xóa nhạc đã tắt. Nhạc luôn được gộp vào thư viện.");
  console.log("========================================================\n");
  process.exit(0);
}

function parseCliArgs() {
  const rawArgs = process.argv.slice(2);
  if (rawArgs.length === 0 || rawArgs.includes("-h") || rawArgs.includes("--help")) {
    printUsageAndExit();
  }

  let target = "";
  let mode = null; // 'append' | 'clean' | null
  let limit = 20;

  for (let i = 0; i < rawArgs.length; i++) {
    const arg = rawArgs[i];
    if (arg === "--append") {
      mode = "append";
    } else if (arg === "--clean") {
      mode = "clean";
    } else if (arg === "--limit" && rawArgs[i + 1]) {
      const parsed = parseInt(rawArgs[i + 1], 10);
      if (!isNaN(parsed) && parsed > 0) limit = parsed;
      i++;
    } else if (!target && !arg.startsWith("-")) {
      target = arg.trim();
    }
  }

  if (!target) {
    printUsageAndExit();
  }

  return { target, mode, limit };
}

function extractTrackInfo(info) {
  let title = String(info.title || "").trim();
  let artist = String(
    info.artist || info.creator || info.uploader || "Unknown"
  ).trim();

  // Xử lý tiêu đề dạng "Artist - Title" thường gặp trên SoundCloud
  if (title.includes(" - ")) {
    const parts = title.split(" - ");
    const candidateArtist = parts[0].trim();
    const candidateTitle = parts.slice(1).join(" - ").trim();
    if (candidateArtist && candidateTitle) {
      artist = candidateArtist;
      title = candidateTitle;
    }
  }

  const cleanArtist = sanitizeFilename(artist) || "Unknown";
  const cleanTitle = sanitizeFilename(title) || "Track";
  const baseName = `${cleanArtist} - ${cleanTitle}`;

  // Lấy ảnh bìa chất lượng cao 500x500
  let coverUrl = info.thumbnail || null;
  if (coverUrl && typeof coverUrl === "string") {
    coverUrl = coverUrl
      .replace(/-large\./i, "-t500x500.")
      .replace(/-badge\./i, "-t500x500.")
      .replace(/-small\./i, "-t500x500.");
  }

  return {
    name: cleanTitle,
    artist: cleanArtist,
    baseName,
    file: `${baseName}.mp3`,
    coverUrl,
    webpageUrl: info.webpage_url || info.url,
  };
}

async function fetchFallbackArtwork(searchTerm) {
  try {
    const res = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&entity=song&limit=1`,
      { signal: AbortSignal.timeout(6000) }
    );
    const data = await res.json();
    return (
      data.results?.[0]?.artworkUrl100?.replace("100x100bb.jpg", "600x600bb.jpg") ||
      null
    );
  } catch {
    return null;
  }
}

async function downloadSingleTrack(trackUrl, index, total) {
  console.log(`\n⏳ [${index}/${total}] Đang trích xuất metadata: ${trackUrl}`);

  let trackInfo = null;
  try {
    const jsonOutput = execFileSync(
      "yt-dlp",
      ["--dump-single-json", "--skip-download", trackUrl],
      { encoding: "utf-8", stdio: ["pipe", "pipe", "ignore"] }
    );
    trackInfo = extractTrackInfo(JSON.parse(jsonOutput));
  } catch (err) {
    console.error(`   ❌ Lỗi đọc metadata (${trackUrl}):`, err.message);
    return null;
  }

  console.log(`   🎵 Bài hát: "${trackInfo.baseName}"`);

  const mp3Path = path.join(musicDir, trackInfo.file);
  const coverPath = path.join(coversDir, `${trackInfo.baseName}.jpg`);
  const tempCutPath = path.join(
    musicDir,
    `temp_sc_${index}_${Date.now()}.mp3`
  );

  // 1. Tải ảnh bìa (Artwork)
  let coverDownloaded = false;
  let artUrl = trackInfo.coverUrl;
  if (!artUrl) {
    artUrl = await fetchFallbackArtwork(`${trackInfo.artist} ${trackInfo.name}`);
  }

  if (artUrl) {
    try {
      const cRes = await fetch(artUrl, { signal: AbortSignal.timeout(8000) });
      if (cRes.ok) {
        const buf = Buffer.from(await cRes.arrayBuffer());
        fs.writeFileSync(coverPath, buf);
        coverDownloaded = true;
        console.log(`   🖼️ Cover tải thành công: ${path.basename(coverPath)}`);
      }
    } catch (e) {
      console.warn(`   ⚠️ Lỗi tải cover: ${e.message}`);
    }
  }

  // 2. Tải audio tối ưu từ SoundCloud qua yt-dlp (MP3 VBR 2, 44.1kHz)
  try {
    execFileSync(
      "yt-dlp",
      [
        ...OPTIMAL_AUDIO_ARGS,
        "-o",
        tempCutPath,
        trackUrl,
      ],
      { stdio: ["pipe", "pipe", "ignore"] }
    );
  } catch (err) {
    console.error(`   ❌ Lỗi tải audio từ SoundCloud:`, err.message);
    if (fs.existsSync(tempCutPath)) fs.unlinkSync(tempCutPath);
    return null;
  }

  // 3. Nhúng Cover & ID3 Metadata bằng ffmpeg
  embedCoverWithFfmpeg(
    tempCutPath,
    coverDownloaded ? coverPath : null,
    mp3Path,
    { title: trackInfo.name, artist: trackInfo.artist }
  );

  if (!fs.existsSync(mp3Path)) {
    console.error(`   ❌ File không tạo được: ${mp3Path}`);
    return null;
  }

  const stat = fs.statSync(mp3Path);
  console.log(
    `   🎧 Audio hoàn tất (${(stat.size / 1024 / 1024).toFixed(2)} MB): ${trackInfo.file}`
  );

  return {
    name: trackInfo.name,
    artist: trackInfo.artist,
    baseName: trackInfo.baseName,
    file: trackInfo.file,
    cover: `/assets/music/covers/${encodeURIComponent(trackInfo.baseName)}.jpg`,
  };
}

async function main() {
  const { target, mode, limit } = parseCliArgs();

  console.log("========================================================");
  console.log("   SOUNDCLOUD SYNC & CLOUD UPDATE - TOMATODEVS");
  console.log("========================================================");
  console.log(`\n🔍 Đang phân tích nguồn: "${target}"...`);

  // Chuẩn bị URL/query cho yt-dlp
  let queryUrl = target;
  if (
    !target.startsWith("http://") &&
    !target.startsWith("https://") &&
    !target.startsWith("scsearch")
  ) {
    queryUrl = `scsearch1:${target}`;
  }

  // Lấy danh sách track từ nguồn
  let playlistData = null;
  try {
    const rawJson = execFileSync(
      "yt-dlp",
      ["--dump-single-json", "--flat-playlist", "--skip-download", queryUrl],
      { encoding: "utf-8", stdio: ["pipe", "pipe", "ignore"] }
    );
    playlistData = JSON.parse(rawJson);
  } catch (err) {
    console.error("❌ Không thể kết nối hoặc trích xuất từ SoundCloud:", err.message);
    process.exit(1);
  }

  const isPlaylist =
    playlistData._type === "playlist" &&
    Array.isArray(playlistData.entries) &&
    playlistData.entries.length > 0;

  // Xác định danh sách URL bài hát cần tải
  let trackUrls = [];
  let isMultiple = false;

  if (isPlaylist) {
    // Nếu là kết quả tìm kiếm scsearch1, chỉ lấy 1 bài
    if (queryUrl.startsWith("scsearch1:")) {
      const first = playlistData.entries[0];
      const url = first.webpage_url || first.url;
      if (url) trackUrls.push(url);
    } else {
      isMultiple = true;
      const validEntries = playlistData.entries
        .map((e) => e.webpage_url || e.url)
        .filter(Boolean)
        .slice(0, limit);
      trackUrls = validEntries;
    }
  } else {
    trackUrls.push(playlistData.webpage_url || playlistData.url || target);
  }

  if (trackUrls.length === 0) {
    console.log("⚠️ Không tìm thấy bài hát nào từ nguồn SoundCloud đã cung cấp.");
    process.exit(0);
  }

  console.log(
    `📦 Phát hiện ${trackUrls.length} bài hát. Chế độ: [TỰ ĐỘNG THÊM VÀO THƯ VIỆN (APPEND)]`
  );

  console.log("\n📥 [1/3] Bắt đầu tải và xử lý các bản nhạc từ SoundCloud...");
  const downloadedTracks = [];
  for (const [idx, url] of trackUrls.entries()) {
    try {
      const track = await downloadSingleTrack(url, idx + 1, trackUrls.length);
      if (track) downloadedTracks.push(track);
    } catch (err) {
      console.warn(`   ⚠️ Bỏ qua bài do lỗi: ${err.message}`);
    }
  }

  if (downloadedTracks.length === 0) {
    console.log("\n⚠️ Không có bài hát nào được tải thành công.");
    process.exit(1);
  }

  // Upload lên R2
  console.log(
    `\n☁️  [2/3] Upload ${downloadedTracks.length} bài mới lên Cloudflare R2 '${bucketName || "local"}'...`
  );
  await uploadTracksAndCoversToR2(s3, bucketName, downloadedTracks);

  // Cập nhật cấu hình music.config.ts
  console.log("\n📝 [3/3] Cập nhật danh sách phát vào src/config/music.config.ts...");
  const localTracks = readLocalTracks();
  writeMusicConfigFile(localTracks);

  await invalidateRedisMusicCache();

  console.log("\n========================================================");
  console.log(
    `🎉 HOÀN TẤT: Đã đồng bộ thành công ${downloadedTracks.length} bài hát từ SoundCloud!`
  );
  console.log(`📁 Tổng số bài hiện có trong thư viện: ${localTracks.length}`);
  console.log("========================================================\n");
}

main().catch((err) => {
  console.error("\n❌ LỖI KHÔNG MONG MUỐN:", err);
  process.exit(1);
});
