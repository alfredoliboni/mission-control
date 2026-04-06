"use client";

import { useState } from "react";
import { useParsedBenefits } from "@/hooks/useWorkspace";
import { WorkspaceSection } from "@/components/workspace/WorkspaceSection";
import type { BenefitStatus, BenefitStatusRow, BenefitDetail } from "@/types/workspace";
import { cn } from "@/lib/utils";
import {
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Upload,
  Bell,
  RefreshCw,
  DollarSign,
  CalendarDays,
  Shield,
} from "lucide-react";

/* ── status config ─────────────────────────────────────────────── */

const statusConfig: Record<
  BenefitStatus,
  { emoji: string; dotColor: string; label: string; softBg: string }
> = {
  approved: {
    emoji: "✅",
    dotColor: "bg-status-success",
    label: "Approved",
    softBg: "bg-status-success/8",
  },
  active: {
    emoji: "✅",
    dotColor: "bg-status-success",
    label: "Active",
    softBg: "bg-status-success/8",
  },
  registered: {
    emoji: "📋",
    dotColor: "bg-status-current",
    label: "Applied",
    softBg: "bg-status-current/8",
  },
  pending: {
    emoji: "⏳",
    dotColor: "bg-status-caution",
    label: "Pending",
    softBg: "bg-status-caution/8",
  },
  waiting: {
    emoji: "⏳",
    dotColor: "bg-status-caution",
    label: "Waiting",
    softBg: "bg-status-caution/8",
  },
  renewed: {
    emoji: "✅",
    dotColor: "bg-status-renewed",
    label: "Renewed",
    softBg: "bg-status-renewed/8",
  },
  unknown: {
    emoji: "📋",
    dotColor: "bg-muted-foreground",
    label: "Unknown",
    softBg: "bg-muted-foreground/8",
  },
  not_started: {
    emoji: "📋",
    dotColor: "bg-muted-foreground",
    label: "Not Started",
    softBg: "bg-muted-foreground/8",
  },
};

/* ── Detail row ────────────────────────────────────────────────── */

function DetailRow({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-1.5 text-[12px]">
      {icon && <span className="mt-0.5 text-muted-foreground shrink-0">{icon}</span>}
      <span className="text-muted-foreground shrink-0">{label}:</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}

/* ── Benefit card ──────────────────────────────────────────────── */

function BenefitCard({
  row,
  detail,
}: {
  row: BenefitStatusRow;
  detail?: BenefitDetail;
}) {
  const [expanded, setExpanded] = useState(false);
  const [localStatus, setLocalStatus] = useState<string | null>(null);
  const cfg = statusConfig[row.status];

  return (
    <div className="bg-card border border-border rounded-xl p-4 transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start gap-3">
        {/* Emoji icon */}
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-lg", cfg.softBg)}>
          {cfg.emoji}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Name */}
          <p className="text-[13px] font-semibold text-muted-foreground truncate">
            {row.benefit}
          </p>

          {/* Amount */}
          {row.amount && row.amount !== "—" && (
            <p className="text-[18px] font-bold text-foreground mt-0.5">
              {row.amount}
            </p>
          )}

          {/* Status with dot */}
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className={cn("w-2 h-2 rounded-full shrink-0", cfg.dotColor)} />
            <span className="text-[12px] font-medium text-foreground">
              {localStatus || cfg.label}
            </span>
          </div>

          {/* Key dates */}
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[11px] text-muted-foreground">
            {row.applied && row.applied !== "—" && (
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3 w-3" /> Applied: {row.applied}
              </span>
            )}
            {row.approved && row.approved !== "—" && (
              <span className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-status-success" /> Approved: {row.approved}
              </span>
            )}
            {row.renewal && row.renewal !== "—" && (
              <span className="flex items-center gap-1">
                <RefreshCw className="h-3 w-3" /> Renewal: {row.renewal}
              </span>
            )}
          </div>

          {/* Notes */}
          {row.notes && (
            <p className="text-[11px] text-muted-foreground mt-1.5">{row.notes}</p>
          )}

          {/* Collapsible eligibility details */}
          {detail && (
            <div className="mt-3">
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-[12px] font-medium text-primary hover:text-primary/80 transition-colors"
              >
                {expanded ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
                Eligibility Details
              </button>

              {expanded && (
                <div className="mt-2 pl-4 border-l-2 border-primary/10 space-y-1.5">
                  {detail.eligibility && (
                    <DetailRow icon={<Shield className="h-3 w-3" />} label="Eligibility" value={detail.eligibility} />
                  )}
                  {detail.amount && (
                    <DetailRow icon={<DollarSign className="h-3 w-3" />} label="Amount" value={detail.amount} />
                  )}
                  {detail.unlocks && <DetailRow label="Unlocks" value={detail.unlocks} />}
                  {detail.howApplied && <DetailRow label="How Applied" value={detail.howApplied} />}
                  {detail.expectedResponse && <DetailRow label="Expected Response" value={detail.expectedResponse} />}
                  {detail.documentsNeeded && <DetailRow label="Documents" value={detail.documentsNeeded} />}
                  {detail.renewal && (
                    <DetailRow icon={<RefreshCw className="h-3 w-3" />} label="Renewal" value={detail.renewal} />
                  )}
                  {detail.status && <DetailRow label="Status" value={detail.status} />}
                  {detail.action && (
                    <p className="text-[12px] font-medium text-status-caution mt-2">
                      ⚠️ {detail.action}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-3 mt-3 border-t border-border">
            {row.status === "not_started" && (
              <button
                onClick={() => setLocalStatus("Applied")}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-status-current hover:bg-status-current/8 px-2 py-1 rounded-md transition-colors"
              >
                <CheckCircle className="h-3.5 w-3.5" />
                Mark as Applied
              </button>
            )}
            <button className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted-foreground/8 px-2 py-1 rounded-md transition-colors">
              <Upload className="h-3.5 w-3.5" />
              Upload Document
            </button>
            <button className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted-foreground/8 px-2 py-1 rounded-md transition-colors">
              <Bell className="h-3.5 w-3.5" />
              Set Reminder
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────────── */

export default function BenefitsPage() {
  const { data: benefits, isLoading } = useParsedBenefits();

  // Match detail entries to status rows by name similarity
  function findDetail(benefitName: string): BenefitDetail | undefined {
    if (!benefits) return undefined;
    const lower = benefitName.toLowerCase();
    return benefits.details.find((d) => {
      const dLower = d.name.toLowerCase();
      return (
        lower.includes(dLower) ||
        dLower.includes(lower) ||
        lower
          .split("(")
          .some((part) => dLower.includes(part.trim().replace(")", "")))
      );
    });
  }

  return (
    <WorkspaceSection
      title="Benefits"
      icon="💰"
      lastUpdated={benefits?.lastUpdated}
      agentMonitoring={benefits?.agentMonitoring}
      isLoading={isLoading}
    >
      {benefits && (
        <div className="space-y-4">
          <p className="text-[13px] text-muted-foreground -mt-2">
            {benefits.statusTable.length} benefits tracked
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {benefits.statusTable.map((row, i) => (
              <BenefitCard
                key={i}
                row={row}
                detail={findDetail(row.benefit)}
              />
            ))}
          </div>
        </div>
      )}
    </WorkspaceSection>
  );
}
