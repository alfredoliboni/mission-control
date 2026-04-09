"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Menu, ChevronDown } from "lucide-react";
import { useParsedAlerts, useParsedProfile } from "@/hooks/useWorkspace";
import { useAppStore } from "@/store/appStore";
import { useFamily } from "@/hooks/useActiveAgent";
import { useQueryClient } from "@tanstack/react-query";

export function TopBar() {
  const { toggleSidebar, activeChildIndex, setActiveChildIndex } = useAppStore();
  const { data: alerts } = useParsedAlerts();
  const { data: profile } = useParsedProfile();
  const family = useFamily();
  const queryClient = useQueryClient();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const hasMultipleChildren = family.children.length > 1;
  const safeIndex = activeChildIndex >= 0 && activeChildIndex < family.children.length
    ? activeChildIndex
    : 0;

  const activeAlertCount = alerts
    ? alerts.filter((a) => a.status === "active").length
    : 0;

  const childName = profile?.basicInfo.name || family.children[safeIndex]?.childName || "Loading...";
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

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [dropdownOpen]);

  function handleChildSwitch(index: number) {
    setActiveChildIndex(index);
    setDropdownOpen(false);
    // Invalidate all workspace queries so data refetches for the new child
    queryClient.invalidateQueries({ queryKey: ["workspace"] });
  }

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

          {/* Child name with optional switcher dropdown */}
          <div className="relative" ref={dropdownRef}>
            {hasMultipleChildren ? (
              <button
                onClick={() => setDropdownOpen((prev) => !prev)}
                className="flex items-center gap-1 text-sm font-semibold text-foreground hover:text-foreground/80 transition-colors"
                aria-label="Switch child"
                aria-expanded={dropdownOpen}
              >
                {childName}
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
              </button>
            ) : (
              <span className="text-sm font-semibold text-foreground">
                {childName}
              </span>
            )}

            {/* Dropdown menu */}
            {hasMultipleChildren && dropdownOpen && (
              <div className="absolute top-full left-0 mt-1 min-w-[180px] bg-card border border-border rounded-lg shadow-lg z-50 py-1">
                {family.children.map((child, index) => (
                  <button
                    key={child.agentId}
                    onClick={() => handleChildSwitch(index)}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                      index === safeIndex
                        ? "bg-warm-50 font-semibold text-foreground"
                        : "text-muted-foreground hover:bg-warm-50 hover:text-foreground"
                    }`}
                  >
                    {child.childName}
                  </button>
                ))}
              </div>
            )}
          </div>

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
