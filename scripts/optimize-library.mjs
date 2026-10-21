#!/usr/bin/env node

/**
 * Script tối ưu hóa toàn bộ thư viện nhạc hiện có:
 * - Nén âm thanh theo chuẩn Web Streaming: MP3 VBR Quality 2 (~190kbps), 44.1 kHz.
 * - Tối ưu ảnh bìa nhúng (ID3 cover) dạng MJPEG (q=3) để file luôn nhẹ và load mượt.
 * - Tiết kiệm 30-50% băng thông R2 & giúp khách truy cập web nghe ngay không bị trễ.
 * - Tự động upload lại các bản nhạc đã tối ưu lên Cloudflare R2.
 *
 * Cách sử dụng:
 *   npm run music:optimize
 */

import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import {
  musicDir,
  coversDir,
  getR2Config,
  readLocalTracks,
  uploadTracksAndCoversToR2,
  writeMusicConfigFile,
  invalidateRedisMusicCache,
} from "./lib/shared.mjs";

const { s3, bucketName } = getR2Config();

console.log("========================================================");
console.log("   LIBRARY AUDIO OPTIMIZER - TOMATODEVS");
console.log("========================================================\n");

const files = fs
  .readdirSync(musicDir)
  .filter((f) => f.toLowerCase().endsWith(".mp3") && !f.startsWith("temp_"));

if (files.length === 0) {
  console.log("ℹ️ Không tìm thấy bài hát nào trong thư viện.");
  process.exit(0);
}

console.log(`📦 Bắt đầu quét & tối ưu ${files.length} bài hát trong thư viện...\n`);

let totalOriginalBytes = 0;
let totalOptimizedBytes = 0;
const optimizedTracks = [];

for (const [idx, file] of files.entries()) {
  const filePath = path.join(musicDir, file);
  const baseName = file.replace(/\.mp3$/i, "").trim();
  const coverPath = path.join(coversDir, `${baseName}.jpg`);
  const tempPath = path.join(musicDir, `opt_temp_${Date.now()}_${idx}.mp3`);

  const initialStat = fs.statSync(filePath);
  totalOriginalBytes += initialStat.size;

  let artist = "Unknown";
  let title = baseName;
  if (baseName.includes(" - ")) {
    const parts = baseName.split(" - ");
    artist = parts[0].trim();
    title = parts.slice(1).join(" - ").trim();
  }

  const ffmpegArgs = ["-y", "-i", filePath];
  if (fs.existsSync(coverPath)) {
    ffmpegArgs.push(
      "-i",
      coverPath,
      "-map",
      "0:a:0",
      "-map",
      "1:0",
      "-c:a",
      "libmp3lame",
      "-q:a",
      "2",
      "-ar",
      "44100",
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
    ffmpegArgs.push(
      "-c:a",
      "libmp3lame",
      "-q:a",
      "2",
      "-ar",
      "44100",
      "-id3v2_version",
      "3"
    );
  }

  ffmpegArgs.push(
    "-metadata",
    `title=${title}`,
    "-metadata",
    `artist=${artist}`,
    tempPath
  );

  try {
    execFileSync("ffmpeg", ffmpegArgs, { stdio: "ignore" });

    if (fs.existsSync(tempPath)) {
      const optStat = fs.statSync(tempPath);

      // Nếu dung lượng tối ưu nhẹ hơn hoặc chênh lệch tích cực
      if (optStat.size <= initialStat.size) {
        fs.renameSync(tempPath, filePath);
        totalOptimizedBytes += optStat.size;
        const savedPercent = (
          ((initialStat.size - optStat.size) / initialStat.size) *
          100
        ).toFixed(1);

        console.log(
          `✅ [${idx + 1}/${files.length}] ${file}`
        );
        console.log(
          `   ${(initialStat.size / 1024 / 1024).toFixed(2)} MB ➔ ${(optStat.size / 1024 / 1024).toFixed(2)} MB (Giảm -${savedPercent}%)\n`
        );
      } else {
        // Đã ở mức tối ưu
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        totalOptimizedBytes += initialStat.size;
        console.log(`⏩ [${idx + 1}/${files.length}] ${file} (Đã tối ưu sẵn)\n`);
      }

      optimizedTracks.push({
        name: title,
        artist,
        baseName,
        file,
        cover: `/assets/music/covers/${encodeURIComponent(baseName)}.jpg`,
      });
    }
  } catch (err) {
    console.warn(`⚠️ Bỏ qua bài ${file} do lỗi:`, err.message);
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    totalOptimizedBytes += initialStat.size;
  }
}

async function finish() {
  console.log("☁️  Đang đồng bộ các file tối ưu lên Cloudflare R2...");
  await uploadTracksAndCoversToR2(s3, bucketName, optimizedTracks);

  const allTracks = readLocalTracks();
  writeMusicConfigFile(allTracks);
  await invalidateRedisMusicCache();

  const originalMB = (totalOriginalBytes / 1024 / 1024).toFixed(2);
  const optimizedMB = (totalOptimizedBytes / 1024 / 1024).toFixed(2);
  const totalSavedMB = (
    (totalOriginalBytes - totalOptimizedBytes) /
    1024 /
    1024
  ).toFixed(2);
  const totalSavedPercent = (
    ((totalOriginalBytes - totalOptimizedBytes) / totalOriginalBytes) *
    100
  ).toFixed(1);

  console.log("\n========================================================");
  console.log("🎉 HOÀN TẤT TỐI ƯU HÓA TOÀN BỘ THƯ VIỆN NHẠC!");
  console.log(`📊 Dung lượng ban đầu:   ${originalMB} MB`);
  console.log(`📉 Dung lượng sau tối ưu: ${optimizedMB} MB`);
  console.log(`✨ Tiết kiệm được:       ${totalSavedMB} MB (-${totalSavedPercent}%)`);
  console.log("========================================================\n");
}

finish().catch(console.error);
