"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/store/appStore";
import { getFamilyAgent, isKnownFamilyEmail, getFamilyAgentFromMetadata } from "@/lib/family-agents";
import type { FamilyAgent } from "@/lib/family-agents";
import { createClient } from "@/lib/supabase/client";

/**
 * Returns the active child's agentId based on the current user session.
 * Returns undefined until the user session is resolved.
 */
export function useActiveAgent(): string | undefined {
  const activeChildIndex = useAppStore((s) => s.activeChildIndex);
  const family = useFamily();

  if (!family) return undefined; // Not resolved yet

  const safeIndex = activeChildIndex >= 0 && activeChildIndex < family.children.length
    ? activeChildIndex
    : 0;
  return family.children[safeIndex].agentId;
}

/**
 * Returns the full family with children for UI rendering.
 * Returns null until the user session is resolved — this prevents
 * workspace hooks from firing with the wrong (default) agent.
 */
export function useFamily(): FamilyAgent | null {
  const [family, setFamily] = useState<FamilyAgent | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        // Not logged in — use default
        setFamily(getFamilyAgent(undefined));
        return;
      }

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

      // Fallback
      setFamily(getFamilyAgent(email));
    });
  }, []);

  return family;
}
