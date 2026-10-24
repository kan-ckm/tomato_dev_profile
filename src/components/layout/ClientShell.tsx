"use client";

import React, { useEffect } from "react";
import { NeuralBackground } from "@/components/background/NeuralBackground";
import { BottomNav } from "@/components/layout/BottomNav";
import { MusicPlayerProvider } from "@/components/player/MusicPlayerContext";
import { FloatingPlayer } from "@/components/player/FloatingPlayer";
import { MobilePlaylistModal } from "@/components/player/MobilePlaylistModal";
import {
  TabNavigationProvider,
  useTabNavigation,
} from "@/context/TabNavigationContext";
import { OverviewView } from "@/components/profile/OverviewView";
import { ProjectsShowcase } from "@/components/projects/ProjectsShowcase";
import { BioLink, ProjectItem } from "@/types";
import { MediaBlockConfig } from "@/config/media.config";
import { cn } from "@/lib/utils";

interface ClientShellProps {
  children?: React.ReactNode;
  overviewData: {
    links: BioLink[];
    mediaConfig: MediaBlockConfig;
  };
  projectsData: ProjectItem[];
}

function ShellInner({
  children,
  overviewData,
  projectsData,
}: ClientShellProps) {
  const { activeTab } = useTabNavigation();

  useEffect(() => {
    const detectMobile = () => {
      const isMobile =
        window.innerWidth <= 768 ||
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        );
      document.body.classList.toggle("is-mobile", isMobile);
    };

    detectMobile();
    document.body.classList.add("loaded");

    window.addEventListener("resize", detectMobile);
    return () => window.removeEventListener("resize", detectMobile);
  }, []);

  return (
    <MusicPlayerProvider>
      <NeuralBackground />

      {/* Persistent Overview View (Giữ sống ProfileSidebar & Desktop Full Player) */}
      <div
        id="tab-view-overview"
        className={cn(
          "tab-view",
          activeTab === "overview" ? "block" : "hidden"
        )}
      >
        <OverviewView
          links={overviewData.links}
          mediaConfig={overviewData.mediaConfig}
        />
      </div>

      {/* Persistent Projects View (Giữ sống Showcase Grid & Mobile Slider) */}
      <div
        id="tab-view-projects"
        className={cn(
          "tab-view",
          activeTab === "projects" ? "block" : "hidden"
        )}
      >
        <ProjectsShowcase initialProjects={projectsData} />
      </div>

      {/* Fallback slot cho các route đặc biệt khác (e.g. 404 Not Found, Error) */}
      {children}

      <FloatingPlayer forcedMini={activeTab === "projects"} />
      <BottomNav />
      <MobilePlaylistModal />
    </MusicPlayerProvider>
  );
}

export function ClientShell(props: ClientShellProps) {
  return (
    <TabNavigationProvider>
      <ShellInner {...props} />
    </TabNavigationProvider>
  );
}
