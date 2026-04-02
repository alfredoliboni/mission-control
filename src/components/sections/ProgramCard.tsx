"use client";

import {
  ExternalLink,
  Phone,
  Mail,
  MapPin,
  Clock,
  DollarSign,
  Users,
  Calendar,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ParsedProgram } from "@/types/workspace";
import { cn } from "@/lib/utils";

interface ProgramCardProps {
  program: ParsedProgram;
}

export function ProgramCard({ program }: ProgramCardProps) {
  const statusConfig = () => {
    if (program.status.includes("✅"))
      return {
        label: "Open",
        className:
          "bg-status-success/10 text-status-success border-status-success/20",
      };
    if (program.status.includes("⚠️"))
      return {
        label: "Deadline",
        className:
          "bg-status-caution/10 text-status-caution border-status-caution/20",
      };
    if (
      program.status.toLowerCase().includes("waiting") ||
      program.status.toLowerCase().includes("registered")
    )
      return {
        label: "In Progress",
        className: "bg-blue-50 text-blue-600 border-blue-200",
      };
    return null;
  };

  const status = statusConfig();

  // Extract a clean status text without emoji
  const cleanStatus = program.status
    .replace(/✅|⚠️|📋|🔄/g, "")
    .trim();

  // Determine the primary action
  const primaryUrl = program.url;
  const hasContact = program.phone || program.email;

  return (
    <Card
      className={cn(
        "group relative flex flex-col transition-shadow hover:shadow-md",
        program.isGapFiller &&
          "ring-1 ring-status-gap-filler/20 bg-status-gap-filler/[0.02]"
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base font-heading leading-snug">
            {primaryUrl ? (
              <a
                href={primaryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors"
              >
                {program.name}
              </a>
            ) : (
              program.name
            )}
          </CardTitle>
          <div className="flex gap-1 shrink-0 flex-wrap justify-end">
            {program.isGapFiller && (
              <Badge className="bg-status-gap-filler/10 text-status-gap-filler border-status-gap-filler/20 text-[10px]">
                Gap Filler
              </Badge>
            )}
            {status && (
              <Badge className={cn("text-[10px]", status.className)}>
                {status.label}
              </Badge>
            )}
          </div>
        </div>
        {program.type && (
          <Badge variant="outline" className="text-[10px] w-fit mt-1">
            {program.type}
          </Badge>
        )}
      </CardHeader>

      <CardContent className="flex-1 space-y-3 text-sm">
        {/* Key details grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          {program.cost && (
            <div className="flex items-center gap-1.5 text-xs">
              <DollarSign className="h-3 w-3 text-warm-400 shrink-0" />
              <span className="text-foreground">{program.cost}</span>
            </div>
          )}
          {program.ages && (
            <div className="flex items-center gap-1.5 text-xs">
              <Users className="h-3 w-3 text-warm-400 shrink-0" />
              <span className="text-foreground">Ages {program.ages}</span>
            </div>
          )}
          {program.schedule && (
            <div className="flex items-center gap-1.5 text-xs col-span-2">
              <Clock className="h-3 w-3 text-warm-400 shrink-0" />
              <span className="text-foreground">{program.schedule}</span>
            </div>
          )}
          {program.location && (
            <div className="flex items-center gap-1.5 text-xs col-span-2">
              <MapPin className="h-3 w-3 text-warm-400 shrink-0" />
              <span className="text-foreground">{program.location}</span>
            </div>
          )}
        </div>

        {/* Gap filler reason */}
        {program.whyGapFiller && (
          <div className="rounded-md bg-status-gap-filler/5 border border-status-gap-filler/10 px-3 py-2">
            <p className="text-xs text-status-gap-filler leading-relaxed">
              💡 {program.whyGapFiller}
            </p>
          </div>
        )}

        {/* Status line */}
        {cleanStatus && (
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3 w-3 text-warm-400 shrink-0" />
            <p className="text-xs font-medium text-foreground">
              {cleanStatus}
            </p>
          </div>
        )}

        {/* Register info */}
        {program.register && !program.register.startsWith("http") && (
          <p className="text-xs text-warm-400">
            Register: {program.register}
          </p>
        )}

        {/* Reimbursable */}
        {program.details?.reimbursable && (
          <div className="flex items-center gap-1.5">
            <DollarSign className="h-3 w-3 text-status-success shrink-0" />
            <p className="text-xs text-status-success font-medium">
              Reimbursable: {program.details.reimbursable}
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-warm-100">
          {primaryUrl && (
            <a
              href={primaryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-primary hover:bg-primary/90 px-3 py-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <ExternalLink className="h-3 w-3" />
              Visit Website
            </a>
          )}
          {program.phone && (
            <a
              href={`tel:${program.phone}`}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:bg-primary/10 px-3 py-2 rounded-lg border border-primary/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Phone className="h-3 w-3" />
              Call
            </a>
          )}
          {program.email && (
            <a
              href={`mailto:${program.email}`}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:bg-primary/10 px-3 py-2 rounded-lg border border-primary/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Mail className="h-3 w-3" />
              Email
            </a>
          )}
          {!primaryUrl && !program.phone && !program.email && program.register && (
            <span className="text-xs text-warm-400 italic">
              {program.register}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
