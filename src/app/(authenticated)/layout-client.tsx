"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
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

  useEffect(() => {
    if (resolved.current) return;
    resolved.current = true;

    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        setResolvedFamily(getFamilyAgent(undefined));
        return;
      }

      const email = user.email;
      let family;
      if (email && isKnownFamilyEmail(email)) {
        family = getFamilyAgent(email);
      } else {
        const metadata = user.user_metadata || {};
        const dynamic = getFamilyAgentFromMetadata(metadata);
        family = dynamic ?? getFamilyAgent(email);
      }

      setResolvedFamily(family);

      // If ALL children are "processing", redirect to processing page
      const allProcessing = family.children.length > 0 &&
        family.children.every((c) => c.status === "processing");

      if (allProcessing) {
        const first = family.children[0];
        router.push(`/setup/processing?agent=${encodeURIComponent(first.agentId)}&child=${encodeURIComponent(first.childName)}`);
        return;
      }

      // Find first ready child (skip processing ones)
      const readyIndex = family.children.findIndex((c) => c.status !== "processing");
      if (readyIndex >= 0) {
        setActiveChildIndex(readyIndex);
      }
    });
  }, [setResolvedFamily, setActiveChildIndex, router]);

  return (
    <QueryProvider>
      <AppShell>{children}</AppShell>
    </QueryProvider>
  );
}
