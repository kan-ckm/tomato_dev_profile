#!/usr/bin/env node

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
  syncTrackToDatabase,
  readLocalTracks,
  OPTIMAL_AUDIO_ARGS,
  embedCoverWithFfmpeg,
  checkPlaylistLimit,
} from "./lib/shared.mjs";

const { s3, bucketName } = getR2Config();
fs.mkdirSync(coversDir, { recursive: true });

const DEFAULT_SPOTIFY_PLAYLIST_ID = "37i9dQZF1E8L31helXXIO2";

async function fetchSpotifyPlaylistTracks(
  playlistId = DEFAULT_SPOTIFY_PLAYLIST_ID,
  limit = 20
) {
  console.log("\n🎵 [2/4] Đang lấy danh sách bài hát từ Spotify playlist...");
  let safeId = playlistId;
  const match = playlistId.match(/playlist\/([a-zA-Z0-9]+)/);
  if (match) {
    safeId = match[1];
  } else {
    safeId = playlistId.replace(/[^a-zA-Z0-9]/g, "");
  }
  const res = await fetch(`https://open.spotify.com/embed/playlist/${safeId}`, {
    signal: AbortSignal.timeout(10000),
  });
  const html = await res.text();
  const nextData = html.match(
    /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/
  );
  if (!nextData) throw new Error("Không thể trích xuất dữ liệu Spotify!");

  const data = JSON.parse(nextData[1]);
  const rawList = data.props?.pageProps?.state?.data?.entity?.trackList || [];
  const selected = rawList.slice(0, limit);
  console.log(
    `   Đã chọn ${selected.length}/${rawList.length} bài hát tiêu biểu nhất từ playlist.`
  );

  const tracks = [];
  for (const [idx, t] of selected.entries()) {
    const id = t.uri.split(":").pop();
    let coverUrl = null;
    try {
      const oRes = await fetch(
        `https://open.spotify.com/oembed?url=https://open.spotify.com/track/${encodeURIComponent(id)}`,
        { signal: AbortSignal.timeout(8000) }
      );
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
      const cRes = await fetch(track.coverUrl, {
        signal: AbortSignal.timeout(8000),
      });
      const buf = Buffer.from(await cRes.arrayBuffer());
      fs.writeFileSync(coverPath, buf);
      console.log(`   🖼️ Cover đã lưu: ${path.basename(coverPath)}`);
    } catch (e) {
      console.warn(`   ⚠️ Không tải được cover: ${e.message}`);
    }
  }

  // 2. Tải audio tối ưu từ YouTube qua yt-dlp (MP3 VBR 2, 44.1kHz)
  const candidateQueries = [
    `ytsearch1:${track.artist} ${track.name} audio`,
    `ytsearch1:${track.name} ${track.artist}`,
    `ytsearch1:${track.name} audio`,
  ];
  let audioDownloaded = false;
  let lastError = null;

  for (const q of candidateQueries) {
    try {
      execFileSync(
        "yt-dlp",
        [
          ...OPTIMAL_AUDIO_ARGS,
          "-o",
          tempMp3Path,
          q,
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
    }
  }

  if (!audioDownloaded) {
    console.error(`   ❌ Lỗi tải audio cho "${track.baseName}":`, lastError ? lastError.message : "Thất bại");
    return false;
  }

    // 3. Nhúng cover và ID3 tags vào MP3 bằng ffmpeg
    embedCoverWithFfmpeg(
      tempMp3Path,
      fs.existsSync(coverPath) ? coverPath : null,
      mp3Path,
      { title: track.name, artist: track.artist }
    );

    const stat = fs.statSync(mp3Path);
    console.log(
      `   🎧 Audio hoàn tất (${(stat.size / 1024 / 1024).toFixed(2)} MB): ${track.file}`
    );
    return true;
  } catch (err) {
    console.error(`   ❌ Lỗi tải audio cho "${track.baseName}":`, err.message);
    if (fs.existsSync(tempMp3Path)) fs.unlinkSync(tempMp3Path);
    return false;
  }
}

async function main() {
  console.log("========================================================");
  console.log("   SPOTIFY PLAYLIST SYNC & CLOUD UPDATE - TOMATODEVS");
  console.log("========================================================");

  const playlistArg = process.argv[2] || DEFAULT_SPOTIFY_PLAYLIST_ID;
  const limitArg = process.argv[3] ? parseInt(process.argv[3], 10) : 20;
  const tracks = await fetchSpotifyPlaylistTracks(playlistArg, limitArg);

  const currentCount = readLocalTracks().length;
  if (!checkPlaylistLimit(currentCount, tracks.length)) {
    process.exit(1);
  }

  console.log("\n📥 [2/3] Bắt đầu tải các bản nhạc...");
  const successfulTracks = [];
  for (const track of tracks) {
    const ok = await downloadTrack(track);
    if (ok) successfulTracks.push(track);
  }

  if (successfulTracks.length > 0) {
    console.log(
      `\n☁️  [3/3] Đang upload ${successfulTracks.length} bản nhạc và cover lên Cloudflare R2...`
    );
    await uploadTracksAndCoversToR2(s3, bucketName, successfulTracks);

    // Đồng bộ vào Neon PostgreSQL Database
    for (const t of successfulTracks) {
      await syncTrackToDatabase(t);
    }

    const allTracks = readLocalTracks();
    writeMusicConfigFile(allTracks);
  }

  const totalLocal = readLocalTracks().length;
  console.log("\n========================================================");
  console.log(
    `🎉 HOÀN TẤT: Đã tải ${successfulTracks.length} bài hát mới (Tổng: ${totalLocal} bài)!`
  );
  console.log("========================================================\n");
}

main().catch(console.error);
