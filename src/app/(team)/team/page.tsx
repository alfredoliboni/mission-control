"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createClient as createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRealtimeMessages } from "@/hooks/useRealtimeMessages";
import { PatientList, type PatientRow } from "./components/PatientList";
import {
  User,
  FileText,
  MessageSquare,
  Upload,
  Download,
  CloudUpload,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Send,
  X,
  Trash2,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────

interface FamilyInfo {
  familyId: string;
  childName: string;
  familyName: string;
  agentId: string;
  childAge: string;
  diagnosis: string;
}

interface TeamProfileResponse {
  family: FamilyInfo;
  // Legacy flat fields
  name: string;
  age: string;
  diagnosis: string;
  familyName: string;
}

interface ChildProfile {
  name: string;
  age: string;
  diagnosis: string;
  familyName: string;
}

interface TeamDocument {
  id: string;
  title: string;
  doc_type: string;
  file_path: string;
  uploaded_at: string;
  uploader_role: string;
  uploaded_by: string;
  download_url: string | null;
  metadata: {
    original_filename?: string;
    content_type?: string;
    size_bytes?: number;
  } | null;
}

interface TeamMessage {
  id: string;
  family_id: string;
  thread_id: string;
  thread_subject: string;
  sender_id: string;
  sender_role: string;
  sender_name?: string;
  recipient_id?: string;
  recipient_name?: string;
  content: string;
  created_at: string;
}

interface TeamContact {
  id: string;
  stakeholder_id: string;
  family_id: string;
  name: string;
  role: string;
  organization?: string;
}

interface TeamThread {
  id: string;
  subject: string;
  messages: TeamMessage[];
  lastMessage: TeamMessage;
}

type UploadStatus = "idle" | "uploading" | "success" | "error";

// ── Fetch helpers ────────────────────────────────────────────────────────

async function fetchTeamProfile(patientId?: string): Promise<TeamProfileResponse> {
  const url = patientId
    ? `/api/team/profile?patient=${encodeURIComponent(patientId)}`
    : "/api/team/profile";
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch child profile");
  return res.json();
}

async function fetchTeamDocuments(patientId?: string): Promise<TeamDocument[]> {
  const url = patientId
    ? `/api/team/documents?patient=${encodeURIComponent(patientId)}`
    : "/api/team/documents";
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 401) return [];
    throw new Error("Failed to fetch documents");
  }
  const data = await res.json();
  return data.documents ?? [];
}

async function fetchTeamMessages(patientId?: string): Promise<TeamThread[]> {
  const url = patientId
    ? `/api/team/messages?patient=${encodeURIComponent(patientId)}`
    : "/api/team/messages";
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 401) return [];
    throw new Error("Failed to fetch messages");
  }
  const data = await res.json();
  return data.threads ?? [];
}

async function sendTeamMessage(body: {
  thread_id?: string;
  new_thread_subject?: string;
  recipient_id?: string;
  recipient_name?: string;
  content: string;
  patient?: string;
}): Promise<void> {
  const res = await fetch("/api/team/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to send message");
  }
}

async function fetchTeamContacts(patientId: string): Promise<TeamContact[]> {
  const res = await fetch(`/api/team/contacts?patient=${encodeURIComponent(patientId)}`);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.contacts ?? []).map((c: { id: string; userId: string; name: string; role: string; organization?: string }) => ({
    id: c.id,
    stakeholder_id: c.userId,
    family_id: "",
    name: c.name,
    role: c.role,
    organization: c.organization,
  }));
}

// ── Helpers ──────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function formatFileSize(bytes: number | undefined): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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

// ── DOC TYPES for upload ─────────────────────────────────────────────────

const DOC_TYPES = [
  { value: "assessment", label: "Assessment" },
  { value: "report", label: "Report" },
  { value: "iep", label: "IEP" },
  { value: "prescription", label: "Prescription" },
  { value: "other", label: "Other" },
] as const;

// ── Child Overview Section ───────────────────────────────────────────────

function ChildOverview({
  profile,
  isLoading,
}: {
  profile: ChildProfile | undefined;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-[15px] font-semibold text-foreground">
            Child Overview
          </h2>
        </div>
        <p className="text-[13px] text-muted-foreground">
          Profile information is not available at this time.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl">
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-[15px] font-semibold text-foreground">
            Child Overview
          </h2>
          <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-muted-foreground px-2 py-0.5 bg-muted rounded">
            Read Only
          </span>
        </div>
      </div>
      <div className="px-5 py-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Name
            </p>
            <p className="text-[14px] font-semibold text-foreground">
              {profile.name}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Age
            </p>
            <p className="text-[14px] font-semibold text-foreground">
              {profile.age}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Diagnosis
            </p>
            <p className="text-[14px] font-semibold text-foreground">
              {profile.diagnosis}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Upload Form ──────────────────────────────────────────────────────────

function TeamUploadForm({
  onSuccess,
  selectedPatientId,
}: {
  onSuccess: () => void;
  selectedPatientId?: string;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState("other");
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = useCallback(() => {
    setFile(null);
    setTitle("");
    setDocType("other");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title || !docType || !selectedPatientId) return;

    setStatus("uploading");
    setErrorMsg("");

    try {
      // 1. Ask server for a signed upload URL
      const prepRes = await fetch("/api/team/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "prepare",
          patient: selectedPatientId,
          filename: file.name,
        }),
      });
      if (!prepRes.ok) {
        const data = await prepRes.json().catch(() => ({}));
        throw new Error(data.error || `Upload prep failed (${prepRes.status})`);
      }
      const { storagePath, token } = await prepRes.json();

      // 2. Upload directly to Supabase Storage (bypasses Next dev server)
      const supabase = createSupabaseBrowserClient();
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .uploadToSignedUrl(storagePath, token, file, {
          contentType: file.type || "application/octet-stream",
        });
      if (uploadError) {
        throw new Error(uploadError.message || "Failed to upload file");
      }

      // 3. Finalize: insert DB row + self-grant permission
      const finalizeRes = await fetch("/api/team/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "finalize",
          patient: selectedPatientId,
          storagePath,
          title,
          doc_type: docType,
          file_name: file.name,
          content_type: file.type,
          size_bytes: file.size,
        }),
      });
      if (!finalizeRes.ok) {
        const data = await finalizeRes.json().catch(() => ({}));
        throw new Error(data.error || `Finalize failed (${finalizeRes.status})`);
      }

      setStatus("success");
      toast.success("Document uploaded successfully");
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Title
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle((e.target as HTMLInputElement).value)}
            placeholder="e.g. Assessment Report"
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

// ── Documents Section ────────────────────────────────────────────────────

function DocumentsSection({
  selectedPatientId,
  currentUserId,
}: {
  selectedPatientId?: string;
  currentUserId: string | null;
}) {
  const queryClient = useQueryClient();
  const {
    data: documents = [],
    isLoading,
  } = useQuery({
    queryKey: ["team-documents", selectedPatientId],
    queryFn: () => fetchTeamDocuments(selectedPatientId),
    staleTime: 30_000,
    enabled: !!selectedPatientId,
  });

  const handleUploadSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["team-documents", selectedPatientId] });
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete document");
      }
    },
    onSuccess: () => {
      toast.success("Document deleted");
      queryClient.invalidateQueries({ queryKey: ["team-documents", selectedPatientId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="bg-card border border-border rounded-xl">
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-[15px] font-semibold text-foreground">
            Documents
          </h2>
        </div>
        <p className="text-[12px] text-muted-foreground mt-1">
          Upload assessments, reports, or IEPs. Documents shared with you by the
          family will also appear here.
        </p>
      </div>

      {/* Upload form */}
      <div className="px-5 py-4 border-b border-border bg-muted/20">
        <h3 className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Upload a Document
        </h3>
        <TeamUploadForm onSuccess={handleUploadSuccess} selectedPatientId={selectedPatientId} />
      </div>

      {/* Document list */}
      <div className="px-5 py-4">
        <h3 className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          All Documents
        </h3>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-[13px] text-muted-foreground">
              No documents yet. Upload your first document above.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/30 transition-colors"
              >
                <span className="text-xl shrink-0" aria-hidden="true">
                  {getTypeEmoji(doc.doc_type)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-foreground truncate">
                    {doc.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground px-1.5 py-0.5 rounded bg-muted">
                      {doc.doc_type}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {formatDate(doc.uploaded_at)}
                    </span>
                    {doc.metadata?.size_bytes && (
                      <span className="text-[11px] text-muted-foreground">
                        &middot; {formatFileSize(doc.metadata.size_bytes)}
                      </span>
                    )}
                  </div>
                </div>
                {doc.download_url && (
                  <a
                    href={doc.download_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-card border border-border text-foreground hover:bg-muted/50 transition-colors"
                  >
                    <Download className="h-3 w-3" />
                    Download
                  </a>
                )}
                {currentUserId && doc.uploaded_by === currentUserId && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Delete "${doc.title}"? This cannot be undone.`)) {
                        deleteMutation.mutate(doc.id);
                      }
                    }}
                    disabled={deleteMutation.isPending}
                    title="Delete this document"
                    className="shrink-0 inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold text-muted-foreground hover:text-[#c96442] hover:bg-[#c96442]/8 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Messages Section ─────────────────────────────────────────────────────

function MessagesSection({
  selectedPatientId,
  currentUserId,
}: {
  selectedPatientId?: string;
  currentUserId: string | null;
}) {
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [selectedContactId, setSelectedContactId] = useState<string>("family");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const deleteThreadMutation = useMutation({
    mutationFn: async (threadId: string) => {
      const res = await fetch(
        `/api/team/messages/${threadId}?scope=thread`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete thread");
      }
    },
    onSuccess: (_data, threadId) => {
      toast.success("Conversation deleted");
      if (selectedThread === threadId) setSelectedThread(null);
      queryClient.invalidateQueries({ queryKey: ["team-messages", selectedPatientId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const res = await fetch(`/api/team/messages/${messageId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete message");
      }
    },
    onSuccess: () => {
      toast.success("Message deleted");
      queryClient.invalidateQueries({ queryKey: ["team-messages", selectedPatientId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Subscribe to realtime message inserts for instant updates
  useRealtimeMessages(selectedPatientId, ["team-messages", selectedPatientId ?? ""]);

  const {
    data: threads = [],
    isLoading,
  } = useQuery({
    queryKey: ["team-messages", selectedPatientId],
    queryFn: () => fetchTeamMessages(selectedPatientId),
    staleTime: 15_000,
    refetchInterval: 60_000,
    enabled: !!selectedPatientId,
  });

  // Fetch contacts (family + other linked stakeholders)
  const { data: contacts = [] } = useQuery({
    queryKey: ["team-contacts", selectedPatientId],
    queryFn: () => fetchTeamContacts(selectedPatientId!),
    staleTime: 60_000,
    enabled: !!selectedPatientId,
  });

  const selectedContact = contacts.find(
    (c) => c.stakeholder_id === selectedContactId
  );

  const sendMutation = useMutation({
    mutationFn: sendTeamMessage,
    onSuccess: () => {
      setNewMessage("");
      setNewSubject("");
      queryClient.invalidateQueries({ queryKey: ["team-messages", selectedPatientId] });
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 200);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to send message");
    },
  });

  const activeThread = useMemo(
    () => threads.find((t) => t.id === selectedThread) ?? null,
    [threads, selectedThread]
  );

  const handleSend = () => {
    const content = newMessage.trim();
    if (!content || !selectedPatientId) return;

    if (activeThread) {
      sendMutation.mutate({
        thread_id: activeThread.id,
        content,
        patient: selectedPatientId,
      });
    } else {
      sendMutation.mutate({
        new_thread_subject: newSubject.trim() || "New Message",
        recipient_id: selectedContact?.stakeholder_id,
        recipient_name: selectedContact?.name,
        content,
        patient: selectedPatientId,
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl">
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-[15px] font-semibold text-foreground">
            Messages
          </h2>
        </div>
        <p className="text-[12px] text-muted-foreground mt-1">
          Communicate with the family about their child&apos;s care.
        </p>
      </div>

      <div className="flex h-[400px]">
        {/* Thread list */}
        <div className="w-[240px] shrink-0 border-r border-border flex flex-col">
          <div className="px-3 py-2 border-b border-border">
            <button
              type="button"
              onClick={() => setSelectedThread(null)}
              className="w-full text-[12px] font-semibold text-primary hover:text-primary/80 transition-colors text-left"
            >
              + New Conversation
            </button>
          </div>
          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="p-3 space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : threads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 px-3 text-center">
                <MessageSquare className="h-6 w-6 text-muted-foreground/40 mb-2" />
                <p className="text-[11px] text-muted-foreground">
                  No conversations yet
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {threads.map((thread) => (
                  <div
                    key={thread.id}
                    onClick={() => setSelectedThread(thread.id)}
                    className={`
                      group relative w-full text-left px-3 py-2.5 transition-colors cursor-pointer
                      ${
                        selectedThread === thread.id
                          ? "bg-primary/5 border-l-2 border-l-primary"
                          : "hover:bg-muted/30 border-l-2 border-l-transparent"
                      }
                    `}
                  >
                    <p className="text-[12px] font-semibold text-foreground truncate pr-6">
                      {thread.subject}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                      {thread.lastMessage.sender_name
                        ? `${thread.lastMessage.sender_name}: `
                        : ""}
                      {thread.lastMessage.content.slice(0, 50)}
                      {thread.lastMessage.content.length > 50 ? "..." : ""}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {formatDate(thread.lastMessage.created_at)}
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (
                          confirm(
                            `Delete conversation "${thread.subject}"? This removes it for everyone in the thread.`
                          )
                        ) {
                          deleteThreadMutation.mutate(thread.id);
                        }
                      }}
                      disabled={deleteThreadMutation.isPending}
                      title="Delete conversation"
                      className="absolute top-2 right-2 p-1 rounded-md text-muted-foreground hover:text-[#c96442] hover:bg-[#c96442]/8 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Message content */}
        <div className="flex-1 flex flex-col">
          {activeThread ? (
            <>
              {/* Thread header */}
              <div className="px-4 py-2.5 border-b border-border bg-muted/20">
                <p className="text-[13px] font-semibold text-foreground">
                  {activeThread.subject}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {activeThread.messages.length} message
                  {activeThread.messages.length !== 1 ? "s" : ""}
                </p>
              </div>
              {/* Messages */}
              <ScrollArea className="flex-1 px-4 py-3">
                <div className="space-y-3">
                  {activeThread.messages.map((msg) => {
                    const isStakeholder = msg.sender_role !== "parent";
                    const senderLabel =
                      msg.sender_name ||
                      (msg.sender_role === "parent" ? "Family" : msg.sender_role);
                    const isOwn = currentUserId !== null && msg.sender_id === currentUserId;
                    return (
                      <div
                        key={msg.id}
                        className={`group flex ${isStakeholder ? "justify-end" : "justify-start"}`}
                      >
                        {isOwn && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm("Delete this message? This cannot be undone.")) {
                                deleteMessageMutation.mutate(msg.id);
                              }
                            }}
                            disabled={deleteMessageMutation.isPending}
                            title="Delete message"
                            className="self-center mr-1 p-1 rounded-md text-muted-foreground hover:text-[#c96442] hover:bg-[#c96442]/8 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                        <div
                          className={`max-w-[80%] rounded-xl px-3.5 py-2.5 ${
                            isStakeholder
                              ? "bg-primary/10 border border-primary/20"
                              : "bg-muted/50 border border-border"
                          }`}
                        >
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                            {senderLabel}
                          </p>
                          <p className="text-[13px] text-foreground leading-relaxed">
                            {msg.content}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-1 text-right">
                            {formatTime(msg.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            </>
          ) : (
            <>
              {/* New conversation with contact picker */}
              <div className="px-4 py-2.5 border-b border-border bg-muted/20">
                <p className="text-[13px] font-semibold text-foreground">
                  New Conversation
                </p>
              </div>
              <div className="flex-1 flex flex-col px-4 py-3 overflow-y-auto">
                {/* Contact picker */}
                <div className="mb-3">
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">
                    To
                  </label>
                  {contacts.length === 0 ? (
                    <p className="text-[12px] text-muted-foreground">
                      Loading contacts...
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {contacts.map((contact) => {
                        const isSelected = selectedContactId === contact.stakeholder_id;
                        return (
                          <button
                            key={contact.stakeholder_id}
                            type="button"
                            onClick={() => setSelectedContactId(contact.stakeholder_id)}
                            className={`
                              w-full text-left px-3 py-2 rounded-lg border transition-colors flex items-center gap-2.5
                              ${
                                isSelected
                                  ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                                  : "border-border hover:border-primary/30 hover:bg-muted/30"
                              }
                            `}
                          >
                            <div className="shrink-0 w-7 h-7 rounded-full bg-primary flex items-center justify-center text-[11px] font-semibold text-white">
                              {contact.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[12px] font-semibold text-foreground truncate">
                                {contact.name}
                              </p>
                              <p className="text-[10px] text-muted-foreground truncate">
                                {contact.role}
                                {contact.organization ? ` — ${contact.organization}` : ""}
                              </p>
                            </div>
                            {isSelected && (
                              <svg className="h-4 w-4 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Subject */}
                <div className="mb-2">
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">
                    Subject
                  </label>
                  <Input
                    value={newSubject}
                    onChange={(e) =>
                      setNewSubject((e.target as HTMLInputElement).value)
                    }
                    placeholder="e.g., Assessment Follow-up"
                    className="h-8 text-[13px]"
                  />
                </div>
              </div>
            </>
          )}

          {/* Compose */}
          <div className="px-4 py-3 border-t border-border">
            <div className="flex items-end gap-2">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                rows={2}
                className="flex-1 resize-none rounded-xl border border-input bg-warm-50 px-3 py-2 text-[13px] transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 placeholder:text-muted-foreground"
              />
              <Button
                size="sm"
                onClick={handleSend}
                disabled={!newMessage.trim() || sendMutation.isPending}
                className="h-9 px-3"
              >
                {sendMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────

export default function TeamPortalPage() {
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
  }, []);

  const { data: patientsData } = useQuery({
    queryKey: ["team-patients"],
    queryFn: async () => {
      const res = await fetch("/api/team/patients");
      if (!res.ok) throw new Error("Failed to load patients");
      return res.json() as Promise<{ patients: PatientRow[] }>;
    },
    refetchInterval: 30000,
  });

  const patients = patientsData?.patients ?? [];

  useEffect(() => {
    if (!selectedPatientId && patients.length > 0) {
      setSelectedPatientId(patients[0].linkId);
    }
  }, [patients, selectedPatientId]);

  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ["team-profile", selectedPatientId],
    queryFn: () => fetchTeamProfile(selectedPatientId ?? undefined),
    enabled: !!selectedPatientId,
    staleTime: 60_000,
  });

  const profile: ChildProfile | undefined = profileData?.family
    ? {
        name: profileData.family.childName,
        age: profileData.family.childAge,
        diagnosis: profileData.family.diagnosis,
        familyName: profileData.family.familyName,
      }
    : undefined;

  return (
    <div className="min-h-screen bg-background -m-6">
      <div className="grid grid-cols-[280px_1fr]">
        <aside className="border-r border-border bg-card min-h-screen">
          <div className="p-4 border-b border-border">
            <h1 className="text-[15px] font-bold tracking-tight flex items-center gap-2">
              <span aria-hidden="true">🤝</span> Care Team
            </h1>
            <p className="text-[11px] text-muted-foreground mt-0.5">Your patients</p>
          </div>
          <PatientList
            patients={patients}
            selectedId={selectedPatientId}
            onSelect={setSelectedPatientId}
          />
        </aside>
        <main className="p-6 space-y-6">
          {selectedPatientId ? (
            <>
              {profile && (
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div>
                    <p className="text-[13px] text-muted-foreground">
                      You are supporting {profile.name}&apos;s care with the {profile.familyName} family.
                    </p>
                  </div>
                </div>
              )}
              <ChildOverview profile={profile} isLoading={profileLoading} />
              <DocumentsSection
                selectedPatientId={selectedPatientId}
                currentUserId={currentUserId}
              />
              <MessagesSection
                selectedPatientId={selectedPatientId}
                currentUserId={currentUserId}
              />
            </>
          ) : (
            <div className="text-muted-foreground text-sm">
              {patients.length === 0 ? "No patients linked yet." : "Select a patient to view their care."}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
