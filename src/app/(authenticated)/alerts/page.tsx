"use client";

import { useState } from "react";
import { useParsedAlerts } from "@/hooks/useWorkspace";
import { WorkspaceSection } from "@/components/workspace/WorkspaceSection";
import { AlertCard } from "@/components/sections/AlertCard";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AlertSeverity } from "@/types/workspace";

type FilterTab = "all" | AlertSeverity;

export default function AlertsPage() {
  const { data: alerts, isLoading } = useParsedAlerts();
  const [filter, setFilter] = useState<FilterTab>("all");
  const [showDismissed, setShowDismissed] = useState(false);

  const filtered = alerts
    ?.filter((a) => (showDismissed ? true : a.status === "active"))
    .filter((a) => (filter === "all" ? true : a.severity === filter));

  return (
    <WorkspaceSection title="Alerts" icon="🚨" isLoading={isLoading}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <Tabs
          value={filter}
          onValueChange={(v) => setFilter(v as FilterTab)}
        >
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="HIGH">High</TabsTrigger>
            <TabsTrigger value="MEDIUM">Medium</TabsTrigger>
            <TabsTrigger value="INFO">Info</TabsTrigger>
          </TabsList>
        </Tabs>
        <button
          className="text-xs text-warm-400 hover:text-foreground transition-colors"
          onClick={() => setShowDismissed(!showDismissed)}
        >
          {showDismissed ? "Hide dismissed" : "Show dismissed"}
        </button>
      </div>

      <div className="space-y-3">
        {filtered && filtered.length > 0 ? (
          filtered.map((alert, i) => <AlertCard key={i} alert={alert} />)
        ) : (
          <p className="text-sm text-warm-400 py-8 text-center">
            No alerts matching this filter
          </p>
        )}
      </div>
    </WorkspaceSection>
  );
}
