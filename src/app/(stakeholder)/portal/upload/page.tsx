"use client";

import { useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { useDocumentUpload } from "@/hooks/useDocuments";
import { useStakeholders } from "@/hooks/useStakeholders";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Loader2, CheckCircle2, FileText } from "lucide-react";

const DOC_TYPES = [
  "Therapy Notes",
  "Assessment",
  "School Report",
  "Medical Record",
  "Progress Report",
  "Other",
];

export default function PortalUploadPage() {
  const searchParams = useSearchParams();
  const preselectedFamily = searchParams.get("family") ?? "";
  const { user, loading: authLoading } = useAuth();
  const { data: stakeholders } = useStakeholders();
  const uploadMutation = useDocumentUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [familyId, setFamilyId] = useState(preselectedFamily);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState(DOC_TYPES[0]);
  const [success, setSuccess] = useState(false);

  const families = stakeholders?.filter((s) => s.status === "active") ?? [];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    if (selected && !title) {
      setTitle(selected.name.replace(/\.[^.]+$/, ""));
    }
  };

  const handleUpload = async () => {
    if (!file || !title || !familyId) return;

    const formData = new FormData();
    formData.set("file", file);
    formData.set("title", title);
    formData.set("doc_type", docType);
    formData.set("family_id", familyId);

    await uploadMutation.mutateAsync(formData);
    setSuccess(true);
  };

  const handleReset = () => {
    setFile(null);
    setTitle("");
    setDocType(DOC_TYPES[0]);
    setSuccess(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Please sign in to upload documents.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-heading text-foreground">
          Upload Document
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload a document to a family&apos;s secure storage.
        </p>
      </div>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="text-base font-heading flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Document Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="text-center py-6 space-y-3">
              <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto" />
              <p className="text-sm font-medium text-foreground">
                Document uploaded successfully
              </p>
              <Button variant="outline" size="sm" onClick={handleReset}>
                Upload another
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Family selector */}
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">
                  Family
                </label>
                {preselectedFamily ? (
                  <p className="text-sm text-foreground">
                    {preselectedFamily.slice(0, 8)}…
                  </p>
                ) : (
                  <select
                    value={familyId}
                    onChange={(e) => setFamilyId(e.target.value)}
                    className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select a family…</option>
                    {families.map((f) => (
                      <option key={f.id} value={f.family_id}>
                        Family {f.family_id.slice(0, 8)}…
                      </option>
                    ))}
                  </select>
                )}
              </div>

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
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {uploadMutation.error && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                  {uploadMutation.error.message}
                </p>
              )}

              <Button
                onClick={handleUpload}
                disabled={!file || !title || !familyId || uploadMutation.isPending}
                className="w-full"
              >
                {uploadMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Upload
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
