/**
 * Quản lý & chuẩn hóa tập trung toàn bộ biến môi trường (Environment Variables)
 * Giúp dễ dàng mở rộng, kiểm tra cấu hình và tránh truy cập process.env phân tán.
 */

export const env = {
  /** URL chính thức của website */
  get siteUrl(): string {
    const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
    if (raw) {
      try {
        return new URL(raw).origin;
      } catch {
        // Fallback nếu URL không hợp lệ
      }
    }
    return "https://tomatodevs.com";
  },

  /** Danh sách Origin được phép gọi API (CORS) */
  get allowedOrigins(): string[] {
    const raw = process.env.ALLOWED_ORIGIN?.trim();
    if (!raw) return [];
    return raw
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean);
  },

  /** Cấu hình Cloudflare R2 */
  r2: {
    get accountId(): string {
      const raw = process.env.R2_ACCOUNT_ID?.trim() || "";
      return raw
        .replace(/^https?:\/\//i, "")
        .replace(/\.r2\.cloudflarestorage\.com.*$/i, "")
        .replace(/\/+$/, "")
        .trim();
    },
    get accessKeyId(): string {
      return process.env.R2_ACCESS_KEY_ID?.trim() || "";
    },
    get secretAccessKey(): string {
      return process.env.R2_SECRET_ACCESS_KEY?.trim() || "";
    },
    get bucketName(): string {
      return process.env.R2_BUCKET_NAME?.trim() || "";
    },
    get publicUrl(): string {
      return process.env.R2_PUBLIC_URL?.replace(/\/+$/, "").trim() || "";
    },
    get isConfigured(): boolean {
      return Boolean(
        this.accountId &&
          this.accessKeyId &&
          this.secretAccessKey &&
          this.bucketName
      );
    },
  },

  /** Cấu hình Upstash / Docker Redis */
  redis: {
    get url(): string {
      return (
        process.env.UPSTASH_REDIS_REST_URL?.trim() ||
        process.env.KV_REST_API_URL?.trim() ||
        ""
      );
    },
    get token(): string {
      return (
        process.env.UPSTASH_REDIS_REST_TOKEN?.trim() ||
        process.env.KV_REST_API_TOKEN?.trim() ||
        ""
      );
    },
    get isConfigured(): boolean {
      const u = this.url;
      const t = this.token;
      if (!u || !t) return false;
      if (
        u.includes("your-redis-instance") ||
        t === "your-upstash-redis-rest-token"
      ) {
        return false;
      }
      return true;
    },
  },

  /** TikTok Username tùy chỉnh */
  get tiktokUsername(): string {
    return process.env.TIKTOK_USERNAME?.replace(/^@/, "").trim() || "";
  },
} as const;
