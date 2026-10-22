#!/usr/bin/env node

/**
 * Universal Track Downloader & Syncer - TomatoDevs
 *
 * Tải 1 bài hát bất kỳ từ YouTube, Spotify, hoặc SoundCloud
 * và tự động thêm vào thư viện nhạc, Cloudflare R2, và cập nhật website.
 *
 * Hỗ trợ các nguồn đầu vào:
 *   1. Link YouTube / YouTube Music:
 *      npm run music:add "https://www.youtube.com/watch?v=..."
 *      npm run music:add "https://youtu.be/..."
 *
 *   2. Link bài hát Spotify (Single Track):
 *      npm run music:add "https://open.spotify.com/track/..."
 *
 *   3. Link bài hát SoundCloud:
 *      npm run music:add "https://soundcloud.com/artist/track"
 *
 *   4. Tìm kiếm theo tên bài hát / nghệ sĩ:
 *      npm run music:add "Blksmiith - F R A G M E N T"
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
  checkPlaylistLimit,
  syncTrackToDatabase,
  syncMusicConfigFromDatabase,
} from "./lib/shared.mjs";

const { s3, bucketName } = getR2Config();
fs.mkdirSync(coversDir, { recursive: true });

function printUsageAndExit() {
  console.log("========================================================");
  console.log("   UNIVERSAL MUSIC DOWNLOADER - TOMATODEVS");
  console.log("========================================================");
  console.log("\n📖 Hướng dẫn sử dụng:\n");
  console.log("  npm run music:add <Link_YouTube_Spotify_SoundCloud_hoặc_Tên_bài>\n");
  console.log("📌 Ví dụ:");
  console.log("  1. Tải từ YouTube:");
  console.log(
    '     npm run music:add "https://www.youtube.com/watch?v=dQw4w9WgXcQ"\n'
  );
  console.log("  2. Tải từ Spotify:");
  console.log(
    '     npm run music:add "https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT"\n'
  );
  console.log("  3. Tải từ SoundCloud:");
  console.log(
    '     npm run music:add "https://soundcloud.com/clarion-885508548/hello-juliet-3"\n'
  );
  console.log("  4. Tự động tìm kiếm & tải bản hay nhất:");
  console.log('     npm run music:add "dracodraco through the light"\n');
  console.log("========================================================\n");
  process.exit(0);
}

// 1. Tải ảnh bìa chuẩn từ iTunes Store Search (600x600 HD)
async function fetchItunesArtwork(searchTerm) {
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

// 2. Làm sạch tiêu đề YouTube (bỏ các hậu tố như [Official Video], MV, 4K...)
function cleanYoutubeTitle(rawTitle, uploader) {
  let cleaned = rawTitle
    .replace(
      /\s*[\(\[](?:Official\s*(?:Music\s*)?Video|Official\s*Audio|4K\s*Remaster|MV|HD|Lyric\s*Video|Visualizer|Lyrics|Audio|Audio\s*Visualizer)[\)\]]/gi,
      ""
    )
    .replace(/\s*[\(\[]HD[\)\]]/gi, "")
    .trim();

  let artist = uploader || "Unknown";
  let title = cleaned;

  if (cleaned.includes(" - ")) {
    const parts = cleaned.split(" - ");
    artist = parts[0].trim();
    title = parts.slice(1).join(" - ").trim();
  }

  title = title.replace(/^["'“”]+|["'“”]+$/g, "").trim();
  artist = artist.replace(/\s*-\s*Topic$/i, "").trim();

  return { artist, title };
}

// 3. Xử lý nguồn Spotify
async function resolveSpotifyTrack(url) {
  const match = url.match(/track\/([a-zA-Z0-9]+)/);
  if (!match) return null;
  const id = match[1];

  let title = "";
  let artist = "";
  let coverUrl = null;

  // Lấy tên bài và ca sĩ từ Embed page
  try {
    const res = await fetch(`https://open.spotify.com/embed/track/${id}`, {
      signal: AbortSignal.timeout(8000),
    });
    const html = await res.text();
    const dataMatch = html.match(
      /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/
    );
    if (dataMatch) {
      const data = JSON.parse(dataMatch[1]);
      const entity = data.props?.pageProps?.state?.data?.entity;
      title = entity?.name || "";
      artist = entity?.artists?.map((a) => a.name).join(", ") || "";
    }
  } catch {
    // Tiếp tục thử oEmbed
  }

  // Lấy ảnh bìa chất lượng cao 640x640 từ oEmbed, fallback về 300x300 nếu cần
  let rawThumbnail = null;
  try {
    const oRes = await fetch(
      `https://open.spotify.com/oembed?url=https://open.spotify.com/track/${id}`,
      { signal: AbortSignal.timeout(8000) }
    );
    const oData = await oRes.json();
    if (!title) title = oData.title || "";
    rawThumbnail = oData.thumbnail_url || null;
    coverUrl = rawThumbnail
      ? rawThumbnail.replace("ab67616d00001e02", "ab67616d0000b273")
      : null;
  } catch {
    // Không tải được từ oEmbed
  }

  if (!title) return null;
  if (!artist) artist = "Unknown";

  const cleanArtist = sanitizeFilename(artist);
  const cleanTitle = sanitizeFilename(title);
  const baseName = `${cleanArtist} - ${cleanTitle}`;

  return {
    source: "spotify",
    artist: cleanArtist,
    title: cleanTitle,
    baseName,
    coverUrl,
    fallbackCoverUrl: rawThumbnail,
    // Vì Spotify có DRM, audio sẽ được tải qua nguồn YouTube tốt nhất với cơ chế fallback
    audioQueries: [
      `ytsearch1:${cleanArtist} ${cleanTitle} audio`,
      `ytsearch1:${cleanTitle} ${cleanArtist}`,
      `ytsearch1:${cleanTitle} audio`,
    ],
    audioQuery: `ytsearch1:${cleanArtist} ${cleanTitle} audio`,
  };
}

// 4. Xử lý nguồn YouTube
async function resolveYoutubeTrack(url) {
  const rawJson = execFileSync(
    "yt-dlp",
    ["--js-runtimes", "node", "--dump-single-json", "--skip-download", url],
    { encoding: "utf-8", stdio: ["pipe", "pipe", "ignore"] }
  );
  const info = JSON.parse(rawJson);
  const { artist, title } = cleanYoutubeTitle(info.title, info.uploader);

  const cleanArtist = sanitizeFilename(info.artist || artist || "Unknown");
  const cleanTitle = sanitizeFilename(info.track || title || "Track");
  const baseName = `${cleanArtist} - ${cleanTitle}`;

  // Thử tìm cover HD trên iTunes, nếu không có thì lấy thumbnail của YouTube
  let coverUrl = await fetchItunesArtwork(`${cleanArtist} ${cleanTitle}`);
  if (!coverUrl) {
    coverUrl = info.thumbnail || null;
  }

  return {
    source: "youtube",
    artist: cleanArtist,
    title: cleanTitle,
    baseName,
    coverUrl,
    audioUrl: url,
  };
}

// 5. Xử lý nguồn SoundCloud
async function resolveSoundcloudTrack(url) {
  const rawJson = execFileSync(
    "yt-dlp",
    ["--js-runtimes", "node", "--dump-single-json", "--skip-download", url],
    { encoding: "utf-8", stdio: ["pipe", "pipe", "ignore"] }
  );
  const info = JSON.parse(rawJson);

  let rawTitle = String(info.title || "").trim();
  let rawArtist = String(
    info.artist || info.creator || info.uploader || "Unknown"
  ).trim();

  if (rawTitle.includes(" - ")) {
    const parts = rawTitle.split(" - ");
    rawArtist = parts[0].trim();
    rawTitle = parts.slice(1).join(" - ").trim();
  }

  const cleanArtist = sanitizeFilename(rawArtist) || "Unknown";
  const cleanTitle = sanitizeFilename(rawTitle) || "Track";
  const baseName = `${cleanArtist} - ${cleanTitle}`;

  let coverUrl = info.thumbnail || null;
  if (coverUrl && typeof coverUrl === "string") {
    coverUrl = coverUrl
      .replace(/-large\./i, "-t500x500.")
      .replace(/-badge\./i, "-t500x500.")
      .replace(/-small\./i, "-t500x500.");
  }
  if (!coverUrl) {
    coverUrl = await fetchItunesArtwork(`${cleanArtist} ${cleanTitle}`);
  }

  return {
    source: "soundcloud",
    artist: cleanArtist,
    title: cleanTitle,
    baseName,
    coverUrl,
    audioUrl: url,
  };
}

// 6. Xử lý từ khóa tìm kiếm tự do
async function resolveSearchQuery(query) {
  const searchQuery = `ytsearch1:${query}`;
  const rawJson = execFileSync(
    "yt-dlp",
    ["--js-runtimes", "node", "--dump-single-json", "--skip-download", searchQuery],
    { encoding: "utf-8", stdio: ["pipe", "pipe", "ignore"] }
  );
  const playlist = JSON.parse(rawJson);
  const info = playlist.entries?.[0] || playlist;

  const { artist, title } = cleanYoutubeTitle(info.title, info.uploader);
  const cleanArtist = sanitizeFilename(info.artist || artist || "Unknown");
  const cleanTitle = sanitizeFilename(info.track || title || "Track");
  const baseName = `${cleanArtist} - ${cleanTitle}`;

  let coverUrl = await fetchItunesArtwork(`${cleanArtist} ${cleanTitle}`);
  if (!coverUrl) {
    coverUrl = info.thumbnail || null;
  }

  return {
    source: "search",
    artist: cleanArtist,
    title: cleanTitle,
    baseName,
    coverUrl,
    audioUrl: info.webpage_url || info.url || searchQuery,
  };
}

async function main() {
  const arg = process.argv.slice(2).join(" ").trim();
  if (!arg || arg === "-h" || arg === "--help") {
    printUsageAndExit();
  }

  const currentLocalTracks = readLocalTracks();
  if (!checkPlaylistLimit(currentLocalTracks.length, 1)) {
    process.exit(1);
  }

  console.log("========================================================");
  console.log("   UNIVERSAL TRACK DOWNLOADER & SYNC - TOMATODEVS");
  console.log("========================================================");
  console.log(`\n🔍 Đang phân tích đầu vào: "${arg}"...`);

  let trackMeta = null;

  try {
    if (arg.includes("spotify.com") || arg.startsWith("spotify:")) {
      console.log("🎧 Nguồn phát hiện: Spotify Track");
      trackMeta = await resolveSpotifyTrack(arg);
    } else if (arg.includes("youtube.com") || arg.includes("youtu.be")) {
      console.log("📺 Nguồn phát hiện: YouTube Video / Music");
      trackMeta = await resolveYoutubeTrack(arg);
    } else if (arg.includes("soundcloud.com")) {
      console.log("☁️  Nguồn phát hiện: SoundCloud Track");
      trackMeta = await resolveSoundcloudTrack(arg);
    } else {
      console.log("🔎 Nguồn phát hiện: Từ khóa tìm kiếm");
      trackMeta = await resolveSearchQuery(arg);
    }
  } catch (err) {
    console.error("❌ Lỗi khi đọc thông tin bài hát:", err.message);
    process.exit(1);
  }

  if (!trackMeta) {
    console.error("❌ Không thể trích xuất metadata từ nguồn này.");
    process.exit(1);
  }

  console.log(`\n✨ Thông tin bài hát:`);
  console.log(`   - Tên bài:   ${trackMeta.title}`);
  console.log(`   - Nghệ sĩ:   ${trackMeta.artist}`);
  console.log(`   - File xuất: ${trackMeta.baseName}.mp3`);

  const mp3Path = path.join(musicDir, `${trackMeta.baseName}.mp3`);
  const coverPath = path.join(coversDir, `${trackMeta.baseName}.jpg`);
  const tempMp3Path = path.join(
    musicDir,
    `temp_add_${Date.now()}.mp3`
  );

  // 1. Tải ảnh bìa (Cover Art) với cơ chế Retry & Đa nguồn fallback
  let coverDownloaded = false;
  const coverCandidates = [
    trackMeta.coverUrl,
    trackMeta.fallbackCoverUrl,
    await fetchItunesArtwork(`${trackMeta.artist} ${trackMeta.title}`),
  ].filter(Boolean);

  if (coverCandidates.length > 0) {
    console.log(`\n🖼️  [1/3] Đang tải ảnh bìa chất lượng cao...`);
    for (const candUrl of coverCandidates) {
      if (coverDownloaded) break;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const cRes = await fetch(candUrl, { signal: AbortSignal.timeout(10000) });
          if (cRes.ok) {
            const buf = Buffer.from(await cRes.arrayBuffer());
            if (buf.length > 1000) {
              fs.writeFileSync(coverPath, buf);
              coverDownloaded = true;
              console.log(
                `   ✅ Cover đã lưu: ${path.basename(coverPath)} (${(buf.length / 1024).toFixed(1)} KB)`
              );
              break;
            }
          }
        } catch {
          if (attempt < 3) await new Promise((r) => setTimeout(r, 1000));
        }
      }
    }
    if (!coverDownloaded) {
      console.warn(`   ⚠️ Không thể tải ảnh bìa sau khi thử các nguồn candidate.`);
    }
  }

  // 2. Tải Audio chuẩn tối ưu qua yt-dlp (MP3 VBR 2, 44.1kHz, nhẹ & chuẩn studio)
  console.log(`\n📥 [2/3] Đang tải audio tối ưu qua yt-dlp...`);
  const candidateSources = trackMeta.audioUrl
    ? [trackMeta.audioUrl]
    : (trackMeta.audioQueries || [trackMeta.audioQuery]);

  let audioDownloaded = false;
  let lastError = null;

  for (const src of candidateSources) {
    try {
      execFileSync(
        "yt-dlp",
        [
          ...OPTIMAL_AUDIO_ARGS,
          "-o",
          tempMp3Path,
          src,
        ],
        { stdio: ["pipe", "pipe", "ignore"] }
      );
      if (fs.existsSync(tempMp3Path) && fs.statSync(tempMp3Path).size > 1000) {
        audioDownloaded = true;
        break;
      }
    } catch (err) {
      lastError = err;
      if (fs.existsSync(tempMp3Path)) fs.unlinkSync(tempMp3Path);
      console.warn(`   ⚠️ Nguồn "${src}" không thành công, đang thử nguồn dự phòng...`);
    }
  }

  if (!audioDownloaded) {
    console.error("❌ Lỗi tải audio:", lastError ? lastError.message : "Không thể tải từ bất kỳ nguồn nào");
    process.exit(1);
  }

  // 3. Nhúng ID3 tags và Cover tối ưu vào MP3 bằng ffmpeg
  embedCoverWithFfmpeg(
    tempMp3Path,
    coverDownloaded ? coverPath : null,
    mp3Path,
    { title: trackMeta.title, artist: trackMeta.artist }
  );

  const stat = fs.statSync(mp3Path);
  console.log(
    `   🎧 File nhạc hoàn tất (${(stat.size / 1024 / 1024).toFixed(2)} MB): ${path.basename(mp3Path)}`
  );

  // 4. Tải lên Cloudflare R2
  const newTrack = {
    name: trackMeta.title,
    artist: trackMeta.artist,
    baseName: trackMeta.baseName,
    file: `${trackMeta.baseName}.mp3`,
    cover: `/assets/music/covers/${encodeURIComponent(trackMeta.baseName)}.jpg`,
  };

  console.log(`\n☁️  [3/3] Upload lên Cloudflare R2 '${bucketName || "local"}'...`);
  await uploadTracksAndCoversToR2(s3, bucketName, [newTrack]);

  // 5. Đồng bộ vào Neon PostgreSQL Database (Single Source of Truth)
  await syncTrackToDatabase(newTrack);

  // 6. Cập nhật file cấu hình music.config.ts trực tiếp từ Neon DB (hoặc fallback đĩa) và làm mới Redis Cache
  const allLocalTracks = readLocalTracks();
  const syncedFromDb = await syncMusicConfigFromDatabase();
  if (!syncedFromDb) {
    writeMusicConfigFile(allLocalTracks);
  }
  await invalidateRedisMusicCache();

  console.log("\n========================================================");
  console.log(
    `🎉 HOÀN TẤT: Đã thêm "${trackMeta.artist} - ${trackMeta.title}" vào thư viện!`
  );
  console.log(`📁 Tổng số bài hiện có trong playlist: ${allLocalTracks.length}`);
  console.log("========================================================\n");
}

main().catch((err) => {
  console.error("\n❌ LỖI KHÔNG MONG MUỐN:", err);
  process.exit(1);
});
