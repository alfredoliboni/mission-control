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

// --- Unified fetch: demo uses /api/workspace, live uses /api/workspace-live ---
// Both return raw .md content; parsing is always client-side.

function getBaseUrl(): string {
  return isDemo() ? "/api/workspace" : "/api/workspace-live";
}

async function fetchFileList(): Promise<string[]> {
  const base = getBaseUrl();
  const res = await fetch(base);
  if (!res.ok) throw new Error("Failed to fetch workspace file list");
  return res.json();
}

async function fetchFile(filename: string): Promise<string> {
  const base = getBaseUrl();
  const res = await fetch(`${base}/${filename}`);
  if (!res.ok) throw new Error(`Failed to fetch ${filename}`);
  return res.text();
}

// --- Hooks ---

export function useWorkspaceFiles() {
  const demo = isDemo();
  return useQuery({
    queryKey: ["workspace", "files", demo ? "demo" : "live"],
    queryFn: fetchFileList,
    staleTime: demo ? Infinity : 30_000,
    refetchInterval: demo ? false : 30_000,
  });
}

export function useWorkspaceFile(filename: string) {
  const demo = isDemo();
  return useQuery({
    queryKey: ["workspace", "file", filename, demo ? "demo" : "live"],
    queryFn: () => fetchFile(filename),
    enabled: !!filename,
    staleTime: demo ? Infinity : 30_000,
    refetchInterval: demo ? false : 30_000,
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

export function useParsedOntarioSystem() {
  const { data: raw, ...rest } = useWorkspaceFile("ontario-system.md");
  return { ...rest, data: raw ? parseOntarioSystem(raw) : undefined };
}
