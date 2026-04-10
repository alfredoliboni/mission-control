"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { QueryProvider } from "@/components/providers/QueryProvider";

export function TeamLayoutClient({
  children,
  inviteStatus = "accepted",
  childNames = [],
  isProvider = false,
}: {
  children: React.ReactNode;
  inviteStatus?: "pending" | "declined" | "accepted";
  childNames?: string[];
  isProvider?: boolean;
}) {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const childLabel = childNames.length > 0 ? childNames.join(", ") : "the child";

  return (
    <QueryProvider>
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <header className="border-b border-border bg-card">
          <div className="mx-auto max-w-[1280px] px-4 sm:px-6 md:px-8 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-xl" aria-hidden="true">
                &#x1F9ED;
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
            <div className="flex items-center gap-2">
              {isProvider && (
                <Link
                  href="/portal/dashboard"
                  className="text-[13px] font-medium text-primary hover:text-primary/80 transition-colors px-3 py-1.5 rounded-lg hover:bg-primary/5"
                >
                  My Profile
                </Link>
              )}
              <button
                type="button"
                onClick={handleSignOut}
                className="text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-muted/50"
              >
                Sign Out
              </button>
            </div>
          </div>
        </header>

        {/* Invite Status Banners */}
        {inviteStatus === "pending" && (
          <div className="bg-[#fef3c7] border-b border-[#f59e0b]/20">
            <div className="mx-auto max-w-[1280px] px-4 sm:px-6 md:px-8 py-3 flex items-center gap-3">
              <span className="text-lg shrink-0" aria-hidden="true">&#x23F3;</span>
              <p className="text-[13px] font-medium text-[#92400e]">
                You have a pending invitation. Accept to access {childLabel}&rsquo;s profile.
              </p>
            </div>
          </div>
        )}

        {inviteStatus === "declined" && (
          <div className="bg-[#fee2e2] border-b border-[#ef4444]/20">
            <div className="mx-auto max-w-[1280px] px-4 sm:px-6 md:px-8 py-3 flex items-center gap-3">
              <span className="text-lg shrink-0" aria-hidden="true">&#x274C;</span>
              <p className="text-[13px] font-medium text-[#991b1b]">
                This invitation was declined. Contact the family if you&rsquo;d like to request access again.
              </p>
            </div>
          </div>
        )}

        {/* Content — only show full content when accepted */}
        <main className="flex-1">
          <div className="mx-auto max-w-[1280px] p-4 sm:p-6 md:p-8">
            {inviteStatus === "accepted" ? (
              children
            ) : inviteStatus === "pending" ? (
              <div className="bg-card border border-border rounded-2xl p-8 text-center">
                <div className="text-4xl mb-4">&#x1F512;</div>
                <h2 className="text-[16px] font-semibold text-foreground mb-2">
                  Pending Invitation
                </h2>
                <p className="text-[13px] text-muted-foreground max-w-md mx-auto">
                  You need to accept the invitation before you can access {childLabel}&rsquo;s care team portal.
                  Check your email for the invitation link, or contact the family.
                </p>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-2xl p-8 text-center">
                <div className="text-4xl mb-4">&#x1F6AB;</div>
                <h2 className="text-[16px] font-semibold text-foreground mb-2">
                  Invitation Declined
                </h2>
                <p className="text-[13px] text-muted-foreground max-w-md mx-auto">
                  This invitation was declined. If this was a mistake, please contact the family to receive a new invitation.
                </p>
              </div>
            )}
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
