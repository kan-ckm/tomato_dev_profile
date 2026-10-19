import { BioLink } from "@/types";

/**
 * Danh sách các thẻ liên kết (Links) hiển thị ở trang chủ (/).
 * Để thêm link mới, chỉ cần thêm một object vào mảng `bioLinks` bên dưới.
 */
export const bioLinks: BioLink[] = [
  {
    id: "link-mixelart-afdian",
    title: "MixelArt YSM Model • Afdian",
    subtitle: "afdian.com/a/6TGESILA?tab=shop",
    url: "https://afdian.com/a/6TGESILA?tab=shop",
    iconSrc: "/assets/link/mixel.webp",
    iconBg: "linear-gradient(135deg,#1a1a2e,#16213e)",
    fallbackEmoji: "🎭",
  },
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
    id: "link-mixelart-patreon",
    title: "MixelArt's Patreon",
    subtitle: "www.patreon.com/user?u=94643123",
    url: "https://www.patreon.com/user?u=94643123",
    iconSrc: "/assets/link/patreon.webp",
    iconBg: "linear-gradient(135deg,#ff424d,#e0311a)",
    fallbackEmoji: "🎁",
  },
  {
    id: "link-mixelart-twitter",
    title: "MixelArt X (Twitter)",
    subtitle: "x.com/Equilibre256",
    url: "https://x.com/Equilibre256",
    iconSrc: "/assets/link/twitterx.webp",
    iconBg: "#111",
    fallbackSvg: "twitter",
  },
  {
    id: "link-ysm-discord",
    title: "Official Community • Discord",
    subtitle: "discord.gg/ysm-team",
    url: "https://discord.gg/ysm-team",
    iconSrc: "/assets/link/ysm.webp",
    iconBg: "linear-gradient(135deg,#1a1a2e,#16213e)",
    fallbackSvg: "discord",
  },
  {
    id: "link-ysm-repo",
    title: "Free Model Collection • Github",
    subtitle: "github.com/Elaina69/Yes-Steve-Model-Repo",
    url: "https://github.com/Elaina69/Yes-Steve-Model-Repo",
    iconSrc: "/assets/link/github.webp",
    iconBg: "#111",
    fallbackSvg: "github",
  },
  {
    id: "link-itt-shader",
    title: "Download ITT Shader",
    subtitle: "shrtlk.click/7XhbZ",
    url: "https://shrtlk.click/7XhbZ",
    iconSrc: "/assets/link/shader.webp",
    iconBg: "linear-gradient(135deg,#0d1b2a,#1b2838)",
    fallbackEmoji: "✨",
  },
  {
    id: "link-kofi",
    title: "Buy me a cofee",
    subtitle: "ko-fi.com/tomatodevs",
    url: "https://ko-fi.com/tomatodevs",
    iconSrc: "/assets/link/kofi.webp",
    iconBg: "linear-gradient(135deg,#ff5f5f,#ff2020)",
    fallbackEmoji: "☕",
  },
];
