"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { useParsedAlerts, useParsedProfile } from "@/hooks/useWorkspace";
import { useAppStore } from "@/store/appStore";

export function TopBar() {
  const { toggleSidebar } = useAppStore();
  const { data: alerts } = useParsedAlerts();
  const { data: profile } = useParsedProfile();

  const activeAlertCount = alerts
    ? alerts.filter((a) => a.status === "active").length
    : 0;

  const childName = profile?.basicInfo.name || "Loading...";
  const initials = childName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const currentStage = profile?.basicInfo.currentStage || "";
  const stageLabel = currentStage
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <header className="flex items-center justify-between h-14 px-7 border-b border-border bg-card">
      <div className="flex items-center gap-3">
        <button
          className="lg:hidden p-2 rounded-md hover:bg-warm-100 transition-colors"
          onClick={toggleSidebar}
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3">
          <div
            className="w-[30px] h-[30px] rounded-[10px] flex items-center justify-center text-white text-[12px] font-bold"
            style={{ background: "linear-gradient(135deg, #f0c27f, #fc5c7d)" }}
          >
            {initials}
          </div>
          <span className="text-sm font-semibold text-foreground">
            {childName}
          </span>
          {stageLabel && (
            <span className="text-[11px] font-medium text-muted-foreground bg-warm-50 px-2 py-0.5 rounded">
              {stageLabel}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Link
          href="/alerts"
          className="relative w-8 h-8 rounded-lg flex items-center justify-center hover:bg-warm-50 transition-colors text-base"
          aria-label={`${activeAlertCount} active alerts`}
        >
          🔔
          {activeAlertCount > 0 && (
            <span className="absolute top-[5px] right-[5px] w-[7px] h-[7px] rounded-full bg-status-blocked border-[1.5px] border-card" />
          )}
        </Link>
      </div>
    </header>
  );
}
