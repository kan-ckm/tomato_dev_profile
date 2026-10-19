"use client";

import React, { useEffect, useRef, useState } from "react";
import { mediaShowcaseConfig, MediaShowcaseConfig } from "@/config/media.config";
import { cn } from "@/lib/utils";

interface MediaShowcaseProps {
  config?: Partial<MediaShowcaseConfig>;
  className?: string;
}

function isVideoFile(src: string): boolean {
  if (!src) return false;
  const clean = src.split("?")[0].toLowerCase();
  return (
    clean.endsWith(".mp4") ||
    clean.endsWith(".webm") ||
    clean.endsWith(".ogg") ||
    clean.endsWith(".mov")
  );
}

export function MediaShowcase({ config: customConfig, className }: MediaShowcaseProps) {
  const cfg = { ...mediaShowcaseConfig, ...customConfig };
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentSrc, setCurrentSrc] = useState<string>(cfg.src);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(cfg.muted ?? true);
  const [hasError, setHasError] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const isVideo = isVideoFile(currentSrc);

  useEffect(() => {
    setCurrentSrc(cfg.src);
    setHasError(false);
  }, [cfg.src]);

  // Đồng bộ trạng thái play/pause khi video bắt đầu hoặc dừng
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Cho phép người dùng thử chọn file video/gif từ máy tính để xem trước ngay lập tức
  const handleLocalFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setCurrentSrc(objectUrl);
      setHasError(false);
      setIsPlaying(true);
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "media-showcase-card group relative flex flex-col overflow-hidden rounded-panel border border-white/[0.08] bg-white/[0.03] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.25)] backdrop-blur-md transition-all duration-300 hover:border-white/20",
        className
      )}
    >
      {/* Header Info */}
      <div className="mb-3 flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-0.5 font-display text-[0.62rem] font-bold uppercase tracking-[0.1em] text-white">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
              {cfg.badge || (isVideo ? "VIDEO" : "GIF")}
            </span>
            <h3 className="truncate font-display text-[0.95rem] font-bold text-white">
              {cfg.title}
            </h3>
          </div>
          {cfg.subtitle && (
            <p className="mt-0.5 truncate text-[0.72rem] text-muted">
              {cfg.subtitle}
            </p>
          )}
        </div>

        {/* Nút upload thử nghiệm nhanh */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title="Chọn video hoặc GIF từ máy"
          className="flex h-7 items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-2 text-[0.65rem] font-semibold text-muted transition-all duration-200 hover:border-white/30 hover:bg-white/10 hover:text-white"
        >
          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <span className="hidden sm:inline">Thay đổi</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*,image/gif,image/webp,image/*"
          className="hidden"
          onChange={handleLocalFileSelect}
        />
      </div>

      {/* Media Player Frame */}
      <div className="relative aspect-video w-full overflow-hidden rounded-card-sm border border-white/[0.08] bg-black/40">
        {!hasError ? (
          isVideo ? (
            <div className="relative h-full w-full">
              <video
                ref={videoRef}
                src={currentSrc}
                poster={cfg.poster}
                autoPlay={cfg.autoPlay ?? true}
                loop={cfg.loop ?? true}
                muted={isMuted}
                playsInline
                onError={() => setHasError(true)}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                className="h-full w-full object-cover object-center"
              />

              {/* Floating Controls Overlay */}
              <div className="absolute inset-0 flex flex-col justify-between bg-gradient-to-t from-black/70 via-transparent to-black/30 p-2.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-transform hover:scale-110"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                    </svg>
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={togglePlay}
                      title={isPlaying ? "Pause" : "Play"}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-zinc-950 shadow-md transition-transform hover:scale-110"
                    >
                      {isPlaying ? (
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                          <rect x="6" y="4" width="4" height="16" />
                          <rect x="14" y="4" width="4" height="16" />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                          <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={toggleMute}
                      title={isMuted ? "Unmute" : "Mute"}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-transform hover:scale-110"
                    >
                      {isMuted ? (
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                        </svg>
                      )}
                    </button>
                  </div>

                  <span className="text-[0.65rem] font-medium uppercase tracking-wider text-white/80">
                    {isPlaying ? "Playing" : "Paused"}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <img
              src={currentSrc}
              alt={cfg.title}
              onError={() => setHasError(true)}
              className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
            />
          )
        ) : (
          /* Placeholder khi chưa có video/gif hoặc lỗi tải file */
          <div className="relative flex h-full w-full flex-col items-center justify-center p-4 text-center">
            {/* Ảnh nền mờ nếu có poster */}
            {cfg.poster && (
              <img
                src={cfg.poster}
                alt="Poster"
                className="absolute inset-0 h-full w-full object-cover opacity-20 blur-sm"
              />
            )}
            <div className="relative z-[1] flex flex-col items-center">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </div>
              <div className="font-display text-[0.82rem] font-bold text-white">
                Sẵn sàng phát Video hoặc GIF
              </div>
              <p className="mt-1 max-w-[260px] text-[0.68rem] leading-relaxed text-muted">
                Đặt tệp vào <code className="rounded bg-white/10 px-1 py-0.5 text-white">public/assets/media/showcase.mp4</code> hoặc nhấn nút <strong>Thay đổi</strong> ở trên.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer / Description / Link */}
      {(cfg.description || cfg.linkUrl) && (
        <div className="mt-3 flex items-center justify-between gap-3 text-[0.78rem]">
          {cfg.description && (
            <p className="line-clamp-2 text-muted text-[0.75rem]">
              {cfg.description}
            </p>
          )}
          {cfg.linkUrl && (
            <a
              href={cfg.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 font-display text-[0.72rem] font-semibold text-white no-underline transition-all duration-200 hover:border-white hover:bg-white hover:text-black"
            >
              {cfg.linkLabel || "Chi tiết →"}
            </a>
          )}
        </div>
      )}
    </div>
  );
}
