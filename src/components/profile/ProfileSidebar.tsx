"use client";

import React, { useState } from "react";
import { profileConfig, socialLinks } from "@/config/profile.config";
import { PlayerPanel } from "@/components/player/PlayerPanel";
import { SocialPlatform } from "@/types";
import { cn } from "@/lib/utils";

function SocialIcon({ platform }: { platform: SocialPlatform }) {
  switch (platform) {
    case "discord":
      return (
        <svg className="relative z-[1] h-[18px] w-[18px] scale-[1.3] fill-current" viewBox="0 0 24 24">
          <path d="M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.09.09 0 00-.07.03c-.18.33-.39.76-.53 1.09a16.09 16.09 0 00-4.8 0c-.14-.34-.35-.76-.54-1.09-.01-.02-.04-.03-.07-.03-1.5.26-2.93.71-4.27 1.33-.01 0-.02.01-.03.02-2.72 4.07-3.47 8.03-2.98 11.94 0 .03.01.06.04.08 1.79 1.47 3.48 2.33 5.03 2.91.03.01.06 0 .07-.02.4-.54.76-1.1 1.07-1.7.01-.04 0-.08-.03-.1-.58-.25-1.14-.55-1.66-.87-.03-.02-.04-.05-.02-.08l.33-.26c.01-.01.03-.01.05-.01 3.44 1.56 7.16 1.56 10.56 0 .02 0 .04 0 .05.01l.33.26c.02.03.01.06-.02.08-.52.33-1.08.62-1.66.87-.03.02-.04.06-.03.1.32.6.68 1.16 1.07 1.7.02.02.05.03.07.02 1.56-.58 3.25-1.44 5.03-2.91.03-.02.04-.05.04-.08.54-4.29-.24-8.24-2.98-11.94-.01-.01-.02-.02-.03-.02zM8.52 14.91c-.99 0-1.8-.89-1.8-2s.79-2 1.8-2 1.8.89 1.8 2-.8 2-1.8 2zm6.97 0c-.99 0-1.8-.89-1.8-2s.79-2 1.8-2 1.8.89 1.8 2-.8 2-1.8 2z" />
        </svg>
      );
    case "tiktok":
      return (
        <svg className="relative z-[1] h-[18px] w-[18px] scale-125 fill-current" viewBox="0 0 24 24">
          <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.31 6.31 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.82a8.22 8.22 0 004.81 1.55V6.9a4.85 4.85 0 01-1.04-.21z" />
        </svg>
      );
    case "facebook":
      return (
        <svg className="relative z-[1] h-[18px] w-[18px] fill-current" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      );
    case "paypal":
      return (
        <svg className="relative z-[1] h-[18px] w-[18px] fill-current" viewBox="0 0 24 24">
          <path d="M7.076 21.337H2.47a.641.641 0 01-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 00-.607-.541c1.379 2.3.504 5.232-2.147 7.139-1.853 1.32-4.297 1.97-7.355 1.97h-1.585l-1.228 7.785h3.66c.524 0 .968-.382 1.05-.9l.835-5.292a.641.641 0 01.633-.54h1.174c3.838 0 6.845-1.558 7.725-6.065.344-1.787.046-3.277-.155-3.556z" />
        </svg>
      );
    case "github":
    default:
      return (
        <svg className="relative z-[1] h-[18px] w-[18px] fill-current" viewBox="0 0 24 24">
          <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
        </svg>
      );
  }
}

export function ProfileSidebar() {
  const [avatarSrc, setAvatarSrc] = useState(profileConfig.avatarSrc);
  const [coverFailed, setCoverFailed] = useState(false);

  return (
    <div className="sidebar-wrapper no-scrollbar flex flex-col gap-5 lg:relative lg:h-full lg:max-h-[calc(100vh-60px)] lg:overflow-y-auto">
      <aside
        className={cn(
          "sidebar-section relative transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)]",
          "lg:flex-1 lg:overflow-hidden lg:rounded-panel lg:border lg:border-white/[0.06] lg:bg-white/[0.03] lg:pb-5 lg:shadow-panel lg:backdrop-blur-md"
        )}
      >
        {/* Cover Image */}
        <div
          className={cn(
            "cover relative mx-3 mt-3 h-[220px] overflow-hidden rounded-card border border-border transition-[height] duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] max-[480px]:h-[190px]",
            "lg:!m-0 lg:!h-[180px] lg:!rounded-none lg:!border-0 lg:!border-b lg:!border-border"
          )}
        >
          {!coverFailed ? (
            <img
              className="cover-img h-full w-full origin-left object-cover object-center brightness-50 saturate-[1.4] transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)]"
              src={profileConfig.coverSrc}
              alt="Cover photo"
              width={800}
              height={220}
              fetchPriority="high"
              onError={() => setCoverFailed(true)}
            />
          ) : (
            <div
              className="h-full w-full"
              style={{ background: "linear-gradient(135deg,#18181b,#09090b)" }}
            />
          )}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, rgba(5,5,8,0) 0%, rgba(5,5,8,0.3) 60%, rgba(5,5,8,0.95) 100%)",
            }}
            aria-hidden="true"
          />
          <div className="cover-grid pointer-events-none" aria-hidden="true" />
        </div>

        {/* Profile Avatar & Bio */}
        <div className="profile relative -mt-14 flex flex-col items-center px-6 text-center lg:!px-5">
          <div className="avatar-wrap relative mb-4 h-[108px] w-[108px] transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]">
            <div
              className="avatar-ring absolute -inset-[3px] animate-spin-slow rounded-full"
              style={{
                background:
                  "conic-gradient(from 180deg, #ffffff, #d4d4d8, #71717a, #ffffff)",
              }}
              aria-hidden="true"
            />
            <div
              className="avatar-ring-mask absolute inset-0 rounded-full bg-bg"
              aria-hidden="true"
            />
            <img
              className="avatar-img absolute inset-[2px] h-[calc(100%-4px)] w-[calc(100%-4px)] rounded-full object-cover"
              src={avatarSrc}
              alt={`${profileConfig.username} avatar`}
              width={120}
              height={120}
              onError={() => setAvatarSrc(profileConfig.fallbackAvatarSrc)}
            />
            <div
              className="avatar-status absolute bottom-1 right-1 z-[2] h-4 w-4 rounded-full border-[3px] border-bg bg-[#22c55e] after:absolute after:left-1/2 after:top-1/2 after:-z-10 after:h-full after:w-full after:animate-status-pulse after:rounded-full after:bg-inherit"
              title={profileConfig.statusText}
              aria-label={profileConfig.statusText}
            />
          </div>

          <h1 className="mb-1 max-w-full whitespace-nowrap font-display text-[clamp(1.3rem,8vw,1.75rem)] font-extrabold leading-[1.1] tracking-[-0.02em] text-white drop-shadow-[0_2px_12px_rgba(255,255,255,0.25)]">
            {profileConfig.username}
          </h1>
          <div className="mb-3 text-[0.78rem] font-medium uppercase tracking-[0.12em] text-accent">
            {profileConfig.handle}
          </div>
          <p className="max-w-[min(320px,100%)] text-[0.88rem] font-light leading-[1.65] text-muted">
            {profileConfig.greeting}
            <br />
            <strong className="font-medium text-text">{profileConfig.roleBold}</strong>
            {profileConfig.roleSuffix}
            <br />
            {profileConfig.collabText}{" "}
            <a
              href={profileConfig.discordUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-accent no-underline transition-all duration-200 hover:text-white hover:[text-shadow:0_0_8px_rgba(255,255,255,0.6)]"
            >
              <strong>{profileConfig.discordHandle}</strong>
            </a>
          </p>
        </div>

        {/* Social Links */}
        <nav
          className="socials mx-6 mt-6 flex flex-wrap justify-center gap-2.5 lg:!mx-5 lg:!mt-5"
          aria-label="Social media links"
        >
          {socialLinks.map((social) => (
            <a
              key={social.id}
              id={social.id}
              href={social.url}
              target="_blank"
              rel="noopener noreferrer"
              title={social.title}
              className="group relative flex h-[42px] w-[42px] items-center justify-center overflow-hidden rounded-[10px] border border-border bg-surface text-muted no-underline transition-all duration-250 ease-[cubic-bezier(0.34,1.56,0.64,1)] before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/20 before:to-white/5 before:opacity-0 before:transition-opacity before:duration-250 hover:-translate-y-[3px] hover:scale-[1.08] hover:border-border-hover hover:text-white hover:shadow-[0_8px_24px_rgba(255,255,255,0.2)] hover:before:opacity-100"
            >
              <SocialIcon platform={social.platform} />
            </a>
          ))}
        </nav>
      </aside>

      {/* Desktop Full Music Player */}
      <PlayerPanel className="hidden lg:block" />
    </div>
  );
}
