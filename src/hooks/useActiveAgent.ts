"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/store/appStore";
import { getFamilyAgent, isKnownFamilyEmail, getFamilyAgentFromMetadata } from "@/lib/family-agents";
import type { FamilyAgent } from "@/lib/family-agents";
import { createClient } from "@/lib/supabase/client";

/**
 * Returns the active child's agentId based on the current user session.
 */
export function useActiveAgent(): string | undefined {
  const activeChildIndex = useAppStore((s) => s.activeChildIndex);
  const family = useFamily();

  const safeIndex = activeChildIndex >= 0 && activeChildIndex < family.children.length
    ? activeChildIndex
    : 0;
  return family.children[safeIndex].agentId;
}

/**
 * Returns the full family with children for UI rendering (e.g., child switcher).
 * Resolves dynamic agents from Supabase user metadata for new users.
 */
export function useFamily(): FamilyAgent {
  const [family, setFamily] = useState<FamilyAgent>(() => getFamilyAgent(undefined));

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;

      const email = user.email;
      if (email && isKnownFamilyEmail(email)) {
        setFamily(getFamilyAgent(email));
        return;
      }

      // Dynamic user — check metadata for agent_id
      const metadata = user.user_metadata || {};
      const dynamic = getFamilyAgentFromMetadata(metadata);
      if (dynamic) {
        setFamily(dynamic);
        return;
      }

      // Fallback to default
      setFamily(getFamilyAgent(email));
    });
  }, []);

  return family;
}
