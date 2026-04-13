"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function TeamError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[TeamError]", error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-sm p-8 text-center">
        <div
          className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/8"
          aria-hidden="true"
        >
          <span className="text-2xl">⚠️</span>
        </div>
        <h2 className="font-heading text-xl font-semibold text-foreground mb-2">
          Something went wrong
        </h2>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          {error.message || "We hit a snag loading the Care Team portal. Please try again."}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto h-11 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="w-full sm:w-auto h-11 px-6 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Go Home
          </Link>
        </div>
        {error.digest && (
          <p className="mt-4 text-[11px] text-muted-foreground">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
