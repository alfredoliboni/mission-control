"use client";

import {
  CheckCircle,
  Clock,
  Circle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import type { BenefitStatus, BenefitStatusRow } from "@/types/workspace";
import { cn } from "@/lib/utils";

const statusConfig: Record<BenefitStatus, { icon: typeof CheckCircle; color: string; label: string }> = {
  registered: {
    icon: CheckCircle,
    color: "text-status-success",
    label: "Registered",
  },
  approved: {
    icon: CheckCircle,
    color: "text-status-success",
    label: "Approved",
  },
  active: {
    icon: CheckCircle,
    color: "text-status-success",
    label: "Active",
  },
  pending: {
    icon: Clock,
    color: "text-status-caution",
    label: "Pending",
  },
  waiting: {
    icon: Loader2,
    color: "text-status-caution",
    label: "Waiting",
  },
  renewed: {
    icon: RefreshCw,
    color: "text-teal-600",
    label: "Renewed",
  },
  not_started: {
    icon: Circle,
    color: "text-warm-300",
    label: "Not Started",
  },
};

interface BenefitRowProps {
  benefit: BenefitStatusRow;
}

export function BenefitRow({ benefit }: BenefitRowProps) {
  const config = statusConfig[benefit.status];
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-3 py-3 px-4 rounded-lg hover:bg-warm-50 transition-colors">
      <Icon className={cn("h-5 w-5 shrink-0", config.color)} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">
          {benefit.benefit}
        </p>
        <p className="text-xs text-warm-400">
          {benefit.statusDisplay}
          {benefit.applied && benefit.applied !== "—"
            ? ` • Applied: ${benefit.applied}`
            : ""}
        </p>
      </div>
      {benefit.notes && (
        <p className="text-xs text-warm-400 text-right max-w-[200px] truncate hidden sm:block">
          {benefit.notes}
        </p>
      )}
    </div>
  );
}
