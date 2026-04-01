"use client";

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
}

export function AlertCard({ alert, compact = false }: AlertCardProps) {
  const config = severityConfig[alert.severity];

  return (
    <Card
      className={cn(
        "border-l-4 py-0",
        config.border,
        alert.status === "dismissed" && "opacity-60"
      )}
      role={alert.severity === "HIGH" ? "alert" : undefined}
    >
      <CardContent className={cn("px-4", compact ? "py-3" : "py-4")}>
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className={cn("text-[10px] font-medium", config.badge)}
            >
              {config.label}
            </Badge>
            <span className="text-xs text-warm-400">{alert.date}</span>
          </div>
        </div>
        <h3 className="font-heading font-semibold text-sm text-foreground mb-1">
          {alert.title}
        </h3>
        {!compact && alert.description && (
          <p className="text-xs text-warm-400 mb-2 line-clamp-3">
            {alert.description}
          </p>
        )}
        {alert.action && (
          <p className="text-xs font-medium text-primary">{alert.action}</p>
        )}
      </CardContent>
    </Card>
  );
}
