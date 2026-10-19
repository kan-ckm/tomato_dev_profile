"use client";

import React, { useEffect, useState } from "react";
import { profileConfig } from "@/config/profile.config";
import { formatShort } from "@/lib/utils";
import { TikTokStatsResponse } from "@/types";

const STATS_URL = "/api/tiktok-stats";
const CACHE_KEY = "tt_stats_cache";
const CACHE_TTL = 30 * 60 * 1000; // 30 phút

export function TikTokCard() {
  const [followers, setFollowers] = useState<string>(() =>
    formatShort(profileConfig.tiktok.fallbackFollowers)
  );
  const [likes, setLikes] = useState<string>(() =>
    formatShort(profileConfig.tiktok.fallbackLikes)
  );
  const [avatarSrc, setAvatarSrc] = useState(profileConfig.avatarSrc);

  useEffect(() => {
    let isMounted = true;

    // 1. Đọc cache từ localStorage nếu còn hạn
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed.followers === "number") {
          setFollowers(formatShort(parsed.followers));
          setLikes(formatShort(parsed.likes));
          if (Date.now() - parsed.timestamp < CACHE_TTL) {
            return;
          }
        }
      }
    } catch {
      // Bỏ qua lỗi đọc cache
    }

    // 2. Gọi API /api/tiktok-stats để cập nhật số liệu mới nhất
    fetch(STATS_URL)
      .then((res) => res.json())
      .then((data: TikTokStatsResponse) => {
        if (!isMounted) return;
        const fRaw = data.followers_raw || profileConfig.tiktok.fallbackFollowers;
        const lRaw = data.likes_raw || profileConfig.tiktok.fallbackLikes;

        setFollowers(formatShort(fRaw));
        setLikes(formatShort(lRaw));

        try {
          localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({
              followers: fRaw,
              likes: lRaw,
              timestamp: Date.now(),
            })
          );
        } catch {
          // Bỏ qua nếu đầy bộ nhớ localStorage
        }
      })
      .catch(() => {
        // Giữ nguyên giá trị fallback nếu mất mạng
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div
      id="tiktok-card"
      style={{ animationDelay: "0.1s" }}
      className="tiktok-card mx-6 mt-5 animate-fade-up overflow-hidden rounded-card-sm border border-border bg-surface transition-all duration-250 hover:border-[rgba(105,185,242,0.35)] hover:shadow-[0_0_32px_rgba(105,185,242,0.08)]"
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border bg-black/20 px-4 py-2.5">
        <div className="flex items-center text-white">
          <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
            <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.31 6.31 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.82a8.22 8.22 0 004.81 1.55V6.9a4.85 4.85 0 01-1.04-.21z" />
          </svg>
        </div>
        <span className="font-display text-[0.72rem] font-bold uppercase tracking-[0.12em] text-muted">
          TikTok
        </span>
      </div>

      {/* Body */}
      <div className="flex items-center gap-4 px-4 pb-3.5 pt-[18px]">
        <img
          className="h-[58px] w-[58px] shrink-0 rounded-full border-2 border-[rgba(105,185,242,0.3)] object-cover"
          src={avatarSrc}
          alt="TikTok Avatar"
          onError={() => setAvatarSrc(profileConfig.fallbackAvatarSrc)}
        />
        <div className="min-w-0 flex-1">
          <div className="mb-0.5 truncate font-display text-[0.95rem] font-bold text-text">
            {profileConfig.tiktok.displayName}
          </div>
          <div className="mb-2 text-[0.72rem] text-muted">
            {profileConfig.tiktok.handle}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex flex-col gap-[1px]">
              <span
                id="tt-followers"
                className="font-numeric text-[1.1rem] font-bold leading-none tracking-[-0.01em] tabular-nums text-white"
              >
                {followers}
              </span>
              <span className="mt-[1px] text-[0.62rem] font-medium uppercase tracking-[0.08em] text-muted">
                Followers
              </span>
            </div>
            <div className="h-7 w-[1px] self-center bg-border" />
            <div className="flex flex-col gap-[1px]">
              <span
                id="tt-likes"
                className="font-numeric text-[1.1rem] font-bold leading-none tracking-[-0.01em] tabular-nums text-white"
              >
                {likes}
              </span>
              <span className="mt-[1px] text-[0.62rem] font-medium uppercase tracking-[0.08em] text-muted">
                Likes
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Follow Button */}
      <a
        href={profileConfig.tiktok.followUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="relative mx-4 mb-4 flex w-[calc(100%-32px)] items-center justify-center gap-2 overflow-hidden rounded-lg border border-white/[0.12] bg-gradient-to-br from-[#010101] to-[#1a1a1a] px-4 py-2.5 font-display text-[0.82rem] font-semibold tracking-[0.04em] text-white no-underline transition-all duration-200 hover:-translate-y-[1px] hover:border-[rgba(105,185,242,0.4)] hover:shadow-[0_6px_20px_rgba(105,185,242,0.15)]"
      >
        Follow on TikTok
      </a>
    </div>
  );
}
