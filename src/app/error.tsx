"use client";

import React, { useEffect } from "react";
import Link from "next/link";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Application Runtime Error]:", error);
  }, [error]);

  return (
    <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="w-full max-w-[420px] rounded-panel border border-white/10 bg-white/[0.03] p-8 shadow-panel backdrop-blur-xl">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-white">
          <svg
            className="h-6 w-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h2 className="mb-2 font-display text-xl font-bold text-white">
          Something went wrong
        </h2>
        <p className="mb-6 text-xs leading-relaxed text-muted">
          An unexpected runtime error occurred. You can try reloading this view
          or return to the home page.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="cursor-pointer rounded-xl border border-white/20 bg-white px-5 py-2.5 font-display text-xs font-semibold text-black transition-all hover:scale-105"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="rounded-xl border border-white/15 bg-white/[0.06] px-5 py-2.5 font-display text-xs font-semibold text-white no-underline transition-all hover:bg-white/[0.12]"
          >
            Back Home
          </Link>
        </div>
      </div>
    </div>
  );
}
