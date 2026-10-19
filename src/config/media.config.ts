export interface MediaShowcaseConfig {
  title: string;
  subtitle: string;
  badge: string;
  /**
   * Đường dẫn video (.mp4, .webm) hoặc ảnh động (.gif, .webp, .png, .jpg).
   * Bạn có thể đặt tệp vào thư mục `public/assets/media/` hoặc dùng đường dẫn URL online.
   */
  src: string;
  /**
   * Ảnh thumbnail / poster hiển thị trước khi video phát hoặc khi tải
   */
  poster?: string;
  description?: string;
  linkUrl?: string;
  linkLabel?: string;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
}

export const mediaShowcaseConfig: MediaShowcaseConfig = {
  title: "Media Showcase",
  subtitle: "YSM Model & Animation Preview",
  badge: "GIF / VIDEO",
  src: "/assets/media/showcase.mp4",
  poster: "/assets/images/background_avartar.jpg",
  description: "Custom video & animated GIF showcase player.",
  linkUrl: "https://discord.gg/ysm-team",
  linkLabel: "Join Community",
  autoPlay: true,
  loop: true,
  muted: true,
};
