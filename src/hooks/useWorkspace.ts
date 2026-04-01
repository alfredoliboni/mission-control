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
import { discoverSections } from "@/lib/workspace/sections";

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

export function useWorkspaceFiles() {
  return useQuery({
    queryKey: ["workspace", "files"],
    queryFn: fetchFileList,
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

export function useParsedAlerts() {
  const { data: raw, ...rest } = useWorkspaceFile("alerts.md");
  return {
    ...rest,
    data: raw ? parseAlerts(raw) : undefined,
  };
}

export function useParsedPathway() {
  const { data: raw, ...rest } = useWorkspaceFile("pathway.md");
  return {
    ...rest,
    data: raw ? parsePathway(raw) : undefined,
  };
}

export function useParsedProfile() {
  const { data: raw, ...rest } = useWorkspaceFile("child-profile.md");
  return {
    ...rest,
    data: raw ? parseProfile(raw) : undefined,
  };
}

export function useParsedProviders() {
  const { data: raw, ...rest } = useWorkspaceFile("providers.md");
  return {
    ...rest,
    data: raw ? parseProviders(raw) : undefined,
  };
}

export function useParsedBenefits() {
  const { data: raw, ...rest } = useWorkspaceFile("benefits.md");
  return {
    ...rest,
    data: raw ? parseBenefits(raw) : undefined,
  };
}

export function useParsedPrograms() {
  const { data: raw, ...rest } = useWorkspaceFile("programs.md");
  return {
    ...rest,
    data: raw ? parsePrograms(raw) : undefined,
  };
}

export function useParsedDocuments() {
  const { data: raw, ...rest } = useWorkspaceFile("documents.md");
  return {
    ...rest,
    data: raw ? parseDocuments(raw) : undefined,
  };
}
