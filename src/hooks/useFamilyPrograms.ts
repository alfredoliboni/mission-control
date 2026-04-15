"use client";

import { useQuery } from "@tanstack/react-query";
import { useActiveAgent } from "@/hooks/useActiveAgent";
import type { FamilyProgram } from "@/lib/supabase/queries/family-programs";

async function fetchFamilyPrograms(agentId?: string): Promise<FamilyProgram[]> {
  const url = `/api/family-programs${agentId ? `?agent=${encodeURIComponent(agentId)}` : ""}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetchFamilyPrograms: ${res.status} ${res.statusText}`);
  return res.json();
}

export function useFamilyPrograms() {
  const agentId = useActiveAgent();
  return useQuery<FamilyProgram[]>({
    queryKey: ["family-programs", agentId],
    queryFn: () => fetchFamilyPrograms(agentId),
    enabled: !!agentId,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}
