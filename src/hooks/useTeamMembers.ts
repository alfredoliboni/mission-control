"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useActiveAgent } from "@/hooks/useActiveAgent";
import type { TeamMember, InsertMemberInput } from "@/lib/supabase/queries/team-members";

// ── Query ─────────────────────────────────────────────────────────────────────

async function fetchTeamMembers(
  agentId?: string
): Promise<{ active: TeamMember[]; former: TeamMember[] }> {
  const url = `/api/team-members${agentId ? `?agent=${encodeURIComponent(agentId)}` : ""}`;
  const res = await fetch(url);
  if (!res.ok)
    throw new Error(`fetchTeamMembers: ${res.status} ${res.statusText}`);
  return res.json();
}

export function useTeamMembers() {
  const agentId = useActiveAgent();
  return useQuery<{ active: TeamMember[]; former: TeamMember[] }>({
    queryKey: ["team-members", agentId],
    queryFn: () => fetchTeamMembers(agentId),
    enabled: !!agentId,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}

// ── Add member mutation ───────────────────────────────────────────────────────

async function postTeamMember(input: InsertMemberInput): Promise<TeamMember> {
  const res = await fetch("/api/team-members", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok)
    throw new Error(`postTeamMember: ${res.status} ${res.statusText}`);
  return res.json();
}

export function useAddTeamMember() {
  const agentId = useActiveAgent();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: postTeamMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members", agentId] });
    },
  });
}

// ── Remove member mutation ────────────────────────────────────────────────────

export interface RemoveMemberPayload {
  memberId: string;
  action: "remove";
  reason: string;
}

async function patchTeamMember(payload: RemoveMemberPayload): Promise<void> {
  const res = await fetch("/api/team-members", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok)
    throw new Error(`patchTeamMember: ${res.status} ${res.statusText}`);
}

export function useRemoveTeamMember() {
  const agentId = useActiveAgent();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: patchTeamMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members", agentId] });
    },
  });
}
