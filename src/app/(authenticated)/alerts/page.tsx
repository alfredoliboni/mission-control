"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParsedAlerts } from "@/hooks/useWorkspace";
import { WorkspaceSection } from "@/components/workspace/WorkspaceSection";
import { cn } from "@/lib/utils";
import {
  Check,
  X,
  MessageSquare,
  Phone,
  Mail,
  ExternalLink,
  Stethoscope,
  Undo2,
} from "lucide-react";
import type { ParsedAlert } from "@/types/workspace";

type StatusFilter = "active" | "resolved" | "all";

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
    /* quota exceeded */
  }
}

function usePersistedAlertState() {
  const [state, setState] = useState<PersistedState>(() => loadPersistedState());
  const initialized = useRef(false);

  useEffect(() => {
    initialized.current = true;
  }, []);

  useEffect(() => {
    if (!initialized.current) return;
    savePersistedState(state);
  }, [state]);

  return [state, setState] as const;
}

// ── Parse action text into CTA buttons ───────────────────────────────────

interface ActionCTA {
  label: string;
  href?: string;
  icon: typeof Phone;
}

function parseActionCTAs(action: string): ActionCTA[] {
  const ctas: ActionCTA[] = [];
  if (!action) return ctas;

  const phoneMatch = action.match(/(\d[\d-]{7,})/);
  if (phoneMatch) {
    const phone = phoneMatch[1];
    ctas.push({
      label: `Call ${phone}`,
      href: `tel:${phone.replace(/[^0-9+]/g, "")}`,
      icon: Phone,
    });
  }

  const emailMatch = action.match(
    /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/
  );
  if (emailMatch) {
    ctas.push({
      label: `Email ${emailMatch[1]}`,
      href: `mailto:${emailMatch[1]}`,
      icon: Mail,
    });
  }

  if (
    action.toLowerCase().includes("profile") &&
    action.toLowerCase().includes("medical")
  ) {
    ctas.push({
      label: "Review in Medical Tab",
      href: "/profile",
      icon: Stethoscope,
    });
  }

  if (
    action.toLowerCase().includes("register") &&
    !ctas.some((c) => c.icon === Phone || c.icon === Mail)
  ) {
    ctas.push({
      label: "Register Now",
      icon: ExternalLink,
    });
  }

  return ctas;
}

// ── Severity dot color mapping ───────────────────────────────────────────

const severityDot: Record<string, string> = {
  HIGH: "bg-status-blocked",
  MEDIUM: "bg-status-caution",
  INFO: "bg-status-current",
};

// ── Alert Item ───────────────────────────────────────────────────────────

function AlertItem({
  alert,
  isCompleted,
  isDismissed,
  completedAt,
  alertNotes,
  onComplete,
  onDismiss,
  onAddNote,
  onUndo,
}: {
  alert: ParsedAlert;
  isCompleted: boolean;
  isDismissed: boolean;
  completedAt?: string;
  alertNotes?: string[];
  onComplete: () => void;
  onDismiss: () => void;
  onAddNote: (note: string) => void;
  onUndo: () => void;
}) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const actionCTAs = parseActionCTAs(alert.action);

  const handleSubmitNote = () => {
    if (noteText.trim()) {
      onAddNote(noteText.trim());
      setNoteText("");
      setNoteOpen(false);
    }
  };

  return (
    <div
      className={cn(
        "py-3 transition-all",
        isCompleted && "opacity-60",
        isDismissed && !isCompleted && "opacity-40"
      )}
    >
      {/* Top row: dot + title + date */}
      <div className="flex items-start gap-2.5">
        {/* Severity dot */}
        <div className="mt-[6px] shrink-0">
          <div
            className={cn(
              "w-[7px] h-[7px] rounded-full",
              severityDot[alert.severity] || "bg-muted-foreground"
            )}
          />
        </div>

        <div className="flex-1 min-w-0">
          {/* Title + date row */}
          <div className="flex items-start justify-between gap-2">
            <h3
              className={cn(
                "text-[13px] font-semibold text-foreground",
                isCompleted && "line-through"
              )}
            >
              {isCompleted && <Check className="inline h-3.5 w-3.5 text-status-success mr-1" />}
              {alert.title}
            </h3>
            <span className="text-[11px] text-muted-foreground shrink-0 pt-0.5">{alert.date}</span>
          </div>

          {/* Description */}
          {alert.description && (
            <p className={cn(
              "text-[12px] text-muted-foreground mt-0.5 leading-relaxed line-clamp-3",
              isCompleted && "line-through"
            )}>
              {alert.description}
            </p>
          )}

          {/* Action text */}
          {alert.action && (
            <p
              className={cn(
                "text-[12px] font-medium text-primary mt-1",
                isCompleted && "line-through opacity-60"
              )}
            >
              {alert.action.replace(/\s*—\s*🏷️.*$/, "")}
            </p>
          )}

          {/* Completed timestamp */}
          {isCompleted && completedAt && (
            <p className="text-[10px] text-status-success mt-1">Completed {completedAt}</p>
          )}

          {/* Undo button for resolved alerts */}
          {(isCompleted || isDismissed) && (
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={onUndo}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted px-2 py-1 rounded-md transition-colors border border-transparent hover:border-border"
              >
                <Undo2 className="h-3.5 w-3.5" />
                Reactivate
              </button>
            </div>
          )}

          {/* CTA buttons for HIGH alerts */}
          {alert.severity === "HIGH" && actionCTAs.length > 0 && !isCompleted && (
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {actionCTAs.map((cta, i) => {
                const CtaIcon = cta.icon;
                return cta.href ? (
                  <a
                    key={i}
                    href={cta.href}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-white bg-primary hover:bg-primary/90 px-2.5 py-1.5 rounded-md transition-colors"
                  >
                    <CtaIcon className="h-3.5 w-3.5" />
                    {cta.label}
                  </a>
                ) : (
                  <button
                    key={i}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-white bg-primary hover:bg-primary/90 px-2.5 py-1.5 rounded-md transition-colors"
                  >
                    <CtaIcon className="h-3.5 w-3.5" />
                    {cta.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Action buttons */}
          {!isCompleted && !isDismissed && (
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={onComplete}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-status-success hover:bg-status-success/8 px-2 py-1 rounded-md transition-colors"
              >
                <Check className="h-3.5 w-3.5" />
                Complete
              </button>
              <button
                onClick={onDismiss}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted px-2 py-1 rounded-md transition-colors"
              >
                <X className="h-3.5 w-3.5" />
                Dismiss
              </button>
              <button
                onClick={() => setNoteOpen(!noteOpen)}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted px-2 py-1 rounded-md transition-colors"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Note
              </button>
            </div>
          )}

          {/* Note input */}
          {noteOpen && (
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmitNote()}
                placeholder="Type a note..."
                className="flex-1 text-[12px] border border-border rounded-md px-2 py-1.5 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                autoFocus
              />
              <button
                onClick={handleSubmitNote}
                disabled={!noteText.trim()}
                className="text-[12px] font-medium text-primary hover:bg-primary/10 px-2 py-1 rounded-md transition-colors disabled:opacity-40"
              >
                Save
              </button>
            </div>
          )}

          {/* Persisted notes */}
          {alertNotes && alertNotes.length > 0 && (
            <div className="mt-1.5 space-y-0.5">
              {alertNotes.map((note, j) => (
                <p key={j} className="text-[11px] text-muted-foreground italic">
                  Note: {note}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── Main Alerts Page ─────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

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

  const handleUndo = useCallback((key: string) => {
    setPersisted((prev) => {
      const { [key]: _removedAt, ...restCompletedAt } = prev.completedAt;
      return {
        ...prev,
        completedIds: prev.completedIds.filter((id) => id !== key),
        dismissedIds: prev.dismissedIds.filter((id) => id !== key),
        completedAt: restCompletedAt,
      };
    });
  }, [setPersisted]);

  // Compute counts
  const allAlerts = alerts || [];
  const counts = { active: 0, resolved: 0, all: allAlerts.length };

  for (const a of allAlerts) {
    const key = alertKey(a.date, a.title);
    const isResolved = completedIds.has(key) || dismissedIds.has(key) || a.status === "dismissed";
    if (isResolved) {
      counts.resolved++;
    } else {
      counts.active++;
    }
  }

  // Filter alerts
  const filtered = allAlerts.filter((a) => {
    const key = alertKey(a.date, a.title);
    const isResolved = completedIds.has(key) || dismissedIds.has(key) || a.status === "dismissed";

    switch (filter) {
      case "active":
        return !isResolved;
      case "resolved":
        return isResolved;
      case "all":
        return true;
    }
  });

  const tabs: { key: StatusFilter; label: string; count: number }[] = [
    { key: "active", label: "Active", count: counts.active },
    { key: "resolved", label: "Resolved", count: counts.resolved },
    { key: "all", label: "All", count: counts.all },
  ];

  return (
    <WorkspaceSection title="Alerts" icon="🔔" isLoading={isLoading}>
      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={cn(
              "text-[13px] font-medium px-3 py-2 -mb-px border-b-2 transition-colors",
              filter === tab.key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Alert list inside a single card */}
      <div className="bg-card border border-border rounded-xl px-5 transition-all">
        {filtered.length > 0 ? (
          <div className="divide-y divide-border">
            {filtered.map((alert) => {
              const key = alertKey(alert.date, alert.title);
              const isCompleted = completedIds.has(key);
              const isDismissed = dismissedIds.has(key) || alert.status === "dismissed";
              return (
                <AlertItem
                  key={key}
                  alert={alert}
                  isCompleted={isCompleted}
                  isDismissed={isDismissed && !isCompleted}
                  completedAt={completedAt[key]}
                  alertNotes={notes[key]}
                  onComplete={() => handleComplete(key)}
                  onDismiss={() => handleDismiss(key)}
                  onAddNote={(note) => handleAddNote(key, note)}
                  onUndo={() => handleUndo(key)}
                />
              );
            })}
          </div>
        ) : (
          <p className="text-[13px] text-muted-foreground py-8 text-center">
            No alerts matching this filter
          </p>
        )}
      </div>
    </WorkspaceSection>
  );
}
