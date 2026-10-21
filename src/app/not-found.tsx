import React from "react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 pb-24 text-center">
      <div className="w-full max-w-[420px] rounded-panel border border-white/10 bg-white/[0.03] p-8 shadow-panel backdrop-blur-xl">
        <div className="mb-2 font-display text-5xl font-extrabold tracking-tight text-white drop-shadow-[0_2px_12px_rgba(255,255,255,0.25)]">
          404
        </div>
        <h2 className="mb-2 font-display text-lg font-bold text-white">
          Page Not Found
        </h2>
        <p className="mb-6 text-xs leading-relaxed text-muted">
          The page you are looking for doesn&apos;t exist or is currently
          unavailable.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white px-6 py-2.5 font-display text-xs font-semibold text-black no-underline transition-all duration-200 hover:scale-105 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]"
        >
          Return to Profile
        </Link>
      </div>
    </div>
  );
}
