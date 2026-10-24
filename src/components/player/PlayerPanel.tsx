"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useMusicPlayer } from "./MusicPlayerContext";
import { VinylDisc } from "./VinylDisc";
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
    isShuffle,
    repeatMode,
    togglePlayPause,
    nextTrack,
    prevTrack,
    selectTrack,
    seekToPercent,
    setVolume,
    toggleMute,
    toggleShuffle,
    toggleRepeatMode,
    reorderPlaylist,
    setIsPlaylistExpanded,
  } = useMusicPlayer();

  const progressBarRef = useRef<HTMLDivElement>(null);
  const volumeContainerRef = useRef<HTMLDivElement>(null);
  const volumeRef = useRef<number>(volume);
  const [isScrubbing, setIsScrubbing] = useState<boolean>(false);
  const [scrubPercent, setScrubPercent] = useState<number>(0);

  // Giữ ref âm lượng luôn mới nhất để dùng trong wheel listener mà không cần re-bind
  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  // Hỗ trợ lăn chuột trên cụm âm lượng để tăng / giảm âm lượng mượt mà và chặn cuộn trang
  useEffect(() => {
    const el = volumeContainerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      onUserInteraction?.();
      // Lăn lên (deltaY < 0): tăng volume (+5%), Lăn xuống (deltaY > 0): giảm volume (-5%)
      const step = 0.05;
      const delta = e.deltaY < 0 ? step : -step;
      const next = Math.round((volumeRef.current + delta) * 100) / 100;
      setVolume(Math.max(0, Math.min(1, next)));
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", handleWheel);
    };
  }, [onUserInteraction, setVolume]);

  // Trạng thái kéo thả (Drag and Drop) danh sách nhạc
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

  const progressPercent = isScrubbing
    ? scrubPercent
    : duration > 0
    ? Math.max(0, Math.min(100, (currentTime / duration) * 100))
    : 0;

  const seekFromPointer = useCallback(
    (clientX: number, commit = false) => {
      if (!progressBarRef.current) return;
      const rect = progressBarRef.current.getBoundingClientRect();
      if (rect.width <= 0) return;
      const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      setScrubPercent(pct * 100);
      if (commit) {
        seekToPercent(pct);
      }
    },
    [seekToPercent]
  );

  const handlePointerDown = (clientX: number) => {
    onUserInteraction?.();
    setIsScrubbing(true);
    seekFromPointer(clientX, false);

    const onPointerMove = (e: MouseEvent | TouchEvent) => {
      const x = "touches" in e ? e.touches[0].clientX : e.clientX;
      seekFromPointer(x, false);
    };

    const onPointerUp = (e: MouseEvent | TouchEvent) => {
      const x =
        "changedTouches" in e ? e.changedTouches[0].clientX : (e as MouseEvent).clientX;
      seekFromPointer(x, true);
      setIsScrubbing(false);
      window.removeEventListener("mousemove", onPointerMove);
      window.removeEventListener("mouseup", onPointerUp);
      window.removeEventListener("touchmove", onPointerMove);
      window.removeEventListener("touchend", onPointerUp);
    };

    window.addEventListener("mousemove", onPointerMove);
    window.addEventListener("mouseup", onPointerUp);
    window.addEventListener("touchmove", onPointerMove, { passive: false });
    window.addEventListener("touchend", onPointerUp);
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
        "player-container relative overflow-hidden rounded-panel border border-white/15 bg-black/35 px-5 pb-[18px] pt-5 shadow-[0_25px_60px_rgba(0,0,0,0.5)] backdrop-blur-2xl transition-all duration-500",
        className
      )}
    >
      {/* Whole-block Album Cover Ambient Color Backdrop (Độ phủ màu đậm đà, sống động theo từng bài) */}
      {currentTrack?.cover && (
        <div
          className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
          aria-hidden="true"
        >
          {/* Base intense blur color layer */}
          <img
            key={`bg-${currentTrack.cover}`}
            src={currentTrack.cover}
            alt=""
            className="h-full w-full scale-150 object-cover object-center blur-2xl brightness-105 saturate-[2.8] opacity-85 transition-all duration-700 ease-out"
          />

          {/* Color booster overlay layer */}
          <img
            key={`boost-${currentTrack.cover}`}
            src={currentTrack.cover}
            alt=""
            className="absolute inset-0 h-full w-full scale-125 object-cover object-center blur-3xl saturate-[3.5] mix-blend-color opacity-85 transition-all duration-700 ease-out"
          />

          {/* Controlled contrast vignette to keep typography ultra-crisp while letting vibrant color shine through */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/30" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,transparent_35%,rgba(0,0,0,0.65)_100%)]" />
        </div>
      )}

      {/* Outer Ambient Glow radiating from behind the container */}
      {currentTrack?.cover && (
        <div
          className="pointer-events-none absolute -inset-2 z-[-1] overflow-hidden rounded-[28px] opacity-70 blur-2xl transition-all duration-700"
          aria-hidden="true"
        >
          <img
            key={`glow-${currentTrack.cover}`}
            src={currentTrack.cover}
            alt=""
            className="h-full w-full scale-150 object-cover saturate-[3.5] brightness-125"
          />
        </div>
      )}

      {/* Main Player Content Area */}
      <div className="relative z-10">
        <div className="mb-[15px] flex items-center gap-3.5">
          {/* Animated Vinyl Disc for Currently Playing Track */}
          <VinylDisc
            cover={currentTrack?.cover}
            alt={currentTrack?.name}
            isActive={true}
            isPlaying={isPlaying}
            size="md"
            className="shadow-[0_4px_16px_rgba(0,0,0,0.6)] ring-1 ring-white/10"
          />

          <div className="min-w-0 flex-1">
            <div className="mb-0.5 flex items-center justify-between gap-2 min-w-0">
              <span
                className="truncate font-display text-[0.95rem] font-bold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)] min-w-0 flex-1"
                title={currentTrack ? currentTrack.name : "Select a track"}
              >
                {currentTrack ? currentTrack.name : "Select a track"}
              </span>
              {playlist.length > 0 && (
                <span className="shrink-0 whitespace-nowrap rounded bg-white/10 px-1.5 py-0.5 font-numeric text-[0.68rem] font-semibold tracking-wider text-accent">
                  {String(currentTrackIndex + 1).padStart(2, "0")}/{String(playlist.length).padStart(2, "0")}
                </span>
              )}
            </div>
            <div className="flex items-center justify-between gap-2 text-[0.72rem] min-w-0">
              <span
                className="truncate font-medium text-white/80 min-w-0 flex-1"
                title={currentTrack?.artist || "Unknown artist"}
              >
                {currentTrack?.artist || "Unknown artist"}
              </span>
              <span className="shrink-0 whitespace-nowrap tabular-nums font-numeric text-white/50 text-right">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>
          </div>
        </div>

        {/* Progress / Timeline Bar with Visible Thumb Dot ("dấu .") */}
        <div
          ref={progressBarRef}
          onMouseDown={(e) => {
            e.preventDefault();
            handlePointerDown(e.clientX);
          }}
          onTouchStart={(e) => {
            if (e.touches.length > 0) {
              handlePointerDown(e.touches[0].clientX);
            }
          }}
          className="player-progress group relative mb-4 flex h-6 w-full cursor-pointer items-center select-none"
          role="slider"
          aria-label="Audio progress"
          aria-valuenow={currentTime}
          aria-valuemin={0}
          aria-valuemax={duration || 100}
        >
          {/* Background Track Bar */}
          <div className="relative h-1.5 w-full rounded-full bg-white/20 transition-all duration-200 group-hover:h-2">
            {/* Played Progress Fill */}
            <div
              className="h-full rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.7)] transition-[width] duration-75 ease-out"
              style={{ width: `${progressPercent}%` }}
            />

            {/* Interactive Thumb Dot ("Dấu .") */}
            <div
              className="pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/20 bg-white shadow-[0_0_10px_rgba(255,255,255,0.95),0_1px_4px_rgba(0,0,0,0.6)] transition-transform duration-150 ease-out group-hover:scale-125"
              style={{ left: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Controls: Single Row - All controls aligned with compact 3-bar playlist icon */}
        <div className="mt-[15px] flex items-center justify-between gap-1.5 sm:gap-2 min-w-0">
          <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 flex-1">
            {/* Previous Track */}
            <button
              type="button"
              title="Previous"
              onClick={() => {
                onUserInteraction?.();
                prevTrack();
              }}
              className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center border-none bg-transparent text-muted transition-all duration-200 hover:scale-110 hover:text-white"
            >
              <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
              </svg>
            </button>

            {/* Play/Pause (Always perfect circle with shrink-0 aspect-square, centered icon) */}
            <button
              type="button"
              title={isPlaying ? "Tạm dừng" : "Phát nhạc"}
              onClick={() => {
                onUserInteraction?.();
                togglePlayPause();
              }}
              className="flex h-[38px] w-[38px] shrink-0 aspect-square cursor-pointer items-center justify-center p-0 m-0 leading-none rounded-full border-none bg-accent text-zinc-950 shadow-[0_4px_15px_rgba(255,255,255,0.25)] transition-all duration-200 hover:scale-105 hover:bg-accent2 active:scale-95"
            >
              {isPlaying ? (
                <svg className="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="5" width="4" height="14" rx="1.5" />
                  <rect x="14" y="5" width="4" height="14" rx="1.5" />
                </svg>
              ) : (
                <svg className="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5.14v13.72a1 1 0 0 0 1.53.85l10.28-6.86a1 1 0 0 0 0-1.7L9.53 4.29A1 1 0 0 0 8 5.14z" />
                </svg>
              )}
            </button>

            {/* Next Track */}
            <button
              type="button"
              title="Next"
              onClick={() => {
                onUserInteraction?.();
                nextTrack();
              }}
              className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center border-none bg-transparent text-muted transition-all duration-200 hover:scale-110 hover:text-white"
            >
              <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
              </svg>
            </button>

            {/* Shuffle Button (Phát ngẫu nhiên) */}
            <button
              type="button"
              title={
                isShuffle
                  ? "Tắt phát ngẫu nhiên (Shuffle: Đang bật)"
                  : "Bật phát ngẫu nhiên (Shuffle: Đang tắt)"
              }
              onClick={() => {
                onUserInteraction?.();
                toggleShuffle();
              }}
              className={cn(
                "flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center border-none bg-transparent transition-all duration-200 hover:scale-110",
                isShuffle
                  ? "text-accent drop-shadow-[0_0_8px_rgba(255,255,255,0.7)]"
                  : "text-muted hover:text-white"
              )}
            >
              <svg
                className="h-[16px] w-[16px]"
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

            {/* Repeat Button (Lặp lại: Off / All / One) */}
            <button
              type="button"
              title={
                repeatMode === "one"
                  ? "Đang lặp lại 1 bài (Click để tắt)"
                  : repeatMode === "all"
                  ? "Đang lặp lại toàn bộ (Click để lặp 1 bài)"
                  : "Không lặp lại (Click để lặp lại toàn bộ)"
              }
              onClick={() => {
                onUserInteraction?.();
                toggleRepeatMode();
              }}
              className={cn(
                "flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center border-none bg-transparent transition-all duration-200 hover:scale-110",
                repeatMode !== "off"
                  ? "text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.7)]"
                  : "text-zinc-400/60 hover:text-white"
              )}
            >
              <span className="relative inline-flex h-4 w-4 items-center justify-center">
                <svg
                  className="h-4 w-4"
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
                  <span className="pointer-events-none absolute -top-1 -right-1.5 flex h-3 w-3 items-center justify-center rounded-full bg-white font-numeric text-[8px] font-bold leading-none text-black shadow-sm ring-1 ring-black/40">
                    1
                  </span>
                )}
              </span>
            </button>

            {/* Volume Control (Hỗ trợ lăn chuột tăng/giảm âm lượng) */}
            <div
              ref={volumeContainerRef}
              title={`Âm lượng: ${Math.round(volume * 100)}% (Lăn chuột để tăng/giảm)`}
              className="flex items-center gap-1 sm:gap-1.5 shrink-0 select-none py-1 group/volume cursor-pointer"
            >
              <button
                type="button"
                title={volume === 0 ? "Bật âm thanh" : "Tắt tiếng"}
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
                className="volume-slider w-14 sm:w-16 shrink-0 cursor-pointer"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                style={{
                  background: `linear-gradient(to right, #ffffff ${volume * 100}%, rgba(255, 255, 255, 0.2) ${volume * 100}%)`,
                }}
                onChange={(e) => {
                  onUserInteraction?.();
                  setVolume(parseFloat(e.target.value));
                }}
              />
            </div>
          </div>

          {/* Playlist Toggle - Rút gọn chỉ còn icon 3 gạch (không còn text số lượng bài) */}
          <div className="flex items-center shrink-0 pl-1">
            <button
              type="button"
              title={`Danh sách phát (${playlist.length}/70 bài)`}
              onClick={() => {
                onUserInteraction?.();
                setIsPlaylistExpanded((prev) => !prev);
              }}
              className={cn(
                "flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg border transition-all duration-200 hover:scale-105 active:scale-95",
                isPlaylistExpanded
                  ? "border-accent/40 bg-accent/15 text-accent shadow-[0_0_12px_rgba(255,255,255,0.15)]"
                  : "border-white/10 bg-white/[0.04] text-muted hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
              )}
            >
              <svg
                className="h-[15px] w-[15px]"
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

        {/* Expandable Playlist with Drag & Drop Reordering */}
        <div
          className={cn(
            "overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]",
            isPlaylistExpanded
              ? "pointer-events-auto mt-5 max-h-[340px] opacity-100"
              : "pointer-events-none mt-0 max-h-0 opacity-0"
          )}
        >
          <div className="custom-scrollbar max-h-[270px] space-y-1.5 overflow-y-auto pr-1">
            {playlist.map((track, idx) => {
              const active = idx === currentTrackIndex;
              const isBeingDragged = draggedIndex === idx;
              const isDropTarget = dragOverIndex === idx && draggedIndex !== idx;

              return (
                <div
                  key={track.file}
                  draggable
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={(e) => handleDrop(e, idx)}
                  onDragEnd={handleDragEnd}
                  onClick={() => {
                    onUserInteraction?.();
                    selectTrack(idx);
                  }}
                  className={cn(
                    "group flex cursor-pointer items-center gap-2 rounded-xl border p-2 transition-all duration-200 select-none",
                    isBeingDragged && "opacity-40 scale-[0.98] border-dashed border-accent bg-accent/10",
                    isDropTarget && "border-accent bg-accent/25 scale-[1.01] shadow-[0_0_15px_rgba(255,255,255,0.2)]",
                    !isBeingDragged &&
                      !isDropTarget &&
                      (active
                        ? "border-accent/30 bg-accent/15 text-accent shadow-[0_4px_15px_rgba(0,0,0,0.3)]"
                        : "border-transparent bg-white/[0.02] text-muted hover:border-white/10 hover:bg-white/[0.06] hover:text-white")
                  )}
                >
                  {/* Grip Handle for Drag & Drop */}
                  <span
                    title="Kéo thả để sắp xếp thứ tự"
                    className="shrink-0 cursor-grab text-white/25 transition-colors hover:text-accent active:cursor-grabbing"
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

                  {/* Track Index Number */}
                  <span
                    className={cn(
                      "w-4 shrink-0 text-center font-numeric text-[0.7rem] font-semibold transition-colors",
                      active
                        ? "text-accent font-bold"
                        : "text-white/35 group-hover:text-white/70"
                    )}
                  >
                    {String(idx + 1).padStart(2, "0")}
                  </span>

                  {/* Rotating Vinyl Disc */}
                  <VinylDisc
                    cover={track.cover}
                    alt={track.name}
                    isActive={active}
                    isPlaying={isPlaying}
                    size="sm"
                  />

                  <div className="min-w-0 flex-1 overflow-hidden">
                    <div
                      className={cn(
                        "truncate text-[0.82rem] font-semibold tracking-tight",
                        active ? "text-white" : "text-zinc-200 group-hover:text-white"
                      )}
                      title={track.name}
                    >
                      {track.name}
                    </div>
                    <div
                      className="truncate text-[0.68rem] text-muted"
                      title={track.artist}
                    >
                      {track.artist}
                    </div>
                  </div>

                  {/* Mini Move Up / Down Buttons */}
                  <div
                    className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      title="Chuyển lên trên"
                      disabled={idx === 0}
                      onClick={() => reorderPlaylist(idx, idx - 1)}
                      className="cursor-pointer rounded p-1 text-white/40 transition-all hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-20"
                    >
                      <svg
                        className="h-3 w-3"
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
                      disabled={idx === playlist.length - 1}
                      onClick={() => reorderPlaylist(idx, idx + 1)}
                      className="cursor-pointer rounded p-1 text-white/40 transition-all hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-20"
                    >
                      <svg
                        className="h-3 w-3"
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

                  {/* Active Equalizer Sound Wave Indicator */}
                  {active && (
                    <div className="mr-1 flex h-3 items-end gap-[2px]">
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
    </div>
  );
}
