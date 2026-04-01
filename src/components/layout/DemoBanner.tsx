"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { useAppStore } from "@/store/appStore";

export function DemoBanner() {
  const { isDemo } = useAppStore();
  const [dismissed, setDismissed] = useState(false);

  if (!isDemo || dismissed) return null;

  return (
    <div
      className="bg-status-caution/15 border-b border-status-caution/30 px-4 py-2 flex items-center justify-between text-sm"
      role="status"
    >
      <p className="text-warm-500">
        <span className="font-medium">Demo Mode</span> — Viewing sample data
        for Alex Santos
      </p>
      <button
        onClick={() => setDismissed(true)}
        className="p-1 rounded hover:bg-status-caution/20 transition-colors"
        aria-label="Dismiss demo banner"
      >
        <X className="h-4 w-4 text-warm-400" />
      </button>
    </div>
  );
}
