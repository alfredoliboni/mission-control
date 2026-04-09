"use client";

import { useEffect, useState, useMemo } from "react";
import { useUploadedDocuments } from "@/hooks/useUploadedDocuments";
import { useParsedProfile } from "@/hooks/useWorkspace";
import { Loader2 } from "lucide-react";
import Link from "next/link";

// ── Types ────────────────────────────────────────────────────────────
interface UploadedDoc {
  id: string;
  title: string;
  doc_type: string;
  file_path: string;
  uploaded_at: string;
  child_nickname: string | null;
  uploader_role: string;
  download_url: string | null;
  metadata: {
    original_filename?: string;
    content_type?: string;
    size_bytes?: number;
    tags?: string[];
  } | null;
}

// ── Helpers ──────────────────────────────────────────────────────────
function getTypeEmoji(type: string): string {
  const lower = type.toLowerCase();
  if (lower === "assessment") return "\uD83D\uDCDD";
  if (lower === "diagnosis") return "\uD83E\uDE7A";
  if (lower === "report") return "\uD83D\uDCCB";
  if (lower === "iep" || lower === "school") return "\uD83D\uDCDA";
  if (lower === "prescription" || lower === "medical") return "\uD83D\uDC8A";
  if (lower === "therapy") return "\uD83E\uDDD1\u200D\u2695\uFE0F";
  return "\uD83D\uDCC4";
}

function getUploaderLabel(role: string): string {
  const lower = role.toLowerCase();
  if (lower === "family" || lower === "parent") return "Family";
  if (lower === "doctor") return "Dr. Park";
  if (lower === "school") return "School";
  if (lower === "therapist") return "Therapist";
  return role;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatToday(): string {
  return new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatFileSize(bytes: number | undefined): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Page ─────────────────────────────────────────────────────────────
export default function PacketPage() {
  const { data: uploadedDocs, isLoading } = useUploadedDocuments();
  const { data: profile } = useParsedProfile();
  const childName = profile?.basicInfo?.name || "Your Child";

  const [selectedIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem("packet_selected_ids");
      if (raw) return JSON.parse(raw) as string[];
    } catch {
      // ignore
    }
    return [];
  });

  // Once data is loaded, trigger print
  useEffect(() => {
    if (isLoading || !uploadedDocs) return;
    // Small delay so the browser can render
    const timer = setTimeout(() => {
      window.print();
    }, 600);
    return () => clearTimeout(timer);
  }, [isLoading, uploadedDocs]);

  const docs = useMemo(() => {
    if (!uploadedDocs) return [];
    const allDocs = uploadedDocs as UploadedDoc[];
    // Filter to selected IDs, preserving selection order
    return selectedIds
      .map((id) => allDocs.find((d) => d.id === id))
      .filter((d): d is UploadedDoc => d != null);
  }, [uploadedDocs, selectedIds]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 print:hidden">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          Preparing your document packet...
        </p>
      </div>
    );
  }

  if (docs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 print:hidden">
        <p className="text-lg font-semibold text-foreground">
          No documents selected
        </p>
        <p className="text-sm text-muted-foreground">
          Go back to the Document Vault and select documents to include in your
          packet.
        </p>
        <Link
          href="/documents"
          className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Back to Document Vault
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Screen-only toolbar */}
      <div className="print:hidden mb-6 flex items-center justify-between bg-card border border-border rounded-xl px-5 py-4">
        <div>
          <h2 className="text-[15px] font-semibold text-foreground">
            Document Packet Preview
          </h2>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            {docs.length} document{docs.length !== 1 ? "s" : ""} selected. Use
            Cmd+P (or Ctrl+P) to save as PDF.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/documents"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold bg-card border border-border text-foreground hover:bg-muted/50 transition-colors"
          >
            Back
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Print / Save PDF
          </button>
        </div>
      </div>

      {/* Printable content */}
      <div className="packet-printable">
        {/* ── Cover Page ─────────────────────────────────────────── */}
        <div className="packet-cover">
          <div className="packet-cover-inner">
            <div className="packet-cover-badge">Document Packet</div>
            <h1 className="packet-cover-name">{childName}</h1>
            <div className="packet-cover-divider" />
            <p className="packet-cover-date">Prepared on {formatToday()}</p>
            <p className="packet-cover-brand">
              The Companion — Mission Control
            </p>
            <p className="packet-cover-note">
              {docs.length} document{docs.length !== 1 ? "s" : ""} included
            </p>
          </div>
        </div>

        {/* ── Table of Contents ──────────────────────────────────── */}
        <div className="packet-toc">
          <h2 className="packet-section-title">Table of Contents</h2>
          <ol className="packet-toc-list">
            {docs.map((doc, i) => (
              <li key={doc.id} className="packet-toc-item">
                <span className="packet-toc-number">{i + 1}.</span>
                <span className="packet-toc-doc-title">{doc.title}</span>
                <span className="packet-toc-meta">
                  {doc.doc_type} — {formatDate(doc.uploaded_at)}
                </span>
              </li>
            ))}
          </ol>
        </div>

        {/* ── Document Sections ──────────────────────────────────── */}
        {docs.map((doc, i) => (
          <div key={doc.id} className="packet-document">
            <div className="packet-doc-header">
              <span className="packet-doc-emoji">
                {getTypeEmoji(doc.doc_type)}
              </span>
              <div>
                <h3 className="packet-doc-title">
                  {i + 1}. {doc.title}
                </h3>
                <p className="packet-doc-type">{doc.doc_type}</p>
              </div>
            </div>

            <div className="packet-doc-details">
              <div className="packet-doc-detail-row">
                <span className="packet-doc-label">Type</span>
                <span className="packet-doc-value">{doc.doc_type}</span>
              </div>
              <div className="packet-doc-detail-row">
                <span className="packet-doc-label">Date Uploaded</span>
                <span className="packet-doc-value">
                  {formatDate(doc.uploaded_at)}
                </span>
              </div>
              <div className="packet-doc-detail-row">
                <span className="packet-doc-label">Uploaded By</span>
                <span className="packet-doc-value">
                  {getUploaderLabel(doc.uploader_role)}
                </span>
              </div>
              {doc.metadata?.size_bytes && (
                <div className="packet-doc-detail-row">
                  <span className="packet-doc-label">File Size</span>
                  <span className="packet-doc-value">
                    {formatFileSize(doc.metadata.size_bytes)}
                  </span>
                </div>
              )}
              {doc.metadata?.tags && doc.metadata.tags.length > 0 && (
                <div className="packet-doc-detail-row">
                  <span className="packet-doc-label">Tags</span>
                  <span className="packet-doc-value">
                    {doc.metadata.tags.join(", ")}
                  </span>
                </div>
              )}
            </div>

            {doc.download_url && (
              <div className="packet-doc-download">
                <span className="packet-doc-download-label">
                  Download original:
                </span>
                <a
                  href={doc.download_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="packet-doc-download-link"
                >
                  {doc.metadata?.original_filename || doc.title}
                </a>
              </div>
            )}
          </div>
        ))}

        {/* ── Footer ─────────────────────────────────────────────── */}
        <div className="packet-footer">
          <p>
            This document packet was generated by The Companion — Mission
            Control on {formatToday()}.
          </p>
          <p>
            Full documents are available for download via the links above or
            through the Mission Control dashboard.
          </p>
        </div>
      </div>
    </>
  );
}
