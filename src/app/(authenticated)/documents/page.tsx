"use client";

import { useState, useRef, useCallback } from "react";
import { useUploadedDocuments } from "@/hooks/useUploadedDocuments";
import { WorkspaceSection } from "@/components/workspace/WorkspaceSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import {
  FileText,
  Download,
  Upload,
  Loader2,
  CheckCircle2,
  AlertCircle,
  CloudUpload,
  X,
  ChevronDown,
  Compass,
  FileSearch,
} from "lucide-react";
import { DocumentSharingPopover } from "@/components/sections/DocumentSharingPopover";
import { useAppStore } from "@/store/appStore";
import { toast } from "sonner";

// ── Type emoji mapping ─────────────────────────────────────────────────
function getTypeEmoji(type: string): string {
  const lower = type.toLowerCase();
  if (lower === "assessment") return "\uD83D\uDCDD";
  if (lower === "report") return "\uD83D\uDCCB";
  if (lower === "iep") return "\uD83D\uDCDA";
  if (lower === "prescription") return "\uD83D\uDC8A";
  return "\uD83D\uDCC4";
}

function getUploaderLabel(role: string): string {
  const lower = role.toLowerCase();
  if (lower === "family" || lower === "parent") return "You";
  if (lower === "doctor") return "Dr. Park";
  if (lower === "school") return "School";
  if (lower === "therapist") return "Therapist";
  return role;
}

// ── Doc types ──────────────────────────────────────────────────────────
const DOC_TYPES = [
  { value: "assessment", label: "Assessment" },
  { value: "report", label: "Report" },
  { value: "iep", label: "IEP" },
  { value: "prescription", label: "Prescription" },
  { value: "other", label: "Other" },
] as const;

type UploadStatus = "idle" | "uploading" | "success" | "error";

// ── Upload Form ────────────────────────────────────────────────────────
function UploadForm({ onSuccess }: { onSuccess: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState("other");
  const [childNickname, setChildNickname] = useState("");
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = useCallback(() => {
    setFile(null);
    setTitle("");
    setDocType("other");
    setChildNickname("");
    setStatus("idle");
    setErrorMsg("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleFile = useCallback(
    (f: File) => {
      setFile(f);
      if (!title) {
        const nameWithoutExt = f.name
          .replace(/\.[^.]+$/, "")
          .replace(/[_-]/g, " ");
        setTitle(nameWithoutExt);
      }
    },
    [title]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) handleFile(droppedFile);
    },
    [handleFile]
  );

  const [dragActive, setDragActive] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title || !docType) return;

    setStatus("uploading");
    setErrorMsg("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title);
    formData.append("doc_type", docType);
    if (childNickname) formData.append("child_nickname", childNickname);

    try {
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Upload failed (${res.status})`);
      }

      setStatus("success");
      onSuccess();
      setTimeout(resetForm, 1500);
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Upload failed");
    }
  };

  const isSubmitting = status === "uploading";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed
          px-4 py-6 cursor-pointer transition-all
          ${
            dragActive
              ? "border-primary bg-primary/5"
              : file
                ? "border-primary/30 bg-primary/3"
                : "border-border hover:border-primary/40 hover:bg-primary/3"
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.gif,.webp"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
        {file ? (
          <div className="flex items-center gap-3 w-full">
            <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-primary/8">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-foreground truncate">
                {file.name}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {(file.size / 1024).toFixed(0)} KB
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setFile(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <CloudUpload className="h-8 w-8 text-muted-foreground" />
            <div className="text-center">
              <p className="text-[13px] font-medium text-foreground">
                Drop a file here or click to browse
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                PDF, Word, or image files up to 20 MB
              </p>
            </div>
          </>
        )}
      </div>

      {/* Fields row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Title
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle((e.target as HTMLInputElement).value)}
            placeholder="e.g. Diagnosis Report"
            required
            disabled={isSubmitting}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Type
          </label>
          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            disabled={isSubmitting}
            className="h-8 w-full rounded-lg border border-input bg-warm-50 px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
          >
            {DOC_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Child (optional)
          </label>
          <Input
            value={childNickname}
            onChange={(e) =>
              setChildNickname((e.target as HTMLInputElement).value)
            }
            placeholder="Nickname"
            disabled={isSubmitting}
          />
        </div>
      </div>

      {/* Status + submit */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[12px] min-h-[20px]">
          {status === "uploading" && (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              <span className="text-muted-foreground">Uploading...</span>
            </>
          )}
          {status === "success" && (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
              <span className="text-green-700">Uploaded successfully</span>
            </>
          )}
          {status === "error" && (
            <>
              <AlertCircle className="h-3.5 w-3.5 text-red-500" />
              <span className="text-red-600">{errorMsg}</span>
            </>
          )}
        </div>
        <Button
          type="submit"
          size="sm"
          disabled={!file || !title || isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
          ) : (
            <Upload className="h-3.5 w-3.5 mr-1" />
          )}
          Upload
        </Button>
      </div>
    </form>
  );
}

// ── Uploaded doc type ──────────────────────────────────────────────────
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
  } | null;
}

// ── Document Card ──────────────────────────────────────────────────────
function DocumentCard({ doc }: { doc: UploadedDoc }) {
  const setChatOpen = useAppStore((s) => s.setChatOpen);

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString("en-CA", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return iso;
    }
  };

  const handleAskNavigator = () => {
    setChatOpen(true);
    toast(`Ask your Navigator about "${doc.title}"`, {
      description:
        "The chat is now open — type your question about this document.",
      duration: 4000,
    });
  };

  const handleGetSummary = () => {
    setChatOpen(true);
    toast(
      `Ask your Navigator to summarize "${doc.title}"`,
      {
        description:
          'Try: "Please summarize the document and tell me the key findings"',
        duration: 5000,
      }
    );
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md">
      {/* Card body */}
      <div className="px-5 py-4 space-y-3">
        {/* Header: emoji + title */}
        <div className="flex items-start gap-3">
          <span className="text-2xl shrink-0 mt-0.5" aria-hidden="true">
            {getTypeEmoji(doc.doc_type)}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-[14px] font-semibold text-foreground leading-snug truncate">
              {doc.title}
            </h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-primary/8 text-primary">
                {doc.doc_type}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {formatDate(doc.uploaded_at)}
              </span>
            </div>
          </div>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-3 text-[12px] text-muted-foreground">
          <span>
            Uploaded by:{" "}
            <span className="font-medium text-foreground">
              {getUploaderLabel(doc.uploader_role)}
            </span>
          </span>
          {doc.child_nickname && (
            <>
              <span className="text-border">&middot;</span>
              <span>Child: {doc.child_nickname}</span>
            </>
          )}
        </div>
      </div>

      {/* Actions footer */}
      <div className="px-5 py-3 border-t border-border bg-muted/30 flex items-center gap-1.5 flex-wrap">
        <DocumentSharingPopover
          docId={`uploaded-${doc.id}`}
          docTitle={doc.title}
        />

        {doc.download_url && (
          <a
            href={doc.download_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-primary/8 transition-colors"
            aria-label={`Download ${doc.title}`}
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Download</span>
          </a>
        )}

        <button
          onClick={handleAskNavigator}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-primary/8 transition-colors"
          aria-label={`Ask Navigator about ${doc.title}`}
        >
          <Compass className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Ask Navigator</span>
        </button>

        <button
          onClick={handleGetSummary}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-primary/8 transition-colors"
          aria-label={`Get summary of ${doc.title}`}
        >
          <FileSearch className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Get Summary</span>
        </button>
      </div>
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────
function EmptyVault() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <span className="text-4xl mb-3" aria-hidden="true">
        {"\uD83D\uDCC2"}
      </span>
      <h3 className="text-[15px] font-semibold text-foreground mb-1">
        No documents yet
      </h3>
      <p className="text-[13px] text-muted-foreground max-w-sm">
        Upload assessments, reports, IEPs, or prescriptions. Your Navigator
        agent can help you understand any document you add.
      </p>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────
export default function DocumentsPage() {
  const {
    data: uploadedDocs,
    isLoading: uploadsLoading,
    refetch: refetchUploads,
  } = useUploadedDocuments();

  const [uploadOpen, setUploadOpen] = useState(false);

  const handleUploadSuccess = () => {
    refetchUploads();
  };

  const docs = (uploadedDocs ?? []) as UploadedDoc[];
  const hasDocuments = docs.length > 0;

  return (
    <WorkspaceSection
      title="Document Vault"
      icon={"\uD83D\uDDC4\uFE0F"}
      isLoading={uploadsLoading}
    >
      {/* Upload section — collapsible */}
      <div className="mb-6">
        <Collapsible open={uploadOpen} onOpenChange={setUploadOpen}>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <CollapsibleTrigger className="w-full px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4 text-primary" />
                <span className="text-[14px] font-semibold text-foreground">
                  Upload Document
                </span>
              </div>
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                  uploadOpen ? "rotate-180" : ""
                }`}
              />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-5 py-4 border-t border-border">
                <UploadForm onSuccess={handleUploadSuccess} />
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      </div>

      {/* Document grid */}
      {hasDocuments ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {docs.map((doc) => (
            <DocumentCard key={doc.id} doc={doc} />
          ))}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <EmptyVault />
        </div>
      )}
    </WorkspaceSection>
  );
}
