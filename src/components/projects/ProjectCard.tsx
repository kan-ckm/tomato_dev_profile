import React from "react";
import { ProjectBadgeType, ProjectGlowVariant, ProjectItem } from "@/types";
import { cn } from "@/lib/utils";

function PlatformBadgeIcon({ type }: { type: ProjectBadgeType }) {
  if (type === "proxy") {
    return (
      <svg className="h-3 w-3 fill-current" viewBox="0 0 24 24" fill="none">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M3.5155 15.7248C3.78702 15.7062 4.13391 15.7059 4.63158 15.7059H19.3684C19.8661 15.7059 20.213 15.7062 20.4845 15.7248C20.7513 15.7431 20.9067 15.7774 21.0253 15.8268C21.4122 15.988 21.7196 16.2972 21.8798 16.6863C21.9289 16.8056 21.963 16.9619 21.9812 17.2303C21.9997 17.5034 22 17.8523 22 18.3529C22 18.8535 21.9997 19.2025 21.9812 19.4756C21.963 19.744 21.9289 19.9002 21.8798 20.0196C21.7196 20.4087 21.4122 20.7179 21.0253 20.8791C20.9067 20.9285 20.7513 20.9628 20.4845 20.9811C20.213 20.9997 19.8661 21 19.3684 21H4.63158C4.13391 21 3.78702 20.9997 3.5155 20.9811C3.2487 20.9628 3.09333 20.9285 2.97471 20.8791C2.58782 20.7179 2.28044 20.4087 2.12019 20.0196C2.07105 19.9002 2.03701 19.744 2.01881 19.4756C2.00028 19.2025 2 18.8535 2 18.3529C2 17.8523 2.00028 17.5034 2.01881 17.2303C2.03701 16.9619 2.07105 16.8056 2.12019 16.6863C2.28044 16.2972 2.58782 15.988 2.97471 15.8268C3.09333 15.7774 3.2487 15.7431 3.5155 15.7248ZM4.63158 19.4118C5.21293 19.4118 5.68421 18.9377 5.68421 18.3529C5.68421 17.7682 5.21293 17.2941 4.63158 17.2941C4.05023 17.2941 3.57895 17.7682 3.57895 18.3529C3.57895 18.9377 4.05023 19.4118 4.63158 19.4118Z"
          fill="currentColor"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M4.63158 8.29412C4.13391 8.29412 3.78702 8.29383 3.5155 8.2752C3.2487 8.25689 3.09333 8.22265 2.97471 8.17322C2.58782 8.01202 2.28044 7.70284 2.12019 7.31367C2.07105 7.19435 2.03701 7.03807 2.01881 6.7697C2.00028 6.49658 2 6.14765 2 5.64706C2 5.14647 2.00028 4.79753 2.01881 4.52441C2.03701 4.25605 2.07105 4.09977 2.12019 3.98044C2.28044 3.59128 2.58782 3.28209 2.97471 3.1209C3.09333 3.07147 3.2487 3.03723 3.5155 3.01892C3.78702 3.00029 4.13391 3 4.63158 3H19.3684C19.8661 3 20.213 3.00029 20.4845 3.01892C20.7513 3.03723 20.9067 3.07147 21.0253 3.1209C21.4122 3.28209 21.7196 3.59128 21.8798 3.98044C21.9289 4.09977 21.963 4.25605 21.9812 4.52441C21.9997 4.79753 22 5.14647 22 5.64706C22 6.14765 21.9997 6.49658 21.9812 6.7697C21.963 7.03807 21.9289 7.19435 21.8798 7.31367C21.7196 7.70284 21.4122 8.01202 21.0253 8.17322C20.9067 8.22265 20.7513 8.25689 20.4845 8.2752C20.213 8.29383 19.8661 8.29412 19.3684 8.29412H4.63158ZM4.63158 9.35294C4.13391 9.35294 3.78702 9.35323 3.5155 9.37186C3.2487 9.39017 3.09333 9.42441 2.97471 9.47384C2.58782 9.63503 2.28044 9.94422 2.12019 10.3334C2.07105 10.4527 2.03701 10.609 2.01881 10.8774C2.00028 11.1505 2 11.4994 2 12C2 12.5006 2.00028 12.8495 2.01881 13.1226C2.03701 13.391 2.07105 13.5473 2.12019 13.6666C2.28044 14.0558 2.58782 14.365 2.97471 14.5262C3.09333 14.5756 3.2487 14.6098 3.5155 14.6281C3.78702 14.6468 4.13391 14.6471 4.63158 14.6471H19.3684C19.8661 14.6471 20.213 14.6468 20.4845 14.6281C20.7513 14.6098 20.9067 14.5756 21.0253 14.5262C21.4122 14.365 21.7196 14.0558 21.8798 13.6666C21.9289 13.5473 21.963 13.391 21.9812 13.1226C21.9997 12.8495 22 12.5006 22 12C22 11.4994 21.9997 11.1505 21.9812 10.8774C21.963 10.609 21.9289 10.4527 21.8798 10.3334C21.7196 9.94422 21.4122 9.63503 21.0253 9.47384C20.9067 9.42441 20.7513 9.39017 20.4845 9.37186C20.213 9.35323 19.8661 9.35294 19.3684 9.35294H4.63158ZM5.68421 12C5.68421 12.5848 5.21293 13.0588 4.63158 13.0588C4.05023 13.0588 3.57895 12.5848 3.57895 12C3.57895 11.4152 4.05023 10.9412 4.63158 10.9412C5.21293 10.9412 5.68421 11.4152 5.68421 12ZM4.63158 6.70588C5.21293 6.70588 5.68421 6.23183 5.68421 5.64706C5.68421 5.06229 5.21293 4.58824 4.63158 4.58824C4.05023 4.58824 3.57895 5.06229 3.57895 5.64706C3.57895 6.23183 4.05023 6.70588 4.63158 6.70588Z"
          fill="currentColor"
        />
      </svg>
    );
  }
  if (type === "android") {
    return (
      <svg className="h-3 w-3 fill-current" viewBox="0 0 32 32">
        <path
          d="M23.35 12.653l2.496-4.323c0.044-0.074 0.070-0.164 0.070-0.26 0-0.287-0.232-0.519-0.519-0.519-0.191 0-0.358 0.103-0.448 0.257l-0.001 0.002-2.527 4.377c-1.887-0.867-4.094-1.373-6.419-1.373s-4.532 0.506-6.517 1.413l0.098-0.040-2.527-4.378c-0.091-0.156-0.259-0.26-0.45-0.26-0.287 0-0.519 0.232-0.519 0.519 0 0.096 0.026 0.185 0.071 0.262l-0.001-0.002 2.496 4.323c-4.286 2.367-7.236 6.697-7.643 11.744l-0.003 0.052h29.991c-0.41-5.099-3.36-9.429-7.57-11.758l-0.076-0.038zM9.098 20.176c-0 0-0 0-0 0-0.69 0-1.249-0.559-1.249-1.249s0.559-1.249 1.249-1.249c0.69 0 1.249 0.559 1.249 1.249v0c-0.001 0.689-0.559 1.248-1.249 1.249h-0zM22.902 20.176c-0 0-0 0-0 0-0.69 0-1.249-0.559-1.249-1.249s0.559-1.249 1.249-1.249c0.69 0 1.249 0.559 1.249 1.249v0c-0.001 0.689-0.559 1.248-1.249 1.249h-0z"
          fill="currentColor"
        />
      </svg>
    );
  }
  return (
    <svg className="h-3 w-3 fill-current" viewBox="0 0 24 24">
      <path
        d="M15,20 C15.5523,20 16,20.4477 16,21 C16,21.5523 15.5523,22 15,22 L9,22 C8.44772,22 8,21.5523 8,21 C8,20.4477 8.44772,20 9,20 L15,20 Z M15,2 C15.51285,2 15.9355092,2.38604429 15.9932725,2.88337975 L16,3 L16,6 L18,6 C19.0543909,6 19.9181678,6.81587733 19.9945144,7.85073759 L20,8 L20,13 C20,16.2383886 17.434417,18.8775714 14.2249377,18.9958615 L14,19 L10,19 C6.76160159,19 4.12242817,16.434417 4.00413847,13.2249377 L4,13 L4,8 C4,6.94563773 4.81587733,6.08183483 5.85073759,6.00548573 L6,6 L8,6 L8,3 C8,2.44772 8.44772,2 9,2 C9.51283143,2 9.93550653,2.38604429 9.9932722,2.88337975 L10,3 L10,6 L14,6 L14,3 C14,2.44772 14.4477,2 15,2 Z"
        fill="currentColor"
      />
    </svg>
  );
}

const GLOW_CLASS_MAP: Record<ProjectGlowVariant, string> = {
  freesia: "glow-freesia",
  ecolens: "glow-ecolens",
  sudden: "glow-sudden",
  orbital: "glow-orbital",
};

const BADGE_HOVER_CLASS_MAP: Record<ProjectBadgeType, string> = {
  android:
    "group-hover:border-[#3DDC84]/30 group-hover:bg-[#3DDC84]/10 group-hover:text-[#3DDC84]",
  plugin:
    "group-hover:border-[#ff9f43]/30 group-hover:bg-[#ff9f43]/10 group-hover:text-[#ff9f43]",
  proxy:
    "group-hover:border-white/20 group-hover:bg-[linear-gradient(90deg,rgba(0,162,211,0.15),rgba(212,160,23,0.15))] group-hover:text-white",
};

export function ProjectCard({ project }: { project: ProjectItem }) {
  return (
    <div
      className={cn(
        "project-card group relative flex h-full flex-col overflow-hidden rounded-panel border border-white/[0.05] bg-white/[0.02] px-6 py-8 shadow-[0_10px_30px_rgba(0,0,0,0.15)] backdrop-blur-[5px] transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]",
        "before:pointer-events-none before:absolute before:inset-0 before:z-[6] before:bg-gradient-to-br before:from-accent before:to-transparent before:opacity-0 before:transition-opacity before:duration-500",
        "md:hover:-translate-y-3 md:hover:border-border-hover md:hover:shadow-[0_30px_60px_rgba(0,0,0,0.4),0_0_20px_rgba(255,255,255,0.15)] md:hover:before:opacity-[0.08]",
        "max-md:mx-[16vw] max-md:max-h-[50vh] max-md:min-h-[360px] max-md:w-[68vw] max-md:shrink-0 max-md:items-center max-md:justify-between max-md:px-5 max-md:pb-5 max-md:pt-6 max-md:text-center",
        "max-[480px]:mx-[15vw] max-[480px]:min-h-[340px] max-[480px]:w-[70vw] max-[480px]:px-4 max-[480px]:pb-4 max-[480px]:pt-6"
      )}
    >
      {/* Platform Badge */}
      <div
        className={cn(
          "platform-badge absolute right-6 top-6 z-[8] flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.05] px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-[0.08em] text-muted transition-all duration-300",
          "max-md:right-4 max-md:top-4 max-md:px-2.5 max-md:py-1 max-md:text-[0.55rem]",
          BADGE_HOVER_CLASS_MAP[project.badgeType]
        )}
      >
        <PlatformBadgeIcon type={project.badgeType} />
        {project.badgeLabel}
      </div>

      {/* Project Icon + Morphing Glow */}
      <div className="project-icon relative z-[7] mb-[30px] flex h-[90px] w-[90px] items-center justify-center max-md:mb-3 max-md:h-16 max-md:w-16">
        <div className={cn("icon-glow", GLOW_CLASS_MAP[project.glowVariant])} />
        <img
          src={project.iconSrc}
          alt={`${project.title} Icon`}
          className="relative z-[7] block h-[90%] w-[90%] rounded-full object-cover"
        />
      </div>

      {/* Content */}
      <div className="project-content relative z-[7] flex-1">
        <h3 className="mb-3 font-display text-[1.45rem] font-bold tracking-[-0.01em] text-white max-md:mb-2.5 max-md:text-[1.2rem]">
          {project.title}
        </h3>
        <p className="project-desc mb-6 line-clamp-4 text-[0.9rem] font-light leading-[1.7] text-muted max-md:mb-3 max-md:line-clamp-3 max-md:text-[0.82rem] max-md:leading-[1.4] max-md:text-[rgba(240,237,247,0.4)]">
          {project.description}
        </p>
      </div>

      {/* Language Tags */}
      <div className="project-meta relative z-[7] mb-7 flex flex-wrap items-center gap-2 max-md:mb-4 max-md:justify-center max-md:gap-1.5">
        {project.languages.map((lang) => (
          <span
            key={lang}
            className="lang-tag rounded-lg border border-accent/15 bg-accent/10 px-3 py-[5px] text-[0.6rem] font-extrabold uppercase tracking-[0.05em] text-accent transition-all duration-300"
          >
            {lang}
          </span>
        ))}
      </div>

      {/* Repository Link Button */}
      <a
        href={project.repoUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="repo-btn relative z-[7] flex items-center justify-center gap-2.5 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-3.5 font-display text-[0.85rem] font-semibold text-white no-underline transition-all duration-300 hover:scale-[1.02] hover:border-accent hover:bg-white/[0.12] hover:text-white hover:shadow-[0_0_20px_rgba(255,255,255,0.25)] max-md:w-full max-md:rounded-xl max-md:p-3 max-md:text-[0.8rem]"
      >
        View Repository
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="7" y1="17" x2="17" y2="7" />
          <polyline points="7 7 17 7 17 17" />
        </svg>
      </a>
    </div>
  );
}
