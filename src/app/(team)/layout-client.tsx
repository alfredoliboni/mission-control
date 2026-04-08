"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { QueryProvider } from "@/components/providers/QueryProvider";

export function TeamLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <QueryProvider>
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <header className="border-b border-border bg-card">
          <div className="mx-auto max-w-[1280px] px-4 sm:px-6 md:px-8 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-xl" aria-hidden="true">
                🧭
              </span>
              <div>
                <h1 className="text-[15px] font-bold text-foreground leading-tight font-heading">
                  The Companion
                </h1>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                  Care Team Portal
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-muted/50"
            >
              Sign Out
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1">
          <div className="mx-auto max-w-[1280px] p-4 sm:p-6 md:p-8">
            {children}
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-border py-4">
          <div className="mx-auto max-w-[1280px] px-4 sm:px-6 md:px-8">
            <p className="text-[11px] text-muted-foreground text-center">
              The Companion &mdash; Care Team Portal &middot; Secure access
              provided by the family
            </p>
          </div>
        </footer>
      </div>
    </QueryProvider>
  );
}
