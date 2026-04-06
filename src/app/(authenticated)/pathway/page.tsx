"use client";

import { useState } from "react";
import { useParsedPathway } from "@/hooks/useWorkspace";
import { WorkspaceSection } from "@/components/workspace/WorkspaceSection";
import { cn } from "@/lib/utils";
import { CheckCircle, Circle, AlertTriangle, Star, ChevronDown, ChevronRight } from "lucide-react";
import type { ParsedPathwayStage, PathwayItem } from "@/types/workspace";

const itemStatusIcons = {
  completed: <CheckCircle className="h-3.5 w-3.5 text-status-success" />,
  current: <Circle className="h-3.5 w-3.5 text-status-current fill-status-current" />,
  upcoming: <Circle className="h-3.5 w-3.5 text-muted-foreground/40" />,
  blocked: <AlertTriangle className="h-3.5 w-3.5 text-status-blocked" />,
  milestone: <Star className="h-3.5 w-3.5 text-status-caution fill-status-caution" />,
};

function StageRow({ stage, isLast }: { stage: ParsedPathwayStage; isLast: boolean }) {
  const [expanded, setExpanded] = useState(stage.status === "current");

  const isDone = stage.status === "completed";
  const isCurrent = stage.status === "current";

  return (
    <div className="relative">
      {/* Connector line */}
      {!isLast && (
        <div
          className={cn(
            "absolute left-[13px] top-[36px] bottom-0 w-[2px]",
            isDone ? "bg-status-success/30" : "bg-border"
          )}
          aria-hidden="true"
        />
      )}

      <button
        className="flex items-start gap-3 w-full text-left group py-3"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        {/* Circle marker */}
        <div className="relative shrink-0 mt-0.5">
          {isDone ? (
            <div className="flex items-center justify-center w-[28px] h-[28px] rounded-full bg-status-success/8">
              <span className="text-[13px] font-bold text-status-success">&#10003;</span>
            </div>
          ) : isCurrent ? (
            <div className="flex items-center justify-center w-[28px] h-[28px] rounded-full bg-status-current/8 shadow-[0_0_0_4px_rgba(59,125,216,0.12)] animate-pulse">
              <span className="text-[13px] font-bold text-status-current">{stage.number}</span>
            </div>
          ) : (
            <div className="flex items-center justify-center w-[28px] h-[28px] rounded-full bg-muted">
              <span className="text-[13px] font-bold text-muted-foreground">{stage.number}</span>
            </div>
          )}
        </div>

        {/* Stage info */}
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex items-center gap-2">
            <h3
              className={cn(
                "text-[13px] font-semibold",
                isDone ? "text-foreground" : isCurrent ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {stage.title}
            </h3>

            {/* Status badge */}
            {isDone && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-status-success/8 text-status-success">
                Complete
              </span>
            )}
            {isCurrent && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-status-current/8 text-status-current">
                Current
              </span>
            )}

            {stage.items.length > 0 && (
              expanded ? (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              )
            )}
          </div>

          {/* Progress indicator */}
          {stage.items.length > 0 && (
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {stage.items.filter((i) => i.completed).length}/{stage.items.length} items done
            </p>
          )}
        </div>
      </button>

      {/* Checklist items */}
      {expanded && stage.items.length > 0 && (
        <div className="ml-[40px] pb-3 space-y-1.5">
          {stage.items.map((item, i) => (
            <ChecklistItem key={i} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function ChecklistItem({ item }: { item: PathwayItem }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 shrink-0">{itemStatusIcons[item.status]}</span>
      <span
        className={cn(
          "text-[13px] flex-1 leading-relaxed",
          item.completed ? "text-muted-foreground line-through" : "text-foreground",
          item.status === "blocked" && "text-status-blocked"
        )}
      >
        {item.text}
      </span>
      {item.date && (
        <span className="text-[11px] text-muted-foreground shrink-0">{item.date}</span>
      )}
    </div>
  );
}

export default function PathwayPage() {
  const { data: pathway, isLoading } = useParsedPathway();

  const totalStages = pathway?.stages.length ?? 0;
  const completedStages = pathway?.stages.filter((s) => s.status === "completed").length ?? 0;

  return (
    <WorkspaceSection title="Pathway" icon="🗺️" isLoading={isLoading}>
      {pathway && (
        <div className="space-y-4">
          {/* Subtitle */}
          <p className="text-[14px] text-muted-foreground">
            {completedStages} of {totalStages} stages completed — you&apos;re making progress! 💪
          </p>

          {/* Single card with all stages */}
          <div className="bg-card border border-border rounded-xl p-5 transition-all">
            {pathway.stages.map((stage, i) => (
              <StageRow
                key={stage.number}
                stage={stage}
                isLast={i === pathway.stages.length - 1}
              />
            ))}
          </div>

          {/* Next Actions */}
          {pathway.nextActions.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-md">
              <h2 className="text-[15px] font-semibold text-foreground mb-3">🎯 Next Actions</h2>
              <ol className="space-y-2">
                {pathway.nextActions.map((action, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="flex items-center justify-center h-5 w-5 rounded-full bg-status-current/8 text-status-current text-[11px] font-bold shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-[13px] text-foreground leading-relaxed">{action}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </WorkspaceSection>
  );
}
