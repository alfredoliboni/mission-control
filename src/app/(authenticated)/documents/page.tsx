"use client";

import { useState } from "react";
import { useParsedDocuments } from "@/hooks/useWorkspace";
import { WorkspaceSection } from "@/components/workspace/WorkspaceSection";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { FileText, Eye, Download, ImageIcon, FileIcon } from "lucide-react";
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
    <WorkspaceSection
      title="Documents"
      icon="📄"
      isLoading={isLoading}
    >
      {documents && (
        <div className="space-y-6">
          {/* Documents table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-heading">
                All Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.documents.map((doc, i) => (
                      <TableRow
                        key={i}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => setSelectedDoc(doc)}
                      >
                        <TableCell className="text-xs whitespace-nowrap">
                          {doc.date}
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-warm-300 shrink-0" />
                            {doc.title}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{doc.from}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">
                            {doc.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDoc(doc);
                              }}
                              className="p-1.5 rounded-md hover:bg-warm-100 transition-colors text-warm-400 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                              aria-label={`View ${doc.title}`}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={(e) => e.stopPropagation()}
                              className="p-1.5 rounded-md hover:bg-warm-100 transition-colors text-warm-400 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
            </CardContent>
          </Card>

          {/* Summaries */}
          {documents.summaries.length > 0 && (
            <section>
              <h2 className="font-heading text-lg font-semibold text-foreground mb-3">
                Agent Summaries
              </h2>
              <div className="space-y-4">
                {documents.summaries.map((summary, i) => (
                  <Card key={i}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">
                        {summary.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1">
                        {summary.findings.map((finding, j) => (
                          <li
                            key={j}
                            className="text-sm text-foreground flex items-start gap-2"
                          >
                            <span className="text-warm-300 mt-1 shrink-0">
                              •
                            </span>
                            {finding}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
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
            <DialogTitle>{selectedDoc?.title}</DialogTitle>
            <DialogDescription>
              {selectedDoc?.from} &middot; {selectedDoc?.date} &middot;{" "}
              <Badge variant="outline" className="text-[10px]">
                {selectedDoc?.type}
              </Badge>
            </DialogDescription>
          </DialogHeader>

          {/* Preview area */}
          <div className="rounded-lg border border-border bg-muted/30 p-6 min-h-[200px] flex flex-col items-center justify-center gap-3">
            {selectedDoc && isImageType(selectedDoc.title) ? (
              <div className="text-center space-y-2">
                <ImageIcon className="h-12 w-12 text-warm-300 mx-auto" />
                <p className="text-sm text-warm-400">Image preview</p>
                <p className="text-xs text-warm-300">{selectedDoc.storageLink}</p>
              </div>
            ) : (
              <div className="text-center space-y-2">
                {(() => {
                  const DocIcon = selectedDoc ? getDocIcon(selectedDoc.type) : FileText;
                  return <DocIcon className="h-12 w-12 text-warm-300 mx-auto" />;
                })()}
                <p className="text-sm font-medium text-foreground">
                  {selectedDoc?.title}
                </p>
                <p className="text-xs text-warm-400">
                  PDF document &middot; {selectedDoc?.storageLink}
                </p>
              </div>
            )}

            {/* Show matching summary if found */}
            {matchingSummary && (
              <div className="w-full mt-4 pt-4 border-t border-border">
                <p className="text-xs font-medium text-foreground mb-2">
                  Agent Summary
                </p>
                <ul className="space-y-1">
                  {matchingSummary.findings.map((finding, j) => (
                    <li
                      key={j}
                      className="text-xs text-warm-400 flex items-start gap-1.5"
                    >
                      <span className="text-warm-300 mt-0.5 shrink-0">
                        •
                      </span>
                      {finding}
                    </li>
                  ))}
                </ul>
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
