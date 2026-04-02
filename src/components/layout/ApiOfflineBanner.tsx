"use client";

import { WifiOff } from "lucide-react";
import { useApiStatus } from "@/hooks/useApiStatus";
import { useAppStore } from "@/store/appStore";

export function ApiOfflineBanner() {
  const { isDemo } = useAppStore();
  const { isOffline, lastUpdated } = useApiStatus();

  if (isDemo || !isOffline) return null;

  return (
    <div
      className="bg-red-50 border-b border-red-200 px-4 py-2 flex items-center gap-2 text-sm"
      role="alert"
    >
      <WifiOff className="h-4 w-4 text-red-500 shrink-0" />
      <p className="text-red-700">
        <span className="font-medium">Navigator API is offline</span>
        {" — data may be outdated."}
        {lastUpdated && (
          <span className="text-red-500"> Last updated: {lastUpdated}</span>
        )}
      </p>
    </div>
  );
}
