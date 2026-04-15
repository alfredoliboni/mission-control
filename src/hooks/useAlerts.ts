"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useActiveAgent } from "@/hooks/useActiveAgent";
import type { FamilyAlert } from "@/lib/supabase/queries/alerts";

// ── Query ─────────────────────────────────────────────────────────────────────

async function fetchAlerts(agentId?: string): Promise<FamilyAlert[]> {
  const url = `/api/alerts${agentId ? `?agent=${encodeURIComponent(agentId)}` : ""}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetchAlerts: ${res.status} ${res.statusText}`);
  return res.json();
}

export function useAlerts() {
  const agentId = useActiveAgent();
  return useQuery<FamilyAlert[]>({
    queryKey: ["alerts", agentId],
    queryFn: () => fetchAlerts(agentId),
    enabled: !!agentId,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}

// ── Mutation ──────────────────────────────────────────────────────────────────

export interface AlertActionPayload {
  alertId: string;
  action?: "dismiss" | "complete" | "reactivate";
  note?: string;
}

async function patchAlert(payload: AlertActionPayload): Promise<void> {
  const res = await fetch("/api/alerts", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`patchAlert: ${res.status} ${res.statusText}`);
}

export function useAlertAction() {
  const agentId = useActiveAgent();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: patchAlert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts", agentId] });
    },
  });
}
