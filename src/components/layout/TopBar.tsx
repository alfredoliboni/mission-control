"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, ChevronDown, Bell } from "lucide-react";
import { useParsedProfile } from "@/hooks/useWorkspace";
import { useNotifications } from "@/hooks/useNotifications";
import { useAppStore } from "@/store/appStore";
import { useFamily } from "@/hooks/useActiveAgent";
import { useQueryClient } from "@tanstack/react-query";

// ── Helpers ──────────────────────────────────────────────────────────────

function formatNotificationTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

const NOTIFICATION_ICONS: Record<string, string> = {
  message: "\u{1F4AC}",
  invite: "\u{1F4E8}",
  alert: "\u{1F6A8}",
};

// ── Component ────────────────────────────────────────────────────────────

export function TopBar() {
  const { toggleSidebar, activeChildIndex, setActiveChildIndex } = useAppStore();
  const { data: profile } = useParsedProfile();
  const family = useFamily();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Notification bell state
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const { data: notifications = [] } = useNotifications();
  const unreadCount = notifications.length;

  const hasMultipleChildren = family.children.length > 1;
  const safeIndex = activeChildIndex >= 0 && activeChildIndex < family.children.length
    ? activeChildIndex
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

  // Close child switcher dropdown when clicking outside
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

  // Close notification dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    }
    if (notifOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [notifOpen]);

  function handleChildSwitch(index: number) {
    setActiveChildIndex(index);
    setDropdownOpen(false);
    // Invalidate ALL queries — workspace + DB-backed hooks all use agentId in their keys
    // The new agentId from useActiveAgent() will be used on refetch
    queryClient.removeQueries();
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
                    onClick={() => {
                      if (child.status === "processing") {
                        router.push(`/setup/processing?agent=${encodeURIComponent(child.agentId)}&child=${encodeURIComponent(child.childName)}`);
                      } else {
                        handleChildSwitch(index);
                      }
                    }}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                      index === safeIndex
                        ? "bg-warm-50 font-semibold text-foreground"
                        : "text-muted-foreground hover:bg-warm-50 hover:text-foreground"
                    }`}
                  >
                    <span>{child.childName}</span>
                    {child.status === "processing" ? (
                      <span className="text-[10px] text-amber-500 font-medium"> Setting up...</span>
                    ) : (
                      <span className="text-[10px] text-green-600 font-medium"> ACTIVE</span>
                    )}
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
        {/* Notification bell */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifOpen((prev) => !prev)}
              className="relative w-8 h-8 rounded-lg flex items-center justify-center hover:bg-warm-50 transition-colors"
              aria-label={`${unreadCount} notifications`}
              aria-expanded={notifOpen}
            >
              <Bell className="h-4 w-4 text-warm-400" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-status-blocked text-white text-[10px] font-bold flex items-center justify-center px-1 border-2 border-card">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* Notification dropdown panel */}
            {notifOpen && (
              <div className="absolute top-full right-0 mt-1 w-80 max-h-96 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden">
                <div className="px-4 py-2.5 border-b border-border">
                  <h3 className="text-sm font-semibold text-foreground">
                    Notifications
                  </h3>
                </div>

                <div className="overflow-y-auto max-h-72">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <Bell className="h-6 w-6 text-warm-200 mx-auto mb-2" />
                      <p className="text-sm text-warm-400">
                        No notifications
                      </p>
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <Link
                        key={notif.id}
                        href={notif.type === "message" ? "/messages" : "/settings"}
                        onClick={() => setNotifOpen(false)}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-warm-50 transition-colors border-b border-border last:border-b-0"
                      >
                        <span className="text-base mt-0.5 shrink-0" aria-hidden="true">
                          {NOTIFICATION_ICONS[notif.type] || NOTIFICATION_ICONS.alert}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">
                            {notif.title}
                          </p>
                          <p className="text-xs text-warm-400 truncate mt-0.5">
                            {notif.description}
                          </p>
                        </div>
                        <span className="text-[10px] text-warm-300 whitespace-nowrap shrink-0 mt-0.5">
                          {formatNotificationTime(notif.timestamp)}
                        </span>
                      </Link>
                    ))
                  )}
                </div>

                <div className="px-4 py-2 border-t border-border flex items-center justify-between">
                  {notifications.length > 0 && (
                    <Link
                      href="/messages"
                      onClick={() => setNotifOpen(false)}
                      className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                    >
                      View all messages
                    </Link>
                  )}
                  <Link
                    href="/alerts"
                    onClick={() => setNotifOpen(false)}
                    className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    View alerts
                  </Link>
                </div>
              </div>
            )}
          </div>

      </div>
    </header>
  );
}
