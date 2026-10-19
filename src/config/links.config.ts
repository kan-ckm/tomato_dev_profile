import { BioLink } from "@/types";

/**
 * Danh sách các thẻ liên kết (Links) hiển thị ở trang chủ (/).
 * Để thêm link mới, chỉ cần thêm một object vào mảng `bioLinks` bên dưới.
 */
export const bioLinks: BioLink[] = [
  {
    id: "link-mixelart-mcmodel",
    title: "MixelArt MCModels",
    subtitle: "mcmodels.net/vendors/307/mixelart",
    url: "https://mcmodels.net/vendors/307/mixelart",
    iconSrc: "/assets/link/mcmodel.webp",
    iconBg: "linear-gradient(135deg,#1a1a2e,#16213e)",
    fallbackEmoji: "🎭",
  },
  {
    id: "link-ysm-discord",
    title: "Official Community • Discord",
    subtitle: "discord.gg/ysm-team",
    url: "https://discord.gg/ysm-team",
    iconSrc: "/assets/link/ysm.webp",
    iconBg: "linear-gradient(135deg,#1a1a2e,#16213e)",
    fallbackSvg: "discord",
  }
];
