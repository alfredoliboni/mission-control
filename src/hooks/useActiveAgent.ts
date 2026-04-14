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
    // Try localStorage first (some Supabase versions store here)
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("sb-") && key.endsWith("-auth-token")) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          const email = parsed?.user?.email
            || parsed?.currentSession?.user?.email
            || parsed?.[0]?.user?.email;
          if (email) return email;
        }
      }
    }

    // Supabase SSR stores session in cookies — decode the JWT to get email
    const cookies = document.cookie.split(";").map(c => c.trim());
    // Look for base64-encoded session chunks
    const authCookies = cookies
      .filter(c => c.startsWith("sb-") && c.includes("auth-token"))
      .sort();

    if (authCookies.length > 0) {
      // Cookies may be chunked: sb-xxx-auth-token.0, sb-xxx-auth-token.1, etc.
      // Or a single sb-xxx-auth-token cookie with base64 value
      let combined = "";
      for (const cookie of authCookies) {
        const value = cookie.split("=").slice(1).join("=");
        combined += value;
      }
      // Try to decode — might be base64 JSON
      if (combined.startsWith("base64-")) {
        combined = combined.slice(7);
      }
      try {
        const decoded = atob(combined);
        const session = JSON.parse(decoded);
        const email = session?.user?.email || session?.access_token;
        if (email && email.includes("@")) return email;

        // Try decoding the access_token JWT payload
        if (session?.access_token) {
          const payload = session.access_token.split(".")[1];
          if (payload) {
            const jwtData = JSON.parse(atob(payload));
            if (jwtData?.email) return jwtData.email;
          }
        }
      } catch {
        // Not valid base64/JSON — try JWT decode on raw cookie chunks
      }
    }

    // Last resort: decode any JWT-looking cookie
    for (const cookie of cookies) {
      if (cookie.includes("auth-token")) {
        const value = cookie.split("=").slice(1).join("=");
        // JWT has 3 parts separated by dots
        const parts = value.split(".");
        if (parts.length === 3) {
          try {
            const payload = JSON.parse(atob(parts[1]));
            if (payload?.email) return payload.email;
          } catch { /* not a valid JWT */ }
        }
      }
    }
  } catch {
    // Silently fail
  }
  return undefined;
}
