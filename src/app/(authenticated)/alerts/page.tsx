"use client";

import { useCallback, useState } from "react";
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

  // Local state for demo-mode actions (keyed by "date|title")
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState<Record<string, string[]>>({});

  const alertKey = (date: string, title: string) => `${date}|${title}`;

  const handleComplete = useCallback((key: string) => {
    setCompletedIds((prev) => new Set(prev).add(key));
  }, []);

  const handleDismiss = useCallback((key: string) => {
    setDismissedIds((prev) => new Set(prev).add(key));
  }, []);

  const handleAddNote = useCallback((key: string, note: string) => {
    setNotes((prev) => ({
      ...prev,
      [key]: [...(prev[key] || []), note],
    }));
  }, []);

  const filtered = alerts
    ?.filter((a) => {
      const key = alertKey(a.date, a.title);
      // Locally dismissed alerts follow the "showDismissed" toggle
      if (dismissedIds.has(key)) return showDismissed;
      return showDismissed ? true : a.status === "active";
    })
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
          filtered.map((alert) => {
            const key = alertKey(alert.date, alert.title);
            const isDismissed = dismissedIds.has(key);
            return (
              <div
                key={key}
                className={isDismissed ? "animate-in fade-in opacity-60" : undefined}
              >
                <AlertCard
                  alert={alert}
                  isCompleted={completedIds.has(key)}
                  onComplete={() => handleComplete(key)}
                  onDismiss={() => handleDismiss(key)}
                  onAddNote={(note) => handleAddNote(key, note)}
                />
                {notes[key] && notes[key].length > 0 && (
                  <div className="mt-1 ml-4 space-y-1">
                    {notes[key].map((note, j) => (
                      <p key={j} className="text-xs text-warm-400 italic">
                        Note: {note}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <p className="text-sm text-warm-400 py-8 text-center">
            No alerts matching this filter
          </p>
        )}
      </div>
    </WorkspaceSection>
  );
}
