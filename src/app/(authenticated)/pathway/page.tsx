"use client";

import { useParsedPathway } from "@/hooks/useWorkspace";
import { WorkspaceSection } from "@/components/workspace/WorkspaceSection";
import { PathwayTimeline } from "@/components/sections/PathwayTimeline";
import { NextActionsCard } from "@/components/sections/NextActionsCard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function PathwayPage() {
  const { data: pathway, isLoading } = useParsedPathway();

  const stageLabel = pathway?.currentStage
    ?.replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const totalStages = pathway?.stages.length ?? 0;
  const completedStages = pathway?.stages.filter(
    (s) => s.status === "completed"
  ).length ?? 0;
  const progressPct =
    totalStages > 0 ? Math.round((completedStages / totalStages) * 100) : 0;

  return (
    <WorkspaceSection title="Pathway" icon="🗺️" isLoading={isLoading}>
      {pathway && (
        <div className="space-y-6">
          {/* Progress summary bar */}
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {completedStages} of {totalStages} stages completed
                  </span>
                  <Badge
                    className={cn(
                      "text-[10px]",
                      progressPct >= 50
                        ? "bg-status-success/10 text-status-success border-status-success/20"
                        : "bg-status-current/10 text-status-current border-status-current/20"
                    )}
                    variant="outline"
                  >
                    {progressPct}% complete
                  </Badge>
                </div>
                {stageLabel && (
                  <Badge className="bg-status-current/10 text-status-current border-status-current/20">
                    Current: {stageLabel}
                  </Badge>
                )}
              </div>
              <div className="h-2 bg-warm-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-status-success rounded-full transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              {/* Stage dots */}
              <div className="flex justify-between mt-1">
                {pathway.stages.map((s) => (
                  <div key={s.number} className="flex flex-col items-center">
                    <div
                      className={cn(
                        "h-2 w-2 rounded-full mt-1",
                        s.status === "completed" && "bg-status-success",
                        s.status === "current" && "bg-status-current",
                        s.status === "upcoming" && "bg-warm-300"
                      )}
                    />
                    <span className="text-[9px] text-warm-400 mt-0.5 hidden sm:block">
                      Stage {s.number}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <PathwayTimeline stages={pathway.stages} />

          {pathway.nextActions.length > 0 && (
            <NextActionsCard actions={pathway.nextActions} />
          )}
        </div>
      )}
    </WorkspaceSection>
  );
}
