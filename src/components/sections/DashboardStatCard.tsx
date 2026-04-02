"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

interface DashboardStatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  color?: string;
  href?: string;
}

export function DashboardStatCard({
  icon: Icon,
  label,
  value,
  color = "text-primary",
  href,
}: DashboardStatCardProps) {
  const content = (
    <Card className="py-4 transition-shadow hover:shadow-md group">
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
            <p className="text-xs text-warm-400 group-hover:text-foreground transition-colors">
              {label}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
      >
        {content}
      </Link>
    );
  }

  return content;
}
