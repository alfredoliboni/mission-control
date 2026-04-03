"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParsedDocuments } from "@/hooks/useWorkspace";
import { useAppStore } from "@/store/appStore";
import type { DocumentEntry } from "@/types/workspace";

interface SupabaseDocument {
  id: string;
  family_id: string;
  title: string;
  doc_type: string;
  file_path: string;
  uploaded_by: string;
  uploader_role: string;
  child_nickname: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

/** Convert a Supabase document row into the workspace DocumentEntry shape */
function toDocumentEntry(doc: SupabaseDocument): DocumentEntry & { supabaseId: string } {
  return {
    supabaseId: doc.id,
    date: new Date(doc.created_at).toLocaleDateString("en-CA"),
    title: doc.title,
    from: doc.uploader_role === "parent" ? "You" : doc.uploader_role,
    type: doc.doc_type,
    storageLink: doc.file_path,
  };
}

async function fetchSupabaseDocuments(): Promise<SupabaseDocument[]> {
  const res = await fetch("/api/documents");
  if (!res.ok) throw new Error("Failed to fetch documents");
  const data = await res.json();
  return data.documents ?? [];
}

/**
 * Unified document hook — merges workspace (agent-parsed) documents with
 * Supabase-uploaded documents. In demo mode, only workspace docs are shown.
 */
export function useDocuments() {
  const { isDemo } = useAppStore();
  const workspaceQuery = useParsedDocuments();

  const supabaseQuery = useQuery({
    queryKey: ["supabase-documents"],
    queryFn: fetchSupabaseDocuments,
    enabled: !isDemo,
    staleTime: 15_000,
  });

  const workspaceDocs = workspaceQuery.data?.documents ?? [];
  const supabaseDocs = supabaseQuery.data?.map(toDocumentEntry) ?? [];

  // Merge: Supabase docs first (newest uploads), then workspace docs
  const allDocuments: (DocumentEntry & { supabaseId?: string })[] = [
    ...supabaseDocs,
    ...workspaceDocs.map((d) => ({ ...d, supabaseId: undefined })),
  ];

  return {
    documents: allDocuments,
    summaries: workspaceQuery.data?.summaries ?? [],
    isLoading: workspaceQuery.isLoading || (!isDemo && supabaseQuery.isLoading),
    isError: workspaceQuery.isError || supabaseQuery.isError,
    refetchSupabase: supabaseQuery.refetch,
  };
}

/** Download a document by creating a signed URL */
export function useDocumentDownload() {
  return useMutation({
    mutationFn: async (documentId: string) => {
      const res = await fetch(`/api/documents/${documentId}/download`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Download failed");
      }
      const data = await res.json();
      return data as { url: string; title: string };
    },
  });
}

/** Upload a document via the API route */
export function useDocumentUpload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Upload failed");
      }
      return res.json() as Promise<{ id: string; file_path: string }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supabase-documents"] });
    },
  });
}
