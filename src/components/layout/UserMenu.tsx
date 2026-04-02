"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { useAppStore } from "@/store/appStore";
import { LogOut, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

const ROLE_LABELS: Record<string, string> = {
  parent: "Parent",
  provider: "Provider",
  school: "School",
  therapist: "Therapist",
  admin: "Admin",
};

export function UserMenu() {
  const router = useRouter();
  const { user, role, signOut } = useAuth();
  const { isDemo, setSidebarOpen } = useAppStore();

  if (isDemo) {
    return (
      <Link
        href="/login"
        onClick={() => {
          document.cookie =
            "companion-demo=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
          setSidebarOpen(false);
        }}
        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-warm-400 hover:bg-warm-100 transition-colors"
      >
        <LogOut className="h-4 w-4" />
        Exit Demo
      </Link>
    );
  }

  if (!user) return null;

  const displayName =
    user.user_metadata?.full_name || user.email?.split("@")[0] || "User";

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-3 px-3 py-2">
        <div className="flex items-center justify-center h-7 w-7 rounded-full bg-primary/10 text-primary shrink-0">
          <User className="h-3.5 w-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {displayName}
          </p>
          <div className="flex items-center gap-1.5">
            {role && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {ROLE_LABELS[role] || role}
              </Badge>
            )}
          </div>
        </div>
      </div>
      <button
        onClick={async () => {
          await signOut();
          setSidebarOpen(false);
          router.push("/login");
        }}
        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-warm-400 hover:bg-warm-100 transition-colors w-full text-left"
      >
        <LogOut className="h-4 w-4" />
        Sign Out
      </button>
    </div>
  );
}
