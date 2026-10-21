"use client";

import React, { useEffect, useRef, useState } from "react";
import { mediaBlockConfig, MediaBlockConfig } from "@/config/media.config";
import { cn } from "@/lib/utils";

interface MediaShowcaseProps {
  config?: Partial<MediaBlockConfig>;
  className?: string;
}

function checkIsVideo(src: string, type?: "auto" | "video" | "gif"): boolean {
  if (type === "video") return true;
  if (type === "gif") return false;
  if (!src) return false;
  const clean = src.split("?")[0].toLowerCase();
  return (
    clean.endsWith(".mp4") ||
    clean.endsWith(".webm") ||
    clean.endsWith(".mov") ||
    clean.endsWith(".ogg")
  );
}

export function MediaShowcase({ config: customConfig, className }: MediaShowcaseProps) {
  const cfg = { ...mediaBlockConfig, ...customConfig };
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    setHasError(false);
  }, [cfg.src]);

  const isVideo = checkIsVideo(cfg.src, cfg.type);

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

  const getAspectClass = () => {
    switch (cfg.aspectRatio) {
      case "4/3":
        return "aspect-[4/3]";
      case "1/1":
        return "aspect-square";
      case "auto":
        return "aspect-auto min-h-[180px]";
      case "16/9":
      default:
        return "aspect-video";
    }
  };

  const content = (
    <div
      className={cn(
        "media-block group relative flex w-full flex-col overflow-hidden rounded-panel border border-white/[0.08] bg-white/[0.02] p-3.5 shadow-[0_10px_30px_rgba(0,0,0,0.2)] backdrop-blur-md transition-all duration-300 hover:border-white/20",
        cfg.linkUrl && "cursor-pointer hover:bg-white/[0.04]",
        className
      )}
    >
      {/* Tiêu đề khối (nếu có cấu hình) */}
      {cfg.title && (
        <div className="mb-2.5 flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]" />
            <h4 className="font-display text-[0.82rem] font-bold text-white">
              {cfg.title}
            </h4>
          </div>
          {cfg.linkUrl && (
            <span className="text-[0.68rem] text-muted transition-colors group-hover:text-white">
              ↗
            </span>
          )}
        </div>
      )}

      {/* Khung chứa GIF hoặc Video */}
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-card-sm border border-white/[0.08] bg-black/40",
          getAspectClass()
        )}
      >
        {cfg.src && !hasError ? (
          isVideo ? (
            <div
              className="relative h-full w-full"
              onClick={(e) => {
                if (!cfg.linkUrl) {
                  e.preventDefault();
                  togglePlay();
                }
              }}
            >
              <video
                ref={videoRef}
                src={cfg.src}
                autoPlay={cfg.autoPlay ?? true}
                loop={cfg.loop ?? true}
                muted={cfg.muted ?? true}
                playsInline
                onError={() => setHasError(true)}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                className="h-full w-full object-cover object-center"
              />

              {/* Icon play/pause nhẹ khi click trên video (nếu không có linkUrl) */}
              {!cfg.linkUrl && (
                <div
                  className={cn(
                    "pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity duration-200",
                    isPlaying ? "opacity-0 group-hover:opacity-100" : "opacity-100"
                  )}
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-black shadow-md backdrop-blur-sm transition-transform group-hover:scale-110">
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
                  </div>
                </div>
              )}
            </div>
          ) : (
            <img
              src={cfg.src}
              alt={cfg.title || "Showcase GIF"}
              onError={() => setHasError(true)}
              className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
            />
          )
        ) : (
          /* Placeholder hiển thị hướng dẫn khi chưa có tệp hoặc tệp bị lỗi */
          <div className="flex h-full w-full flex-col items-center justify-center p-4 text-center">
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white">
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
            </div>
            <p className="font-display text-[0.78rem] font-medium text-white">
              Khối GIF / Video
            </p>
            <p className="mt-1 text-[0.68rem] text-muted">
              Nhập đường dẫn trong <code className="text-white">src/config/media.config.ts</code>
            </p>
          </div>
        )}
      </div>

      {/* Phụ đề / chú thích (nếu có cấu hình) */}
      {cfg.subtitle && (
        <div className="mt-2.5 px-1 text-[0.72rem] text-muted">
          {cfg.subtitle}
        </div>
      )}
    </div>
  );

  // Nếu có linkUrl thì bọc thẻ <a>, ngược lại hiển thị div thông thường
  if (cfg.linkUrl) {
    return (
      <a
        href={cfg.linkUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block no-underline"
      >
        {content}
      </a>
    );
  }

  return content;
}
