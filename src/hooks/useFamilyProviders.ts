"use client";

import { useQuery } from "@tanstack/react-query";
import { useActiveAgent } from "@/hooks/useActiveAgent";
import type { FamilyProvider } from "@/lib/supabase/queries/family-providers";

async function fetchFamilyProviders(agentId?: string): Promise<FamilyProvider[]> {
  const url = `/api/family-providers${agentId ? `?agent=${encodeURIComponent(agentId)}` : ""}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetchFamilyProviders: ${res.status} ${res.statusText}`);
  return res.json();
}

export function useFamilyProviders() {
  const agentId = useActiveAgent();
  return useQuery<FamilyProvider[]>({
    queryKey: ["family-providers", agentId],
    queryFn: () => fetchFamilyProviders(agentId),
    enabled: !!agentId,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}
