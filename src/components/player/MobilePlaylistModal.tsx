"use client";

import React from "react";
import { useMusicPlayer } from "./MusicPlayerContext";
import { VinylDisc } from "./VinylDisc";
import { cn } from "@/lib/utils";

export function MobilePlaylistModal() {
  const {
    playlist,
    currentTrackIndex,
    isPlaying,
    isMobileModalOpen,
    selectTrack,
    setIsMobileModalOpen,
  } = useMusicPlayer();

  return (
    <div
      id="mobile-playlist-modal"
      aria-hidden={!isMobileModalOpen}
      className={cn(
        "fixed inset-0 z-[10000] flex items-center justify-center p-5 transition-opacity duration-300",
        isMobileModalOpen
          ? "pointer-events-auto opacity-100"
          : "pointer-events-none opacity-0"
      )}
    >
      {/* Overlay */}
      <div
        id="modal-overlay"
        onClick={() => setIsMobileModalOpen(false)}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* Modal Content */}
      <div
        className={cn(
          "relative w-full max-w-[380px] overflow-hidden rounded-panel border border-white/10 bg-[rgba(20,20,25,0.92)] shadow-[0_25px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl transition-all duration-500 ease-[cubic-bezier(0.175,0.885,0.32,1.275)]",
          isMobileModalOpen ? "translate-y-0 scale-100" : "translate-y-[30px] scale-95"
        )}
      >
        <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-[18px]">
          <div className="flex items-center gap-3 text-accent">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              width="18"
              height="18"
            >
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
            <h3 className="font-display text-[1.1rem] font-bold text-white">Playlist</h3>
          </div>
          <button
            id="close-playlist-modal"
            type="button"
            aria-label="Close"
            onClick={() => setIsMobileModalOpen(false)}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-none bg-white/[0.05] text-muted transition-all duration-300 hover:rotate-90 hover:bg-white/[0.15] hover:text-white"
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
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="custom-scrollbar max-h-[420px] space-y-1.5 overflow-y-auto p-3">
          {playlist.map((track, index) => {
            const active = index === currentTrackIndex;
            return (
              <div
                key={track.file}
                onClick={() => {
                  selectTrack(index);
                  setIsMobileModalOpen(false);
                }}
                className={cn(
                  "group flex cursor-pointer items-center gap-3.5 rounded-2xl border p-2.5 transition-all duration-200",
                  active
                    ? "border-accent/30 bg-accent/[0.15] shadow-[0_4px_16px_rgba(0,0,0,0.3)]"
                    : "border-white/[0.04] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.06]"
                )}
              >
                {/* Rotating Vinyl Disc */}
                <VinylDisc
                  cover={track.cover}
                  alt={track.name}
                  isActive={active}
                  isPlaying={isPlaying}
                  size="md"
                />

                <div className="min-w-0 flex-1">
                  <div
                    className={cn(
                      "mb-0.5 truncate text-[0.88rem] font-semibold tracking-tight",
                      active ? "text-accent3" : "text-white group-hover:text-white"
                    )}
                  >
                    {track.name}
                  </div>
                  <div className="truncate text-[0.72rem] text-muted">{track.artist}</div>
                </div>

                {/* Animated Equalizer Indicator when Active */}
                {active && (
                  <div className="mr-2 flex h-3.5 items-end gap-[2px]">
                    <span
                      className={cn(
                        "w-[2.5px] rounded-full bg-accent transition-all duration-300",
                        isPlaying ? "animate-[bounce_0.6s_ease-in-out_infinite]" : "h-2"
                      )}
                      style={{ height: "100%" }}
                    />
                    <span
                      className={cn(
                        "w-[2.5px] rounded-full bg-accent transition-all duration-300",
                        isPlaying ? "animate-[bounce_0.8s_ease-in-out_infinite_0.15s]" : "h-3"
                      )}
                      style={{ height: "60%" }}
                    />
                    <span
                      className={cn(
                        "w-[2.5px] rounded-full bg-accent transition-all duration-300",
                        isPlaying ? "animate-[bounce_0.7s_ease-in-out_infinite_0.3s]" : "h-1.5"
                      )}
                      style={{ height: "80%" }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
