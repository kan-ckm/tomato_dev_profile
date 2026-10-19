#!/usr/bin/env node

/**
 * Script upload toàn bộ file nhạc MP3 từ `public/assets/music` lên Cloudflare R2.
 * 
 * Cách sử dụng:
 *   node scripts/upload-music-to-r2.mjs
 *   hoặc:
 *   npm run r2:upload
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

// Đọc file .env.local hoặc .env nếu có
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

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucketName = process.env.R2_BUCKET_NAME;
const publicUrl = process.env.R2_PUBLIC_URL?.replace(/\/+$/, "") || "";

console.log("\n========================================================");
console.log("   CLOUDFLARE R2 MUSIC UPLOADER - TOMATODEVS");
console.log("========================================================\n");

if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
  console.error("❌ LỖI: Chưa cấu hình đầy đủ biến môi trường cho Cloudflare R2!");
  console.error("Vui lòng tạo file .env.local và khai báo:");
  console.error("  R2_ACCOUNT_ID=...");
  console.error("  R2_ACCESS_KEY_ID=...");
  console.error("  R2_SECRET_ACCESS_KEY=...");
  console.error("  R2_BUCKET_NAME=...");
  console.error("  R2_PUBLIC_URL=... (Tùy chọn)\n");
  process.exit(1);
}

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

const musicDir = path.join(rootDir, "public", "assets", "music");
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

console.log(`📦 Tìm thấy ${files.length} bản nhạc. Bắt đầu upload lên bucket '${bucketName}'...\n`);

async function uploadFile(fileName) {
  const filePath = path.join(musicDir, fileName);
  const fileStat = fs.statSync(filePath);
  const sizeMB = (fileStat.size / (1024 * 1024)).toFixed(2);
  const key = `music/${fileName}`;

  // Kiểm tra xem file đã tồn tại trên R2 chưa
  try {
    const head = await s3.send(
      new HeadObjectCommand({
        Bucket: bucketName,
        Key: key,
      })
    );
    if (head.ContentLength === fileStat.size) {
      console.log(`⏩ [BỎ QUA - ĐÃ TỒN TẠI] ${fileName} (${sizeMB} MB)`);
      return;
    }
  } catch {
    // Chưa tồn tại -> tiếp tục upload
  }

  console.log(`🚀 [ĐANG TẢI LÊN] ${fileName} (${sizeMB} MB)...`);
  const fileStream = fs.createReadStream(filePath);

  await s3.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: fileStream,
      ContentType: "audio/mpeg",
      CacheControl: "public, max-age=31536000, immutable",
      ContentLength: fileStat.size,
    })
  );

  const directUrl = publicUrl
    ? `${publicUrl}/${encodeURI(key)}`
    : `https://${accountId}.r2.cloudflarestorage.com/${bucketName}/${encodeURI(key)}`;

  console.log(`✅ [THÀNH CÔNG] ${fileName}`);
  console.log(`   🔗 URL: ${directUrl}\n`);
}

async function run() {
  let successCount = 0;
  for (const file of files) {
    try {
      await uploadFile(file);
      successCount++;
    } catch (err) {
      console.error(`❌ Lỗi khi tải lên ${file}:`, err.message);
    }
  }

  console.log("========================================================");
  console.log(`🎉 HOÀN TẤT: Đã đồng bộ ${successCount}/${files.length} file nhạc lên Cloudflare R2!`);
  console.log("========================================================\n");
}

run();
