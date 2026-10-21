"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";

interface VinylDiscProps {
  cover?: string;
  alt?: string;
  isPlaying?: boolean;
  isActive?: boolean;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const SIZE_MAP = {
  xs: "h-7 w-7",
  sm: "h-9 w-9",
  md: "h-11 w-11",
  lg: "h-14 w-14",
  xl: "h-20 w-20",
};

export function VinylDisc({
  cover,
  alt = "Vinyl disc artwork",
  isPlaying = false,
  isActive = false,
  size = "md",
  className,
}: VinylDiscProps) {
  const [imageError, setImageError] = useState(false);

  const shouldSpin = isActive && isPlaying;
  const isPausedState = isActive && !isPlaying;

  return (
    <div
      className={cn(
        "vinyl-disc relative shrink-0 overflow-hidden rounded-full border border-black/40 bg-[#0d0d12] shadow-[0_4px_12px_rgba(0,0,0,0.5)] transition-transform duration-300",
        SIZE_MAP[size],
        shouldSpin && "animate-[spin_4s_linear_infinite]",
        isPausedState && "animate-[spin_4s_linear_infinite] [animation-play-state:paused]",
        className
      )}
      style={{
        // Concentric realistic vinyl micro-grooves
        backgroundImage: `
          radial-gradient(circle at center, transparent 32%, rgba(255,255,255,0.06) 33%, transparent 35%),
          radial-gradient(circle at center, transparent 48%, rgba(255,255,255,0.06) 49%, transparent 51%),
          radial-gradient(circle at center, transparent 65%, rgba(255,255,255,0.07) 66%, transparent 68%),
          radial-gradient(circle at center, transparent 82%, rgba(255,255,255,0.08) 83%, transparent 85%),
          conic-gradient(from 45deg, rgba(255,255,255,0.12) 0deg, transparent 60deg, rgba(255,255,255,0.15) 120deg, transparent 180deg, rgba(255,255,255,0.12) 240deg, transparent 300deg, rgba(255,255,255,0.15) 360deg)
        `,
      }}
      aria-hidden="true"
    >
      {/* Vinyl Outer Edge Ring */}
      <div className="pointer-events-none absolute inset-0 rounded-full border border-white/10" />

      {/* Center Label (Album Cover Artwork) */}
      <div className="absolute inset-[24%] overflow-hidden rounded-full border border-white/20 bg-zinc-900 shadow-[inset_0_0_4px_rgba(0,0,0,0.8)]">
        {cover && !imageError ? (
          <img
            src={cover}
            alt={alt}
            className="h-full w-full object-cover object-center"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-700 via-zinc-800 to-zinc-900 text-white/50">
            <svg className="h-3 w-3 fill-current" viewBox="0 0 24 24">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          </div>
        )}

        {/* Center Spindle Hole ("Lỗ tâm đĩa than") */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[22%] w-[22%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/40 bg-zinc-950 shadow-[0_0_2px_rgba(0,0,0,0.9)]" />
      </div>

      {/* Glossy Sheen overlay across vinyl */}
      <div className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/[0.08] to-transparent" />
    </div>
  );
}
