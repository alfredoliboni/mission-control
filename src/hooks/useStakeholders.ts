"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/store/appStore";

export interface StakeholderLink {
  id: string;
  family_id: string;
  stakeholder_id: string | null;
  email: string;
  role: string;
  name: string | null;
  organization: string | null;
  status: string;
  created_at: string;
}

async function fetchStakeholders(): Promise<StakeholderLink[]> {
  const res = await fetch("/api/stakeholders");
  if (!res.ok) throw new Error("Failed to fetch stakeholders");
  const data = await res.json();
  return data.stakeholders ?? [];
}

export function useStakeholders() {
  const { isDemo } = useAppStore();

  return useQuery({
    queryKey: ["stakeholders"],
    queryFn: fetchStakeholders,
    enabled: !isDemo,
    staleTime: 30_000,
  });
}

export function useInviteStakeholder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      email,
      stakeholder_role,
    }: {
      email: string;
      stakeholder_role?: string;
    }) => {
      const res = await fetch("/api/stakeholders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, stakeholder_role }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Invite failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stakeholders"] });
    },
  });
}

export function useRemoveStakeholder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/stakeholders/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Remove failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stakeholders"] });
    },
  });
}
