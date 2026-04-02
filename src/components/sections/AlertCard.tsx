"use client";

import { useState } from "react";
import {
  Check,
  X,
  MessageSquare,
  Phone,
  Mail,
  ExternalLink,
  Stethoscope,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ParsedAlert } from "@/types/workspace";
import { cn } from "@/lib/utils";

const severityConfig = {
  HIGH: {
    border: "border-l-status-blocked",
    badge: "bg-status-blocked/10 text-status-blocked border-status-blocked/20",
    label: "High",
  },
  MEDIUM: {
    border: "border-l-status-caution",
    badge: "bg-status-caution/10 text-status-caution border-status-caution/20",
    label: "Medium",
  },
  INFO: {
    border: "border-l-status-success",
    badge: "bg-status-success/10 text-status-success border-status-success/20",
    label: "Info",
  },
};

/* ── Parse action text into CTA buttons ───────────────────────── */
interface ActionCTA {
  label: string;
  href?: string;
  icon: typeof Phone;
}

function parseActionCTAs(action: string): ActionCTA[] {
  const ctas: ActionCTA[] = [];
  if (!action) return ctas;

  // Phone numbers: patterns like 1-800-959-8281 or 519-555-0456
  const phoneMatch = action.match(
    /(\d[\d-]{7,})/
  );
  if (phoneMatch) {
    const phone = phoneMatch[1];
    ctas.push({
      label: `Call ${phone}`,
      href: `tel:${phone.replace(/[^0-9+]/g, "")}`,
      icon: Phone,
    });
  }

  // Email: patterns like email@domain
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

  // Profile / Medical tab reference
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

  // Register / enrollment links
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

interface AlertCardProps {
  alert: ParsedAlert;
  compact?: boolean;
  onComplete?: () => void;
  onDismiss?: () => void;
  onAddNote?: (note: string) => void;
  isCompleted?: boolean;
  isDismissed?: boolean;
  completedAt?: string;
}

export function AlertCard({
  alert,
  compact = false,
  onComplete,
  onDismiss,
  onAddNote,
  isCompleted = false,
  isDismissed = false,
  completedAt,
}: AlertCardProps) {
  const config = severityConfig[alert.severity];
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const actionCTAs = parseActionCTAs(alert.action);

  const handleSubmitNote = () => {
    if (noteText.trim() && onAddNote) {
      onAddNote(noteText.trim());
      setNoteText("");
      setNoteOpen(false);
    }
  };

  return (
    <Card
      className={cn(
        "border-l-4 py-0 transition-all",
        config.border,
        isCompleted && "bg-status-success/5 border-l-status-success/40",
        isDismissed && !isCompleted && "bg-warm-50 opacity-60",
        alert.status === "dismissed" && !isCompleted && "bg-warm-50 opacity-60"
      )}
      role={alert.severity === "HIGH" ? "alert" : undefined}
    >
      <CardContent className={cn("px-4", compact ? "py-3" : "py-4")}>
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 flex-wrap">
            {isCompleted && (
              <Check className="h-4 w-4 text-status-success" aria-label="Completed" />
            )}
            <Badge
              variant="outline"
              className={cn("text-[10px] font-medium", config.badge)}
            >
              {config.label}
            </Badge>
            <span className="text-xs text-warm-400">{alert.date}</span>
            {alert.action.includes("🏷️ Gap Filler") && (
              <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-600 border-purple-200">
                Gap Filler
              </Badge>
            )}
          </div>
        </div>
        <h3
          className={cn(
            "font-heading font-semibold text-sm text-foreground mb-1",
            isCompleted && "line-through"
          )}
        >
          {alert.title}
        </h3>
        {!compact && alert.description && (
          <p className="text-xs text-warm-400 mb-2 line-clamp-3">
            {alert.description}
          </p>
        )}
        {alert.action && (
          <p
            className={cn(
              "text-xs font-medium text-primary",
              isCompleted && "line-through opacity-60"
            )}
          >
            {alert.action.replace(/\s*—\s*🏷️.*$/, "")}
          </p>
        )}

        {/* CTA action buttons */}
        {!compact && actionCTAs.length > 0 && !isCompleted && (
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {actionCTAs.map((cta, i) => {
              const CtaIcon = cta.icon;
              return cta.href ? (
                <a
                  key={i}
                  href={cta.href}
                  className="inline-flex items-center gap-1 text-xs font-medium text-white bg-primary hover:bg-primary/90 px-2.5 py-1.5 rounded-md transition-colors"
                >
                  <CtaIcon className="h-3.5 w-3.5" />
                  {cta.label}
                </a>
              ) : (
                <button
                  key={i}
                  className="inline-flex items-center gap-1 text-xs font-medium text-white bg-primary hover:bg-primary/90 px-2.5 py-1.5 rounded-md transition-colors"
                >
                  <CtaIcon className="h-3.5 w-3.5" />
                  {cta.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Completion timestamp */}
        {isCompleted && completedAt && (
          <p className="text-[10px] text-status-success mt-1">
            Completed {completedAt}
          </p>
        )}

        {/* Action buttons — only shown when callbacks are provided */}
        {!compact && (onComplete || onDismiss || onAddNote) && !isCompleted && !isDismissed && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
            {onComplete && (
              <button
                onClick={onComplete}
                className="inline-flex items-center gap-1 text-xs font-medium text-status-success hover:bg-status-success/10 px-2 py-1 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Mark alert as complete"
              >
                <Check className="h-3.5 w-3.5" />
                Complete
              </button>
            )}
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="inline-flex items-center gap-1 text-xs font-medium text-warm-400 hover:text-foreground hover:bg-warm-100 px-2 py-1 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Dismiss alert"
              >
                <X className="h-3.5 w-3.5" />
                Dismiss
              </button>
            )}
            {onAddNote && (
              <button
                onClick={() => setNoteOpen(!noteOpen)}
                className="inline-flex items-center gap-1 text-xs font-medium text-warm-400 hover:text-foreground hover:bg-warm-100 px-2 py-1 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Add a note"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Add Note
              </button>
            )}
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
              className="flex-1 text-xs border border-border rounded-md px-2 py-1.5 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
            <button
              onClick={handleSubmitNote}
              disabled={!noteText.trim()}
              className="text-xs font-medium text-primary hover:bg-primary/10 px-2 py-1 rounded-md transition-colors disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Save
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
