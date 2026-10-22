import React from "react";
import { profileConfig } from "@/config/site.config";
import { ProfileSidebar } from "@/components/profile/ProfileSidebar";
import { LinkCard } from "@/components/profile/LinkCard";
import { TikTokCard } from "@/components/profile/TikTokCard";
import { MediaShowcase } from "@/components/profile/MediaShowcase";
import { getBioLinks, getMediaShowcaseConfig } from "@/lib/cms";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [links, mediaConfig] = await Promise.all([
    getBioLinks(),
    getMediaShowcaseConfig(),
  ]);

  return (
    <div className="wrapper relative z-[2] mx-auto max-w-[480px] pb-[60px] lg:grid lg:h-screen lg:max-w-[1000px] lg:grid-cols-[minmax(300px,358.4px)_1fr] lg:items-stretch lg:gap-8 lg:px-6 lg:py-[30px]">
      {/* Left Sidebar (Profile + Desktop Full Player) */}
      <ProfileSidebar />

      {/* Right Main Content (Scrollable on Desktop) */}
      <main className="main-content custom-scrollbar lg:h-[calc(100vh-60px)] lg:overflow-y-auto lg:rounded-panel lg:border lg:border-white/[0.05] lg:bg-white/[0.02] lg:pb-[80px] lg:pt-2.5 lg:shadow-[0_10px_30px_rgba(0,0,0,0.15)] lg:backdrop-blur-[5px]">
        {/* Khối 1: Danh sách Liên kết (Links) - Giới hạn chiều cao & Cuộn mượt mà */}
        <div className="section-header mx-6 mb-3 mt-7 flex items-center justify-between gap-2.5 font-display text-[0.7rem] font-bold uppercase tracking-[0.15em] text-muted lg:!mt-5">
          <div className="flex items-center gap-2">
            <span>Links</span>
            <span className="rounded-full border border-white/10 bg-white/[0.05] px-2 py-0.5 text-[0.62rem] font-numeric text-muted">
              {links.length}
            </span>
          </div>
          <span className="h-[1px] flex-1 bg-border" />
          <span className="text-[0.68rem] font-medium lowercase tracking-normal text-muted">
            scroll ↓
          </span>
        </div>

        <div className="links custom-scrollbar mx-6 flex max-h-[265px] flex-col gap-2 overflow-y-auto pr-1.5 py-1">
          {links.map((link, index) => (
            <LinkCard key={link.id} link={link} index={index} />
          ))}
        </div>

        {/* Khối 2: Khối GIF / Video tùy ý (xếp ở dưới khối link theo hàng dọc) */}
        <div
          className="section-label mx-6 mb-3 mt-7 flex items-center gap-2.5 font-display text-[0.7rem] font-bold uppercase tracking-[0.15em] text-muted after:h-[1px] after:flex-1 after:bg-border"
          aria-label="GIF and Video"
        >
          Media
        </div>

        <div className="media-container px-6">
          <MediaShowcase config={mediaConfig} />
        </div>

        {/* Section Divider */}
        <div
          className="section-divider mx-6 my-8 flex items-center gap-4 opacity-80"
          aria-hidden="true"
        >
          <span
            className="h-[1px] flex-1"
            style={{
              background:
                "linear-gradient(90deg, transparent, var(--border) 20%, var(--border) 80%, transparent)",
            }}
          />
          <div className="relative h-[7px] w-[7px] rounded-full bg-accent shadow-[0_0_10px_rgba(255,255,255,0.8)] after:absolute after:left-1/2 after:top-1/2 after:h-[18px] after:w-[18px] after:-translate-x-1/2 after:-translate-y-1/2 after:animate-[spinRing_8s_linear_infinite] after:rounded-full after:border-[1.5px] after:border-dashed after:border-accent/35" />
          <span
            className="h-[1px] flex-1"
            style={{
              background:
                "linear-gradient(90deg, transparent, var(--border) 20%, var(--border) 80%, transparent)",
            }}
          />
        </div>

        {/* TikTok Stats Card */}
        <TikTokCard />

        {/* Footer */}
        <footer className="bio-footer mt-10 text-center text-[0.72rem] tracking-[0.06em] text-muted lg:!mt-[30px]">
          <p>
            {profileConfig.footer.text}{" "}
            <a
              href={profileConfig.footer.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent no-underline"
            >
              {profileConfig.footer.author}
            </a>
          </p>
        </footer>
      </main>
    </div>
  );
}
