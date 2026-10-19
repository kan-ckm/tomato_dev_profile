import { ProfileConfig, SocialLink } from "@/types";

export const profileConfig: ProfileConfig = {
  username: "TOMATODEVS",
  handle: "TomatoDevs · ReDreaming",
  greeting: "ごきげんよう。",
  roleBold: "Member of ReDreaming",
  roleSuffix: " — ReDreaming dev.",
  collabText: "DM for collabs: discord",
  discordHandle: "@nxcjcd",
  discordUrl: "https://discord.com/users/907653276701433896",
  avatarSrc: "/assets/avatar/avatar.jpg",
  fallbackAvatarSrc: "/assets/images/og-image.png",
  coverSrc: "/assets/images/background_avartar.jpg",
  statusText: "Online",
  tiktok: {
    displayName: "Tomato Dev",
    handle: "@tomatodevs",
    profileUrl: "https://www.tiktok.com/@tuanttuu",
    followUrl: "https://www.tiktok.com/@tuanttuu",
    fallbackFollowers: 1885,
    fallbackLikes: 32400,
  },
  footer: {
    text: "Powered by",
    author: "TomatoDevs",
    url: "https://github.com/kan-ckm",
  },
  seo: {
    title: "TOMATODEVS — BIO",
    description:
      "ごきげんよう。 Member of ReDreaming. For any discussion, please contact me via discord @nxcjcd",
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
