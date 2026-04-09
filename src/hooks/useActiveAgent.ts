"use client";

import { useAppStore } from "@/store/appStore";
import { getFamilyAgent } from "@/lib/family-agents";

/**
 * Returns the active child's agentId based on the current user session
 * and the selected child index from the app store.
 *
 * In demo mode or when the user is unknown, returns undefined
 * (API routes will use the default agent).
 *
 * For live mode, reads the user email from the session cookie and
 * combines it with activeChildIndex to resolve the correct agentId.
 */
export function useActiveAgent(): string | undefined {
  const activeChildIndex = useAppStore((s) => s.activeChildIndex);

  // On the client we can read the supabase session email from localStorage
  // but it's simpler + more reliable to let the API route resolve the user.
  // We only need the agentId here as a cache key differentiator and param.
  // The actual user resolution still happens server-side in the API route.

  // For the client, we read from cookies/localStorage to determine email.
  // However the cleanest approach: store the family data once and reuse.
  // For now, we derive the agentId from what we can read client-side.
  if (typeof window === "undefined") return undefined;

  // Check if demo mode — no agent routing needed
  if (document.cookie.includes("companion-demo=true")) return undefined;

  // Try to get user email from Supabase session in localStorage
  const email = getSupabaseUserEmail();
  if (!email) return undefined;

  const family = getFamilyAgent(email);
  const safeIndex = activeChildIndex >= 0 && activeChildIndex < family.children.length
    ? activeChildIndex
    : 0;
  return family.children[safeIndex].agentId;
}

/**
 * Returns the full family with children for UI rendering (e.g., child switcher).
 */
export function useFamily() {
  const email = typeof window !== "undefined" ? getSupabaseUserEmail() : undefined;
  return getFamilyAgent(email ?? undefined);
}

function getSupabaseUserEmail(): string | undefined {
  try {
    // Supabase stores session in localStorage with a key pattern
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("sb-") && key.endsWith("-auth-token")) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          // Supabase v2 stores { user: { email } } or nested
          const email = parsed?.user?.email
            || parsed?.currentSession?.user?.email
            || parsed?.[0]?.user?.email;
          if (email) return email;
        }
      }
    }
  } catch {
    // localStorage may not be available or JSON parse may fail
  }
  return undefined;
}
