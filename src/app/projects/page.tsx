import React from "react";
import type { Metadata } from "next";
import { ProjectsShowcase } from "@/components/projects/ProjectsShowcase";
import { getShowcaseProjects } from "@/lib/cms";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "TOMATODEVS — MY PROJECTS",
  description: "Explore the projects and creations of TomatoDevs. Member of Redre.",
  openGraph: {
    title: "TOMATODEVS — MY PROJECTS",
    description: "Explore the projects and creations of TomatoDevs. Member of Redre.",
  },
  twitter: {
    title: "TOMATODEVS — MY PROJECTS",
    description: "Explore the projects and creations of TomatoDevs. Member of Redre.",
  },
};

export default async function ProjectsPage() {
  const dynamicProjects = await getShowcaseProjects();
  return <ProjectsShowcase initialProjects={dynamicProjects} />;
}
