import {
  S3Client,
  ListObjectsV2Command,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { env } from "./env";

/**
 * Cloudflare R2 Client & Helper Functions
 * R2 là dịch vụ lưu trữ đối tượng tương thích API S3 của Cloudflare (Zero Egress Fees).
 */

let r2ClientInstance: S3Client | null = null;

/**
 * Kiểm tra xem các biến môi trường cấu hình Cloudflare R2 đã đầy đủ chưa
 */
export function isR2Configured(): boolean {
  return env.r2.isConfigured;
}

/**
 * Lấy tên Bucket từ biến môi trường
 */
export function getR2BucketName(): string {
  return env.r2.bucketName;
}

/**
 * Chuẩn hóa Account ID (tự động loại bỏ https:// hoặc .r2.cloudflarestorage.com nếu người dùng vô tình dán cả URL)
 */
export function getCleanR2AccountId(): string {
  return env.r2.accountId;
}

/**
 * Khởi tạo singleton S3Client kết nối tới Cloudflare R2
 */
export function getR2Client(): S3Client {
  if (r2ClientInstance) {
    return r2ClientInstance;
  }

  const { accountId, accessKeyId, secretAccessKey } = env.r2;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "[Cloudflare R2] Missing credentials. Please configure R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY."
    );
  }

  r2ClientInstance = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    maxAttempts: 2,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return r2ClientInstance;
}

/**
 * Tạo URL công khai (public URL) cho đối tượng trong Cloudflare R2.
 * Ưu tiên dùng R2_PUBLIC_URL (custom domain hoặc *.r2.dev đã bật Public Access).
 */
export function getR2PublicUrl(key: string): string {
  const publicBase = env.r2.publicUrl;
  const cleanKey = key.replace(/^\/+/, "");

  if (publicBase) {
    return `${publicBase}/${encodeURI(cleanKey)}`;
  }

  // Fallback về endpoint chuẩn nếu chưa gắn public domain
  const accountId = env.r2.accountId;
  const bucket = env.r2.bucketName;
  return `https://${accountId}.r2.cloudflarestorage.com/${bucket}/${encodeURI(cleanKey)}`;
}

/**
 * Liệt kê các đối tượng trong bucket Cloudflare R2 (có giới hạn timeout 6 giây chống treo request)
 */
export async function listR2Objects(prefix = "", timeoutMs = 6000) {
  if (!isR2Configured()) {
    return [];
  }

  const client = getR2Client();
  const bucket = getR2BucketName();

  const command = new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: prefix,
  });

  const response = await client.send(command, {
    abortSignal: AbortSignal.timeout(timeoutMs),
  });
  return response.Contents || [];
}

/**
 * Tải một file lên Cloudflare R2
 */
export async function uploadToR2(
  key: string,
  body: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
  cacheControl = "public, max-age=31536000, immutable"
) {
  const client = getR2Client();
  const bucket = getR2BucketName();

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
    CacheControl: cacheControl,
  });

  return client.send(command);
}

/**
 * Xóa một đối tượng khỏi Cloudflare R2
 */
export async function deleteFromR2(key: string) {
  const client = getR2Client();
  const bucket = getR2BucketName();

  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  return client.send(command);
}

/**
 * Lấy đối tượng từ R2 (phục vụ stream hoặc đọc nội dung)
 */
export async function getR2Object(key: string) {
  const client = getR2Client();
  const bucket = getR2BucketName();

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  return client.send(command);
}

/**
 * Kiểm tra xem một đối tượng có tồn tại trên R2 hay không
 */
export async function headR2Object(key: string, timeoutMs = 5000): Promise<boolean> {
  try {
    const client = getR2Client();
    const bucket = getR2BucketName();

    const command = new HeadObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    await client.send(command, {
      abortSignal: AbortSignal.timeout(timeoutMs),
    });
    return true;
  } catch {
    return false;
  }
}
