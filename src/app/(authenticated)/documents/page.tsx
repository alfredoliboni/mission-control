"use client";

import { useState, useRef, useCallback } from "react";
import { useParsedDocuments } from "@/hooks/useWorkspace";
import { useUploadedDocuments } from "@/hooks/useUploadedDocuments";
import { WorkspaceSection } from "@/components/workspace/WorkspaceSection";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FileText,
  Eye,
  Download,
  ImageIcon,
  FileIcon,
  Upload,
  Loader2,
  CheckCircle2,
  AlertCircle,
  CloudUpload,
  X,
} from "lucide-react";
import { MarkdownRenderer } from "@/components/workspace/MarkdownRenderer";
import type { DocumentEntry } from "@/types/workspace";

function getDocIcon(type: string) {
  const lower = type.toLowerCase();
  if (lower.includes("diagnosis") || lower.includes("financial") || lower.includes("therapy"))
    return FileText;
  if (lower.includes("image") || lower.includes("photo"))
    return ImageIcon;
  return FileIcon;
}

function isImageType(title: string) {
  return /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(title);
}

const DOC_TYPES = [
  { value: "assessment", label: "Assessment" },
  { value: "report", label: "Report" },
  { value: "iep", label: "IEP" },
  { value: "prescription", label: "Prescription" },
  { value: "other", label: "Other" },
] as const;

type UploadStatus = "idle" | "uploading" | "success" | "error";

function UploadForm({ onSuccess }: { onSuccess: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState("other");
  const [childNickname, setChildNickname] = useState("");
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [dragActive, setDragActive] = useState(false);
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

  const handleFile = useCallback((f: File) => {
    setFile(f);
    if (!title) {
      // Auto-fill title from filename (without extension)
      const nameWithoutExt = f.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ");
      setTitle(nameWithoutExt);
    }
  }, [title]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) handleFile(droppedFile);
    },
    [handleFile]
  );

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

      // Reset after a brief pause so the user sees the success state
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
          ${dragActive
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
            onChange={(e) => setChildNickname((e.target as HTMLInputElement).value)}
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

export default function DocumentsPage() {
  const { data: documents, isLoading } = useParsedDocuments();
  const {
    data: uploadedDocs,
    isLoading: uploadsLoading,
    refetch: refetchUploads,
  } = useUploadedDocuments();
  const [selectedDoc, setSelectedDoc] = useState<DocumentEntry | null>(null);
  const [showUploadForm, setShowUploadForm] = useState(false);

  // Find matching summary for the selected document
  const matchingSummary = selectedDoc
    ? documents?.summaries.find(
        (s) =>
          s.title.toLowerCase().includes(selectedDoc.title.toLowerCase().split("\u2014")[0].trim()) ||
          selectedDoc.title.toLowerCase().includes(s.title.toLowerCase().split("\u2014")[0].trim())
      )
    : null;

  const handleUploadSuccess = () => {
    refetchUploads();
  };

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

  return (
    <WorkspaceSection title="Documents" icon="\uD83D\uDCC4" isLoading={isLoading}>
      {/* Upload section */}
      <div className="mb-6">
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-foreground">
              Upload Document
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowUploadForm(!showUploadForm)}
            >
              {showUploadForm ? (
                <>
                  <X className="h-3.5 w-3.5 mr-1" />
                  Close
                </>
              ) : (
                <>
                  <Upload className="h-3.5 w-3.5 mr-1" />
                  New Upload
                </>
              )}
            </Button>
          </div>
          {showUploadForm && (
            <div className="px-5 py-4">
              <UploadForm onSuccess={handleUploadSuccess} />
            </div>
          )}
        </div>
      </div>

      {/* Uploaded documents from Supabase */}
      {(uploadsLoading || (uploadedDocs && uploadedDocs.length > 0)) && (
        <div className="mb-6">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="text-[15px] font-semibold text-foreground">
                Uploaded Documents
              </h2>
            </div>
            {uploadsLoading ? (
              <div className="px-5 py-8 flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-[13px]">Loading uploads...</span>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[12px] font-medium text-muted-foreground">Date</TableHead>
                    <TableHead className="text-[12px] font-medium text-muted-foreground">Title</TableHead>
                    <TableHead className="text-[12px] font-medium text-muted-foreground">Type</TableHead>
                    <TableHead className="text-[12px] font-medium text-muted-foreground">Child</TableHead>
                    <TableHead className="text-[12px] font-medium text-muted-foreground w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(uploadedDocs as UploadedDoc[])?.map((doc) => (
                    <TableRow key={doc.id} className="hover:bg-primary/4 transition-colors">
                      <TableCell className="text-[12px] text-muted-foreground whitespace-nowrap">
                        {formatDate(doc.uploaded_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary shrink-0" />
                          <span className="text-[13px] font-medium text-foreground">{doc.title}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-primary/8 text-primary">
                          {doc.doc_type}
                        </span>
                      </TableCell>
                      <TableCell className="text-[12px] text-muted-foreground">
                        {doc.child_nickname || "\u2014"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {doc.download_url && (
                            <a
                              href={doc.download_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-1.5 rounded-md hover:bg-primary/8 transition-colors text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                              aria-label={`Download ${doc.title}`}
                            >
                              <Download className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      )}

      {/* Workspace documents (agent-parsed from .md) */}
      {documents && (
        <div className="space-y-6">
          {/* Documents card */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="text-[15px] font-semibold text-foreground">
                Agent Documents
              </h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Parsed from your Navigator agent&apos;s workspace
              </p>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[12px] font-medium text-muted-foreground">Date</TableHead>
                  <TableHead className="text-[12px] font-medium text-muted-foreground">Title</TableHead>
                  <TableHead className="text-[12px] font-medium text-muted-foreground">From</TableHead>
                  <TableHead className="text-[12px] font-medium text-muted-foreground">Type</TableHead>
                  <TableHead className="text-[12px] font-medium text-muted-foreground w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.documents.map((doc, i) => (
                  <TableRow
                    key={i}
                    className="cursor-pointer hover:bg-primary/4 transition-colors"
                    onClick={() => setSelectedDoc(doc)}
                  >
                    <TableCell className="text-[12px] text-muted-foreground whitespace-nowrap">
                      {doc.date}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-[13px] font-medium text-foreground">{doc.title}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-[12px] text-muted-foreground">{doc.from}</TableCell>
                    <TableCell>
                      <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-primary/8 text-primary">
                        {doc.type}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDoc(doc);
                          }}
                          className="p-1.5 rounded-md hover:bg-primary/8 transition-colors text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          aria-label={`View ${doc.title}`}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 rounded-md hover:bg-primary/8 transition-colors text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          aria-label={`Download ${doc.title}`}
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Summaries */}
          {documents.summaries.length > 0 && (
            <section>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                Agent Summaries
              </p>
              <div className="space-y-3">
                {documents.summaries.map((summary, i) => (
                  <div key={i} className="bg-card border border-border rounded-xl p-4 transition-all hover:-translate-y-0.5 hover:shadow-md">
                    <h3 className="text-[14px] font-semibold text-foreground mb-2">
                      {summary.title}
                    </h3>
                    <div className="text-[12px] text-muted-foreground">
                      <MarkdownRenderer
                        content={summary.findings
                          .map((f) => `- ${f}`)
                          .join("\n")}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Document preview dialog */}
      <Dialog open={!!selectedDoc} onOpenChange={(open) => !open && setSelectedDoc(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[15px] font-semibold">{selectedDoc?.title}</DialogTitle>
            <DialogDescription>
              {selectedDoc?.from} &middot; {selectedDoc?.date} &middot;{" "}
              <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-primary/8 text-primary">
                {selectedDoc?.type}
              </span>
            </DialogDescription>
          </DialogHeader>

          {/* Preview area */}
          <div className="rounded-xl border border-border bg-card p-6 min-h-[200px] flex flex-col items-center justify-center gap-3">
            {selectedDoc && isImageType(selectedDoc.title) ? (
              <div className="text-center space-y-2">
                <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto" />
                <p className="text-[13px] text-muted-foreground">Image preview</p>
                <p className="text-[11px] text-muted-foreground">{selectedDoc.storageLink}</p>
              </div>
            ) : (
              <div className="text-center space-y-2">
                {(() => {
                  const DocIcon = selectedDoc ? getDocIcon(selectedDoc.type) : FileText;
                  return <DocIcon className="h-12 w-12 text-muted-foreground mx-auto" />;
                })()}
                <p className="text-[13px] font-medium text-foreground">
                  {selectedDoc?.title}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  PDF document &middot; {selectedDoc?.storageLink}
                </p>
              </div>
            )}

            {/* Show matching summary if found */}
            {matchingSummary && (
              <div className="w-full mt-4 pt-4 border-t border-border">
                <p className="text-[12px] font-semibold text-foreground mb-2">
                  Agent Summary
                </p>
                <div className="text-[12px] text-muted-foreground">
                  <MarkdownRenderer
                    content={matchingSummary.findings
                      .map((f) => `- ${f}`)
                      .join("\n")}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm">
              <Download className="h-3.5 w-3.5 mr-1" />
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </WorkspaceSection>
  );
}
