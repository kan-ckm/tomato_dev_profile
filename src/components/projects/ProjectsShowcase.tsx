"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { projectsConfig } from "@/config/projects.config";
import { ProjectCard } from "./ProjectCard";
import { cn } from "@/lib/utils";

export function ProjectsShowcase() {
  const gridRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const totalProjects = projectsConfig.length;

  const scrollToSlide = useCallback(
    (index: number, smooth = true) => {
      if (totalProjects === 0) return;
      const clamped = Math.max(0, Math.min(totalProjects - 1, index));
      setCurrentIndex(clamped);

      if (gridRef.current && typeof window !== "undefined" && window.innerWidth <= 768) {
        gridRef.current.scrollTo({
          left: clamped * window.innerWidth,
          behavior: smooth ? "smooth" : "auto",
        });
      }
    },
    [totalProjects]
  );

  useEffect(() => {
    let resizeTimer: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (window.innerWidth <= 768 && gridRef.current) {
          gridRef.current.scrollTo({
            left: currentIndex * window.innerWidth,
            behavior: "auto",
          });
        }
      }, 250);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      clearTimeout(resizeTimer);
      window.removeEventListener("resize", handleResize);
    };
  }, [currentIndex]);

  return (
    <div className="projects-container relative z-[15] mx-auto flex min-h-screen max-w-[1200px] flex-col items-center justify-start px-6 pb-[60px] pt-10 max-md:min-h-[100dvh] max-md:px-0 max-md:pb-[100px] max-md:pt-[60px]">
      <header className="projects-header relative z-[15] mb-10 animate-fade-up text-center max-md:mb-2.5 max-md:px-8">
        <h1 className="mb-2 bg-gradient-to-br from-white to-accent3 bg-clip-text font-display text-[clamp(2.5rem,8vw,4rem)] font-extrabold text-transparent max-md:text-[2.2rem] max-[480px]:text-[1.8rem]">
          PROJECTS
        </h1>
        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-muted">
          Software Engineering &amp; Creative Coding
        </p>
      </header>

      {/* Desktop 4-col / Tablet 2-col Grid / Mobile Horizontal Slider */}
      <div
        ref={gridRef}
        style={{ animationDelay: "0.2s" }}
        className={cn(
          "projects-grid no-scrollbar relative z-[2] w-full animate-fade-up",
          "grid grid-cols-4 gap-6 max-xl:grid-cols-2 max-xl:gap-5",
          "max-md:-mt-10 max-md:flex max-md:gap-0 max-md:overflow-x-hidden max-md:py-[60px]"
        )}
      >
        {projectsConfig.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>

      {/* Slider Navigation Controls (Mobile <= 768px) */}
      <div className="slider-controls fixed bottom-6 left-1/2 z-[9990] flex -translate-x-1/2 items-center justify-center gap-6 md:hidden">
        <button
          id="project-prev"
          type="button"
          aria-label="Previous Project"
          disabled={currentIndex === 0}
          onClick={() => scrollToSlide(currentIndex - 1)}
          className={cn(
            "slider-btn flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/[0.08] text-white backdrop-blur-md transition-all duration-300 active:scale-90 active:border-accent active:bg-accent/20",
            currentIndex === 0 && "pointer-events-none opacity-30"
          )}
        >
          <svg
            className="h-5 w-5 opacity-80"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div id="project-dots" className="flex items-center gap-2.5">
          {projectsConfig.map((p, idx) => (
            <button
              key={p.id}
              type="button"
              aria-label={`Go to project ${idx + 1}`}
              onClick={() => scrollToSlide(idx)}
              className={cn(
                "h-1.5 w-1.5 cursor-pointer rounded-full border-none p-0 transition-all duration-300",
                idx === currentIndex
                  ? "scale-[1.4] bg-accent shadow-[0_0_10px_rgba(178,137,239,0.5)]"
                  : "bg-white/20"
              )}
            />
          ))}
        </div>

        <button
          id="project-next"
          type="button"
          aria-label="Next Project"
          disabled={currentIndex === totalProjects - 1}
          onClick={() => scrollToSlide(currentIndex + 1)}
          className={cn(
            "slider-btn flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/[0.08] text-white backdrop-blur-md transition-all duration-300 active:scale-90 active:border-accent active:bg-accent/20",
            currentIndex === totalProjects - 1 && "pointer-events-none opacity-30"
          )}
        >
          <svg
            className="h-5 w-5 opacity-80"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
