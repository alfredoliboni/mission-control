"use client";

import Link from "next/link";
import { Menu, Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useParsedAlerts, useParsedProfile } from "@/hooks/useWorkspace";
import { useAppStore } from "@/store/appStore";
import { LastUpdated } from "./LastUpdated";

export function TopBar() {
  const { toggleSidebar } = useAppStore();
  const { data: alerts } = useParsedAlerts();
  const { data: profile } = useParsedProfile();

  const activeAlertCount = alerts
    ? alerts.filter((a) => a.status === "active").length
    : 0;

  const childName = profile?.basicInfo.name || "Loading...";
  const currentStage = profile?.basicInfo.currentStage || "";

  const stageLabel = currentStage
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <header className="flex items-center justify-between h-14 px-4 border-b border-border bg-card">
      <nav aria-label="Top navigation" className="flex items-center justify-between w-full gap-3">
        <div className="flex items-center gap-3">
        <button
          className="lg:hidden p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md hover:bg-warm-100 transition-colors"
          onClick={toggleSidebar}
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2">
          <h1 className="font-heading font-semibold text-sm sm:text-base text-foreground">
            {childName}
          </h1>
          {stageLabel && (
            <Badge variant="secondary" className="text-xs font-normal">
              {stageLabel}
            </Badge>
          )}
        </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
        <LastUpdated />
        <Link
          href="/alerts"
          className="relative p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md hover:bg-warm-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors"
          aria-label={`${activeAlertCount} active alerts`}
        >
          <Bell className="h-5 w-5 text-warm-400" />
          {activeAlertCount > 0 && (
            <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-status-blocked text-white text-[10px] font-bold flex items-center justify-center">
              {activeAlertCount}
            </span>
          )}
        </Link>
        </div>
      </nav>
    </header>
  );
}
