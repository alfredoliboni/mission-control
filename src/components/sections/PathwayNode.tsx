"use client";

import { useState } from "react";
import {
  CheckCircle,
  Circle,
  AlertTriangle,
  Star,
  ChevronDown,
  ChevronRight,
  Clock,
  Ban,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ParsedPathwayStage, PathwayItem } from "@/types/workspace";

const statusConfig = {
  completed: {
    icon: CheckCircle,
    color: "text-status-success",
    bg: "bg-status-success/10",
    ring: "ring-status-success/20",
    stageBg: "bg-status-success/5",
    label: "Completed",
  },
  current: {
    icon: Circle,
    color: "text-status-current",
    bg: "bg-status-current/10",
    ring: "ring-status-current/30",
    stageBg: "",
    label: "In Progress",
  },
  upcoming: {
    icon: Circle,
    color: "text-warm-300",
    bg: "bg-warm-100",
    ring: "ring-warm-200",
    stageBg: "",
    label: "Upcoming",
  },
};

const itemStatusIcons = {
  completed: <CheckCircle className="h-3.5 w-3.5 text-status-success" />,
  current: <Circle className="h-3.5 w-3.5 text-status-current fill-status-current" />,
  upcoming: <Circle className="h-3.5 w-3.5 text-warm-300" />,
  blocked: <AlertTriangle className="h-3.5 w-3.5 text-status-blocked" />,
  milestone: <Star className="h-3.5 w-3.5 text-status-caution fill-status-caution" />,
};

const stageStatusEmoji: Record<string, React.ReactNode> = {
  completed: <CheckCircle className="h-4 w-4 text-status-success" />,
  current: <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-current opacity-75" /><span className="relative inline-flex rounded-full h-3 w-3 bg-status-current" /></span>,
  upcoming: <Clock className="h-4 w-4 text-warm-300" />,
  blocked: <Ban className="h-4 w-4 text-status-blocked" />,
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
  const isCurrent = stage.status === "current";

  return (
    <div
      className={cn(
        "pb-6 rounded-lg transition-all",
        isCurrent && "ring-2 ring-status-current/20 bg-status-current/5 p-3 -mx-3",
        stage.status === "completed" && config.stageBg && "p-3 -mx-3"
      )}
    >
      <button
        className="flex items-start gap-3 w-full text-left group"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        {/* Stage number + icon */}
        <div className="relative shrink-0">
          <div
            className={cn(
              "flex items-center justify-center h-10 w-10 rounded-full ring-2 shrink-0",
              config.bg,
              config.ring,
              isCurrent && "ring-status-current/40"
            )}
          >
            {stage.status === "completed" ? (
              <Icon className={cn("h-5 w-5", config.color, "fill-status-success")} />
            ) : (
              <span className="text-sm font-bold text-foreground">{stage.number}</span>
            )}
          </div>
          {/* Status emoji */}
          <div className="absolute -top-1 -right-1">
            {stageStatusEmoji[stage.status]}
          </div>
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

          {/* Duration / checklist count */}
          <div className="flex items-center gap-3 mt-1">
            {/* Progress bar */}
            {total > 0 && (
              <div className="flex items-center gap-2 flex-1">
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
        </div>
      </button>

      {/* Items / checklist */}
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
          item.completed ? "text-warm-400 line-through" : "text-foreground",
          item.status === "blocked" && "text-status-blocked"
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
