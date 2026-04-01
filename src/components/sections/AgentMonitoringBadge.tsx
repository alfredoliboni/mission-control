"use client";

import { Eye } from "lucide-react";

interface AgentMonitoringBadgeProps {
  items: string[];
}

export function AgentMonitoringBadge({ items }: AgentMonitoringBadgeProps) {
  if (items.length === 0) return null;

  return (
    <div className="flex items-start gap-2 rounded-lg bg-primary/5 border border-primary/10 px-3 py-2">
      <Eye className="h-4 w-4 text-primary mt-0.5 shrink-0" />
      <div className="text-xs text-warm-400 space-y-0.5">
        <span className="font-medium text-primary">Agent is monitoring:</span>
        <ul className="space-y-0.5">
          {items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
