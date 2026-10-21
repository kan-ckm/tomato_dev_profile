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