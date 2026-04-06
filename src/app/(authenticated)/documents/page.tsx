"use client";

import { useState } from "react";
import { useParsedDocuments } from "@/hooks/useWorkspace";
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
import { FileText, Eye, Download, ImageIcon, FileIcon } from "lucide-react";
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

export default function DocumentsPage() {
  const { data: documents, isLoading } = useParsedDocuments();
  const [selectedDoc, setSelectedDoc] = useState<DocumentEntry | null>(null);

  // Find matching summary for the selected document
  const matchingSummary = selectedDoc
    ? documents?.summaries.find(
        (s) =>
          s.title.toLowerCase().includes(selectedDoc.title.toLowerCase().split("—")[0].trim()) ||
          selectedDoc.title.toLowerCase().includes(s.title.toLowerCase().split("—")[0].trim())
      )
    : null;

  return (
    <WorkspaceSection title="Documents" icon="📄" isLoading={isLoading}>
      {documents && (
        <div className="space-y-6">
          {/* Documents card */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="text-[15px] font-semibold text-foreground">
                All Documents
              </h2>
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
                🤖 Agent Summaries
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
