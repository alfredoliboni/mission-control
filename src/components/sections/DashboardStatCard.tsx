"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

interface DashboardStatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  color?: string;
}

export function DashboardStatCard({
  icon: Icon,
  label,
  value,
  color = "text-primary",
}: DashboardStatCardProps) {
  return (
    <Card className="py-4">
      <CardContent className="px-4">
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-lg bg-warm-100 ${color}`}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold font-heading text-foreground">
              {value}
            </p>
            <p className="text-xs text-warm-400">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
