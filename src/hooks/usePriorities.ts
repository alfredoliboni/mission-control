"use client";

import { useQuery } from "@tanstack/react-query";
import { useActiveAgent } from "@/hooks/useActiveAgent";
import type { FamilyPriority } from "@/lib/supabase/queries/priorities";

async function fetchPriorities(agentId?: string): Promise<FamilyPriority[]> {
  const url = `/api/priorities${agentId ? `?agent=${encodeURIComponent(agentId)}` : ""}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetchPriorities: ${res.status} ${res.statusText}`);
  return res.json();
}

export function usePriorities() {
  const agentId = useActiveAgent();
  return useQuery<FamilyPriority[]>({
    queryKey: ["priorities", agentId],
    queryFn: () => fetchPriorities(agentId),
    enabled: !!agentId,
    staleTime: 30_000,
  });
}
