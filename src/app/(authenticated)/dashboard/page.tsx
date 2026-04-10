"use client";

import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useParsedAlerts,
  useParsedPathway,
  useParsedBenefits,
  useParsedProviders,
  useParsedPrograms,
  useParsedProfile,
  isNavigatorOffline,
} from "@/hooks/useWorkspace";

/* ── Severity dot color map ──────────────────────────────────── */
const severityDot: Record<string, string> = {
  HIGH: "bg-status-blocked",
  MEDIUM: "bg-status-caution",
  INFO: "bg-status-success",
};

export default function DashboardPage() {
  const { data: alerts, isLoading: alertsLoading, error: alertsError } = useParsedAlerts();
  const { data: pathway, isLoading: pathwayLoading, error: pathwayError } = useParsedPathway();
  const { data: benefits, isLoading: benefitsLoading, error: benefitsError } = useParsedBenefits();
  const { data: providers, isLoading: providersLoading, error: providersError } = useParsedProviders();
  const { data: programs, isLoading: programsLoading, error: programsError } = useParsedPrograms();
  const { data: profile, isLoading: profileLoading, error: profileError } = useParsedProfile();

  const isLoading =
    alertsLoading ||
    pathwayLoading ||
    benefitsLoading ||
    providersLoading ||
    programsLoading ||
    profileLoading;

  const errors = [alertsError, pathwayError, benefitsError, providersError, programsError, profileError];
  const hasError = errors.some(Boolean);
  const isOffline = errors.some((e) => isNavigatorOffline(e));

  // Compute stats
  const activeAlerts = alerts?.filter((a) => a.status === "active") || [];
  const highAlerts = activeAlerts.filter((a) => a.severity === "HIGH");
  const providerCount =
    (providers?.highestPriority.length || 0) +
    (providers?.relevant.length || 0) +
    (providers?.other.length || 0);
  const programCount =
    (programs?.gapFillers.length || 0) +
    (programs?.government.length || 0) +
    (programs?.educational.length || 0);
  const benefitsPending =
    benefits?.statusTable.filter(
      (b) => b.status === "pending" || b.status === "waiting"
    ).length || 0;

  // Current stage info
  const currentStage = pathway?.stages.find((s) => s.status === "current");
  const stageProgress = currentStage
    ? {
        completed: currentStage.items.filter((i) => i.completed).length,
        total: currentStage.items.length,
      }
    : null;

  const childName = profile?.basicInfo?.name || "your child";

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 rounded-2xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  /* ── Metric card config ────────────────────────────────────── */
  const metrics = [
    {
      emoji: "🚨",
      bg: "bg-[#fde8e8]",
      value: activeAlerts.length,
      label: "Active Alerts",
      href: "/alerts",
      color: highAlerts.length > 0 ? "text-status-blocked" : "text-status-caution",
    },
    {
      emoji: "🏥",
      bg: "bg-[#fef0e8]",
      value: providerCount,
      label: "Providers Found",
      href: "/providers",
      color: "text-primary",
    },
    {
      emoji: "📚",
      bg: "bg-[#e6f4ea]",
      value: programCount,
      label: "Programs Available",
      href: "/programs",
      color: "text-status-success",
    },
    {
      emoji: "💰",
      bg: "bg-[#fef7e0]",
      value: benefitsPending,
      label: "Benefits Pending",
      href: "/benefits",
      color: "text-status-caution",
    },
  ];

  const progressPct =
    stageProgress && stageProgress.total > 0
      ? (stageProgress.completed / stageProgress.total) * 100
      : 0;

  return (
    <div className="space-y-6">
      {/* ── Navigator offline banner ────────────────────────── */}
      {hasError && (
        <div className="bg-[#fef7e0] border border-[#f5d67a] rounded-xl px-5 py-4 flex items-center gap-3">
          <span className="text-xl shrink-0" aria-hidden="true">📡</span>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {isOffline
                ? "Your Navigator is currently offline. Showing cached data."
                : "Some data could not be loaded. Showing cached data."}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              We&apos;ll keep trying to reconnect automatically.
            </p>
          </div>
        </div>
      )}

      {/* ── Welcome card ─────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-[#fef5f0] via-[#fdf2f8] to-[#f0f4ff] border border-border rounded-2xl px-4 py-4 sm:px-6 sm:py-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-bold text-foreground">
            Good morning! Here&apos;s {childName}&apos;s journey overview{" "}
            <span aria-hidden="true">&#x1F44B;</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Everything in one place — alerts, pathway, and next steps.
          </p>
        </div>
        <span className="text-4xl hidden sm:block" aria-hidden="true">
          &#x1F31F;
        </span>
      </div>

      {/* ── Metric cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <Link
            key={m.label}
            href={m.href}
            className="bg-card border border-border rounded-xl px-4 py-4 flex items-center gap-3 transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-border/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span
              className={`${m.bg} flex items-center justify-center w-10 h-10 rounded-lg text-xl shrink-0`}
              aria-hidden="true"
            >
              {m.emoji}
            </span>
            <div>
              <p className={`text-2xl font-bold font-heading ${m.color}`}>
                {m.value}
              </p>
              <p className="text-xs font-medium text-muted-foreground">
                {m.label}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* ── Two-column: Stage + Alerts ───────────────────────── */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Current Stage */}
        <div className="bg-card border border-border rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-border/80">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <h2 className="font-heading text-base font-semibold text-foreground flex items-center gap-2">
              <span aria-hidden="true">&#x1F5FA;&#xFE0F;</span>
              {currentStage
                ? `Current Stage: ${currentStage.title}`
                : "Pathway"}
            </h2>
            <Link
              href="/pathway"
              className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              View pathway &rarr;
            </Link>
          </div>

          <div className="px-4 pb-4 space-y-4">
            {/* Progress bar */}
            {stageProgress && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    Progress
                  </span>
                  <span className="text-xs font-semibold text-foreground">
                    {stageProgress.completed}/{stageProgress.total}
                  </span>
                </div>
                <div className="h-2 bg-warm-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${progressPct}%`,
                      background:
                        "linear-gradient(90deg, var(--color-status-current), var(--color-status-renewed))",
                    }}
                  />
                </div>
              </div>
            )}

            {/* Next actions (numbered) */}
            {pathway?.nextActions && pathway.nextActions.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Next Actions
                </h3>
                <ol className="space-y-2">
                  {pathway.nextActions.slice(0, 4).map((action, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span className="text-foreground font-normal">
                        {action}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </div>

        {/* Active Alerts */}
        <div className="bg-card border border-border rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-border/80">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <h2 className="font-heading text-base font-semibold text-foreground flex items-center gap-2">
              <span aria-hidden="true">&#x1F514;</span>
              Active Alerts
            </h2>
            <Link
              href="/alerts"
              className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              View all &rarr;
            </Link>
          </div>

          <div className="px-4 pb-4 space-y-3">
            {activeAlerts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                No active alerts — you&apos;re all caught up.
              </p>
            ) : (
              activeAlerts.slice(0, 4).map((alert, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 py-2 border-b border-border last:border-b-0"
                >
                  {/* Severity dot */}
                  <span
                    className={`mt-1.5 shrink-0 rounded-full ${severityDot[alert.severity] || "bg-warm-300"}`}
                    style={{ width: 7, height: 7 }}
                    aria-label={`${alert.severity} severity`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground leading-snug">
                      {alert.title}
                    </p>
                    {alert.action && (
                      <p className="text-xs font-medium text-primary mt-0.5 truncate">
                        {alert.action.replace(/\s*—\s*🏷️.*$/, "")}
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {alert.date}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
