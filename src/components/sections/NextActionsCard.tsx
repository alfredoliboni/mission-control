"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface NextActionsCardProps {
  actions: string[];
}

export function NextActionsCard({ actions }: NextActionsCardProps) {
  if (actions.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-heading">Next Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="space-y-2">
          {actions.map((action, i) => (
            <li
              key={i}
              className="flex items-start gap-3 text-sm"
            >
              <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0 mt-0.5">
                {i + 1}
              </span>
              <span className="text-foreground">{action}</span>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
