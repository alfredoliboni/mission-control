"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  X,
} from "lucide-react";
import { useWorkspaceSections } from "@/hooks/useWorkspace";
import { getSectionGroups } from "@/lib/workspace/sections";
import { useAppStore } from "@/store/appStore";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { UserMenu } from "@/components/layout/UserMenu";

const GROUP_LABELS: Record<string, string> = {
  overview: "Overview",
  navigate: "Navigate",
  organize: "Organize",
  connect: "Connect",
  dynamic: "More",
};

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useAppStore();
  const { data: sections, isLoading } = useWorkspaceSections();

  const groups = sections ? getSectionGroups(sections) : null;

  const isActive = (route: string) => pathname === route;

  const navLink = (
    route: string,
    icon: string | React.ReactNode,
    label: string
  ) => (
    <Link
      key={route}
      href={route}
      onClick={() => setSidebarOpen(false)}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 min-h-[44px] text-sm transition-colors",
        "hover:bg-warm-100",
        isActive(route)
          ? "bg-primary/10 text-primary font-medium"
          : "text-warm-400"
      )}
    >
      {typeof icon === "string" ? (
        <span className="text-base w-5 text-center" aria-hidden="true">
          {icon}
        </span>
      ) : (
        icon
      )}
      <span>{label}</span>
    </Link>
  );

  const sidebarContent = (
    <>
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-2">
        <Link
          href="/dashboard"
          className="flex items-center gap-2"
          onClick={() => setSidebarOpen(false)}
        >
          <span className="text-xl" aria-hidden="true">
            🧭
          </span>
          <span className="font-heading font-bold text-lg text-foreground">
            Mission Control
          </span>
        </Link>
        <button
          className="lg:hidden min-h-[44px] min-w-[44px] rounded-md hover:bg-warm-100 flex items-center justify-center"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <Separator className="mx-4" />

      {/* Navigation */}
      <nav
        className="flex-1 overflow-y-auto px-3 py-4 space-y-6"
        aria-label="Main navigation"
      >
        {/* Dashboard (always first) */}
        <div>
          {navLink(
            "/dashboard",
            <LayoutDashboard className="h-5 w-5" />,
            "Dashboard"
          )}
        </div>

        {isLoading ? (
          <div className="space-y-2 px-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : groups ? (
          Object.entries(groups).map(([group, items]) => {
            if (items.length === 0) return null;
            return (
              <div key={group}>
                <h3 className="px-3 mb-1 text-xs font-semibold uppercase tracking-wider text-warm-400">
                  {GROUP_LABELS[group] || group}
                </h3>
                <div className="space-y-0.5">
                  {items.map((section) =>
                    navLink(section.route, section.icon, section.label)
                  )}
                </div>
              </div>
            );
          })
        ) : null}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border space-y-0.5">
        {navLink("/settings", "⚙️", "Settings")}
        <UserMenu />
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex lg:flex-col lg:w-[260px] lg:border-r lg:border-border lg:bg-sidebar h-full lg:order-1"
        role="complementary"
        aria-label="Sidebar"
      >
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-[280px] bg-sidebar flex flex-col shadow-xl">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
