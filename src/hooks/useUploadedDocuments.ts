"use client";

import { useQuery } from "@tanstack/react-query";

interface UploadedDocument {
  id: string;
  family_id: string;
  child_nickname: string | null;
  uploaded_by: string;
  uploader_role: string;
  title: string;
  doc_type: string;
  file_path: string;
  uploaded_at: string;
  metadata: Record<string, unknown> | null;
  download_url: string | null;
}

async function fetchUploadedDocuments(): Promise<UploadedDocument[]> {
  const res = await fetch("/api/documents");
  if (!res.ok) {
    // If user is not authenticated or endpoint fails, return empty
    if (res.status === 401) return [];
    throw new Error("Failed to fetch uploaded documents");
  }
  const data = await res.json();
  return data.documents ?? [];
}

/**
 * Hook to fetch documents uploaded to Supabase Storage.
 * Returns an empty array in demo mode or when not authenticated.
 */
export function useUploadedDocuments() {
  return useQuery({
    queryKey: ["uploaded-documents"],
    queryFn: fetchUploadedDocuments,
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 1,
  });
}
