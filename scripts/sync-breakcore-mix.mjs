#!/usr/bin/env node

import fs from "fs";
import os from "os";
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
  checkPlaylistLimit,
  syncTrackToDatabase,
} from "./lib/shared.mjs";

const { s3, bucketName } = getR2Config();
fs.mkdirSync(coversDir, { recursive: true });

const DEFAULT_BREAKCORE_URL = "https://youtu.be/-DX7-CqCO8E";

const DEFAULT_BREAKCORE_TRACKS = [
  { start: 0, end: 97, artist: "dracodraco", title: "through the light", searchTerm: "dracodraco through the light" },
  { start: 97, end: 289, artist: "Blksmiith", title: "GORE-TEX COVERS MY SOUL", searchTerm: "Blksmiith GORE-TEX COVERS MY SOUL" },
  { start: 289, end: 435, artist: "DXRKWRLD", title: "Face The Future", searchTerm: "DXRKWRLD Face The Future" },
  { start: 435, end: 562, artist: "ooxygen", title: "Final wish", searchTerm: "ooxygen Final wish" },
  { start: 562, end: 714, artist: "GnB Chili", title: "Blazing in the Dark", searchTerm: "GnB Chili Blazing in the Dark" },
  { start: 714, end: 806, artist: "Ftlframe", title: "Shine or Die", searchTerm: "Ftlframe Shine or Die" },
  { start: 806, end: 962, artist: "TOKYOPILL", title: "Emptiness", searchTerm: "TOKYOPILL Emptiness" },
  { start: 962, end: 1023, artist: "Blksmiith", title: "F R A G M E N T", searchTerm: "Blksmiith FRAGMENT" },
  { start: 1023, end: 1288, artist: "amore", title: "Pure Judgement", searchTerm: "amore Pure Judgement" },
  { start: 1288, end: 1469, artist: "In Explosions", title: "amnesia", searchTerm: "In Explosions amnesia" },
  { start: 1469, end: 1569, artist: "FlowerBoyDeMii", title: "Subject : Haise", searchTerm: "FlowerBoyDeMii Subject : Haise" },
];

function toSeconds(ts) {
  const parts = ts.trim().split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

function parseTrackName(rawText) {
  let cleaned = rawText
    .replace(/\b\d{1,2}:\d{2}(?::\d{2})?\b(?:\s*[-–—]\s*\b\d{1,2}:\d{2}(?::\d{2})?\b)?/g, "")
    .replace(/[\[\(][^\]\)]*\b\d{1,2}:\d{2}\b[^\]\)]*[\]\)]/g, "")
    .replace(/^[•\s\-_–—*|#\d\.)]+|[•\s\-_–—*|]+$/g, "")
    .trim();

  let artist = "Unknown";
  let title = cleaned;

  const separators = [" — ", " – ", " - ", " // "];
  for (const sep of separators) {
    if (cleaned.includes(sep)) {
      const parts = cleaned.split(sep);
      // Nếu có format: Title — Artist hoặc Artist — Title
      title = parts[0].trim();
      artist = parts.slice(1).join(sep).trim();
      break;
    }
  }

  return {
    artist: sanitizeFilename(artist) || "Various Artists",
    title: sanitizeFilename(title) || "Untitled Track",
  };
}

/**
 * Phân tích video metadata để tự động trích xuất danh sách Chapters / Timestamps
 */
function extractTracksMetadata(videoUrl) {
  console.log(`\n🔍 Đang phân tích cấu trúc Chapters/Tracklist từ YouTube...`);
  try {
    const rawJson = execFileSync(
      "yt-dlp",
      ["--dump-json", videoUrl],
      { encoding: "utf-8", stdio: ["pipe", "pipe", "ignore"], timeout: 30000 }
    );
    const info = JSON.parse(rawJson);
    const totalDuration = info.duration || 0;

    // 1. Thử parse từ YouTube Chapters native
    if (Array.isArray(info.chapters) && info.chapters.length > 0) {
      const validChapters = info.chapters.filter((ch) => ch.title && !ch.title.includes("<Untitled"));
      if (validChapters.length >= 2) {
        console.log(`   ✨ Tìm thấy ${validChapters.length} Chapters native từ video!`);
        return validChapters.map((ch) => {
          const { artist, title } = parseTrackName(ch.title);
          return {
            start: Math.round(ch.start_time),
            end: Math.round(ch.end_time),
            artist,
            title,
            searchTerm: `${artist} ${title}`.trim(),
          };
        });
      }
    }

    // 2. Thử parse từ Description timestamps
    const desc = info.description || "";
    const lines = desc.split("\n");
    const parsed = [];
    const lineRegex = /^(.*?)(?:[\s–—-])*(\d{1,2}:\d{2}(?::\d{2})?)\s*(?:-|–|—)?\s*(\d{1,2}:\d{2}(?::\d{2})?)?(.*?)$/;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const match = trimmed.match(lineRegex);
      if (match) {
        const ts1 = match[2];
        const ts2 = match[3];
        const text1 = match[1].trim();
        const text2 = match[4].trim();
        const rawTitle = text1 || text2;
        if (ts1 && rawTitle && rawTitle.length > 2) {
          const { artist, title } = parseTrackName(rawTitle);
          parsed.push({
            start: toSeconds(ts1),
            end: ts2 ? toSeconds(ts2) : 0,
            artist,
            title,
            searchTerm: `${artist} ${title}`.trim(),
          });
        }
      }
    }

    if (parsed.length >= 2) {
      parsed.sort((a, b) => a.start - b.start);
      for (let i = 0; i < parsed.length; i++) {
        if (!parsed[i].end) {
          parsed[i].end = i < parsed.length - 1 ? parsed[i + 1].start : totalDuration;
        }
      }
      console.log(`   ✨ Tìm thấy ${parsed.length} mốc bài hát từ Description của video!`);
      return parsed;
    }

    console.log(`   ℹ️ Video không có Chapters/Tracklist tự động, sử dụng cấu hình mặc định.`);
  } catch (err) {
    console.warn(`   ⚠️ Không thể phân tích JSON metadata của video (${err.message}).`);
  }

  return DEFAULT_BREAKCORE_TRACKS;
}

function ensureMixAudioFile(sourceUrl) {
  const urlSafe = Buffer.from(sourceUrl).toString("hex").substring(0, 10);
  const tempMixPath = path.join(os.tmpdir(), `tomato_mix_${urlSafe}.mp3`);

  if (!fs.existsSync(tempMixPath)) {
    console.log(`\n📥 [1/4] Đang tải audio gốc từ: ${sourceUrl}...`);
    execFileSync(
      "yt-dlp",
      [
        "-x",
        "--audio-format",
        "mp3",
        "--audio-quality",
        "0",
        "--no-warnings",
        "-o",
        tempMixPath,
        sourceUrl,
      ],
      { stdio: "inherit" }
    );
  } else {
    console.log(`\n⚡ [1/4] Tái sử dụng audio nguồn đã cache: ${path.basename(tempMixPath)}`);
  }
  return tempMixPath;
}

async function fetchArtwork(searchTerm) {
  try {
    const res = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&entity=song&limit=1`,
      { signal: AbortSignal.timeout(8000) }
    );
    const data = await res.json();
    const art = data.results?.[0]?.artworkUrl100?.replace(
      "100x100bb.jpg",
      "600x600bb.jpg"
    );
    return art || null;
  } catch {
    return null;
  }
}

async function processTracks(mixMp3Path, tracksMeta) {
  console.log(`\n✂️  [2/4] Bắt đầu cắt ${tracksMeta.length} bài hát và tải ảnh bìa tương ứng...`);
  const processed = [];

  for (const [idx, item] of tracksMeta.entries()) {
    const cleanArtist = sanitizeFilename(item.artist) || "Unknown";
    const cleanTitle = sanitizeFilename(item.title) || `Track ${idx + 1}`;
    const baseName = `${cleanArtist} - ${cleanTitle}`;
    const mp3File = `${baseName}.mp3`;
    const coverFile = `${baseName}.jpg`;

    const mp3Path = path.join(musicDir, mp3File);
    const coverPath = path.join(coversDir, coverFile);
    const tempCutPath = path.join(musicDir, `temp_cut_${idx}_${Date.now()}.mp3`);

    console.log(
      `\n⏳ [${idx + 1}/${tracksMeta.length}] Xử lý: "${baseName}" (${item.start}s -> ${item.end}s)`
    );

    // 1. Tải Artwork
    const artUrl = await fetchArtwork(item.searchTerm);
    if (artUrl) {
      try {
        const cRes = await fetch(artUrl, { signal: AbortSignal.timeout(8000) });
        if (cRes.ok) {
          const buf = Buffer.from(await cRes.arrayBuffer());
          fs.writeFileSync(coverPath, buf);
          console.log(`   🖼️ Cover tải thành công: ${coverFile}`);
        }
      } catch (e) {
        console.warn(`   ⚠️ Lỗi tải cover: ${e.message}`);
      }
    }

    // 2. Cắt audio từ mix bằng ffmpeg
    const duration = String(Math.max(1, item.end - item.start));
    try {
      execFileSync(
        "ffmpeg",
        [
          "-y",
          "-ss",
          String(item.start),
          "-t",
          duration,
          "-i",
          mixMp3Path,
          "-acodec",
          "copy",
          tempCutPath,
        ],
        { stdio: "pipe" }
      );
    } catch (cutErr) {
      console.warn(`   ⚠️ Lỗi cắt audio đoạn ${item.start}s-${item.end}s:`, cutErr.message);
      continue;
    }

    // 3. Nhúng artwork vào MP3
    if (fs.existsSync(coverPath)) {
      try {
        execFileSync(
          "ffmpeg",
          [
            "-y",
            "-i",
            tempCutPath,
            "-i",
            coverPath,
            "-map",
            "0:0",
            "-map",
            "1:0",
            "-c",
            "copy",
            "-id3v2_version",
            "3",
            "-metadata:s:v",
            "title=Album cover",
            "-metadata:s:v",
            "comment=Cover (front)",
            "-metadata",
            `title=${cleanTitle}`,
            "-metadata",
            `artist=${cleanArtist}`,
            mp3Path,
          ],
          { stdio: "pipe" }
        );
        if (fs.existsSync(tempCutPath)) fs.unlinkSync(tempCutPath);
      } catch {
        if (fs.existsSync(tempCutPath)) fs.renameSync(tempCutPath, mp3Path);
      }
    } else if (fs.existsSync(tempCutPath)) {
      fs.renameSync(tempCutPath, mp3Path);
    }

    if (fs.existsSync(mp3Path)) {
      const stat = fs.statSync(mp3Path);
      console.log(
        `   🎧 Track hoàn tất (${(stat.size / 1024 / 1024).toFixed(2)} MB): ${mp3File}`
      );

      processed.push({
        name: cleanTitle,
        artist: cleanArtist,
        baseName,
        file: mp3File,
        cover: `/assets/music/covers/${encodeURIComponent(baseName)}.jpg`,
      });
    }
  }

  return processed;
}

async function main() {
  console.log("========================================================");
  console.log("   UNIVERSAL YOUTUBE MIX & CHAPTER SEGMENTER - TOMATODEVS");
  console.log("========================================================");

  const cliArg = process.argv[2]?.trim();
  const sourceUrl = (cliArg && (cliArg.startsWith("http://") || cliArg.startsWith("https://")))
    ? cliArg
    : DEFAULT_BREAKCORE_URL;

  console.log(`🔗 Nguồn Mix: ${sourceUrl}`);

  // Phân tích danh sách track tự động từ Chapters hoặc Description
  const tracksMeta = extractTracksMetadata(sourceUrl);

  const existingLocal = readLocalTracks();
  if (!checkPlaylistLimit(existingLocal.length, tracksMeta.length)) {
    process.exit(1);
  }

  const mixMp3Path = ensureMixAudioFile(sourceUrl);

  const tracks = await processTracks(mixMp3Path, tracksMeta);

  if (tracks.length === 0) {
    console.error("❌ Không có bài hát nào được xử lý thành công.");
    process.exit(1);
  }

  console.log(
    `\n☁️  [3/4] Upload ${tracks.length} bài nhạc & ảnh bìa lên Cloudflare R2 '${bucketName}'...`
  );
  await uploadTracksAndCoversToR2(s3, bucketName, tracks);

  // Đồng bộ từng track vào Neon PostgreSQL Database (Single Source of Truth)
  console.log(`\n🗄️  [4/4] Đồng bộ danh sách vào Neon PostgreSQL Database...`);
  for (const t of tracks) {
    await syncTrackToDatabase(t);
  }

  const allTracks = readLocalTracks();
  writeMusicConfigFile(allTracks);

  console.log("\n========================================================");
  console.log(
    `🎉 HOÀN TẤT: Đã cắt và thêm thành công ${tracks.length} bài hát mới vào thư viện (Tổng: ${allTracks.length} bài)!`
  );
  console.log("========================================================\n");
}

main().catch(console.error);
