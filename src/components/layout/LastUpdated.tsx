"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getLastDataUpdate } from "@/hooks/useWorkspace";
import { useAppStore } from "@/store/appStore";

function formatTimeAgo(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

export function LastUpdated() {
  const [label, setLabel] = useState("just now");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();
  const { isDemo } = useAppStore();

  useEffect(() => {
    const tick = () => {
      const ago = Date.now() - getLastDataUpdate();
      setLabel(formatTimeAgo(ago));
    };
    tick();
    const id = setInterval(tick, 5_000);
    return () => clearInterval(id);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries();
    // Brief visual feedback
    setTimeout(() => setIsRefreshing(false), 600);
  };

  if (isDemo) return null;

  return (
    <button
      onClick={handleRefresh}
      className="flex items-center gap-1.5 text-xs text-warm-300 hover:text-warm-500 transition-colors"
      title="Click to refresh data"
      aria-label={`Data updated ${label}. Click to refresh.`}
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-success opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-status-success" />
      </span>
      <span>Updated {label}</span>
      <RefreshCw
        className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`}
      />
    </button>
  );
}
