"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { projectsConfig } from "@/config/projects.config";
import { ProjectItem } from "@/types";
import { ProjectCard } from "./ProjectCard";
import { cn } from "@/lib/utils";

interface ProjectsShowcaseProps {
  initialProjects?: ProjectItem[];
}

export function ProjectsShowcase({ initialProjects }: ProjectsShowcaseProps = {}) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const projects = initialProjects && initialProjects.length > 0 ? initialProjects : projectsConfig;
  const totalProjects = projects.length;

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

  const handleScroll = useCallback(() => {
    if (!gridRef.current || typeof window === "undefined" || window.innerWidth > 768) return;
    const scrollLeft = gridRef.current.scrollLeft;
    const cardWidth = window.innerWidth;
    if (cardWidth > 0) {
      const newIndex = Math.round(scrollLeft / cardWidth);
      if (newIndex >= 0 && newIndex < totalProjects && newIndex !== currentIndex) {
        setCurrentIndex(newIndex);
      }
    }
  }, [totalProjects, currentIndex]);

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
    <div className="projects-container relative z-[15] mx-auto flex min-h-screen max-w-[1200px] flex-col items-center justify-start px-6 pb-[90px] pt-10 max-md:min-h-[100dvh] max-md:px-0 max-md:pb-[150px] max-md:pt-[60px]">
      <header className="projects-header relative z-[15] mb-10 animate-fade-up text-center max-md:mb-2.5 max-md:px-8">
        <h1 className="mb-2 font-display text-[clamp(2.5rem,8vw,4rem)] font-extrabold text-white drop-shadow-[0_4px_20px_rgba(255,255,255,0.2)] max-md:text-[2.2rem] max-[480px]:text-[1.8rem]">
          PROJECTS
        </h1>
        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-muted">
          Software Engineering &amp; Devops:3
        </p>
      </header>

      {/* Hiển thị Empty State nếu danh sách dự án trống */}
      {totalProjects === 0 ? (
        <div className="my-16 flex flex-col items-center justify-center rounded-panel border border-white/[0.08] bg-white/[0.02] px-8 py-14 text-center shadow-panel backdrop-blur-md">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white">
            <svg
              className="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
          </div>
          <h3 className="font-display text-lg font-bold text-white">
            No Projects Yet
          </h3>
          <p className="mt-1.5 max-w-[280px] text-xs text-muted">
            Dự án đang được chuẩn bị và sẽ sớm được cập nhật.
          </p>
        </div>
      ) : (
        /* Desktop 4-col / Tablet 2-col Grid / Mobile Horizontal Slider */
        <div
          ref={gridRef}
          onScroll={handleScroll}
          style={{ animationDelay: "0.2s" }}
          className={cn(
            "projects-grid no-scrollbar relative z-[2] w-full animate-fade-up",
            "grid grid-cols-4 gap-6 max-xl:grid-cols-2 max-xl:gap-5",
            "max-md:-mt-10 max-md:flex max-md:gap-0 max-md:overflow-x-auto max-md:snap-x max-md:snap-mandatory max-md:scroll-smooth max-md:py-[50px]"
          )}
        >
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      {/* Slider Navigation Controls (Mobile <= 768px - Đặt cao hơn thanh menu dưới để không bị che khuất) */}
      {totalProjects > 0 && (
        <div className="slider-controls fixed bottom-[88px] left-1/2 z-[9990] flex -translate-x-1/2 items-center justify-center gap-3.5 rounded-full border border-white/15 bg-black/75 px-3.5 py-1.5 shadow-[0_12px_30px_rgba(0,0,0,0.6)] backdrop-blur-xl md:hidden">
          <button
            id="project-prev"
            type="button"
            aria-label="Previous Project"
            disabled={currentIndex === 0}
            onClick={() => scrollToSlide(currentIndex - 1)}
            className={cn(
              "slider-btn flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/10 text-white backdrop-blur-md transition-all duration-200 active:scale-90",
              currentIndex === 0 && "pointer-events-none opacity-25"
            )}
          >
            <svg
              className="h-4 w-4 opacity-90"
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

          <div id="project-dots" className="flex items-center gap-2 px-1">
            {projects.map((p, idx) => (
              <button
                key={p.id}
                type="button"
                aria-label={`Go to project ${idx + 1}`}
                onClick={() => scrollToSlide(idx)}
                className={cn(
                  "h-1.5 cursor-pointer rounded-full border-none p-0 transition-all duration-300",
                  idx === currentIndex
                    ? "w-5 bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]"
                    : "w-1.5 bg-white/30"
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
              "slider-btn flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/10 text-white backdrop-blur-md transition-all duration-200 active:scale-90",
              currentIndex === totalProjects - 1 && "pointer-events-none opacity-25"
            )}
          >
            <svg
              className="h-4 w-4 opacity-90"
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
      )}
    </div>
  );
}
