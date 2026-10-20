import { ProjectItem } from "@/types";

/**
 * Danh sách dự án hiển thị tại trang /projects.
 * Template mẫu dự án Web:
 */
export const projectsConfig: ProjectItem[] = [
  {
    id: "register",
    title: "Register & Auth App",
    description:
      "A modern, interactive sliding authentication interface (Register & Login) with smooth transitions, built with Next.js 15, React 19, TypeScript, and Tailwind CSS.",
    badgeType: "web",
    badgeLabel: "Web App",
    glowVariant: "web",
    iconSrc: "/assets/project_img/register_showcase.png",
    image: "/assets/project_img/register_showcase.png",
    languages: ["Next.js", "TypeScript", "React", "Tailwind CSS"],
    repoUrl: "https://github.com/kan-ckm/register",
    buttonLabel: "View Repository",
  },
  {
    id: "tomato-commerce",
    title: "Tomato Store & Commerce",
    description:
      "A fullstack e-commerce platform with Stripe international payments, Cloudinary CDN streaming, JWT authentication, and an Admin Analytics Dashboard.",
    badgeType: "web",
    badgeLabel: "E-Commerce",
    glowVariant: "ecolens",
    iconSrc: "/assets/project_img/ecome_showcase.png",
    image: "/assets/project_img/ecome_showcase.png",
    languages: ["React", "Node.js", "Express", "MongoDB", "Stripe", "Tailwind CSS"],
    repoUrl: "https://github.com/kan-ckm/tomato_Commerce",
    buttonLabel: "View Repository",
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
