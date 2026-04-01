"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { AgentMonitoringBadge } from "@/components/sections/AgentMonitoringBadge";

interface WorkspaceSectionProps {
  title: string;
  icon?: string;
  lastUpdated?: string;
  agentMonitoring?: string[];
  isLoading?: boolean;
  children: React.ReactNode;
}

export function WorkspaceSection({
  title,
  icon,
  lastUpdated,
  agentMonitoring,
  isLoading,
  children,
}: WorkspaceSectionProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-40" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
          {icon && (
            <span className="text-2xl" aria-hidden="true">
              {icon}
            </span>
          )}
          {title}
        </h1>
        <div className="flex items-center gap-2 flex-wrap">
          {lastUpdated && (
            <Badge variant="outline" className="text-xs font-normal">
              Updated {lastUpdated}
            </Badge>
          )}
        </div>
      </div>

      {agentMonitoring && agentMonitoring.length > 0 && (
        <AgentMonitoringBadge items={agentMonitoring} />
      )}

      {children}
    </div>
  );
}
