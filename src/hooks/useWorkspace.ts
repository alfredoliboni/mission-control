"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, useRef, useCallback } from "react";
import { toast } from "sonner";
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

// --- Visibility-based polling ---

function useSmartInterval(baseMs: number): number | false {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const onVisibility = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // Poll faster when visible, slower when hidden
  return visible ? baseMs : baseMs * 2;
}

// --- Last updated tracking ---

let lastDataUpdate = Date.now();

export function getLastDataUpdate(): number {
  return lastDataUpdate;
}

function markUpdated() {
  lastDataUpdate = Date.now();
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
  markUpdated();
  return data.parsed as T;
}

async function fetchCompanionFileList(): Promise<string[]> {
  const res = await fetch("/api/companion/api/files");
  if (!res.ok) throw new Error("Companion API error for file list");
  const data = await res.json();
  markUpdated();
  return data.files.map((f: { filename: string }) => f.filename);
}

// --- Hooks ---

export function useWorkspaceFiles() {
  const demo = isDemo();
  const interval = useSmartInterval(30_000);

  return useQuery({
    queryKey: ["workspace", "files", demo ? "demo" : "live"],
    queryFn: demo ? fetchFileList : fetchCompanionFileList,
    staleTime: demo ? Infinity : 30_000,
    refetchInterval: demo ? false : interval,
    refetchOnWindowFocus: !demo,
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

// --- Alert toast notifications ---

export function useAlertNotifications() {
  const prevCountRef = useRef<number | null>(null);
  const { data: alerts } = useParsedAlerts();

  useEffect(() => {
    if (!alerts) return;
    const activeCount = alerts.filter((a) => a.status === "active").length;

    if (prevCountRef.current !== null && activeCount > prevCountRef.current) {
      const diff = activeCount - prevCountRef.current;
      toast.warning(
        `${diff} new alert${diff > 1 ? "s" : ""} detected`,
        { description: "Check the alerts page for details." }
      );
    }

    prevCountRef.current = activeCount;
  }, [alerts]);
}

// --- Force refresh ---

export function useForceRefresh() {
  const [refreshKey, setRefreshKey] = useState(0);

  const forceRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
    markUpdated();
  }, []);

  return { refreshKey, forceRefresh };
}

// --- Data hooks ---

export function useParsedAlerts() {
  const demo = isDemo();
  const interval = useSmartInterval(30_000);
  const { data: raw, ...demoRest } = useWorkspaceFile("alerts.md");

  const liveQuery = useQuery({
    queryKey: ["parsed", "alerts", "live"],
    queryFn: () => fetchParsed<ParsedAlert[]>("alerts.md"),
    enabled: !demo,
    staleTime: 30_000,
    refetchInterval: demo ? false : interval,
    refetchOnWindowFocus: !demo,
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
  const interval = useSmartInterval(30_000);
  const { data: raw, ...demoRest } = useWorkspaceFile("pathway.md");

  const liveQuery = useQuery({
    queryKey: ["parsed", "pathway", "live"],
    queryFn: () => fetchParsed<ParsedPathway>("pathway.md"),
    enabled: !demo,
    staleTime: 30_000,
    refetchInterval: demo ? false : interval,
    refetchOnWindowFocus: !demo,
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
  const interval = useSmartInterval(30_000);
  const { data: raw, ...demoRest } = useWorkspaceFile("child-profile.md");

  const liveQuery = useQuery({
    queryKey: ["parsed", "profile", "live"],
    queryFn: () => fetchParsed<ParsedProfile>("child-profile.md"),
    enabled: !demo,
    staleTime: 30_000,
    refetchInterval: demo ? false : interval,
    refetchOnWindowFocus: !demo,
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
  const interval = useSmartInterval(30_000);
  const { data: raw, ...demoRest } = useWorkspaceFile("providers.md");

  const liveQuery = useQuery({
    queryKey: ["parsed", "providers", "live"],
    queryFn: () => fetchParsed<ParsedProviders>("providers.md"),
    enabled: !demo,
    staleTime: 30_000,
    refetchInterval: demo ? false : interval,
    refetchOnWindowFocus: !demo,
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
  const interval = useSmartInterval(30_000);
  const { data: raw, ...demoRest } = useWorkspaceFile("benefits.md");

  const liveQuery = useQuery({
    queryKey: ["parsed", "benefits", "live"],
    queryFn: () => fetchParsed<ParsedBenefits>("benefits.md"),
    enabled: !demo,
    staleTime: 30_000,
    refetchInterval: demo ? false : interval,
    refetchOnWindowFocus: !demo,
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
  const interval = useSmartInterval(30_000);
  const { data: raw, ...demoRest } = useWorkspaceFile("programs.md");

  const liveQuery = useQuery({
    queryKey: ["parsed", "programs", "live"],
    queryFn: () => fetchParsed<ParsedPrograms>("programs.md"),
    enabled: !demo,
    staleTime: 30_000,
    refetchInterval: demo ? false : interval,
    refetchOnWindowFocus: !demo,
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
  const interval = useSmartInterval(30_000);
  const { data: raw, ...demoRest } = useWorkspaceFile("documents.md");

  const liveQuery = useQuery({
    queryKey: ["parsed", "documents", "live"],
    queryFn: () => fetchParsed<ParsedDocuments>("documents.md"),
    enabled: !demo,
    staleTime: 30_000,
    refetchInterval: demo ? false : interval,
    refetchOnWindowFocus: !demo,
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
  const interval = useSmartInterval(60_000);
  const { data: raw, ...demoRest } = useWorkspaceFile("ontario-system.md");

  const liveQuery = useQuery({
    queryKey: ["parsed", "ontario-system", "live"],
    queryFn: () => fetchParsed<ParsedOntarioSystem>("ontario-system.md"),
    enabled: !demo,
    staleTime: 60_000,
    refetchInterval: demo ? false : interval,
    refetchOnWindowFocus: !demo,
  });

  if (demo) {
    return {
      ...demoRest,
      data: raw ? parseOntarioSystem(raw) : undefined,
    };
  }
  return liveQuery;
}
