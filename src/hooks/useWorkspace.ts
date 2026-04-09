"use client";

import { useQuery } from "@tanstack/react-query";
import {
  parseAlerts,
  parseBenefits,
  parseDocuments,
  parseEmployment,
  parsePathway,
  parseProfile,
  parsePrograms,
  parseProviders,
  parseUniversity,
} from "@/lib/workspace/parsers";
import { parseOntarioSystem } from "@/lib/workspace/parsers/ontario-system";
import { discoverSections } from "@/lib/workspace/sections";
import { useActiveAgent } from "@/hooks/useActiveAgent";

// --- Mode detection ---

function isDemo(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.includes("companion-demo=true");
}

// --- Unified fetch: demo uses /api/workspace, live uses /api/workspace-live ---
// Both return raw .md content; parsing is always client-side.

function getBaseUrl(agentId?: string): string {
  const base = isDemo() ? "/api/workspace" : "/api/workspace-live";
  // In live mode, append ?agent= param to route to the correct child's workspace
  if (!isDemo() && agentId) {
    return `${base}?agent=${encodeURIComponent(agentId)}`;
  }
  return base;
}

class WorkspaceError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "WorkspaceError";
    this.status = status;
  }
}

/** Returns true for errors that indicate the Orgo.ai VM is down */
export function isNavigatorOffline(error: unknown): boolean {
  if (error instanceof WorkspaceError) {
    return error.status === 404 || error.status === 502 || error.status === 503;
  }
  return false;
}

async function fetchFileList(agentId?: string): Promise<string[]> {
  const base = getBaseUrl(agentId);
  const res = await fetch(base);
  if (!res.ok)
    throw new WorkspaceError("Failed to fetch workspace file list", res.status);
  return res.json();
}

async function fetchFile(filename: string, agentId?: string): Promise<string> {
  const demo = isDemo();
  const baseRoot = demo ? "/api/workspace" : "/api/workspace-live";
  const agentParam = !demo && agentId ? `?agent=${encodeURIComponent(agentId)}` : "";
  const res = await fetch(`${baseRoot}/${filename}${agentParam}`);
  if (!res.ok)
    throw new WorkspaceError(`Failed to fetch ${filename}`, res.status);
  return res.text();
}

// --- Hooks ---

export function useWorkspaceFiles() {
  const demo = isDemo();
  const agentId = useActiveAgent();
  return useQuery({
    queryKey: ["workspace", "files", demo ? "demo" : "live", agentId],
    queryFn: () => fetchFileList(agentId),
    staleTime: demo ? Infinity : 30_000,
    refetchInterval: demo ? false : 30_000,
    retry: 2,
  });
}

export function useWorkspaceFile(filename: string) {
  const demo = isDemo();
  const agentId = useActiveAgent();
  return useQuery({
    queryKey: ["workspace", "file", filename, demo ? "demo" : "live", agentId],
    queryFn: () => fetchFile(filename, agentId),
    enabled: !!filename,
    staleTime: demo ? Infinity : 30_000,
    refetchInterval: demo ? false : 30_000,
    retry: 2,
  });
}

export function useWorkspaceSections() {
  const { data: files, ...rest } = useWorkspaceFiles();
  return {
    ...rest,
    data: files ? discoverSections(files) : undefined,
  };
}

// --- Typed data hooks (always parse client-side from raw .md) ---

export function useParsedAlerts() {
  const { data: raw, ...rest } = useWorkspaceFile("alerts.md");
  return { ...rest, data: raw ? parseAlerts(raw) : undefined };
}

export function useParsedPathway() {
  const { data: raw, ...rest } = useWorkspaceFile("pathway.md");
  return { ...rest, data: raw ? parsePathway(raw) : undefined };
}

export function useParsedProfile() {
  const { data: raw, ...rest } = useWorkspaceFile("child-profile.md");
  return { ...rest, data: raw ? parseProfile(raw) : undefined };
}

export function useParsedProviders() {
  const { data: raw, ...rest } = useWorkspaceFile("providers.md");
  return { ...rest, data: raw ? parseProviders(raw) : undefined };
}

export function useParsedBenefits() {
  const { data: raw, ...rest } = useWorkspaceFile("benefits.md");
  return { ...rest, data: raw ? parseBenefits(raw) : undefined };
}

export function useParsedPrograms() {
  const { data: raw, ...rest } = useWorkspaceFile("programs.md");
  return { ...rest, data: raw ? parsePrograms(raw) : undefined };
}

export function useParsedDocuments() {
  const { data: raw, ...rest } = useWorkspaceFile("documents.md");
  return { ...rest, data: raw ? parseDocuments(raw) : undefined };
}

export function useParsedEmployment() {
  const { data: raw, ...rest } = useWorkspaceFile("employment.md");
  return { ...rest, data: raw ? parseEmployment(raw) : undefined };
}

export function useParsedUniversity() {
  const { data: raw, ...rest } = useWorkspaceFile("university.md");
  return { ...rest, data: raw ? parseUniversity(raw) : undefined };
}

export function useParsedOntarioSystem() {
  const { data: raw, ...rest } = useWorkspaceFile("ontario-system.md");
  return { ...rest, data: raw ? parseOntarioSystem(raw) : undefined };
}
