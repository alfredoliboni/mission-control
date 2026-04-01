"use client";

import {
  AlertTriangle,
  Users,
  BookOpen,
  DollarSign,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useParsedAlerts,
  useParsedPathway,
  useParsedBenefits,
  useParsedProviders,
  useParsedPrograms,
} from "@/hooks/useWorkspace";
import { DashboardStatCard } from "@/components/sections/DashboardStatCard";
import { AlertCard } from "@/components/sections/AlertCard";
import { NextActionsCard } from "@/components/sections/NextActionsCard";

export default function DashboardPage() {
  const { data: alerts, isLoading: alertsLoading } = useParsedAlerts();
  const { data: pathway, isLoading: pathwayLoading } = useParsedPathway();
  const { data: benefits, isLoading: benefitsLoading } = useParsedBenefits();
  const { data: providers, isLoading: providersLoading } =
    useParsedProviders();
  const { data: programs, isLoading: programsLoading } = useParsedPrograms();

  const isLoading =
    alertsLoading ||
    pathwayLoading ||
    benefitsLoading ||
    providersLoading ||
    programsLoading;

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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-foreground">
        Dashboard
      </h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardStatCard
          icon={AlertTriangle}
          label="Active Alerts"
          value={activeAlerts.length}
          color={highAlerts.length > 0 ? "text-status-blocked" : "text-status-caution"}
        />
        <DashboardStatCard
          icon={Users}
          label="Providers Found"
          value={providerCount}
          color="text-primary"
        />
        <DashboardStatCard
          icon={BookOpen}
          label="Programs Available"
          value={programCount}
          color="text-status-success"
        />
        <DashboardStatCard
          icon={DollarSign}
          label="Benefits Pending"
          value={benefitsPending}
          color="text-status-caution"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Current stage progress */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-heading flex items-center gap-2">
              <span aria-hidden="true">🗺️</span>
              {currentStage
                ? `Stage: ${currentStage.title}`
                : "Pathway"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stageProgress && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-warm-400">Progress</span>
                  <span className="text-sm font-medium text-foreground">
                    {stageProgress.completed}/{stageProgress.total}
                  </span>
                </div>
                <div className="h-2 bg-warm-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-status-current rounded-full transition-all"
                    style={{
                      width: `${
                        stageProgress.total > 0
                          ? (stageProgress.completed / stageProgress.total) *
                            100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            )}
            {pathway?.nextActions && pathway.nextActions.length > 0 && (
              <NextActionsCard actions={pathway.nextActions.slice(0, 3)} />
            )}
          </CardContent>
        </Card>

        {/* Active alerts */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-heading flex items-center gap-2">
              <span aria-hidden="true">🚨</span>
              Active Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeAlerts.length === 0 ? (
              <p className="text-sm text-warm-400">No active alerts</p>
            ) : (
              activeAlerts
                .slice(0, 3)
                .map((alert, i) => (
                  <AlertCard key={i} alert={alert} compact />
                ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
