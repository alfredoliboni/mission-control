"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ParsedProvider } from "@/types/workspace";

interface ProviderCardProps {
  provider: ParsedProvider;
}

export function ProviderCard({ provider }: ProviderCardProps) {
  const needsConfirmation = !provider.contact || provider.contact === "—" || provider.waitlist?.toLowerCase().includes("unknown");

  return (
    <Card className={cn(needsConfirmation && "bg-amber-50/50 border-amber-200/60")}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className={cn("text-base font-heading", needsConfirmation && "text-gray-500")}>
            {provider.name}
          </CardTitle>
          <div className="flex gap-1 shrink-0 flex-wrap justify-end">
            {needsConfirmation && (
              <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-300">
                <AlertTriangle className="h-3 w-3 mr-0.5" />
                Needs confirmation
              </Badge>
            )}
            {provider.isGapFiller && (
              <Badge className="bg-status-gap-filler/10 text-status-gap-filler border-status-gap-filler/20 text-[10px]">
                Gap Filler
              </Badge>
            )}
          </div>
        </div>
        {provider.type && (
          <Badge variant="outline" className="text-[10px] w-fit">
            {provider.type}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {provider.services && (
          <div>
            <span className="font-medium text-warm-400 text-xs">Services:</span>
            <p className="text-foreground">{provider.services}</p>
          </div>
        )}
        {provider.relevance && (
          <div>
            <span className="font-medium text-warm-400 text-xs">Relevance:</span>
            <p className="text-foreground">{provider.relevance}</p>
          </div>
        )}
        {provider.waitlist && (
          <div>
            <span className="font-medium text-warm-400 text-xs">Waitlist:</span>
            <p className="text-foreground">{provider.waitlist}</p>
          </div>
        )}
        <div className="flex items-center gap-4 pt-1 text-xs text-warm-400">
          {provider.contact && <span>{provider.contact}</span>}
          {provider.funding && <span>Funding: {provider.funding}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
