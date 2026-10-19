"use client";

import React, { useEffect, useRef } from "react";
import { profileConfig } from "@/config/profile.config";

const STRIP_FONTS = [
  "Kablammo",
  "Bungee",
  "Rubik Glitch",
  "Jersey 10 Charted",
  "Griffy",
  "Rubik Maze",
];

interface StripPath {
  rotate: number;
  startX: number;
  endX: number;
  left: string;
  bottom: string;
  top: string;
  right: string;
}

const STRIP_PATHS: StripPath[] = [
  { rotate: -30, startX: -250, endX: 250, left: "0", bottom: "15%", top: "auto", right: "auto" },
  { rotate: 25, startX: -250, endX: 250, left: "0", top: "12%", bottom: "auto", right: "auto" },
  { rotate: -25, startX: 250, endX: -250, right: "0", bottom: "15%", left: "auto", top: "auto" },
  { rotate: 35, startX: 250, endX: -250, left: "50%", top: "10%", bottom: "auto", right: "auto" },
];

function pickFont(): string {
  if (Math.random() < 0.5) return "";
  return STRIP_FONTS[Math.floor(Math.random() * STRIP_FONTS.length)];
}

function pickPath(excludeIndex: number): StripPath {
  const pool =
    excludeIndex >= 0
      ? STRIP_PATHS.filter((_, i) => i !== excludeIndex)
      : STRIP_PATHS;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function BgTextStrip() {
  const mainRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined" || window.innerWidth <= 768) return;

    const mainEl = mainRef.current;
    const shadowEl = shadowRef.current;
    if (!mainEl || !shadowEl) return;

    let mainAnim: Animation | null = null;
    let shadowAnim: Animation | null = null;
    let shadowTimer: ReturnType<typeof setTimeout> | null = null;
    let loopTimer: ReturnType<typeof setTimeout> | null = null;

    const runSingle = (
      el: HTMLDivElement,
      path: StripPath,
      duration: number,
      font: string,
      isShadow: boolean
    ) => {
      if (isShadow && shadowAnim) shadowAnim.cancel();
      if (!isShadow && mainAnim) mainAnim.cancel();

      el.style.left = path.left;
      el.style.right = path.right;
      el.style.top = path.top;
      el.style.bottom = path.bottom;
      el.style.transform = `rotate(${path.rotate}deg) translateX(${path.startX}%)`;
      el.style.opacity = "1";
      el.style.fontFamily = font ? `'${font}', sans-serif` : "";
      el.classList.add("active");

      const anim = el.animate(
        [
          { transform: `rotate(${path.rotate}deg) translateX(${path.startX}%)` },
          { transform: `rotate(${path.rotate}deg) translateX(${path.endX}%)` },
        ],
        { duration, easing: "linear", fill: "forwards" }
      );

      if (isShadow) {
        shadowAnim = anim;
      } else {
        mainAnim = anim;
      }
    };

    const runStrip = () => {
      const mainPath = pickPath(-1);
      const shadowPath = pickPath(STRIP_PATHS.indexOf(mainPath));
      const mainSweep = 6000 + Math.random() * 9000;
      const shadowSweep = mainSweep * 1.3;
      const longest = shadowSweep + 500;
      const cooldown = Math.max(8000, 30000 - longest);
      const font = pickFont();

      runSingle(mainEl, mainPath, mainSweep, font, false);
      shadowTimer = setTimeout(() => {
        runSingle(shadowEl, shadowPath, shadowSweep, font, true);
      }, 500);

      loopTimer = setTimeout(runStrip, longest + cooldown);
    };

    const initialTimer = setTimeout(runStrip, Math.random() * 10000);

    return () => {
      clearTimeout(initialTimer);
      if (shadowTimer) clearTimeout(shadowTimer);
      if (loopTimer) clearTimeout(loopTimer);
      if (mainAnim) mainAnim.cancel();
      if (shadowAnim) shadowAnim.cancel();
    };
  }, []);

  return (
    <div className="bg-text-strip" aria-hidden="true">
      <div ref={mainRef} className="bg-text-strip-inner">
        {profileConfig.username}
      </div>
      <div ref={shadowRef} className="bg-text-strip-inner bg-text-strip-shadow">
        {profileConfig.username}
      </div>
    </div>
  );
}
