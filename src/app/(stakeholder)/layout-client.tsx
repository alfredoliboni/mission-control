"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { useAppStore } from "@/store/appStore";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  Home,
  Upload,
  MessageSquare,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { href: "/portal", label: "Families", icon: Home },
  { href: "/portal/upload", label: "Upload", icon: Upload },
  { href: "/portal/messages", label: "Messages", icon: MessageSquare },
];

export function StakeholderLayoutClient({
  children,
  isDemo,
}: {
  children: React.ReactNode;
  isDemo: boolean;
}) {
  const { setIsDemo } = useAppStore();
  const { user, role, signOut } = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    setIsDemo(isDemo);
  }, [isDemo, setIsDemo]);

  return (
    <QueryProvider>
      <div className="min-h-screen bg-background flex flex-col">
        {/* Minimal header */}
        <header className="border-b border-border bg-card">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/portal" className="font-heading font-bold text-foreground">
                Mission Control
                <span className="text-xs text-muted-foreground font-normal ml-2">
                  Stakeholder Portal
                </span>
              </Link>
              <nav className="hidden sm:flex items-center gap-1">
                {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      pathname === href
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                ))}
              </nav>
            </div>

            <div className="flex items-center gap-3">
              {user && (
                <span className="text-xs text-muted-foreground hidden sm:block">
                  {user.email} ({role})
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut()}
                className="h-8 px-2"
              >
                <LogOut className="h-4 w-4 mr-1" />
                <span className="text-xs">Sign out</span>
              </Button>
            </div>
          </div>

          {/* Mobile nav */}
          <div className="sm:hidden border-t border-border px-4 py-2 flex gap-1">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs transition-colors ${
                  pathname === href
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Link>
            ))}
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6">
          {children}
        </main>
      </div>
    </QueryProvider>
  );
}
