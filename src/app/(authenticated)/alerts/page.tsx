"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParsedAlerts } from "@/hooks/useWorkspace";
import { WorkspaceSection } from "@/components/workspace/WorkspaceSection";
import { AlertCard } from "@/components/sections/AlertCard";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusFilter = "active" | "completed" | "dismissed" | "all";

const STORAGE_KEY = "alerts-state";

interface PersistedState {
  completedIds: string[];
  dismissedIds: string[];
  completedAt: Record<string, string>;
  notes: Record<string, string[]>;
}

function loadPersistedState(): PersistedState {
  if (typeof window === "undefined") {
    return { completedIds: [], dismissedIds: [], completedAt: {}, notes: {} };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return { completedIds: [], dismissedIds: [], completedAt: {}, notes: {} };
}

function savePersistedState(state: PersistedState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota exceeded — ignore */
  }
}

function usePersistedAlertState() {
  const [state, setState] = useState<PersistedState>(() => loadPersistedState());
  const initialized = useRef(false);

  // Mark as initialized after first render
  useEffect(() => {
    initialized.current = true;
  }, []);

  // Persist to localStorage on changes (skip initial render)
  useEffect(() => {
    if (!initialized.current) return;
    savePersistedState(state);
  }, [state]);

  return [state, setState] as const;
}

export default function AlertsPage() {
  const { data: alerts, isLoading } = useParsedAlerts();
  const [filter, setFilter] = useState<StatusFilter>("active");

  const [persisted, setPersisted] = usePersistedAlertState();
  const completedIds = new Set(persisted.completedIds);
  const dismissedIds = new Set(persisted.dismissedIds);
  const completedAt = persisted.completedAt;
  const notes = persisted.notes;

  const alertKey = (date: string, title: string) => `${date}|${title}`;

  const handleComplete = useCallback((key: string) => {
    setPersisted((prev) => ({
      ...prev,
      completedIds: [...new Set([...prev.completedIds, key])],
      completedAt: { ...prev.completedAt, [key]: new Date().toLocaleString() },
    }));
  }, [setPersisted]);

  const handleDismiss = useCallback((key: string) => {
    setPersisted((prev) => ({
      ...prev,
      dismissedIds: [...new Set([...prev.dismissedIds, key])],
    }));
  }, [setPersisted]);

  const handleAddNote = useCallback((key: string, note: string) => {
    setPersisted((prev) => ({
      ...prev,
      notes: { ...prev.notes, [key]: [...(prev.notes[key] || []), note] },
    }));
  }, [setPersisted]);

  // Compute counts
  const allAlerts = alerts || [];
  const counts = {
    active: 0,
    completed: 0,
    dismissed: 0,
    all: allAlerts.length,
  };
  for (const a of allAlerts) {
    const key = alertKey(a.date, a.title);
    if (completedIds.has(key)) {
      counts.completed++;
    } else if (dismissedIds.has(key) || a.status === "dismissed") {
      counts.dismissed++;
    } else {
      counts.active++;
    }
  }

  // Filter alerts
  const filtered = allAlerts.filter((a) => {
    const key = alertKey(a.date, a.title);
    const isCompleted = completedIds.has(key);
    const isDismissed = dismissedIds.has(key) || a.status === "dismissed";

    switch (filter) {
      case "active":
        return !isCompleted && !isDismissed;
      case "completed":
        return isCompleted;
      case "dismissed":
        return isDismissed && !isCompleted;
      case "all":
        return true;
    }
  });

  const filterOptions: { key: StatusFilter; label: string }[] = [
    { key: "active", label: "Active" },
    { key: "completed", label: "Completed" },
    { key: "dismissed", label: "Dismissed" },
    { key: "all", label: "All" },
  ];

  return (
    <WorkspaceSection title="Alerts" icon="🚨" isLoading={isLoading}>
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {filterOptions.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setFilter(opt.key)}
            className={cn(
              "inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors border",
              filter === opt.key
                ? "bg-primary text-white border-primary"
                : "bg-background text-warm-400 border-border hover:bg-warm-50 hover:text-foreground"
            )}
          >
            {opt.label}
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] px-1.5 py-0 h-4 min-w-[1.25rem] flex items-center justify-center",
                filter === opt.key
                  ? "bg-white/20 text-white border-white/30"
                  : "bg-warm-100 text-warm-400 border-warm-200"
              )}
            >
              {counts[opt.key]}
            </Badge>
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length > 0 ? (
          filtered.map((alert) => {
            const key = alertKey(alert.date, alert.title);
            const isCompleted = completedIds.has(key);
            const isDismissed = dismissedIds.has(key) || alert.status === "dismissed";
            return (
              <div key={key}>
                <AlertCard
                  alert={alert}
                  isCompleted={isCompleted}
                  isDismissed={isDismissed}
                  completedAt={completedAt[key]}
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
