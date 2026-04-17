"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { AppShell } from "@/components/layout/AppShell";
import { useAppStore } from "@/store/appStore";
import { createClient } from "@/lib/supabase/client";
import { getFamilyAgent, isKnownFamilyEmail, getFamilyAgentFromMetadata } from "@/lib/family-agents";

export function AuthenticatedLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const setResolvedFamily = useAppStore((s) => s.setResolvedFamily);
  const setActiveChildIndex = useAppStore((s) => s.setActiveChildIndex);
  const resolved = useRef(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const needsRefresh = searchParams.get("refresh") === "1";

  useEffect(() => {
    // Skip if already resolved — UNLESS ?refresh=1 forces re-resolve
    if (resolved.current && !needsRefresh) return;
    resolved.current = true;

    // Clean the refresh param from URL
    if (needsRefresh) {
      router.replace(pathname);
    }

    const supabase = createClient();

    // Force fresh session from server when refreshing (not browser cache)
    const getUser = needsRefresh
      ? supabase.auth.refreshSession().then(() => supabase.auth.getUser())
      : supabase.auth.getUser();

    getUser.then(({ data: { user } }) => {
      if (!user) {
        setResolvedFamily(getFamilyAgent(undefined));
        return;
      }

      const email = user.email;
      const metadata = user.user_metadata || {};
      console.log("[layout-client] Resolving family. refresh:", needsRefresh, "children:", JSON.stringify(metadata.children?.map((c: { childName: string; agentId: string }) => c.childName)));

      let family;
      if (email && isKnownFamilyEmail(email)) {
        family = getFamilyAgent(email);
      } else {
        const dynamic = getFamilyAgentFromMetadata(metadata);
        family = dynamic ?? getFamilyAgent(email);
      }

      console.log("[layout-client] Resolved:", family.children.map(c => c.childName).join(", "));
      setResolvedFamily(family);

      // If ALL children are "processing", redirect to processing page
      const allProcessing = family.children.length > 0 &&
        family.children.every((c) => c.status === "processing");

      if (allProcessing) {
        const first = family.children[0];
        router.push(`/setup/processing?agent=${encodeURIComponent(first.agentId)}&child=${encodeURIComponent(first.childName)}`);
        return;
      }

      // Set active child to the latest ready child (likely the new one)
      const readyChildren = family.children
        .map((c, i) => ({ ...c, index: i }))
        .filter((c) => c.status !== "processing");

      if (readyChildren.length > 0) {
        // If refreshing after onboarding, select the LAST ready child (the new one)
        const targetIndex = needsRefresh
          ? readyChildren[readyChildren.length - 1].index
          : readyChildren[0].index;
        setActiveChildIndex(targetIndex);
      }
    });
  }, [needsRefresh, setResolvedFamily, setActiveChildIndex, router, pathname]);

  return (
    <QueryProvider>
      <AppShell>{children}</AppShell>
    </QueryProvider>
  );
}
