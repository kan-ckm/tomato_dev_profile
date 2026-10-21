"use client";

import React from "react";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-[#050508] px-6 text-center text-white">
        <div className="w-full max-w-[400px] rounded-2xl border border-white/10 bg-white/[0.04] p-8 backdrop-blur-xl">
          <h2 className="mb-2 text-lg font-bold">System Recovery</h2>
          <p className="mb-6 text-xs text-zinc-400">
            The interface encountered an unexpected issue and has been safely
            caught.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="cursor-pointer rounded-xl bg-white px-5 py-2.5 text-xs font-semibold text-black"
          >
            Reload Application
          </button>
        </div>
      </body>
    </html>
  );
}
