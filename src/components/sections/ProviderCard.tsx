"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ParsedProvider } from "@/types/workspace";

interface ProviderCardProps {
  provider: ParsedProvider;
}

export function ProviderCard({ provider }: ProviderCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base font-heading">
            {provider.name}
          </CardTitle>
          <div className="flex gap-1 shrink-0">
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
