"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[RootError]", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#faf9f6] px-4">
      <div className="w-full max-w-md bg-[#fefefe] border border-[#e7e5e0] rounded-xl shadow-sm p-8 text-center">
        <div
          className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#fef3ed]"
          aria-hidden="true"
        >
          <span className="text-2xl">⚠️</span>
        </div>
        <h1
          className="text-xl font-semibold text-[#2d2d2d] mb-2"
          style={{ fontFamily: "var(--font-heading), system-ui, sans-serif" }}
        >
          Something went wrong
        </h1>
        <p className="text-sm text-[#78716c] mb-6 leading-relaxed">
          {error.message || "An unexpected error occurred. Please try again."}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto h-11 px-6 rounded-lg bg-[#c96442] text-white text-sm font-medium hover:bg-[#b5573a] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c96442] focus-visible:ring-offset-2"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="w-full sm:w-auto h-11 px-6 rounded-lg border border-[#e7e5e0] text-sm font-medium text-[#2d2d2d] hover:bg-[#f3f1ec] transition-colors inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c96442] focus-visible:ring-offset-2"
          >
            Go Home
          </Link>
        </div>
        {error.digest && (
          <p className="mt-4 text-[11px] text-[#78716c]">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
