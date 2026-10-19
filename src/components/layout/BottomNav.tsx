"use client";

import React, { useEffect, useState } from "react";
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
        className="h-[22px] w-[22px] stroke-current lg:hidden"
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
        className="h-[22px] w-[22px] stroke-current lg:hidden"
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
  {
    href: "/clock",
    label: "Clock",
    icon: (
      <svg
        className="h-[22px] w-[22px] stroke-current lg:hidden"
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
];

export function BottomNav() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const handleDocumentClick = () => {
      setExpanded(false);
    };
    document.addEventListener("click", handleDocumentClick);
    return () => document.removeEventListener("click", handleDocumentClick);
  }, []);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/" || pathname === "/index.html";
    return pathname.startsWith(href);
  };

  return (
    <nav
      id="bottom-nav"
      aria-label="Main Navigation"
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "bottom-nav fixed bottom-6 left-3.5 z-[9998] flex items-center overflow-hidden rounded-[18px] border border-white/[0.08] bg-[rgba(15,15,20,0.35)] shadow-[0_15px_40px_rgba(0,0,0,0.4)] backdrop-blur-md transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]",
        "max-lg:flex-col-reverse",
        expanded
          ? "gap-2 max-lg:max-h-[400px] max-lg:max-w-[54px] max-lg:p-0 lg:max-h-[54px] lg:max-w-[500px] lg:pr-3"
          : "gap-0 max-h-[54px] max-w-[54px] p-0"
      )}
    >
      <button
        id="nav-toggle"
        type="button"
        aria-label="Toggle Menu"
        onClick={(e) => {
          e.stopPropagation();
          setExpanded((prev) => !prev);
        }}
        className="relative z-[2] flex h-[54px] w-[54px] shrink-0 cursor-pointer items-center justify-center rounded-[18px] border-none bg-transparent transition-colors duration-300 hover:bg-white/[0.08]"
      >
        <div className="relative flex h-[14px] w-5 flex-col justify-between">
          <span
            className={cn(
              "h-[2px] w-full rounded-[2px] bg-accent transition-all duration-300",
              expanded && "translate-y-[6px] rotate-45"
            )}
          />
          <span
            className={cn(
              "h-[2px] w-full rounded-[2px] bg-accent transition-all duration-300",
              expanded && "-translate-x-2.5 opacity-0"
            )}
          />
          <span
            className={cn(
              "h-[2px] w-full rounded-[2px] bg-accent transition-all duration-300",
              expanded && "-translate-y-[6px] -rotate-45"
            )}
          />
        </div>
      </button>

      <div
        className={cn(
          "flex whitespace-nowrap transition-all duration-300",
          "max-lg:w-full max-lg:flex-col max-lg:items-center max-lg:gap-2.5 lg:gap-2",
          expanded
            ? "pointer-events-auto translate-x-0 translate-y-0 opacity-100"
            : "pointer-events-none opacity-0 max-lg:translate-y-5 lg:-translate-x-5"
        )}
      >
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              onClick={() => setExpanded(false)}
              className={cn(
                "nav-item relative flex items-center justify-center gap-2 font-display text-xs font-semibold uppercase tracking-[0.05em] no-underline transition-all duration-300",
                "max-lg:h-[54px] max-lg:w-[54px] max-lg:rounded-[18px] max-lg:p-0 lg:rounded-xl lg:px-[18px] lg:py-2.5",
                active
                  ? "text-white bg-transparent [&_svg]:drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] lg:after:absolute lg:after:bottom-1.5 lg:after:left-1/2 lg:after:h-[2px] lg:after:w-3.5 lg:after:-translate-x-1/2 lg:after:rounded-[10px] lg:after:bg-white lg:after:shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                  : "text-muted hover:bg-white/[0.08] hover:text-white"
              )}
            >
              {item.icon}
              <span className="max-lg:hidden">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
