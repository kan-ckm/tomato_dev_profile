import { ProjectItem } from "@/types";

/**
 * Danh sách dự án hiển thị tại trang /projects.
 * Template mẫu dự án Web:
 */
export const projectsConfig: ProjectItem[] = [
  {
    id: "my-web-project",
    title: "My Web App",
    description:
      "A modern, responsive web application built with Next.js, TypeScript and Tailwind CSS.",
    badgeType: "web",
    badgeLabel: "Web App",
    glowVariant: "web",
    iconSrc: "/assets/images/og-image.png",
    languages: ["TypeScript", "Next.js", "React"],
    repoUrl: "https://github.com/kan-ckm",
    buttonLabel: "Visit Website",
  },
];

/*
// Mẫu dự án cũ để khôi phục khi cần:
export const previousProjectsBackup: ProjectItem[] = [
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
*/
