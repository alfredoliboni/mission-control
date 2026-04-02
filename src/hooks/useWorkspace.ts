"use client";

import { useQuery } from "@tanstack/react-query";
import {
  parseAlerts,
  parseBenefits,
  parseDocuments,
  parsePathway,
  parseProfile,
  parsePrograms,
  parseProviders,
} from "@/lib/workspace/parsers";
import { parseOntarioSystem } from "@/lib/workspace/parsers/ontario-system";
import { discoverSections } from "@/lib/workspace/sections";

// --- Mode detection ---

function isDemo(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.includes("companion-demo=true");
}

// --- Demo mode: fetch raw .md from /api/workspace and parse client-side ---

async function fetchFileList(): Promise<string[]> {
  const res = await fetch("/api/workspace");
  if (!res.ok) throw new Error("Failed to fetch workspace file list");
  return res.json();
}

async function fetchFile(filename: string): Promise<string> {
  const res = await fetch(`/api/workspace/${filename}`);
  if (!res.ok) throw new Error(`Failed to fetch ${filename}`);
  return res.text();
}

// --- Production mode: fetch parsed JSON from companion API proxy ---

async function fetchParsed<T>(filename: string): Promise<T> {
  const res = await fetch(`/api/companion/api/parsed/${filename}`);
  if (!res.ok) throw new Error(`Companion API error for ${filename}: ${res.status}`);
  const data = await res.json();
  return data.parsed as T;
}

async function fetchCompanionFileList(): Promise<string[]> {
  const res = await fetch("/api/companion/api/files");
  if (!res.ok) throw new Error("Companion API error for file list");
  const data = await res.json();
  return data.files.map((f: { filename: string }) => f.filename);
}

// --- Hooks ---

export function useWorkspaceFiles() {
  const demo = isDemo();
  return useQuery({
    queryKey: ["workspace", "files", demo ? "demo" : "live"],
    queryFn: demo ? fetchFileList : fetchCompanionFileList,
    staleTime: demo ? Infinity : 30_000, // Live: refetch every 30s
    refetchInterval: demo ? false : 30_000,
  });
}

export function useWorkspaceFile(filename: string) {
  return useQuery({
    queryKey: ["workspace", "file", filename],
    queryFn: () => fetchFile(filename),
    enabled: !!filename,
  });
}

export function useWorkspaceSections() {
  const { data: files, ...rest } = useWorkspaceFiles();
  return {
    ...rest,
    data: files ? discoverSections(files) : undefined,
  };
}

// --- Typed data hooks (demo = parse client-side, live = pre-parsed from API) ---

import type {
  ParsedAlert,
  ParsedPathway,
  ParsedProfile,
  ParsedProviders,
  ParsedBenefits,
  ParsedPrograms,
  ParsedDocuments,
  ParsedOntarioSystem,
} from "@/types/workspace";

export function useParsedAlerts() {
  const demo = isDemo();
  const { data: raw, ...demoRest } = useWorkspaceFile("alerts.md");
  
  const liveQuery = useQuery({
    queryKey: ["parsed", "alerts", "live"],
    queryFn: () => fetchParsed<ParsedAlert[]>("alerts.md"),
    enabled: !demo,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  if (demo) {
    return {
      ...demoRest,
      data: raw ? parseAlerts(raw) : undefined,
    };
  }
  return liveQuery;
}

export function useParsedPathway() {
  const demo = isDemo();
  const { data: raw, ...demoRest } = useWorkspaceFile("pathway.md");
  
  const liveQuery = useQuery({
    queryKey: ["parsed", "pathway", "live"],
    queryFn: () => fetchParsed<ParsedPathway>("pathway.md"),
    enabled: !demo,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  if (demo) {
    return {
      ...demoRest,
      data: raw ? parsePathway(raw) : undefined,
    };
  }
  return liveQuery;
}

export function useParsedProfile() {
  const demo = isDemo();
  const { data: raw, ...demoRest } = useWorkspaceFile("child-profile.md");
  
  const liveQuery = useQuery({
    queryKey: ["parsed", "profile", "live"],
    queryFn: () => fetchParsed<ParsedProfile>("child-profile.md"),
    enabled: !demo,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  if (demo) {
    return {
      ...demoRest,
      data: raw ? parseProfile(raw) : undefined,
    };
  }
  return liveQuery;
}

export function useParsedProviders() {
  const demo = isDemo();
  const { data: raw, ...demoRest } = useWorkspaceFile("providers.md");
  
  const liveQuery = useQuery({
    queryKey: ["parsed", "providers", "live"],
    queryFn: () => fetchParsed<ParsedProviders>("providers.md"),
    enabled: !demo,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  if (demo) {
    return {
      ...demoRest,
      data: raw ? parseProviders(raw) : undefined,
    };
  }
  return liveQuery;
}

export function useParsedBenefits() {
  const demo = isDemo();
  const { data: raw, ...demoRest } = useWorkspaceFile("benefits.md");
  
  const liveQuery = useQuery({
    queryKey: ["parsed", "benefits", "live"],
    queryFn: () => fetchParsed<ParsedBenefits>("benefits.md"),
    enabled: !demo,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  if (demo) {
    return {
      ...demoRest,
      data: raw ? parseBenefits(raw) : undefined,
    };
  }
  return liveQuery;
}

export function useParsedPrograms() {
  const demo = isDemo();
  const { data: raw, ...demoRest } = useWorkspaceFile("programs.md");
  
  const liveQuery = useQuery({
    queryKey: ["parsed", "programs", "live"],
    queryFn: () => fetchParsed<ParsedPrograms>("programs.md"),
    enabled: !demo,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  if (demo) {
    return {
      ...demoRest,
      data: raw ? parsePrograms(raw) : undefined,
    };
  }
  return liveQuery;
}

export function useParsedDocuments() {
  const demo = isDemo();
  const { data: raw, ...demoRest } = useWorkspaceFile("documents.md");
  
  const liveQuery = useQuery({
    queryKey: ["parsed", "documents", "live"],
    queryFn: () => fetchParsed<ParsedDocuments>("documents.md"),
    enabled: !demo,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  if (demo) {
    return {
      ...demoRest,
      data: raw ? parseDocuments(raw) : undefined,
    };
  }
  return liveQuery;
}

export function useParsedOntarioSystem() {
  const demo = isDemo();
  const { data: raw, ...demoRest } = useWorkspaceFile("ontario-system.md");
  
  const liveQuery = useQuery({
    queryKey: ["parsed", "ontario-system", "live"],
    queryFn: () => fetchParsed<ParsedOntarioSystem>("ontario-system.md"),
    enabled: !demo,
    staleTime: 60_000, // Less frequent — reference data
    refetchInterval: 60_000,
  });

  if (demo) {
    return {
      ...demoRest,
      data: raw ? parseOntarioSystem(raw) : undefined,
    };
  }
  return liveQuery;
}
