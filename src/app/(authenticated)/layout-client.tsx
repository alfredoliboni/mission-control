"use client";

import { useEffect, useRef } from "react";
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
  const resolved = useRef(false);

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
      if (email && isKnownFamilyEmail(email)) {
        setResolvedFamily(getFamilyAgent(email));
        return;
      }

      const metadata = user.user_metadata || {};
      const dynamic = getFamilyAgentFromMetadata(metadata);
      if (dynamic) {
        setResolvedFamily(dynamic);
        return;
      }

      setResolvedFamily(getFamilyAgent(email));
    });
  }, [setResolvedFamily]);

  return (
    <QueryProvider>
      <AppShell>{children}</AppShell>
    </QueryProvider>
  );
}
