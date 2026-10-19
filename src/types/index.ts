export type SocialPlatform = "discord" | "tiktok" | "facebook" | "paypal" | "github" | "twitter" | "youtube" | "custom";

export interface SocialLink {
  id: string;
  platform: SocialPlatform;
  title: string;
  url: string;
}

export interface BioLink {
  id: string;
  title: string;
  subtitle: string;
  url: string;
  iconSrc: string;
  iconBg: string;
  fallbackEmoji?: string;
  fallbackSvg?: "twitter" | "discord" | "github";
}

export type ProjectBadgeType = "proxy" | "android" | "plugin";
export type ProjectGlowVariant = "freesia" | "ecolens" | "sudden" | "orbital";

export interface ProjectItem {
  id: string;
  title: string;
  description: string;
  badgeType: ProjectBadgeType;
  badgeLabel: string;
  glowVariant: ProjectGlowVariant;
  iconSrc: string;
  languages: string[];
  repoUrl: string;
}

export interface MusicTrack {
  name: string;
  artist: string;
  file: string;
  url?: string;
  size?: number;
}

export interface TikTokStatsResponse {
  followers_raw: number;
  likes_raw: number;
  source: "tiktok" | "cached" | "fallback";
  updated_at?: string;
}

export interface CoreBlockConfig {
  dirLightIntensity: number;
  fillLightIntensity: number;
  pointLightIntensity: number;
  speed: number;
  zoom: number;
  offsetX: number;
  offsetY: number;
  ringAmount: number;
  particleAmount: number;
  particleSize: number;
  debrisAmount: number;
  debrisSize: number;
  ringSpacing: number;
  glowSize: number;
  glowIntensity: number;
  musicEnable?: boolean;
  musicSensitive?: number;
  musicStyle?: "tectonic" | "wave" | "ripple";
}

export interface ProfileConfig {
  username: string;
  handle: string;
  greeting: string;
  roleBold: string;
  roleSuffix: string;
  collabText: string;
  discordHandle: string;
  discordUrl: string;
  avatarSrc: string;
  fallbackAvatarSrc: string;
  coverSrc: string;
  statusText: string;
  tiktok: {
    displayName: string;
    handle: string;
    profileUrl: string;
    followUrl: string;
    fallbackFollowers: number;
    fallbackLikes: number;
  };
  footer: {
    text: string;
    author: string;
    url: string;
  };
  seo: {
    title: string;
    description: string;
    siteName: string;
    ogImage: string;
    themeColor: string;
  };
}
