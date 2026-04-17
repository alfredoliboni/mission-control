"use client";

import { useAppStore } from "@/store/appStore";
import { getFamilyAgent } from "@/lib/family-agents";
import type { FamilyAgent } from "@/lib/family-agents";

/**
 * Returns the active child's agentId from the Zustand store.
 * The family is resolved once in layout-client.tsx and stored globally.
 * Returns undefined only if family hasn't been resolved yet.
 */
export function useActiveAgent(): string | undefined {
  const activeChildIndex = useAppStore((s) => s.activeChildIndex);
  const family = useFamily();

  if (family.children.length === 0) return undefined;

  const safeIndex = activeChildIndex >= 0 && activeChildIndex < family.children.length
    ? activeChildIndex
    : 0;
  const agentId = family.children[safeIndex].agentId;
  console.log(`[useActiveAgent] index=${activeChildIndex} safe=${safeIndex} children=${family.children.length} agent=${agentId}`);
  return agentId;
}

/**
 * Returns the resolved family from the Zustand store.
 * Falls back to default generic family if not yet resolved.
 * No useState, no useEffect, no async — pure synchronous read.
 */
export function useFamily(): FamilyAgent {
  const resolvedFamily = useAppStore((s) => s.resolvedFamily);
  return resolvedFamily || getFamilyAgent(undefined);
}
