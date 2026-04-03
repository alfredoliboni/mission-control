"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/store/appStore";
import {
  demoProviderProfile,
  demoProviderPrograms,
  demoProviderFamilies,
  type DemoProviderProfile,
  type DemoProviderProgram,
  type DemoProviderFamily,
} from "@/data/demoProvider";

// ── Types ──────────────────────────────────────────────────────

export type ProviderProfile = DemoProviderProfile;
export type ProviderProgram = DemoProviderProgram;
export type ProviderFamily = DemoProviderFamily;

// ── Fetchers ───────────────────────────────────────────────────

async function fetchProfile(): Promise<ProviderProfile | null> {
  const res = await fetch("/api/provider/profile");
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to fetch provider profile");
  const data = await res.json();
  return data.profile ?? null;
}

async function fetchPrograms(): Promise<ProviderProgram[]> {
  const res = await fetch("/api/provider/programs");
  if (!res.ok) throw new Error("Failed to fetch programs");
  const data = await res.json();
  return data.programs ?? [];
}

async function fetchFamilies(): Promise<ProviderFamily[]> {
  const res = await fetch("/api/provider/families");
  if (!res.ok) throw new Error("Failed to fetch linked families");
  const data = await res.json();
  return data.families ?? [];
}

// ── Hooks ──────────────────────────────────────────────────────

export function useProviderProfile() {
  const { isDemo } = useAppStore();

  return useQuery({
    queryKey: ["provider-profile"],
    queryFn: fetchProfile,
    enabled: !isDemo,
    staleTime: 30_000,
    placeholderData: isDemo ? demoProviderProfile : undefined,
  });
}

export function useProviderPrograms() {
  const { isDemo } = useAppStore();

  return useQuery({
    queryKey: ["provider-programs"],
    queryFn: fetchPrograms,
    enabled: !isDemo,
    staleTime: 30_000,
    placeholderData: isDemo ? demoProviderPrograms : undefined,
  });
}

export function useProviderFamilies() {
  const { isDemo } = useAppStore();

  return useQuery({
    queryKey: ["provider-families"],
    queryFn: fetchFamilies,
    enabled: !isDemo,
    staleTime: 30_000,
    placeholderData: isDemo ? demoProviderFamilies : undefined,
  });
}

export function useSaveProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: Partial<ProviderProfile>) => {
      const res = await fetch("/api/provider/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to save profile");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-profile"] });
    },
  });
}

export function useCreateProgram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (program: Partial<ProviderProgram>) => {
      const res = await fetch("/api/provider/programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(program),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to create program");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-programs"] });
    },
  });
}

export function useUpdateProgram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<ProviderProgram> & { id: string }) => {
      const res = await fetch(`/api/provider/programs`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updates }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to update program");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-programs"] });
    },
  });
}

export function useDeleteProgram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/provider/programs?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to delete program");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-programs"] });
    },
  });
}

export function useAcceptInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (linkId: string) => {
      const res = await fetch("/api/provider/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ link_id: linkId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to accept invite");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-families"] });
      queryClient.invalidateQueries({ queryKey: ["stakeholders"] });
    },
  });
}
