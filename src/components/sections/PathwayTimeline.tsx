"use client";

import type { ParsedPathwayStage } from "@/types/workspace";
import { PathwayNode } from "./PathwayNode";
import { cn } from "@/lib/utils";

interface PathwayTimelineProps {
  stages: ParsedPathwayStage[];
}

export function PathwayTimeline({ stages }: PathwayTimelineProps) {
  return (
    <div className="relative space-y-0" role="list" aria-label="Pathway stages">
      {stages.map((stage, i) => (
        <div key={stage.number} className="relative" role="listitem">
          {/* Connector line */}
          {i < stages.length - 1 && (
            <div
              className={cn(
                "absolute left-[19px] top-12 bottom-0 w-0.5",
                stage.status === "completed"
                  ? "bg-status-success/40"
                  : "bg-border"
              )}
              aria-hidden="true"
            />
          )}
          <PathwayNode stage={stage} />
        </div>
      ))}
    </div>
  );
}
