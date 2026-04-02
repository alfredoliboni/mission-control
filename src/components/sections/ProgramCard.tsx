"use client";

import { ExternalLink, Phone, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ParsedProgram } from "@/types/workspace";
import { cn } from "@/lib/utils";

interface ProgramCardProps {
  program: ParsedProgram;
}

export function ProgramCard({ program }: ProgramCardProps) {
  const statusBadge = () => {
    if (program.status.includes("✅"))
      return (
        <Badge className="bg-status-success/10 text-status-success border-status-success/20 text-[10px]">
          Open
        </Badge>
      );
    if (program.status.includes("⚠️"))
      return (
        <Badge className="bg-status-caution/10 text-status-caution border-status-caution/20 text-[10px]">
          Deadline
        </Badge>
      );
    return null;
  };

  return (
    <Card
      className={cn(
        program.isGapFiller &&
          "ring-1 ring-status-gap-filler/20 bg-status-gap-filler/[0.02]"
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base font-heading">
            {program.name}
          </CardTitle>
          <div className="flex gap-1 shrink-0">
            {program.isGapFiller && (
              <Badge className="bg-status-gap-filler/10 text-status-gap-filler border-status-gap-filler/20 text-[10px]">
                Gap Filler
              </Badge>
            )}
            {statusBadge()}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-1.5 text-sm">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-warm-400">
          {program.cost && <span>Cost: {program.cost}</span>}
          {program.ages && <span>Ages: {program.ages}</span>}
          {program.schedule && <span>{program.schedule}</span>}
        </div>
        {program.location && (
          <p className="text-xs text-warm-400">📍 {program.location}</p>
        )}
        {program.whyGapFiller && (
          <p className="text-xs text-status-gap-filler">
            {program.whyGapFiller}
          </p>
        )}
        {program.status && (
          <p className="text-xs font-medium text-foreground">
            {program.status}
          </p>
        )}
        {program.register && (
          <p className="text-xs text-primary">Register: {program.register}</p>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-2">
          {program.url ? (
            <a
              href={program.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:bg-primary/10 px-2.5 py-1.5 rounded-md border border-primary/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <ExternalLink className="h-3 w-3" />
              Visit Website
            </a>
          ) : program.phone ? (
            <a
              href={`tel:${program.phone}`}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:bg-primary/10 px-2.5 py-1.5 rounded-md border border-primary/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Phone className="h-3 w-3" />
              Contact for details
            </a>
          ) : program.email ? (
            <a
              href={`mailto:${program.email}`}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:bg-primary/10 px-2.5 py-1.5 rounded-md border border-primary/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Mail className="h-3 w-3" />
              Contact for details
            </a>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
