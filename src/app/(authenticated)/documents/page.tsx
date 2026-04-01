"use client";

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
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";

export default function DocumentsPage() {
  const { data: documents, isLoading } = useParsedDocuments();

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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.documents.map((doc, i) => (
                      <TableRow key={i}>
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
    </WorkspaceSection>
  );
}
