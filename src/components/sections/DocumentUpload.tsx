"use client";

import { useState, useRef } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useAppStore } from "@/store/appStore";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Upload, Loader2, CheckCircle2 } from "lucide-react";

const DOC_TYPES = [
  "Diagnosis Report",
  "Therapy Notes",
  "School Report",
  "Financial Record",
  "Legal Document",
  "Medical Record",
  "Assessment",
  "Other",
];

interface DocumentUploadProps {
  familyId: string;
  childNickname?: string;
  onUploadComplete?: () => void;
}

export function DocumentUpload({
  familyId,
  childNickname,
  onUploadComplete,
}: DocumentUploadProps) {
  const { user, role } = useAuth();
  const { isDemo } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState(DOC_TYPES[0]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Only show for authenticated users, not demo mode
  if (isDemo || !user) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    if (selected && !title) {
      setTitle(selected.name.replace(/\.[^.]+$/, ""));
    }
  };

  const handleUpload = async () => {
    if (!file || !title) return;

    setUploading(true);
    setError(null);

    try {
      const supabase = createClient();
      const filePath = `${familyId}/${Date.now()}-${file.name}`;

      // Upload file to Supabase Storage
      const { error: storageError } = await supabase.storage
        .from("documents")
        .upload(filePath, file);

      if (storageError) throw storageError;

      // Save metadata to documents table
      const { error: dbError } = await supabase.from("documents").insert({
        family_id: familyId,
        child_nickname: childNickname ?? null,
        uploaded_by: user.id,
        uploader_role: role ?? "parent",
        title,
        doc_type: docType,
        file_path: filePath,
        metadata: {
          original_name: file.name,
          size: file.size,
          mime_type: file.type,
        },
      });

      if (dbError) throw dbError;

      setSuccess(true);
      onUploadComplete?.();

      // Reset after a moment
      setTimeout(() => {
        setOpen(false);
        setFile(null);
        setTitle("");
        setDocType(DOC_TYPES[0]);
        setSuccess(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Upload className="h-4 w-4 mr-1.5" />
        Upload Document
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              Upload a document to your family&apos;s secure storage.
            </DialogDescription>
          </DialogHeader>

          {success ? (
            <div className="text-center py-6 space-y-2">
              <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto" />
              <p className="text-sm font-medium text-foreground">
                Document uploaded successfully
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">
                  File
                </label>
                <Input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.gif,.webp"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">
                  Title
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Document title"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">
                  Document Type
                </label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {DOC_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
            </div>
          )}

          {!success && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!file || !title || uploading}
              >
                {uploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Upload
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
