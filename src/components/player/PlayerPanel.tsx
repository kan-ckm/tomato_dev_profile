"use client";

import React from "react";
import { useMusicPlayer } from "./MusicPlayerContext";
import { cn, formatTime } from "@/lib/utils";

interface PlayerPanelProps {
  className?: string;
  onUserInteraction?: () => void;
}

export function PlayerPanel({ className, onUserInteraction }: PlayerPanelProps) {
  const {
    playlist,
    currentTrackIndex,
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isPlaylistExpanded,
    togglePlayPause,
    nextTrack,
    prevTrack,
    selectTrack,
    seekToPercent,
    setVolume,
    toggleMute,
    setIsPlaylistExpanded,
  } = useMusicPlayer();

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    onUserInteraction?.();
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    seekToPercent(pct);
  };

  const renderVolumeIcon = () => {
    if (volume === 0) {
      return (
        <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
      );
    }
    if (volume < 0.5) {
      return (
        <path d="M7 9v6h4l5 5V4L11 9H7zm11.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
      );
    }
    return (
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
    );
  };

  return (
    <div
      className={cn(
        "player-container rounded-panel border border-white/[0.06] bg-white/[0.03] px-5 pb-[18px] pt-5 shadow-[0_20px_40px_rgba(0,0,0,0.2)] backdrop-blur-md",
        className
      )}
    >
      <div className="mb-[15px]">
        <div className="mb-1 truncate font-display text-[0.95rem] font-bold text-white">
          {currentTrack
            ? `${currentTrack.name} — ${currentTrack.artist}`
            : "Select a track"}
        </div>
        <div className="text-[0.7rem] tabular-nums text-muted">
          <span>{formatTime(currentTime)}</span> / <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div
        onClick={handleProgressClick}
        className="player-progress relative mb-5 h-1.5 w-full cursor-pointer overflow-hidden rounded-[3px] bg-white/[0.05]"
      >
        <div
          className="h-full rounded-[3px] bg-gradient-to-r from-accent to-accent2 transition-[width] duration-100 ease-linear"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Controls */}
      <div className="mt-[15px] flex items-center justify-between">
        <div className="flex items-center gap-[15px]">
          <button
            type="button"
            title="Previous"
            onClick={() => {
              onUserInteraction?.();
              prevTrack();
            }}
            className="flex cursor-pointer items-center justify-center border-none bg-transparent text-muted transition-all duration-200 hover:scale-110 hover:text-white"
          >
            <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
            </svg>
          </button>

          <button
            type="button"
            title="Play/Pause"
            onClick={() => {
              onUserInteraction?.();
              togglePlayPause();
            }}
            className="flex h-[38px] w-[38px] cursor-pointer items-center justify-center rounded-full border-none bg-accent text-zinc-950 shadow-[0_4px_15px_rgba(255,255,255,0.25)] transition-all duration-200 hover:scale-105 hover:bg-accent2"
          >
            {isPlaying ? (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          <button
            type="button"
            title="Next"
            onClick={() => {
              onUserInteraction?.();
              nextTrack();
            }}
            className="flex cursor-pointer items-center justify-center border-none bg-transparent text-muted transition-all duration-200 hover:scale-110 hover:text-white"
          >
            <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
            </svg>
          </button>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              title="Mute/Unmute"
              onClick={() => {
                onUserInteraction?.();
                toggleMute();
              }}
              className="flex cursor-pointer items-center justify-center border-none bg-transparent text-muted transition-all duration-200 hover:scale-110 hover:text-white"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                {renderVolumeIcon()}
              </svg>
            </button>
            <input
              type="range"
              aria-label="Volume"
              className="volume-slider"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => {
                onUserInteraction?.();
                setVolume(parseFloat(e.target.value));
              }}
            />
          </div>
        </div>

        <div className="flex items-center">
          <button
            type="button"
            title="Playlist"
            onClick={() => {
              onUserInteraction?.();
              setIsPlaylistExpanded((prev) => !prev);
            }}
            className="flex cursor-pointer items-center justify-center border-none bg-transparent text-muted transition-all duration-200 hover:scale-110 hover:text-white"
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
        </div>
      </div>

      {/* Expandable Playlist */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]",
          isPlaylistExpanded
            ? "pointer-events-auto mt-5 max-h-[300px] opacity-100"
            : "pointer-events-none mt-0 max-h-0 opacity-0"
        )}
      >
        <div className="custom-scrollbar max-h-[250px] overflow-y-auto pr-1">
          {playlist.map((track, idx) => {
            const active = idx === currentTrackIndex;
            return (
              <div
                key={track.file}
                onClick={() => {
                  onUserInteraction?.();
                  selectTrack(idx);
                }}
                className={cn(
                  "mb-1 cursor-pointer truncate rounded-xl border px-3 py-2.5 text-[0.8rem] transition-all duration-200",
                  active
                    ? "border-accent/20 bg-accent/10 text-accent"
                    : "border-transparent text-muted hover:bg-white/[0.05] hover:text-white"
                )}
              >
                {track.name}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
