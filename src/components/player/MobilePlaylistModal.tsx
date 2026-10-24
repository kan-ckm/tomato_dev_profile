"use client";

import React, { useState } from "react";
import { useMusicPlayer } from "./MusicPlayerContext";
import { VinylDisc } from "./VinylDisc";
import { cn } from "@/lib/utils";

export function MobilePlaylistModal() {
  const {
    playlist,
    currentTrackIndex,
    isPlaying,
    isMobileModalOpen,
    isShuffle,
    repeatMode,
    selectTrack,
    toggleShuffle,
    toggleRepeatMode,
    reorderPlaylist,
    setIsMobileModalOpen,
  } = useMusicPlayer();

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      reorderPlaylist(draggedIndex, dropIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div
      id="mobile-playlist-modal"
      aria-hidden={!isMobileModalOpen}
      className={cn(
        "fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-5 transition-opacity duration-300",
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
          "relative w-full max-w-[420px] overflow-hidden rounded-panel border border-white/10 bg-[rgba(20,20,25,0.94)] shadow-[0_25px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl transition-all duration-500 ease-[cubic-bezier(0.175,0.885,0.32,1.275)]",
          isMobileModalOpen ? "translate-y-0 scale-100" : "translate-y-[30px] scale-95"
        )}
      >
        {/* Header with Title, Count (X/70), Shuffle, Repeat, and Close */}
        <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-[14px]">
          <div className="flex items-center gap-2 text-accent">
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
            <h3 className="font-display text-[1.05rem] font-bold text-white">Playlist</h3>
            <span className="rounded-full bg-accent/15 px-2 py-0.5 font-numeric text-[0.7rem] font-semibold text-accent">
              {playlist.length}<span className="text-white/40">/70</span> bài
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Shuffle Button */}
            <button
              type="button"
              title={isShuffle ? "Tắt phát ngẫu nhiên" : "Bật phát ngẫu nhiên"}
              onClick={toggleShuffle}
              className={cn(
                "flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border transition-all",
                isShuffle
                  ? "border-accent/40 bg-accent/20 text-accent shadow-[0_0_10px_rgba(255,255,255,0.2)]"
                  : "border-white/10 bg-white/[0.04] text-muted hover:text-white"
              )}
            >
              <svg
                className="h-3.5 w-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="16 3 21 3 21 8" />
                <line x1="4" y1="20" x2="21" y2="3" />
                <polyline points="21 16 21 21 16 21" />
                <line x1="15" y1="15" x2="21" y2="21" />
                <line x1="4" y1="4" x2="9" y2="9" />
              </svg>
            </button>

            {/* Repeat Button */}
            <button
              type="button"
              title={
                repeatMode === "one"
                  ? "Lặp lại 1 bài"
                  : repeatMode === "all"
                  ? "Lặp lại toàn bộ"
                  : "Không lặp lại"
              }
              onClick={toggleRepeatMode}
              className={cn(
                "relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border transition-all",
                repeatMode !== "off"
                  ? "border-accent/40 bg-accent/20 text-accent shadow-[0_0_10px_rgba(255,255,255,0.2)]"
                  : "border-white/10 bg-white/[0.04] text-muted hover:text-white"
              )}
            >
              <svg
                className="h-3.5 w-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="17 1 21 5 17 9" />
                <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                <polyline points="7 23 3 19 7 15" />
                <path d="M21 13v2a4 4 0 0 1-4 4H3" />
              </svg>
              {repeatMode === "one" && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-accent font-numeric text-[8px] font-black text-black">
                  1
                </span>
              )}
            </button>

            {/* Close Modal Button */}
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
        </div>

        {/* Playlist Items with Drag & Drop and Move Buttons */}
        <div className="custom-scrollbar max-h-[420px] space-y-1.5 overflow-y-auto p-3">
          {playlist.map((track, index) => {
            const active = index === currentTrackIndex;
            const isBeingDragged = draggedIndex === index;
            const isDropTarget = dragOverIndex === index && draggedIndex !== index;

            return (
              <div
                key={track.file}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                onClick={() => {
                  selectTrack(index);
                  setIsMobileModalOpen(false);
                }}
                className={cn(
                  "group flex cursor-pointer items-center gap-2.5 rounded-2xl border p-2.5 transition-all duration-200 select-none",
                  isBeingDragged && "opacity-40 scale-[0.98] border-dashed border-accent bg-accent/10",
                  isDropTarget && "border-accent bg-accent/25 scale-[1.01] shadow-[0_0_15px_rgba(255,255,255,0.2)]",
                  !isBeingDragged &&
                    !isDropTarget &&
                    (active
                      ? "border-accent/30 bg-accent/[0.15] shadow-[0_4px_16px_rgba(0,0,0,0.3)]"
                      : "border-white/[0.04] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.06]")
                )}
              >
                {/* Drag Handle Grip Icon */}
                <span
                  title="Kéo thả để sắp xếp"
                  className="shrink-0 cursor-grab text-white/20 transition-colors hover:text-accent active:cursor-grabbing"
                  onClick={(e) => e.stopPropagation()}
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="8" cy="6" r="2" />
                    <circle cx="16" cy="6" r="2" />
                    <circle cx="8" cy="12" r="2" />
                    <circle cx="16" cy="12" r="2" />
                    <circle cx="8" cy="18" r="2" />
                    <circle cx="16" cy="18" r="2" />
                  </svg>
                </span>

                {/* Track Index */}
                <span
                  className={cn(
                    "w-4 shrink-0 text-center font-numeric text-[0.72rem] font-semibold transition-colors",
                    active
                      ? "text-accent font-bold"
                      : "text-white/30 group-hover:text-white/70"
                  )}
                >
                  {String(index + 1).padStart(2, "0")}
                </span>

                {/* Rotating Vinyl Disc */}
                <VinylDisc
                  cover={track.cover}
                  alt={track.name}
                  isActive={active}
                  isPlaying={isPlaying}
                  size="md"
                />

                <div className="min-w-0 flex-1 overflow-hidden">
                  <div
                    className={cn(
                      "mb-0.5 truncate text-[0.88rem] font-semibold tracking-tight",
                      active ? "text-accent3" : "text-white group-hover:text-white"
                    )}
                    title={track.name}
                  >
                    {track.name}
                  </div>
                  <div className="truncate text-[0.72rem] text-muted" title={track.artist}>
                    {track.artist}
                  </div>
                </div>

                {/* Mini Reorder Up / Down Buttons */}
                <div
                  className="flex items-center gap-1 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    title="Chuyển lên trên"
                    disabled={index === 0}
                    onClick={() => reorderPlaylist(index, index - 1)}
                    className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg bg-white/[0.04] text-white/50 transition-all hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-20 active:scale-95"
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="18 15 12 9 6 15" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    title="Chuyển xuống dưới"
                    disabled={index === playlist.length - 1}
                    onClick={() => reorderPlaylist(index, index + 1)}
                    className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg bg-white/[0.04] text-white/50 transition-all hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-20 active:scale-95"
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                </div>

                {/* Animated Equalizer Indicator when Active */}
                {active && (
                  <div className="ml-1 flex h-3.5 items-end gap-[2px]">
                    <span
                      className={cn(
                        "w-[2px] rounded-full bg-accent transition-all duration-300",
                        isPlaying ? "animate-[bounce_0.6s_ease-in-out_infinite]" : "h-2"
                      )}
                      style={{ height: "100%" }}
                    />
                    <span
                      className={cn(
                        "w-[2px] rounded-full bg-accent transition-all duration-300",
                        isPlaying ? "animate-[bounce_0.8s_ease-in-out_infinite_0.15s]" : "h-3"
                      )}
                      style={{ height: "60%" }}
                    />
                    <span
                      className={cn(
                        "w-[2px] rounded-full bg-accent transition-all duration-300",
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
