"use client";

import { useParsedPathway } from "@/hooks/useWorkspace";
import { WorkspaceSection } from "@/components/workspace/WorkspaceSection";
import { PathwayTimeline } from "@/components/sections/PathwayTimeline";
import { NextActionsCard } from "@/components/sections/NextActionsCard";
import { Badge } from "@/components/ui/badge";

export default function PathwayPage() {
  const { data: pathway, isLoading } = useParsedPathway();

  const stageLabel = pathway?.currentStage
    ?.replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <WorkspaceSection title="Pathway" icon="🗺️" isLoading={isLoading}>
      {pathway && (
        <div className="space-y-6">
          {stageLabel && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-warm-400">Current Stage:</span>
              <Badge className="bg-status-current/10 text-status-current border-status-current/20">
                {stageLabel}
              </Badge>
            </div>
          )}

          <PathwayTimeline stages={pathway.stages} />

          {pathway.nextActions.length > 0 && (
            <NextActionsCard actions={pathway.nextActions} />
          )}
        </div>
      )}
    </WorkspaceSection>
  );
}
