"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUploadedDocuments } from "@/hooks/useUploadedDocuments";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
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
  Search,
  ArrowLeft,
  Calendar,
  User,
  Tag,
  HardDrive,
  Package,
  Check,
  Trash2,
} from "lucide-react";
import { DocumentSharingPopover } from "@/components/sections/DocumentSharingPopover";
import { useAppStore } from "@/store/appStore";
import { useParsedProfile } from "@/hooks/useWorkspace";
import { useFamily, useActiveAgent } from "@/hooks/useActiveAgent";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

// ── Category filters ──────────────────────────────────────────────────
const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "diagnosis", label: "Diagnosis" },
  { value: "assessment", label: "Assessments" },
  { value: "therapy", label: "Therapy" },
  { value: "school", label: "School" },
  { value: "medical", label: "Medical" },
] as const;

type CategoryValue = (typeof CATEGORIES)[number]["value"];

// ── Type icon mapping ─────────────────────────────────────────────────
function getTypeEmoji(type: string): string {
  const lower = type.toLowerCase();
  if (lower === "assessment") return "📝";
  if (lower === "diagnosis") return "🩺";
  if (lower === "report") return "📋";
  if (lower === "iep" || lower === "school") return "📚";
  if (lower === "prescription" || lower === "medical") return "💊";
  if (lower === "therapy") return "🧑\u200D\u2695\uFE0F";
  return "📄";
}


function getTypeBadgeColor(type: string): string {
  const lower = type.toLowerCase();
  if (lower === "diagnosis") return "bg-red-50 text-red-700 border-red-200";
  if (lower === "assessment") return "bg-blue-50 text-blue-700 border-blue-200";
  if (lower === "therapy") return "bg-purple-50 text-purple-700 border-purple-200";
  if (lower === "school" || lower === "iep") return "bg-green-50 text-green-700 border-green-200";
  if (lower === "medical" || lower === "prescription") return "bg-amber-50 text-amber-700 border-amber-200";
  if (lower === "report") return "bg-slate-50 text-slate-700 border-slate-200";
  return "bg-primary/8 text-primary border-primary/20";
}

function matchesCategory(docType: string, category: CategoryValue): boolean {
  if (category === "all") return true;
  const lower = docType.toLowerCase();
  if (category === "diagnosis") return lower === "diagnosis";
  if (category === "assessment") return lower === "assessment" || lower === "report";
  if (category === "therapy") return lower === "therapy";
  if (category === "school") return lower === "school" || lower === "iep";
  if (category === "medical") return lower === "medical" || lower === "prescription";
  return false;
}

// ── Doc types for upload ──────────────────────────────────────────────
const DOC_TYPES = [
  { value: "assessment", label: "Assessment" },
  { value: "diagnosis", label: "Diagnosis" },
  { value: "therapy", label: "Therapy" },
  { value: "school", label: "School" },
  { value: "medical", label: "Medical" },
  { value: "report", label: "Report" },
  { value: "iep", label: "IEP" },
  { value: "prescription", label: "Prescription" },
  { value: "other", label: "Other" },
] as const;

type UploadStatus = "idle" | "uploading" | "success" | "error";

// ── Uploaded doc type ─────────────────────────────────────────────────
interface UploadedDoc {
  id: string;
  title: string;
  doc_type: string;
  file_path: string;
  uploaded_at: string;
  uploaded_by: string;
  child_nickname: string | null;
  child_name: string | null;
  uploader_role: string;
  download_url: string | null;
  metadata: {
    original_filename?: string;
    content_type?: string;
    size_bytes?: number;
    tags?: string[];
  } | null;
}

// ── Date formatting ───────────────────────────────────────────────────
function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "numeric",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatDateLong(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatFileSize(bytes: number | undefined): string {
  if (!bytes) return "Unknown";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Upload Form ───────────────────────────────────────────────────────
function UploadForm({ onSuccess }: { onSuccess: () => void }) {
  const family = useFamily();
  const activeAgentId = useActiveAgent();
  const children = family.children ?? [];
  const defaultChildName = useMemo(() => {
    if (children.length === 0) return "";
    if (children.length === 1) return children[0].childName;
    const active = children.find((c) => c.agentId === activeAgentId);
    return active?.childName || "";
  }, [children, activeAgentId]);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState("other");
  const [childNickname, setChildNickname] = useState(defaultChildName);

  useEffect(() => {
    setChildNickname(defaultChildName);
  }, [defaultChildName]);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = useCallback(() => {
    setFile(null);
    setTitle("");
    setDocType("other");
    setChildNickname(defaultChildName);
    setStatus("idle");
    setErrorMsg("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [defaultChildName]);

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
    if (childNickname) {
      formData.append("child_nickname", childNickname);
      formData.append("child_name", childNickname);
    }

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
        {children.length > 1 && (
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Child
            </label>
            <select
              value={childNickname}
              onChange={(e) => setChildNickname(e.target.value)}
              disabled={isSubmitting}
              className="h-8 w-full rounded-lg border border-input bg-warm-50 px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
            >
              {children.map((c) => (
                <option key={c.agentId || c.childName} value={c.childName}>
                  {c.childName}
                </option>
              ))}
            </select>
          </div>
        )}
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

// ── Document List Card (left panel) ───────────────────────────────────
function DocumentListCard({
  doc,
  uploaderName,
  isSelected,
  onSelect,
  selectionMode,
  isChecked,
  onToggleCheck,
}: {
  doc: UploadedDoc;
  uploaderName: string;
  isSelected: boolean;
  onSelect: () => void;
  selectionMode: boolean;
  isChecked: boolean;
  onToggleCheck: () => void;
}) {
  return (
    <button
      type="button"
      onClick={selectionMode ? onToggleCheck : onSelect}
      className={`
        w-full text-left px-4 py-3 transition-all cursor-pointer
        border-l-[3px] hover:bg-muted/40
        ${
          isSelected && !selectionMode
            ? "border-l-primary bg-primary/4"
            : isChecked && selectionMode
              ? "border-l-primary bg-primary/4"
              : "border-l-transparent hover:border-l-primary/30"
        }
      `}
    >
      <div className="flex items-start gap-3">
        {selectionMode && (
          <div
            className={`
              shrink-0 mt-1 flex items-center justify-center w-5 h-5 rounded-md border-2 transition-all
              ${
                isChecked
                  ? "bg-primary border-primary"
                  : "border-border hover:border-primary/50"
              }
            `}
          >
            {isChecked && <Check className="h-3 w-3 text-primary-foreground" />}
          </div>
        )}
        <span className="text-xl shrink-0 mt-0.5" aria-hidden="true">
          {getTypeEmoji(doc.doc_type)}
        </span>
        <div className="min-w-0 flex-1">
          <h3
            className={`text-[13px] font-semibold leading-snug truncate ${
              isSelected ? "text-foreground" : "text-foreground/90"
            }`}
          >
            {doc.title}
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
            {uploaderName} &bull;{" "}
            {formatDate(doc.uploaded_at)}
          </p>
          <span
            className={`inline-block mt-1.5 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border ${getTypeBadgeColor(
              doc.doc_type
            )}`}
          >
            {doc.doc_type}
          </span>
        </div>
      </div>
    </button>
  );
}

// ── Analysis state type ──────────────────────────────────────────────
type AnalysisState = "idle" | "extracting" | "analyzing" | "done" | "error";

// ── Simple markdown renderer ─────────────────────────────────────────
function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let listItems: string[] = [];
  let listKey = 0;

  const flushList = () => {
    if (listItems.length > 0) {
      nodes.push(
        <ul key={`list-${listKey++}`} className="list-disc list-inside space-y-1 text-[13px] text-foreground/90 ml-1">
          {listItems.map((item, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: inlineFormat(item) }} />
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  const inlineFormat = (str: string): string => {
    return str
      .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`(.+?)`/g, '<code class="px-1 py-0.5 rounded bg-muted text-[12px] font-mono">$1</code>');
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      continue;
    }

    // Headers
    if (trimmed.startsWith("## ")) {
      flushList();
      nodes.push(
        <h3 key={i} className="text-[14px] font-bold text-foreground mt-4 mb-1.5 first:mt-0">
          {trimmed.slice(3)}
        </h3>
      );
      continue;
    }

    // Checkbox items
    if (trimmed.startsWith("- [ ] ") || trimmed.startsWith("- [x] ")) {
      flushList();
      const checked = trimmed.startsWith("- [x] ");
      const content = trimmed.slice(6);
      nodes.push(
        <label key={i} className="flex items-start gap-2 text-[13px] text-foreground/90 py-0.5">
          <input type="checkbox" defaultChecked={checked} className="mt-0.5 accent-primary" readOnly />
          <span dangerouslySetInnerHTML={{ __html: inlineFormat(content) }} />
        </label>
      );
      continue;
    }

    // List items (- or numbered)
    const bulletMatch = trimmed.match(/^[-*]\s+(.*)$/);
    const numberedMatch = trimmed.match(/^\d+\.\s+(.*)$/);
    if (bulletMatch) {
      listItems.push(bulletMatch[1]);
      continue;
    }
    if (numberedMatch) {
      listItems.push(numberedMatch[1]);
      continue;
    }

    // Regular paragraph
    flushList();
    nodes.push(
      <p key={i} className="text-[13px] text-foreground/90 leading-relaxed" dangerouslySetInnerHTML={{ __html: inlineFormat(trimmed) }} />
    );
  }

  flushList();
  return nodes;
}

// ── Analysis Result Display ──────────────────────────────────────────
function AnalysisResult({
  analysis,
  analysisState,
  analysisError,
  onRetry,
}: {
  analysis: string | null;
  analysisState: AnalysisState;
  analysisError: string | null;
  onRetry: () => void;
}) {
  if (analysisState === "idle") return null;

  if (analysisState === "extracting" || analysisState === "analyzing") {
    return (
      <div className="bg-primary/3 border border-primary/15 rounded-xl p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="relative">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-foreground">
              {analysisState === "extracting"
                ? "Reading document..."
                : "Navigator is analyzing..."}
            </h3>
            <p className="text-[11px] text-muted-foreground">
              {analysisState === "extracting"
                ? "Extracting text content from the file"
                : "Your Navigator agent is reviewing the document content"}
            </p>
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-1.5 bg-primary/10 rounded-full overflow-hidden">
            <div
              className={`h-full bg-primary/40 rounded-full transition-all duration-1000 ${
                analysisState === "extracting" ? "w-1/3" : "w-2/3"
              } animate-pulse`}
            />
          </div>
        </div>
      </div>
    );
  }

  if (analysisState === "error") {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h3 className="text-[13px] font-semibold text-red-800">
              Analysis failed
            </h3>
            <p className="text-[12px] text-red-600 mt-0.5">
              {analysisError || "Something went wrong. Please try again."}
            </p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-white border border-red-200 text-red-700 hover:bg-red-50 transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Done — show the analysis
  if (analysisState === "done" && analysis) {
    return (
      <div className="bg-gradient-to-br from-primary/3 to-primary/6 border border-primary/15 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-primary/10 flex items-center gap-2">
          <Compass className="h-4 w-4 text-primary" />
          <h3 className="text-[12px] font-semibold uppercase tracking-wide text-primary">
            Navigator Analysis
          </h3>
        </div>
        <div className="px-5 py-4 space-y-2">
          {renderMarkdown(analysis)}
        </div>
      </div>
    );
  }

  return null;
}

// ── Document Detail View (right panel) ────────────────────────────────
function DocumentDetail({
  doc,
  uploaderName,
  currentUserId,
  onBack,
  onDelete,
}: {
  doc: UploadedDoc;
  uploaderName: string;
  currentUserId: string | null | undefined;
  onBack: () => void;
  onDelete: (id: string) => void;
}) {
  const setChatOpen = useAppStore((s) => s.setChatOpen);
  const setPendingChatMessage = useAppStore((s) => s.setPendingChatMessage);
  const family = useFamily();

  const childAgentId = useMemo(() => {
    const candidates = [doc.child_name, doc.child_nickname]
      .filter((v): v is string => !!v)
      .map((v) => v.toLowerCase());
    if (candidates.length === 0) return undefined;
    const match = (family.children ?? []).find((c) =>
      candidates.some(
        (cand) =>
          c.childName.toLowerCase() === cand ||
          c.childName.toLowerCase().includes(cand) ||
          cand.includes(c.childName.toLowerCase())
      )
    );
    return match?.agentId || undefined;
  }, [doc.child_name, doc.child_nickname, family.children]);

  // Analysis state
  const [analysisState, setAnalysisState] = useState<AnalysisState>("idle");
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<"summary" | "insights" | null>(null);

  const runAnalysis = useCallback(
    async (action: "summary" | "insights") => {
      setLastAction(action);
      setAnalysisState("extracting");
      setAnalysis(null);
      setAnalysisError(null);

      try {
        // Brief delay then move to "analyzing" to show progress
        const progressTimer = setTimeout(() => {
          setAnalysisState((prev) =>
            prev === "extracting" ? "analyzing" : prev
          );
        }, 2000);

        const res = await fetch("/api/documents/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documentId: doc.id, action }),
        });

        clearTimeout(progressTimer);

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Analysis failed (${res.status})`);
        }

        const data = await res.json();
        setAnalysis(data.analysis);
        setAnalysisState("done");

        toast.success(
          action === "summary"
            ? "Document summary ready"
            : "Navigator insights ready"
        );
      } catch (err) {
        setAnalysisError(
          err instanceof Error ? err.message : "Analysis failed"
        );
        setAnalysisState("error");
      }
    },
    [doc.id]
  );

  const handleGetSummary = useCallback(() => {
    runAnalysis("summary");
  }, [runAnalysis]);

  const handleAskNavigator = useCallback(() => {
    runAnalysis("insights");
  }, [runAnalysis]);

  const handleRetry = useCallback(() => {
    if (lastAction) {
      runAnalysis(lastAction);
    }
  }, [lastAction, runAnalysis]);

  const handleAskNavigatorChat = useCallback(() => {
    const childLabel = doc.child_name || doc.child_nickname || "n/a";
    const primer = `Can you help me with the document "${doc.title}"? Context: type=${doc.doc_type}, uploaded=${formatDate(doc.uploaded_at)}, child=${childLabel}.`;
    setPendingChatMessage(primer);
    setChatOpen(true);
  }, [
    setChatOpen,
    setPendingChatMessage,
    doc.title,
    doc.doc_type,
    doc.uploaded_at,
    doc.child_name,
    doc.child_nickname,
  ]);

  const handleChatFollowUp = useCallback(() => {
    const primer = `I just analyzed the document "${doc.title}" (type: ${doc.doc_type}). I'd like to discuss the findings and next steps.`;
    setPendingChatMessage(primer);
    setChatOpen(true);
  }, [setChatOpen, setPendingChatMessage, doc.title, doc.doc_type]);

  const isAnalyzing =
    analysisState === "extracting" || analysisState === "analyzing";

  const tags = doc.metadata?.tags;

  return (
    <div className="h-full flex flex-col">
      {/* Mobile back button */}
      <div className="md:hidden px-4 py-3 border-b border-border">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to documents
        </button>
      </div>

      {/* Detail content */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {/* Title */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl" aria-hidden="true">
              {getTypeEmoji(doc.doc_type)}
            </span>
            <span
              className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded border ${getTypeBadgeColor(
                doc.doc_type
              )}`}
            >
              {doc.doc_type}
            </span>
          </div>
          <h2 className="font-heading text-xl font-bold text-foreground leading-tight">
            {doc.title}
          </h2>
        </div>

        {/* Metadata grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/6">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Author
              </p>
              <p className="text-[13px] font-medium text-foreground">
                {uploaderName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/6">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Date
              </p>
              <p className="text-[13px] font-medium text-foreground">
                {formatDateLong(doc.uploaded_at)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/6">
              <Tag className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Type
              </p>
              <p className="text-[13px] font-medium text-foreground capitalize">
                {doc.doc_type}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/6">
              <HardDrive className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Size
              </p>
              <p className="text-[13px] font-medium text-foreground">
                {formatFileSize(doc.metadata?.size_bytes)}
              </p>
            </div>
          </div>
        </div>

        {/* Analysis Result — shown inline when analysis is running or done */}
        <AnalysisResult
          analysis={analysis}
          analysisState={analysisState}
          analysisError={analysisError}
          onRetry={handleRetry}
        />

        {/* AI Document Analysis — on demand (hidden when analysis is showing) */}
        {analysisState === "idle" && (
          <div className="bg-muted/30 border border-border rounded-xl p-4">
            <h3 className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              AI Document Analysis
            </h3>
            <p className="text-[12px] text-muted-foreground mb-3">
              Your Navigator can read this document and provide a detailed analysis with key findings and action items.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={handleGetSummary}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-dashed border-primary/30 bg-primary/3 hover:bg-primary/6 hover:border-primary/50 transition-all text-[13px] font-medium text-primary"
              >
                <FileSearch className="h-4 w-4" />
                Get Summary
              </button>
              <button
                type="button"
                onClick={handleAskNavigator}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-dashed border-primary/30 bg-primary/3 hover:bg-primary/6 hover:border-primary/50 transition-all text-[13px] font-medium text-primary"
              >
                <Compass className="h-4 w-4" />
                Get Insights
              </button>
            </div>
          </div>
        )}

        {/* Follow-up actions after analysis is done */}
        {analysisState === "done" && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => runAnalysis(lastAction === "summary" ? "insights" : "summary")}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold bg-primary/6 border border-primary/15 text-primary hover:bg-primary/10 transition-colors"
            >
              {lastAction === "summary" ? (
                <>
                  <Compass className="h-3.5 w-3.5" />
                  Now Get Insights
                </>
              ) : (
                <>
                  <FileSearch className="h-3.5 w-3.5" />
                  Now Get Summary
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleChatFollowUp}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold bg-card border border-border text-foreground hover:bg-muted/50 transition-colors"
            >
              <Compass className="h-3.5 w-3.5" />
              Discuss with Navigator
            </button>
          </div>
        )}

        {/* Tags */}
        {tags && tags.length > 0 && (
          <div>
            <h3 className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Tags
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-primary/6 text-primary border border-primary/15"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 pt-2">
          {doc.download_url && (
            <a
              href={doc.download_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold bg-card border border-border text-foreground hover:bg-muted/50 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </a>
          )}

          <DocumentSharingPopover
            docId={`uploaded-${doc.id}`}
            docTitle={doc.title}
            childAgentId={childAgentId}
          />

          <button
            type="button"
            onClick={handleAskNavigatorChat}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold bg-card border border-border text-foreground hover:bg-muted/50 transition-colors"
          >
            <Compass className="h-3.5 w-3.5" />
            Ask Navigator
          </button>

          {currentUserId && doc.uploaded_by === currentUserId && (
            <Button
              variant="ghost"
              size="sm"
              className="text-status-blocked hover:bg-status-blocked/8"
              onClick={() => {
                if (window.confirm("Delete this document?")) {
                  onDelete(doc.id);
                }
              }}
            >
              <Trash2 className="size-3.5 mr-1" />
              Delete
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────
function EmptyVault() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <span className="text-4xl mb-3" aria-hidden="true">
        {"📂"}
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

// ── Empty detail placeholder ──────────────────────────────────────────
function EmptyDetail() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-8">
      <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
        <FileText className="h-7 w-7 text-muted-foreground/50" />
      </div>
      <h3 className="text-[15px] font-semibold text-foreground mb-1">
        Select a document
      </h3>
      <p className="text-[13px] text-muted-foreground max-w-xs">
        Choose a document from the list to view its details, get AI-powered
        insights, and share with your care team.
      </p>
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-52 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="flex gap-4 h-[calc(100dvh-220px)]">
        <div className="w-full md:w-[380px] space-y-1 bg-card border border-border rounded-xl p-3">
          <Skeleton className="h-8 w-full mb-2" />
          <Skeleton className="h-7 w-full mb-3" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[72px] w-full" />
          ))}
        </div>
        <div className="hidden md:block flex-1 bg-card border border-border rounded-xl p-6">
          <Skeleton className="h-6 w-40 mb-4" />
          <Skeleton className="h-8 w-64 mb-6" />
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────
export default function DocumentsPage() {
  const router = useRouter();
  const {
    data: uploadedDocs,
    isLoading: uploadsLoading,
    refetch: refetchUploads,
  } = useUploadedDocuments();

  const { data: profile } = useParsedProfile();
  const childName = profile?.basicInfo?.name || "your child";
  const family = useFamily();
  const activeAgentId = useActiveAgent();
  const activeChild = useMemo(
    () => family.children.find((c) => c.agentId === activeAgentId),
    [family.children, activeAgentId]
  );
  const isMultiChild = family.children.length > 1;

  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<CategoryValue>("all");
  const [selectionMode, setSelectionMode] = useState(false);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  // Current user id
  const { data: currentUserId } = useQuery({
    queryKey: ["current-user-id"],
    queryFn: async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      return user?.id ?? null;
    },
    staleTime: Infinity,
  });

  // Team members for uploader name lookup
  const { data: teamMembersData } = useQuery({
    queryKey: ["team-members-all"],
    queryFn: async () => {
      const res = await fetch("/api/team-members");
      return res.ok ? res.json() : { active: [], former: [] };
    },
  });

  const uploaderNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of [
      ...(teamMembersData?.active ?? []),
      ...(teamMembersData?.former ?? []),
    ]) {
      if (m.stakeholderUserId) map.set(m.stakeholderUserId, m.name);
    }
    return map;
  }, [teamMembersData]);

  function getUploaderName(doc: UploadedDoc): string {
    if (currentUserId && doc.uploaded_by === currentUserId) return "You";
    const name = uploaderNameById.get(doc.uploaded_by);
    if (name) return name;
    const roleMap: Record<string, string> = {
      doctor: "Doctor",
      therapist: "Therapist",
      school: "School",
      stakeholder: "Care Team",
      family: "Family",
      parent: "Family",
    };
    return roleMap[doc.uploader_role?.toLowerCase()] || "Care Team";
  }

  // Delete mutation
  const queryClient = useQueryClient();
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error || "Delete failed");
    },
    onSuccess: () => {
      toast.success("Document deleted");
      queryClient.invalidateQueries({ queryKey: ["uploaded-documents"] });
      setSelectedId(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const docs = useMemo(
    () => (uploadedDocs ?? []) as UploadedDoc[],
    [uploadedDocs]
  );

  // Filter documents
  const filteredDocs = useMemo(() => {
    return docs.filter((doc) => {
      const matchesSearch =
        !searchQuery ||
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.doc_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        getUploaderName(doc)
          .toLowerCase()
          .includes(searchQuery.toLowerCase());

      const matchesCat = matchesCategory(doc.doc_type, activeCategory);

      // Multi-child families filter by the TopBar's active child; single-child
      // families see all their docs by default.
      const matchesChild = (() => {
        if (!isMultiChild || !activeChild) return true;
        const activeFirst = activeChild.childName.split(" ")[0].toLowerCase();
        const activeFull = activeChild.childName.toLowerCase();
        const cn = doc.child_name?.toLowerCase() || "";
        const nick = doc.child_nickname?.toLowerCase() || "";
        // A doc with no child scope is shown on every child's view.
        if (!cn && !nick) return true;
        return (
          cn === activeFull ||
          cn === activeFirst ||
          cn.includes(activeFirst) ||
          activeFull.includes(cn) ||
          nick === activeFirst ||
          nick.includes(activeFirst)
        );
      })();

      return matchesSearch && matchesCat && matchesChild;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docs, searchQuery, activeCategory, isMultiChild, activeChild, currentUserId, uploaderNameById]);

  const selectedDoc = useMemo(
    () => docs.find((d) => d.id === selectedId) || null,
    [docs, selectedId]
  );

  const handleUploadSuccess = () => {
    refetchUploads();
    setUploadOpen(false);
  };

  const handleSelectDoc = (id: string) => {
    setSelectedId(id);
  };

  const handleBack = () => {
    setSelectedId(null);
  };

  const handleToggleCheck = useCallback((id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleEnterSelectionMode = useCallback(() => {
    setSelectionMode(true);
    setCheckedIds(new Set());
  }, []);

  const handleExitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setCheckedIds(new Set());
  }, []);

  const handleSelectAll = useCallback(() => {
    setCheckedIds(new Set(filteredDocs.map((d) => d.id)));
  }, [filteredDocs]);

  const handleGeneratePacket = useCallback(() => {
    if (checkedIds.size === 0) {
      toast("Select at least one document to create a packet.");
      return;
    }
    try {
      localStorage.setItem(
        "packet_selected_ids",
        JSON.stringify(Array.from(checkedIds))
      );
    } catch {
      // storage full
    }
    router.push("/documents/packet");
  }, [checkedIds, router]);

  if (uploadsLoading) {
    return (
      <div className="space-y-4">
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <span className="text-2xl" aria-hidden="true">
              {"📄"}
            </span>
            Document Vault
          </h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {childName}&apos;s documents in one place
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectionMode ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
              >
                <Check className="h-3.5 w-3.5 mr-1" />
                Select All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExitSelectionMode}
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleGeneratePacket}
                disabled={checkedIds.size === 0}
              >
                <Package className="h-3.5 w-3.5 mr-1" />
                Generate Packet{checkedIds.size > 0 ? ` (${checkedIds.size})` : ""}
              </Button>
            </>
          ) : (
            <>
              {docs.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEnterSelectionMode}
                >
                  <Package className="h-3.5 w-3.5 mr-1" />
                  Share Packet
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setUploadOpen(!uploadOpen)}
              >
                <Upload className="h-3.5 w-3.5 mr-1" />
                Upload
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Upload section — collapsible */}
      {uploadOpen && (
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
      )}

      {/* Selection mode banner */}
      {selectionMode && (
        <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
          <Package className="h-4 w-4 text-primary shrink-0" />
          <p className="text-[13px] text-foreground flex-1">
            <span className="font-semibold">Selection mode:</span> Tap documents
            to include in your shareable packet.{" "}
            {checkedIds.size > 0 && (
              <span className="text-primary font-medium">
                {checkedIds.size} selected
              </span>
            )}
          </p>
        </div>
      )}

      {/* Two-panel layout */}
      {docs.length === 0 ? (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <EmptyVault />
        </div>
      ) : (
        <div className="flex gap-0 md:gap-4 h-[calc(100dvh-220px)]">
          {/* Left panel — document list */}
          <div
            className={`
              w-full md:w-[380px] md:shrink-0 bg-card border border-border rounded-xl overflow-hidden flex flex-col
              ${selectedDoc ? "hidden md:flex" : "flex"}
            `}
          >
            {/* Search */}
            <div className="px-3 pt-3 pb-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) =>
                    setSearchQuery((e.target as HTMLInputElement).value)
                  }
                  placeholder="Search documents..."
                  className="pl-8 h-8 text-[13px]"
                />
              </div>
            </div>

            {/* Category pills */}
            <div className="px-3 pb-2 flex gap-1 flex-wrap">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setActiveCategory(cat.value)}
                  className={`
                    px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all
                    ${
                      activeCategory === cat.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                    }
                  `}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Divider */}
            <div className="border-t border-border" />

            {/* Document list */}
            <ScrollArea className="flex-1">
              {filteredDocs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <Search className="h-6 w-6 text-muted-foreground/40 mb-2" />
                  <p className="text-[13px] text-muted-foreground">
                    No documents match your filters
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredDocs.map((doc) => (
                    <DocumentListCard
                      key={doc.id}
                      doc={doc}
                      uploaderName={getUploaderName(doc)}
                      isSelected={selectedId === doc.id}
                      onSelect={() => handleSelectDoc(doc.id)}
                      selectionMode={selectionMode}
                      isChecked={checkedIds.has(doc.id)}
                      onToggleCheck={() => handleToggleCheck(doc.id)}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Right panel — document detail */}
          <div
            className={`
              flex-1 bg-card border border-border rounded-xl overflow-hidden
              ${selectedDoc ? "flex flex-col" : "hidden md:flex md:flex-col"}
            `}
          >
            {selectedDoc ? (
              <DocumentDetail
                doc={selectedDoc}
                uploaderName={getUploaderName(selectedDoc)}
                currentUserId={currentUserId}
                onBack={handleBack}
                onDelete={(id) => deleteMutation.mutate(id)}
              />
            ) : (
              <EmptyDetail />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
