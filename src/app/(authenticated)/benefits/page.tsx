"use client";

import { useState } from "react";
import { useParsedBenefits } from "@/hooks/useWorkspace";
import { WorkspaceSection } from "@/components/workspace/WorkspaceSection";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { BenefitStatus, BenefitStatusRow, BenefitDetail } from "@/types/workspace";
import { cn } from "@/lib/utils";
import {
  CheckCircle,
  Clock,
  Circle,
  Loader2,
  ChevronDown,
  ChevronRight,
  Eye,
  Upload,
  Bell,
  RefreshCw,
  DollarSign,
  CalendarDays,
  Shield,
  HelpCircle,
} from "lucide-react";

/* ── status config ─────────────────────────────────────────────── */
const statusConfig: Record<
  BenefitStatus,
  { icon: typeof CheckCircle; color: string; bg: string; border: string; label: string }
> = {
  approved: {
    icon: CheckCircle,
    color: "text-status-success",
    bg: "bg-status-success/10",
    border: "border-status-success/30",
    label: "Approved",
  },
  active: {
    icon: CheckCircle,
    color: "text-status-success",
    bg: "bg-status-success/10",
    border: "border-status-success/30",
    label: "Active",
  },
  registered: {
    icon: CheckCircle,
    color: "text-status-current",
    bg: "bg-status-current/10",
    border: "border-status-current/30",
    label: "Applied",
  },
  pending: {
    icon: Clock,
    color: "text-status-caution",
    bg: "bg-status-caution/10",
    border: "border-status-caution/30",
    label: "Pending",
  },
  waiting: {
    icon: Loader2,
    color: "text-status-caution",
    bg: "bg-status-caution/10",
    border: "border-status-caution/30",
    label: "Pending",
  },
  renewed: {
    icon: RefreshCw,
    color: "text-teal-600",
    bg: "bg-teal-50",
    border: "border-teal-300",
    label: "Renewed",
  },
  unknown: {
    icon: HelpCircle,
    color: "text-warm-400",
    bg: "bg-warm-50",
    border: "border-warm-200",
    label: "Unknown",
  },
  not_started: {
    icon: Circle,
    color: "text-warm-300",
    bg: "bg-warm-50",
    border: "border-warm-200",
    label: "Not Started",
  },
};

/* ── progress steps ────────────────────────────────────────────── */
const progressSteps = ["Applied", "Approved", "Active", "Renewal Due"] as const;

function getProgressIndex(status: BenefitStatus): number {
  switch (status) {
    case "registered":
    case "pending":
    case "waiting":
      return 0;
    case "approved":
      return 1;
    case "active":
    case "renewed":
      return 2;
    default:
      return -1;
  }
}

function ProgressBar({ status }: { status: BenefitStatus }) {
  const activeIdx = getProgressIndex(status);
  if (activeIdx < 0) return null;

  return (
    <div className="flex items-center gap-1 mt-3">
      {progressSteps.map((step, i) => (
        <div key={step} className="flex items-center gap-1 flex-1">
          <div className="flex flex-col items-center flex-1">
            <div
              className={cn(
                "h-1.5 w-full rounded-full transition-all",
                i <= activeIdx ? "bg-status-current" : "bg-warm-200"
              )}
            />
            <span
              className={cn(
                "text-[10px] mt-1",
                i <= activeIdx ? "text-status-current font-medium" : "text-warm-300"
              )}
            >
              {step}
            </span>
          </div>
        </div>
      ))}
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
  const Icon = cfg.icon;
  const isUnconfirmed = row.status === "unknown";

  return (
    <Card className={cn("border-l-4 transition-shadow hover:shadow-md", cfg.border, isUnconfirmed && "bg-amber-50/50")}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Icon className={cn("h-5 w-5 shrink-0", cfg.color)} />
            <CardTitle className={cn("text-base font-heading truncate", isUnconfirmed && "text-gray-500")}>
              {row.benefit}
            </CardTitle>
          </div>
          <div className="flex gap-1 shrink-0 flex-wrap justify-end">
            {isUnconfirmed && (
              <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-300">
                Needs confirmation
              </Badge>
            )}
            <Badge
              variant="outline"
              className={cn("text-[10px] font-medium", cfg.bg, cfg.color)}
            >
              {localStatus || cfg.label}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {/* Amount */}
        {row.amount && row.amount !== "—" && (
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-status-success shrink-0" />
            <span className="text-lg font-semibold text-foreground">
              {row.amount}
            </span>
          </div>
        )}

        {/* Key dates */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-warm-400">
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
          <p className="text-xs text-warm-400">{row.notes}</p>
        )}

        {/* Agent monitoring badge */}
        {(row.status === "pending" || row.status === "waiting" || row.status === "registered") && (
          <div className="flex items-center gap-1">
            <Eye className="h-3 w-3 text-status-current" />
            <span className="text-[10px] text-status-current font-medium">
              Agent monitoring
            </span>
          </div>
        )}

        {/* Progress indicator */}
        <ProgressBar status={row.status} />

        {/* Collapsible eligibility details */}
        {detail && (
          <div className="pt-1">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
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
                {detail.unlocks && (
                  <DetailRow label="Unlocks" value={detail.unlocks} />
                )}
                {detail.howApplied && (
                  <DetailRow label="How Applied" value={detail.howApplied} />
                )}
                {detail.expectedResponse && (
                  <DetailRow label="Expected Response" value={detail.expectedResponse} />
                )}
                {detail.documentsNeeded && (
                  <DetailRow label="Documents" value={detail.documentsNeeded} />
                )}
                {detail.renewal && (
                  <DetailRow icon={<RefreshCw className="h-3 w-3" />} label="Renewal" value={detail.renewal} />
                )}
                {detail.status && (
                  <DetailRow label="Status" value={detail.status} />
                )}
                {detail.action && (
                  <p className="text-xs font-medium text-status-caution mt-2">
                    ⚠️ {detail.action}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
          {row.status === "not_started" && (
            <button
              onClick={() => setLocalStatus("Applied")}
              className="inline-flex items-center gap-1 text-xs font-medium text-status-current hover:bg-status-current/10 px-2 py-1 rounded-md transition-colors"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              Mark as Applied
            </button>
          )}
          <button className="inline-flex items-center gap-1 text-xs font-medium text-warm-400 hover:text-foreground hover:bg-warm-100 px-2 py-1 rounded-md transition-colors">
            <Upload className="h-3.5 w-3.5" />
            Upload Document
          </button>
          <button className="inline-flex items-center gap-1 text-xs font-medium text-warm-400 hover:text-foreground hover:bg-warm-100 px-2 py-1 rounded-md transition-colors">
            <Bell className="h-3.5 w-3.5" />
            Set Reminder
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

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
    <div className="flex items-start gap-1.5 text-xs">
      {icon && <span className="mt-0.5 text-warm-300 shrink-0">{icon}</span>}
      <span className="text-warm-400 shrink-0">{label}:</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────────── */
export default function BenefitsPage() {
  const { data: benefits, isLoading } = useParsedBenefits();
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "approved" | "pending" | "unknown" | "not_started">("all");
  const [sortOrder, setSortOrder] = useState<"az" | "za">("az");

  const allRows = benefits?.statusTable || [];
  const filteredRows = allRows
    .filter((row) => {
      if (statusFilter === "all") return true;
      if (statusFilter === "active") return row.status === "active" || row.status === "renewed";
      if (statusFilter === "approved") return row.status === "approved";
      if (statusFilter === "pending") return row.status === "registered" || row.status === "pending" || row.status === "waiting";
      if (statusFilter === "unknown") return row.status === "unknown";
      if (statusFilter === "not_started") return row.status === "not_started";
      return true;
    })
    .sort((a, b) => {
      const cmp = a.benefit.localeCompare(b.benefit);
      return sortOrder === "az" ? cmp : -cmp;
    });

  // Match detail entries to status rows by name similarity
  function findDetail(benefitName: string): BenefitDetail | undefined {
    if (!benefits) return undefined;
    const lower = benefitName.toLowerCase();
    return benefits.details.find((d) => {
      const dLower = d.name.toLowerCase();
      return lower.includes(dLower) || dLower.includes(lower) ||
        lower.split("(").some((part) => dLower.includes(part.trim().replace(")", "")));
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
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="w-full sm:w-auto text-xs border border-border rounded-lg px-2.5 py-1.5 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="unknown">Unknown</option>
              <option value="not_started">Not Started</option>
            </select>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
              className="w-full sm:w-auto text-xs border border-border rounded-lg px-2.5 py-1.5 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="az">Name A-Z</option>
              <option value="za">Name Z-A</option>
            </select>
            <span className="text-xs text-warm-400 sm:ml-auto">
              Showing {filteredRows.length} of {allRows.length} benefits
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {filteredRows.map((row, i) => (
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
