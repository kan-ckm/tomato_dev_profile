#!/usr/bin/env node

/**
 * Script upload toàn bộ file nhạc MP3 và ảnh bìa từ `public/assets/music` lên Cloudflare R2.
 *
 * Cách sử dụng:
 *   node scripts/upload-music-to-r2.mjs
 *   hoặc:
 *   npm run r2:upload
 */

import fs from "fs";
import path from "path";
import { PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import {
  musicDir,
  coversDir,
  getR2Config,
  invalidateRedisMusicCache,
} from "./lib/shared.mjs";

const { s3, accountId, bucketName, publicUrl, isEnabled } = getR2Config();

console.log("\n========================================================");
console.log("   CLOUDFLARE R2 MUSIC UPLOADER - TOMATODEVS");
console.log("========================================================\n");

if (!isEnabled || !s3) {
  console.error(
    "❌ LỖI: Chưa cấu hình đầy đủ biến môi trường cho Cloudflare R2!"
  );
  console.error("Vui lòng khai báo trong .env hoặc .env.local:");
  console.error("  R2_ACCOUNT_ID=...");
  console.error("  R2_ACCESS_KEY_ID=...");
  console.error("  R2_SECRET_ACCESS_KEY=...");
  console.error("  R2_BUCKET_NAME=...");
  console.error("  R2_PUBLIC_URL=... (Tùy chọn)\n");
  process.exit(1);
}

if (!fs.existsSync(musicDir)) {
  console.error(`❌ Thư mục không tồn tại: ${musicDir}`);
  process.exit(1);
}

const files = fs
  .readdirSync(musicDir)
  .filter((f) => f.toLowerCase().endsWith(".mp3"));

if (files.length === 0) {
  console.log("ℹ️ Không tìm thấy file .mp3 nào trong public/assets/music.");
  process.exit(0);
}

console.log(
  `📦 Tìm thấy ${files.length} bản nhạc. Bắt đầu đồng bộ lên bucket '${bucketName}'...\n`
);

async function uploadObjectIfNeeded(localPath, key, contentType) {
  const fileStat = fs.statSync(localPath);
  const sizeMB = (fileStat.size / (1024 * 1024)).toFixed(2);

  try {
    const head = await s3.send(
      new HeadObjectCommand({
        Bucket: bucketName,
        Key: key,
      })
    );
    if (head.ContentLength === fileStat.size) {
      console.log(`⏩ [BỎ QUA - ĐÃ TỒN TẠI] ${key} (${sizeMB} MB)`);
      return;
    }
  } catch {
    // Chưa tồn tại -> tiếp tục upload
  }

  console.log(`🚀 [ĐANG TẢI LÊN] ${key} (${sizeMB} MB)...`);
  const fileBuffer = fs.readFileSync(localPath);

  await s3.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );

  const directUrl = publicUrl
    ? `${publicUrl}/${encodeURI(key)}`
    : `https://${accountId}.r2.cloudflarestorage.com/${bucketName}/${encodeURI(key)}`;

  console.log(`✅ [THÀNH CÔNG] ${key}`);
  console.log(`   🔗 URL: ${directUrl}\n`);
}

async function run() {
  let successCount = 0;
  for (const file of files) {
    try {
      await uploadObjectIfNeeded(
        path.join(musicDir, file),
        `music/${file}`,
        "audio/mpeg"
      );
      const baseName = file.replace(/\.mp3$/i, "");
      const coverPath = path.join(coversDir, `${baseName}.jpg`);
      if (fs.existsSync(coverPath)) {
        await uploadObjectIfNeeded(
          coverPath,
          `music/covers/${baseName}.jpg`,
          "image/jpeg"
        );
      }
      successCount++;
    } catch (err) {
      console.error(`❌ Lỗi khi tải lên ${file}:`, err.message);
    }
  }

  await invalidateRedisMusicCache();

  console.log("========================================================");
  console.log(
    `🎉 HOÀN TẤT: Đã đồng bộ ${successCount}/${files.length} bản nhạc & ảnh bìa lên Cloudflare R2!`
  );
  console.log("========================================================\n");
}

run();
