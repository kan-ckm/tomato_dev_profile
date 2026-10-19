import { ProfileConfig, SocialLink } from "@/types";

export const profileConfig: ProfileConfig = {
  username: "TOMATODEVS",
  handle: "@TomatoDevs · MixelArt",
  greeting: "ごきげんよう。",
  roleBold: "Member of MixelArt",
  roleSuffix: " — YSM custom model.",
  collabText: "DM for collabs: discord",
  discordHandle: "@TomatoDevs",
  discordUrl: "https://discord.com/users/883689446422220821",
  avatarSrc: "/assets/avatar/avatar.jpg",
  fallbackAvatarSrc: "/assets/images/og-image.png",
  coverSrc: "/assets/images/background_avartar.jpg",
  statusText: "Online",
  tiktok: {
    displayName: "Tomato Dev",
    handle: "@tomatodevs",
    profileUrl: "https://www.tiktok.com/@tomatodevs",
    followUrl: "https://vm.tiktok.com/ZSHE2R4JU/",
    fallbackFollowers: 113799,
    fallbackLikes: 4082986,
  },
  footer: {
    text: "Powered by",
    author: "TomatoDevs",
    url: "https://github.com/TomatoDevs",
  },
  seo: {
    title: "TOMATODEVS — BIO",
    description:
      "ごきげんよう。 Member of MixelArt. For any discussion, please contact me via discord @TomatoDevs",
    siteName: "TomatoDevs Profile",
    ogImage: "/assets/images/og-image.png",
    themeColor: "#050508",
  },
};

export const socialLinks: SocialLink[] = [
  {
    id: "social-discord",
    platform: "discord",
    title: "Discord",
    url: "https://discord.com/users/883689446422220821",
  },
  {
    id: "social-tiktok",
    platform: "tiktok",
    title: "TikTok",
    url: "https://www.tiktok.com/@tomatodevs",
  },
  {
    id: "social-facebook",
    platform: "facebook",
    title: "Facebook",
    url: "https://www.facebook.com/TomatoDevs",
  },
  {
    id: "social-paypal",
    platform: "paypal",
    title: "PayPal",
    url: "https://paypal.me/TomatoDevs",
  },
  {
    id: "social-github",
    platform: "github",
    title: "GitHub",
    url: "https://github.com/TomatoDevs",
  },
];
