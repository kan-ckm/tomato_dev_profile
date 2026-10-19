/**
 * CẤU HÌNH KHỐI GIF / VIDEO
 * Bạn chỉ cần nhập các thông tin cần thiết vào object `mediaBlockConfig` dưới đây:
 */
export interface MediaBlockConfig {
  /**
   * Đường dẫn đến file GIF hoặc Video:
   * - Tệp trong thư mục public: ví dụ "/assets/media/showcase.gif" hoặc "/assets/media/showcase.mp4"
   * - Hoặc URL online bất kỳ (Giphy, Tenor, Imgur, Discord, Cloudflare...)
   */
  src: string;

  /**
   * Loại media:
   * - "auto": tự động nhận diện theo đuôi file (.mp4, .webm, .mov -> video; .gif, .webp, .png, .jpg -> gif/ảnh)
   * - "video": phát dưới dạng video
   * - "gif": hiển thị dưới dạng ảnh GIF / ảnh tĩnh
   */
  type?: "auto" | "video" | "gif";

  /**
   * Tiêu đề hiển thị trên khối (tùy chọn, để trống "" nếu không muốn hiển thị tiêu đề)
   */
  title?: string;

  /**
   * Chú thích ngắn bên dưới (tùy chọn, để trống "" nếu không muốn hiển thị)
   */
  subtitle?: string;

  /**
   * Đường dẫn web khi click vào khối (tùy chọn, ví dụ link shop, Discord, YouTube... Để trống "" nếu không muốn click)
   */
  linkUrl?: string;

  /**
   * Tỷ lệ khung hình: "16/9" | "4/3" | "1/1" | "auto" (mặc định "16/9")
   */
  aspectRatio?: "16/9" | "4/3" | "1/1" | "auto";

  /**
   * Tự động phát (mặc định: true)
   */
  autoPlay?: boolean;

  /**
   * Tự động lặp lại (mặc định: true)
   */
  loop?: boolean;

  /**
   * Tắt tiếng video khi phát tự động (mặc định: true)
   */
  muted?: boolean;
}

/**
 * 👉 NHẬP THÔNG TIN CHO KHỐI CỦA BẠN TẠI ĐÂY:
 */
export const mediaBlockConfig: MediaBlockConfig = {
  src: "/assets/media/cosmic-princess-kaguya-yachiyo.gif",
  type: "auto",
  title: "GIF / Video",
  subtitle: "",
  linkUrl: "",
  aspectRatio: "16/9",
  autoPlay: true,
  loop: true,
  muted: true,
};

// Alias tương thích
export const mediaShowcaseConfig = mediaBlockConfig;
export type MediaShowcaseConfig = MediaBlockConfig;
