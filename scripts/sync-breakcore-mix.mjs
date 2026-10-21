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
} from "./lib/shared.mjs";

const { s3, bucketName } = getR2Config();
fs.mkdirSync(coversDir, { recursive: true });

const YOUTUBE_MIX_URL = "https://youtu.be/-DX7-CqCO8E";

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

function ensureMixAudioFile() {
  const cliFileArg = process.argv[2];
  if (cliFileArg && fs.existsSync(cliFileArg)) {
    return path.resolve(cliFileArg);
  }

  const tempMixPath = path.join(os.tmpdir(), "tomato_breakcore_mix.mp3");
  if (!fs.existsSync(tempMixPath)) {
    console.log(`\n📥 Đang tải audio gốc từ ${YOUTUBE_MIX_URL}...`);
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
        YOUTUBE_MIX_URL,
      ],
      { stdio: "inherit" }
    );
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

async function processTracks(mixMp3Path) {
  console.log("\n✂️  [2/4] Cắt 11 bài nhạc từ mix và tải ảnh bìa tương ứng...");
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

    console.log(
      `\n⏳ [${idx + 1}/11] Xử lý: "${baseName}" (${item.start}s -> ${item.end}s)`
    );

    // 1. Tải Artwork
    const artUrl = await fetchArtwork(item.searchTerm);
    if (artUrl) {
      try {
        const cRes = await fetch(artUrl, { signal: AbortSignal.timeout(8000) });
        const buf = Buffer.from(await cRes.arrayBuffer());
        fs.writeFileSync(coverPath, buf);
        console.log(`   🖼️ Cover tải thành công: ${coverFile}`);
      } catch (e) {
        console.warn(`   ⚠️ Lỗi tải cover: ${e.message}`);
      }
    }

    // 2. Cắt audio từ mix bằng execFileSync (An toàn tuyệt đối, chống Command Injection)
    const duration = String(item.end - item.start);
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

  return processed;
}

async function main() {
  console.log("========================================================");
  console.log("   BREAKCORE MIX SYNC & CLOUD UPDATE - TOMATODEVS");
  console.log("========================================================");

  const existingLocal = readLocalTracks();
  if (!checkPlaylistLimit(existingLocal.length, TRACKS_METADATA.length)) {
    process.exit(1);
  }

  const mixMp3Path = ensureMixAudioFile();

  const tracks = await processTracks(mixMp3Path);

  console.log(
    `\n☁️  [2/3] Upload ${tracks.length} bài nhạc & ảnh bìa lên Cloudflare R2 '${bucketName}'...`
  );
  await uploadTracksAndCoversToR2(s3, bucketName, tracks);

  console.log("\n📝 [3/3] Cập nhật src/config/music.config.ts...");
  const allTracks = readLocalTracks();
  writeMusicConfigFile(allTracks);

  console.log("\n========================================================");
  console.log(
    `🎉 HOÀN TẤT: Đã cập nhật ${tracks.length} bài breakcore vào thư viện (${allTracks.length} bài tổng cộng)!`
  );
  console.log("========================================================\n");
}

main().catch(console.error);
