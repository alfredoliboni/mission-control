"use client";

import { useEffect } from "react";
import Link from "next/link";

export function ErrorPage({
  error,
  reset,
  homeHref = "/",
  logTag = "Error",
}: {
  error: Error & { digest?: string };
  reset: () => void;
  homeHref?: string;
  logTag?: string;
}) {
  useEffect(() => {
    console.error(`[${logTag}]`, error);
  }, [error, logTag]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center space-y-4">
        <div className="text-4xl">&#x26A0;</div>
        <h2 className="text-lg font-bold text-foreground font-heading">
          Something went wrong
        </h2>
        <p className="text-sm text-muted-foreground">
          {error.message || "An unexpected error occurred. Please try again."}
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground/60">Error ID: {error.digest}</p>
        )}
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={reset}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Try Again
          </button>
          <Link
            href={homeHref}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-border text-foreground hover:bg-muted/50 transition-colors"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
