"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface NavItemConfig {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItemConfig[] = [
  {
    href: "/",
    label: "Overview",
    icon: (
      <svg
        className="h-[18px] w-[18px] stroke-current"
        viewBox="0 0 24 24"
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    href: "/projects",
    label: "Projects",
    icon: (
      <svg
        className="h-[18px] w-[18px] stroke-current"
        viewBox="0 0 24 24"
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </svg>
    ),
  },
  /*
  {
    href: "/clock",
    label: "Clock",
    icon: (
      <svg
        className="h-[18px] w-[18px] stroke-current"
        viewBox="0 0 24 24"
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  */
];

export function BottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/" || pathname === "/index.html";
    return pathname.startsWith(href);
  };

  return (
    <nav
      id="bottom-nav"
      aria-label="Main Navigation"
      className="bottom-nav fixed bottom-6 left-4 z-[9998] flex items-center gap-1.5 rounded-full border border-white/15 bg-black/70 p-1.5 shadow-[0_15px_35px_rgba(0,0,0,0.5),0_0_20px_rgba(255,255,255,0.06)] backdrop-blur-xl transition-all duration-300 md:left-1/2 md:-translate-x-1/2"
    >
      {NAV_ITEMS.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            className={cn(
              "nav-item relative flex items-center gap-2 rounded-full px-3.5 py-2 font-display text-[0.8rem] font-semibold tracking-[0.03em] no-underline transition-all duration-200",
              active
                ? "bg-white text-black shadow-[0_2px_12px_rgba(255,255,255,0.35)]"
                : "text-muted hover:bg-white/10 hover:text-white"
            )}
          >
            {item.icon}
            <span className="font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
