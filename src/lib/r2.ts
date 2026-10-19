import {
  S3Client,
  ListObjectsV2Command,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";

/**
 * Cloudflare R2 Client & Helper Functions
 * R2 là dịch vụ lưu trữ đối tượng tương thích API S3 của Cloudflare (Zero Egress Fees).
 */

let r2ClientInstance: S3Client | null = null;

/**
 * Kiểm tra xem các biến môi trường cấu hình Cloudflare R2 đã đầy đủ chưa
 */
export function isR2Configured(): boolean {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;

  return Boolean(
    accountId &&
    accessKeyId &&
    secretAccessKey &&
    bucketName &&
    accountId.trim().length > 0 &&
    accessKeyId.trim().length > 0 &&
    secretAccessKey.trim().length > 0 &&
    bucketName.trim().length > 0
  );
}

/**
 * Lấy tên Bucket từ biến môi trường
 */
export function getR2BucketName(): string {
  return process.env.R2_BUCKET_NAME || "";
}

/**
 * Khởi tạo singleton S3Client kết nối tới Cloudflare R2
 */
export function getR2Client(): S3Client {
  if (r2ClientInstance) {
    return r2ClientInstance;
  }

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "[Cloudflare R2] Missing credentials. Please configure R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY."
    );
  }

  r2ClientInstance = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
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
  const publicBase = process.env.R2_PUBLIC_URL?.replace(/\/+$/, "");
  const cleanKey = key.replace(/^\/+/, "");

  if (publicBase) {
    return `${publicBase}/${encodeURI(cleanKey)}`;
  }

  // Fallback về endpoint chuẩn nếu chưa gắn public domain
  const accountId = process.env.R2_ACCOUNT_ID;
  const bucket = getR2BucketName();
  return `https://${accountId}.r2.cloudflarestorage.com/${bucket}/${encodeURI(cleanKey)}`;
}

/**
 * Liệt kê các đối tượng trong bucket Cloudflare R2
 */
export async function listR2Objects(prefix = "") {
  if (!isR2Configured()) {
    return [];
  }

  const client = getR2Client();
  const bucket = getR2BucketName();

  const command = new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: prefix,
  });

  const response = await client.send(command);
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
export async function headR2Object(key: string): Promise<boolean> {
  try {
    const client = getR2Client();
    const bucket = getR2BucketName();

    const command = new HeadObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    await client.send(command);
    return true;
  } catch {
    return false;
  }
}
