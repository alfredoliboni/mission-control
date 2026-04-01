"use client";

import { useState } from "react";
import {
  CheckCircle,
  Circle,
  AlertTriangle,
  Star,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ParsedPathwayStage, PathwayItem } from "@/types/workspace";

const statusConfig = {
  completed: {
    icon: CheckCircle,
    color: "text-status-success",
    bg: "bg-status-success/10",
    ring: "ring-status-success/20",
  },
  current: {
    icon: Circle,
    color: "text-status-current",
    bg: "bg-status-current/10",
    ring: "ring-status-current/20",
  },
  upcoming: {
    icon: Circle,
    color: "text-warm-300",
    bg: "bg-warm-100",
    ring: "ring-warm-200",
  },
};

const itemStatusIcons = {
  completed: <CheckCircle className="h-3.5 w-3.5 text-status-success" />,
  current: <Circle className="h-3.5 w-3.5 text-status-current fill-status-current" />,
  upcoming: <Circle className="h-3.5 w-3.5 text-warm-300" />,
  blocked: <AlertTriangle className="h-3.5 w-3.5 text-status-blocked" />,
  milestone: <Star className="h-3.5 w-3.5 text-status-caution fill-status-caution" />,
};

interface PathwayNodeProps {
  stage: ParsedPathwayStage;
}

export function PathwayNode({ stage }: PathwayNodeProps) {
  const [expanded, setExpanded] = useState(
    stage.status === "current"
  );
  const config = statusConfig[stage.status];
  const Icon = config.icon;

  const completed = stage.items.filter((i) => i.completed).length;
  const total = stage.items.length;
  const progressPct = total > 0 ? (completed / total) * 100 : 0;

  return (
    <div className="pb-6">
      <button
        className="flex items-start gap-3 w-full text-left group"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        {/* Stage icon */}
        <div
          className={cn(
            "flex items-center justify-center h-10 w-10 rounded-full ring-2 shrink-0",
            config.bg,
            config.ring
          )}
        >
          <Icon
            className={cn(
              "h-5 w-5",
              config.color,
              stage.status === "completed" && "fill-status-success"
            )}
          />
        </div>

        {/* Stage info */}
        <div className="flex-1 min-w-0 pt-1">
          <div className="flex items-center gap-2">
            <h3
              className={cn(
                "font-heading font-semibold text-sm",
                stage.status === "upcoming"
                  ? "text-warm-400"
                  : "text-foreground"
              )}
            >
              {stage.title}
            </h3>
            {expanded ? (
              <ChevronDown className="h-4 w-4 text-warm-300" />
            ) : (
              <ChevronRight className="h-4 w-4 text-warm-300" />
            )}
          </div>

          {/* Progress bar */}
          {total > 0 && (
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-1.5 bg-warm-200 rounded-full overflow-hidden max-w-[200px]">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    stage.status === "completed"
                      ? "bg-status-success"
                      : "bg-status-current"
                  )}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="text-xs text-warm-400">
                {completed}/{total}
              </span>
            </div>
          )}
        </div>
      </button>

      {/* Items */}
      {expanded && stage.items.length > 0 && (
        <div className="ml-[52px] mt-2 space-y-1.5">
          {stage.items.map((item, i) => (
            <PathwayItemRow key={i} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function PathwayItemRow({ item }: { item: PathwayItem }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="mt-0.5 shrink-0">{itemStatusIcons[item.status]}</span>
      <span
        className={cn(
          "flex-1",
          item.completed ? "text-warm-400 line-through" : "text-foreground"
        )}
      >
        {item.text}
      </span>
      {item.date && (
        <span className="text-xs text-warm-300 shrink-0">{item.date}</span>
      )}
    </div>
  );
}
