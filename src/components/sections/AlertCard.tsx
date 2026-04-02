"use client";

import { useState } from "react";
import { Check, X, MessageSquare } from "lucide-react";
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

interface AlertCardProps {
  alert: ParsedAlert;
  compact?: boolean;
  onComplete?: () => void;
  onDismiss?: () => void;
  onAddNote?: (note: string) => void;
  isCompleted?: boolean;
}

export function AlertCard({
  alert,
  compact = false,
  onComplete,
  onDismiss,
  onAddNote,
  isCompleted = false,
}: AlertCardProps) {
  const config = severityConfig[alert.severity];
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState("");

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
        "border-l-4 py-0 transition-opacity",
        config.border,
        alert.status === "dismissed" && "opacity-60",
        isCompleted && "opacity-70"
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
            {alert.action}
          </p>
        )}

        {/* Action buttons — only shown when callbacks are provided */}
        {!compact && (onComplete || onDismiss || onAddNote) && !isCompleted && (
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
