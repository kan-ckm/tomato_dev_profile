"use client";

import React, { useEffect } from "react";
import { AnimatedBackground } from "@/components/background/AnimatedBackground";
import { BgTextStrip } from "@/components/background/BgTextStrip";
import { BottomNav } from "@/components/layout/BottomNav";
import { MusicPlayerProvider } from "@/components/player/MusicPlayerContext";
import { FloatingPlayer } from "@/components/player/FloatingPlayer";
import { MobilePlaylistModal } from "@/components/player/MobilePlaylistModal";

export function ClientShell({ children }: { children: React.ReactNode }) {
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
      <AnimatedBackground />
      <BgTextStrip />
      {children}
      <FloatingPlayer />
      <BottomNav />
      <MobilePlaylistModal />
    </MusicPlayerProvider>
  );
}
