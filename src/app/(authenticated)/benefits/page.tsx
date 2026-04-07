"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParsedBenefits } from "@/hooks/useWorkspace";
import { WorkspaceSection } from "@/components/workspace/WorkspaceSection";
import type { BenefitStatus, BenefitStatusRow, BenefitDetail } from "@/types/workspace";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Bell,
  RefreshCw,
  DollarSign,
  CalendarDays,
  Shield,
  Clock,
  MessageSquare,
} from "lucide-react";

/* ── reminder persistence ────────────────────────────────────────── */

const REMINDER_STORAGE_KEY = "benefits-reminders";

interface BenefitReminder {
  benefitName: string;
  remindAt: string; // ISO date string
  setAt: string;
}

function loadReminders(): BenefitReminder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(REMINDER_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

function saveReminders(reminders: BenefitReminder[]) {
  try {
    localStorage.setItem(REMINDER_STORAGE_KEY, JSON.stringify(reminders));
  } catch { /* quota exceeded */ }
}

/* ── applied status persistence ──────────────────────────────────── */

const TRACKING_STORAGE_KEY = "benefits-tracking";

type TrackingStatus = "applied" | "pending_review" | "approved" | "denied";

interface BenefitTracking {
  status: TrackingStatus;
  appliedDate: string;
  updatedAt: string;
}

function loadTracking(): Record<string, BenefitTracking> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(TRACKING_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {};
}

function saveTracking(tracking: Record<string, BenefitTracking>) {
  try {
    localStorage.setItem(TRACKING_STORAGE_KEY, JSON.stringify(tracking));
  } catch { /* quota exceeded */ }
}

const TRACKING_CONFIG: Record<TrackingStatus, { label: string; emoji: string; dotColor: string; next?: TrackingStatus[] }> = {
  applied: { label: "Applied", emoji: "📨", dotColor: "bg-status-current", next: ["pending_review", "approved", "denied"] },
  pending_review: { label: "Pending Review", emoji: "⏳", dotColor: "bg-status-caution", next: ["approved", "denied"] },
  approved: { label: "Approved", emoji: "✅", dotColor: "bg-status-success" },
  denied: { label: "Denied", emoji: "❌", dotColor: "bg-status-blocked", next: ["applied"] },
};

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
  onSetReminder,
  onMarkApplied,
  onUpdateTracking,
  tracking,
  hasReminder,
}: {
  row: BenefitStatusRow;
  detail?: BenefitDetail;
  onSetReminder: (benefitName: string, option: "1week" | "1month") => void;
  onMarkApplied: (benefitName: string) => void;
  onUpdateTracking: (benefitName: string, status: TrackingStatus) => void;
  tracking?: BenefitTracking;
  hasReminder: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
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
            <span className={cn("w-2 h-2 rounded-full shrink-0", tracking ? TRACKING_CONFIG[tracking.status].dotColor : cfg.dotColor)} />
            <span className="text-[12px] font-medium text-foreground">
              {tracking ? `${TRACKING_CONFIG[tracking.status].emoji} ${TRACKING_CONFIG[tracking.status].label}` : cfg.label}
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

          {/* Action buttons — tracking flow */}
          <div className="pt-3 mt-3 border-t border-border space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {/* Not started — show "Mark as Applied" */}
              {!tracking && row.status === "not_started" && (
                <div className="space-y-1">
                  <button
                    onClick={() => onMarkApplied(row.benefit)}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-status-current hover:bg-status-current/8 px-2 py-1 rounded-md transition-colors"
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    Mark as Applied
                  </button>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1 pl-2">
                    <MessageSquare className="h-2.5 w-2.5" />
                    You can also tell your Navigator in the chat
                  </p>
                </div>
              )}

              {/* Tracking active — show current status + next actions */}
              {tracking && (
                <div className="space-y-2 w-full">
                  <div className="flex items-center gap-2">
                    <span className={cn("w-2 h-2 rounded-full", TRACKING_CONFIG[tracking.status].dotColor)} />
                    <span className="text-[12px] font-semibold">
                      {TRACKING_CONFIG[tracking.status].emoji} {TRACKING_CONFIG[tracking.status].label}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      since {new Date(tracking.updatedAt).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Next status buttons */}
                  {TRACKING_CONFIG[tracking.status].next && (
                    <div className="flex flex-wrap gap-1.5">
                      {TRACKING_CONFIG[tracking.status].next!.map((nextStatus) => (
                        <button
                          key={nextStatus}
                          onClick={() => onUpdateTracking(row.benefit, nextStatus)}
                          className={cn(
                            "inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-md transition-colors border",
                            nextStatus === "approved" && "text-status-success border-status-success/30 hover:bg-status-success/8",
                            nextStatus === "denied" && "text-status-blocked border-status-blocked/30 hover:bg-status-blocked/8",
                            nextStatus === "pending_review" && "text-status-caution border-status-caution/30 hover:bg-status-caution/8",
                            nextStatus === "applied" && "text-status-current border-status-current/30 hover:bg-status-current/8",
                          )}
                        >
                          {TRACKING_CONFIG[nextStatus].emoji} {TRACKING_CONFIG[nextStatus].label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Already approved from agent data (not user-tracked) */}
              {!tracking && (row.status === "approved" || row.status === "active") && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-status-success px-2 py-1">
                  <CheckCircle className="h-3.5 w-3.5" />
                  {cfg.label}
                </span>
              )}
              <div className="relative">
                <button
                  onClick={() => setReminderOpen(!reminderOpen)}
                  className={cn(
                    "inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md transition-colors",
                    hasReminder
                      ? "text-status-caution"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted-foreground/8"
                  )}
                >
                  {hasReminder ? <Clock className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
                  {hasReminder ? "Reminder Set" : "Set Reminder"}
                </button>
                {reminderOpen && (
                  <div className="absolute left-0 top-full mt-1 z-10 bg-card border border-border rounded-lg shadow-lg p-2 min-w-[160px]">
                    <button
                      onClick={() => {
                        onSetReminder(row.benefit, "1week");
                        setReminderOpen(false);
                      }}
                      className="w-full text-left text-[12px] text-foreground hover:bg-muted px-3 py-1.5 rounded-md transition-colors"
                    >
                      Remind in 1 week
                    </button>
                    <button
                      onClick={() => {
                        onSetReminder(row.benefit, "1month");
                        setReminderOpen(false);
                      }}
                      className="w-full text-left text-[12px] text-foreground hover:bg-muted px-3 py-1.5 rounded-md transition-colors"
                    >
                      Remind in 1 month
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────────── */

// Statuses that indicate the family IS eligible / has engaged
const eligibleStatuses = new Set<BenefitStatus>([
  "approved",
  "active",
  "registered",
  "pending",
  "waiting",
  "renewed",
]);

export default function BenefitsPage() {
  const { data: benefits, isLoading } = useParsedBenefits();
  const [reminders, setReminders] = useState<BenefitReminder[]>(() => loadReminders());
  const [trackingData, setTrackingData] = useState<Record<string, BenefitTracking>>(() => loadTracking());

  const initialized = useRef(false);
  useEffect(() => { initialized.current = true; }, []);
  useEffect(() => {
    if (!initialized.current) return;
    saveReminders(reminders);
  }, [reminders]);
  useEffect(() => {
    if (!initialized.current) return;
    saveTracking(trackingData);
  }, [trackingData]);

  const handleSetReminder = useCallback((benefitName: string, option: "1week" | "1month") => {
    const now = new Date();
    const remindAt = new Date(now);
    if (option === "1week") {
      remindAt.setDate(remindAt.getDate() + 7);
    } else {
      remindAt.setMonth(remindAt.getMonth() + 1);
    }
    const newReminder: BenefitReminder = {
      benefitName,
      remindAt: remindAt.toISOString(),
      setAt: now.toISOString(),
    };
    setReminders((prev) => [...prev.filter((r) => r.benefitName !== benefitName), newReminder]);
    const label = option === "1week" ? "1 week" : "1 month";
    toast.success(`Reminder set for ${remindAt.toLocaleDateString()}`, {
      description: `We'll remind you about ${benefitName} in ${label}.`,
    });
  }, []);

  const handleMarkApplied = useCallback((benefitName: string) => {
    const now = new Date().toISOString();
    setTrackingData((prev) => ({
      ...prev,
      [benefitName]: { status: "applied", appliedDate: now, updatedAt: now },
    }));
    toast.success("Marked as Applied", {
      description: `${benefitName} is now being tracked. Update the status when you hear back.`,
    });
  }, []);

  const handleUpdateTracking = useCallback((benefitName: string, status: TrackingStatus) => {
    setTrackingData((prev) => ({
      ...prev,
      [benefitName]: {
        ...prev[benefitName],
        status,
        updatedAt: new Date().toISOString(),
      },
    }));
    const cfg = TRACKING_CONFIG[status];
    toast.success(`${cfg.emoji} ${benefitName}`, {
      description: `Status updated to: ${cfg.label}`,
    });
  }, []);

  const hasReminder = useCallback((benefitName: string) => {
    return reminders.some((r) => r.benefitName === benefitName);
  }, [reminders]);

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

  // Sort: eligible/active benefits first, not_started/unknown last
  const sortedRows = benefits
    ? [...benefits.statusTable].sort((a, b) => {
        const aEligible = eligibleStatuses.has(a.status) ? 0 : 1;
        const bEligible = eligibleStatuses.has(b.status) ? 0 : 1;
        return aEligible - bEligible;
      })
    : [];

  const eligibleCount = sortedRows.filter((r) => eligibleStatuses.has(r.status) || trackingData[r.benefit]).length;
  const notStartedCount = sortedRows.length - eligibleCount;

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
            {eligibleCount} benefits eligible or in progress
            {notStartedCount > 0 && ` · ${notStartedCount} to explore`}
          </p>

          {/* Eligible / active benefits */}
          {sortedRows.filter((r) => eligibleStatuses.has(r.status) || trackingData[r.benefit]).length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              {sortedRows
                .filter((r) => eligibleStatuses.has(r.status) || trackingData[r.benefit])
                .map((row, i) => (
                  <BenefitCard
                    key={i}
                    row={row}
                    detail={findDetail(row.benefit)}
                    onSetReminder={handleSetReminder}
                    onMarkApplied={handleMarkApplied}
                    tracking={trackingData[row.benefit]}
                    onUpdateTracking={handleUpdateTracking}
                    hasReminder={hasReminder(row.benefit)}
                  />
                ))}
            </div>
          )}

          {/* Not started benefits — de-emphasized */}
          {sortedRows.filter((r) => !eligibleStatuses.has(r.status) && !trackingData[r.benefit]).length > 0 && (
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Worth Exploring
              </p>
              <div className="grid gap-4 sm:grid-cols-2 opacity-80">
                {sortedRows
                  .filter((r) => !eligibleStatuses.has(r.status) && !trackingData[r.benefit])
                  .map((row, i) => (
                    <BenefitCard
                      key={i}
                      row={row}
                      detail={findDetail(row.benefit)}
                      onSetReminder={handleSetReminder}
                      onMarkApplied={handleMarkApplied}
                      tracking={trackingData[row.benefit]}
                    onUpdateTracking={handleUpdateTracking}
                      hasReminder={hasReminder(row.benefit)}
                    />
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </WorkspaceSection>
  );
}
