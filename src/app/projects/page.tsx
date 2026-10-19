import React from "react";
import type { Metadata } from "next";
import { ProjectsShowcase } from "@/components/projects/ProjectsShowcase";

export const metadata: Metadata = {
  title: "TOMATODEVS — MY PROJECTS",
  description: "Explore the projects and creations of TomatoDevs. Member of MixelArt.",
  openGraph: {
    title: "TOMATODEVS — MY PROJECTS",
    description: "Explore the projects and creations of TomatoDevs. Member of MixelArt.",
  },
  twitter: {
    title: "TOMATODEVS — MY PROJECTS",
    description: "Explore the projects and creations of TomatoDevs. Member of MixelArt.",
  },
};

export default function ProjectsPage() {
  return <ProjectsShowcase />;
}
