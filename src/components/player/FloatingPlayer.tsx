"use client";

import React, { useCallback, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useMusicPlayer } from "./MusicPlayerContext";
import { PlayerPanel } from "./PlayerPanel";
import { VinylDisc } from "./VinylDisc";
import { cn } from "@/lib/utils";

interface FloatingPlayerProps {
  forcedMini?: boolean;
}

export function FloatingPlayer({ forcedMini }: FloatingPlayerProps = {}) {
  const pathname = usePathname();
  const {
    currentTrack,
    isPlaying,
    isPlaylistExpanded,
    isFloatingExpanded,
    togglePlayPause,
    nextTrack,
    prevTrack,
    setIsPlaylistExpanded,
    setIsFloatingExpanded,
    setIsMobileModalOpen,
  } = useMusicPlayer();

  const containerRef = useRef<HTMLDivElement>(null);
  const autoCollapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const collapseStepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Trên trang /projects hoặc /clock, bật chế độ mini-player-mode cho Desktop
  const isMiniPlayerPage =
    forcedMini !== undefined
      ? forcedMini
      : pathname.startsWith("/projects") || pathname.startsWith("/clock");

  const stopAutoCollapse = useCallback(() => {
    if (autoCollapseTimerRef.current) {
      clearTimeout(autoCollapseTimerRef.current);
      autoCollapseTimerRef.current = null;
    }
    if (collapseStepTimerRef.current) {
      clearTimeout(collapseStepTimerRef.current);
      collapseStepTimerRef.current = null;
    }
  }, []);

  const collapsePlayerSmoothly = useCallback(() => {
    if (isPlaylistExpanded) {
      setIsPlaylistExpanded(false);
      if (collapseStepTimerRef.current) clearTimeout(collapseStepTimerRef.current);
      collapseStepTimerRef.current = setTimeout(() => {
        setIsFloatingExpanded(false);
      }, 800);
    } else {
      setIsFloatingExpanded(false);
    }
  }, [isPlaylistExpanded, setIsPlaylistExpanded, setIsFloatingExpanded]);

  const startAutoCollapse = useCallback(
    (delay = 2500) => {
      stopAutoCollapse();
      autoCollapseTimerRef.current = setTimeout(() => {
        const el = containerRef.current;
        if (el && el.matches(":hover")) {
          startAutoCollapse(2500);
          return;
        }
        collapsePlayerSmoothly();
      }, delay);
    },
    [stopAutoCollapse, collapsePlayerSmoothly]
  );

  // Click ra ngoài vùng player sẽ tự động đóng
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        if (isFloatingExpanded || isPlaylistExpanded) {
          collapsePlayerSmoothly();
        }
      }
    };

    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, [isFloatingExpanded, isPlaylistExpanded, collapsePlayerSmoothly]);

  useEffect(() => {
    return () => stopAutoCollapse();
  }, [stopAutoCollapse]);

  return (
    <div
      ref={containerRef}
      id="mobile-music-player"
      aria-label="Music Player"
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "music-player fixed bottom-6 right-3.5 z-[9999]",
        !isMiniPlayerPage && "lg:hidden",
        isMiniPlayerPage && "mini-player-mode",
        isFloatingExpanded && "expanded"
      )}
    >
      {/* Giao diện mở rộng trên Desktop khi ở chế độ mini-player-mode (/projects, /clock) */}
      <PlayerPanel
        className="mini-player-ui hidden"
        onUserInteraction={() => startAutoCollapse(2500)}
      />

      {/* Các nút điều khiển xòe quạt tròn trên Mobile */}
      <div
        id="mobile-controls"
        className="mobile-controls pointer-events-none absolute bottom-0 right-0 -z-10 flex h-[54px] w-[54px] items-center justify-center"
      >
        <button
          id="mobile-playlist"
          type="button"
          title="Playlist"
          onClick={() => {
            setIsMobileModalOpen(true);
            setIsFloatingExpanded(false);
          }}
          className={cn(
            "mobile-ctrl absolute flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-[rgba(20,20,25,0.35)] text-accent3 shadow-[0_8px_25px_rgba(0,0,0,0.4)] backdrop-blur-md transition-all duration-500 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] active:!scale-90 active:bg-white active:text-black",
            isFloatingExpanded
              ? "pointer-events-auto opacity-100"
              : "pointer-events-none scale-50 opacity-0"
          )}
        >
          <svg
            className="h-[18px] w-[18px]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
        </button>

        <button
          id="mobile-prev"
          type="button"
          title="Previous"
          onClick={() => {
            prevTrack();
            startAutoCollapse(2500);
          }}
          className={cn(
            "mobile-ctrl absolute flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-[rgba(20,20,25,0.35)] text-accent3 shadow-[0_8px_25px_rgba(0,0,0,0.4)] backdrop-blur-md transition-all duration-500 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] active:!scale-90 active:bg-white active:text-black",
            isFloatingExpanded
              ? "pointer-events-auto opacity-100"
              : "pointer-events-none scale-50 opacity-0"
          )}
        >
          <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
          </svg>
        </button>

        <button
          id="mobile-play-pause"
          type="button"
          title="Play/Pause"
          onClick={() => {
            togglePlayPause();
            startAutoCollapse(2500);
          }}
          className={cn(
            "mobile-ctrl play-pause absolute flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-[rgba(20,20,25,0.35)] text-accent3 shadow-[0_8px_25px_rgba(0,0,0,0.4)] backdrop-blur-md transition-all duration-500 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] active:!scale-90 active:bg-white active:text-black",
            isFloatingExpanded
              ? "pointer-events-auto opacity-100"
              : "pointer-events-none scale-50 opacity-0"
          )}
        >
          {isPlaying ? (
            <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          ) : (
            <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <button
          id="mobile-next"
          type="button"
          title="Next"
          onClick={() => {
            nextTrack();
            startAutoCollapse(2500);
          }}
          className={cn(
            "mobile-ctrl absolute flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-[rgba(20,20,25,0.35)] text-accent3 shadow-[0_8px_25px_rgba(0,0,0,0.4)] backdrop-blur-md transition-all duration-500 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] active:!scale-90 active:bg-white active:text-black",
            isFloatingExpanded
              ? "pointer-events-auto opacity-100"
              : "pointer-events-none scale-50 opacity-0"
          )}
        >
          <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
          </svg>
        </button>
      </div>

      {/* Nút tròn chính (Music Toggle) */}
      <button
        id="music-btn"
        type="button"
        aria-label="Toggle Music"
        title="Music Menu"
        onClick={() => {
          stopAutoCollapse();
          setIsFloatingExpanded((prev) => {
            const next = !prev;
            if (next) startAutoCollapse(2500);
            return next;
          });
        }}
        className={cn(
          "music-toggle relative z-[2] flex h-[54px] w-[54px] cursor-pointer items-center justify-center rounded-full border p-0 shadow-[0_10px_40px_rgba(0,0,0,0.5)] backdrop-blur-md transition-all duration-300 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] hover:scale-110 hover:border-white hover:bg-white/10 hover:text-white hover:shadow-[0_0_25px_rgba(255,255,255,0.4)]",
          isPlaying
            ? "playing border-white bg-white/[0.12] text-white"
            : "muted border-white/[0.08] bg-[rgba(25,25,30,0.35)] text-white/70",
          isFloatingExpanded && "!rotate-45 !border-white !bg-white !text-black"
        )}
      >
        <div
          className={cn(
            "relative flex h-full w-full items-center justify-center",
            isPlaying && "drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]"
          )}
        >
          {isFloatingExpanded ? (
            <svg
              className="h-5 w-5 stroke-current"
              viewBox="0 0 24 24"
              fill="none"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : isPlaying ? (
            currentTrack?.cover ? (
              <VinylDisc
                cover={currentTrack.cover}
                alt={currentTrack.name}
                isActive={true}
                isPlaying={isPlaying}
                size="sm"
              />
            ) : (
              <div className="flex h-[22px] items-center justify-center gap-[3.5px]">
                <span className="music-wave-1 w-[3.5px] rounded-[4px] bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                <span className="music-wave-2 w-[3.5px] rounded-[4px] bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                <span className="music-wave-3 w-[3.5px] rounded-[4px] bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
              </div>
            )
          ) : (
            <svg
              className="h-6 w-6 stroke-current"
              viewBox="0 0 24 24"
              fill="none"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              <line
                x1="22"
                y1="9"
                x2="16"
                y2="15"
                className="stroke-accent3 stroke-[2.5]"
              />
              <line
                x1="16"
                y1="9"
                x2="22"
                y2="15"
                className="stroke-accent3 stroke-[2.5]"
              />
            </svg>
          )}
        </div>
      </button>
    </div>
  );
}
