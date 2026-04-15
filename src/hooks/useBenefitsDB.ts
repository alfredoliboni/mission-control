"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useActiveAgent } from "@/hooks/useActiveAgent";
import type { FamilyBenefit, BenefitStatus } from "@/lib/supabase/queries/benefits";

// ── Query ─────────────────────────────────────────────────────────────────────

async function fetchBenefits(agentId?: string): Promise<FamilyBenefit[]> {
  const url = `/api/benefits${agentId ? `?agent=${encodeURIComponent(agentId)}` : ""}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetchBenefits: ${res.status} ${res.statusText}`);
  return res.json();
}

export function useBenefitsDB() {
  const agentId = useActiveAgent();
  return useQuery<FamilyBenefit[]>({
    queryKey: ["benefits-db", agentId],
    queryFn: () => fetchBenefits(agentId),
    enabled: !!agentId,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}

// ── Mutation ──────────────────────────────────────────────────────────────────

export interface BenefitActionPayload {
  benefitId: string;
  status: BenefitStatus | string;
  dates?: {
    applied?: string;
    approved?: string;
    renewal?: string;
  };
}

async function patchBenefit(payload: BenefitActionPayload): Promise<void> {
  const res = await fetch("/api/benefits", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`patchBenefit: ${res.status} ${res.statusText}`);
}

export function useBenefitAction() {
  const agentId = useActiveAgent();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: patchBenefit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["benefits-db", agentId] });
    },
  });
}
