import { ProfileConfig, SocialLink } from "@/types";

export const profileConfig: ProfileConfig = {
  username: "TOMATODEV",
  handle: "TomatoDev · Redre",
  greeting: "Hello。",
  roleBold: "Member of Redre",
  roleSuffix: " — Redre dev.",
  collabText: "Contact for collabs: discord",
  discordHandle: "@nxcjcd",
  discordUrl: "https://discord.com/users/907653276701433896",
  avatarSrc: "/assets/avatar/avatar.jpg",
  fallbackAvatarSrc: "/assets/avatar/avatar.jpg",
  coverSrc: "/assets/images/background_avartar.jpg",
  statusText: "Online",
  tiktok: {
    displayName: "Tomato Dev",
    handle: "@tomatodev",
    profileUrl: "https://www.tiktok.com/@tuanttuu",
    followUrl: "https://www.tiktok.com/@tuanttuu",
    fallbackFollowers: 992,
    fallbackLikes: 32400,
  },
  footer: {
    text: "Powered by",
    author: "TomatoDev",
    url: "https://github.com/kan-ckm",
  },
  seo: {
    title: "TOMATODEV",
    description:
      "Hello。 Member of Redre. For any discussion, please contact me via discord @nxcjcd",
    siteName: "TomatoDev Profile",
    ogImage: "/assets/avatar/avatar.jpg?v=2",
    themeColor: "#050508",
  },
};

export const socialLinks: SocialLink[] = [
  {
    id: "social-discord",
    platform: "discord",
    title: "Discord",
    url: "https://discord.com/users/907653276701433896",
  },
  {
    id: "social-tiktok",
    platform: "tiktok",
    title: "TikTok",
    url: "https://www.tiktok.com/@tuanttuu",
  },
  {
    id: "social-facebook",
    platform: "facebook",
    title: "Facebook",
    url: "https://www.facebook.com/tomato.tomato.289738",
  },
  {
    id: "social-github",
    platform: "github",
    title: "GitHub",
    url: "https://github.com/kan-ckm",
  },
];
