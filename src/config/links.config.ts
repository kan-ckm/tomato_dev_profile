import { BioLink } from "@/types";

/**
 * Danh sách các thẻ liên kết (Links) hiển thị ở trang chủ (/).
 * Để thêm link mới, chỉ cần thêm một object vào mảng `bioLinks` bên dưới.
 */
export const bioLinks: BioLink[] = [
  {
    id: "link-ReDreaming-discord",
    title: "Our Discord Community",
    subtitle: "discord.gg/ReDreaming • Join our server",
    url: "https://discord.gg/EVegtwFUw",
    iconSrc: "/assets/link/lilith.png",
    iconBg: "linear-gradient(135deg,#1a1a2e,#16213e)",
    fallbackSvg: "discord",
  }
];
