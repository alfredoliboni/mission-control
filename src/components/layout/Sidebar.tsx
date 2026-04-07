"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, LogOut } from "lucide-react";
import { useWorkspaceSections } from "@/hooks/useWorkspace";
import { getSectionGroups } from "@/lib/workspace/sections";
import { useAppStore } from "@/store/appStore";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";

const GROUP_LABELS: Record<string, string> = {
  overview: "Overview",
  navigate: "Navigate",
  organize: "Organize",
  connect: "Connect",
  dynamic: "More",
};

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen, isDemo } = useAppStore();
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
        "flex items-center gap-3 rounded-lg px-3 py-2.5 min-h-[44px] text-[13px] font-medium transition-all",
        "hover:bg-warm-50",
        isActive(route)
          ? "bg-primary/8 text-primary font-semibold"
          : "text-muted-foreground"
      )}
    >
      {typeof icon === "string" ? (
        <span className="text-[15px] w-5 text-center" aria-hidden="true">
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
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-[10px]"
          onClick={() => setSidebarOpen(false)}
        >
          <span className="text-[22px]" aria-hidden="true">🧭</span>
          <span className="font-bold text-[15px] tracking-tight text-foreground">
            Mission Control
          </span>
        </Link>
        <button
          className="lg:hidden p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md hover:bg-warm-100"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav
        className="flex-1 overflow-y-auto px-3 py-1 space-y-5"
        aria-label="Main navigation"
      >
        <div>
          {navLink("/dashboard", "📊", "Dashboard")}
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
                <h3 className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {GROUP_LABELS[group] || group}
                </h3>
                <div className="space-y-[2px]">
                  {items.map((section) =>
                    navLink(section.route, section.icon, section.label)
                  )}
                </div>
              </div>
            );
          })
        ) : null}
      </nav>

      <div className="p-3 border-t border-border space-y-[2px]">
        {navLink("/settings", "⚙️", "Settings")}
        <button
          onClick={async () => {
            if (isDemo) {
              document.cookie =
                "companion-demo=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
            } else {
              const supabase = createClient();
              await supabase.auth.signOut();
            }
            setSidebarOpen(false);
            window.location.href = "/login";
          }}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 min-h-[44px] text-[13px] font-medium text-muted-foreground hover:bg-warm-50 transition-all w-full text-left"
        >
          <LogOut className="h-4 w-4" />
          {isDemo ? "Exit Demo" : "Sign Out"}
        </button>
      </div>
    </>
  );

  return (
    <>
      <aside
        className="hidden lg:flex lg:flex-col lg:w-[260px] lg:border-r lg:border-border lg:bg-card h-full"
        role="complementary"
        aria-label="Sidebar"
      >
        {sidebarContent}
      </aside>

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
          <aside className="absolute left-0 top-0 bottom-0 w-[280px] bg-card flex flex-col shadow-xl">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
