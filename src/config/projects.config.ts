import { ProjectItem } from "@/types";

/**
 * Danh sách dự án hiển thị tại trang /projects.
 * Thêm hoặc chỉnh sửa phần tử tại đây sẽ tự động cập nhật cả Grid Desktop lẫn Slider Mobile.
 */
export const projectsConfig: ProjectItem[] = [
  {
    id: "freesia-ii",
    title: "Freesia II",
    description:
      "A high-performance server-side proxy plugin designed to synchronize YSM custom player models across Minecraft BungeeCord/Velocity networks.",
    badgeType: "proxy",
    badgeLabel: "Proxy",
    glowVariant: "freesia",
    iconSrc: "/assets/project_icon/freesia.webp",
    languages: ["Java"],
    repoUrl: "https://github.com/TomatoDevs/FreesiaII",
  },
  {
    id: "ecolens",
    title: "EcoLens",
    description:
      "A professional Android application that utilizes Gemini AI and biodiversity databases for instant identification of plants and animals.",
    badgeType: "android",
    badgeLabel: "Android",
    glowVariant: "ecolens",
    iconSrc: "/assets/project_icon/ecolens.webp",
    languages: ["Kotlin", "JS", "C++"],
    repoUrl: "https://github.com/TomatoDevs/EcoLens",
  },
  {
    id: "sudden-death",
    title: "Sudden-Death",
    description:
      "A specialized Minecraft survival plugin that pushes game difficulty to the absolute limit by dynamically enhancing mob AI and attributes.",
    badgeType: "plugin",
    badgeLabel: "Plugin",
    glowVariant: "sudden",
    iconSrc: "/assets/project_icon/suddendeath.webp",
    languages: ["Java"],
    repoUrl: "https://github.com/TomatoDevs/Sudden-Death",
  },
  {
    id: "orbitalstrike",
    title: "Orbitalstrike",
    description:
      "A complex orbital artillery system for Minecraft servers, featuring advanced targeting mechanisms and highly destructive visual effects.",
    badgeType: "plugin",
    badgeLabel: "Plugin",
    glowVariant: "orbital",
    iconSrc: "/assets/project_icon/orbitalstrike.webp",
    languages: ["Java"],
    repoUrl: "https://github.com/TomatoDevs/Orbitalstrike",
  },
];
