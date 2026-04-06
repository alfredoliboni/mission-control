"use client";

import { useAppStore } from "@/store/appStore";

export function DemoBanner() {
  const { isDemo } = useAppStore();

  if (!isDemo) return null;

  return (
    <div
      className="bg-foreground text-white text-center py-[5px] text-[11px] font-medium tracking-wide"
      role="status"
    >
      Demo Mode — Viewing sample data for Alex Santos
    </div>
  );
}
