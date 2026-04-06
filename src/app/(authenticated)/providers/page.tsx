"use client";

import { useState } from "react";
import { useParsedProviders } from "@/hooks/useWorkspace";
import { WorkspaceSection } from "@/components/workspace/WorkspaceSection";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search } from "lucide-react";
import type { ParsedProvider } from "@/types/workspace";

function ProviderCardInline({ provider }: { provider: ParsedProvider }) {
  const categoryTag = provider.isGapFiller ? (
    <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-status-gap-filler/8 text-status-gap-filler">
      Gap Filler
    </span>
  ) : provider.priority === "highest" ? (
    <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-primary/8 text-primary">
      Priority
    </span>
  ) : null;

  return (
    <div className="bg-card border border-border rounded-xl p-4 transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-[14px] font-semibold text-foreground leading-snug">
          {provider.name}
        </h3>
        {categoryTag}
      </div>
      <div className="text-[12px] text-muted-foreground leading-[1.6] space-y-0.5">
        {provider.type && <p>{provider.type}</p>}
        {provider.services && <p>{provider.services}</p>}
        {provider.waitlist && provider.waitlist !== "—" && (
          <p>Waitlist: {provider.waitlist}</p>
        )}
        {provider.funding && provider.funding !== "—" && (
          <p>Funding: {provider.funding}</p>
        )}
        {provider.contact && provider.contact !== "—" && (
          <p>{provider.contact}</p>
        )}
        {provider.notes && <p className="italic">{provider.notes}</p>}
      </div>
    </div>
  );
}

export default function ProvidersPage() {
  const { data: providers, isLoading } = useParsedProviders();
  const [search, setSearch] = useState("");

  const filterProviders = (
    list: typeof providers extends undefined
      ? never
      : NonNullable<typeof providers>["highestPriority"]
  ) =>
    list.filter(
      (p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.services.toLowerCase().includes(search.toLowerCase())
    );

  const totalCount = providers
    ? providers.highestPriority.length +
      providers.relevant.length +
      providers.other.length
    : 0;

  return (
    <WorkspaceSection
      title="Service Providers"
      icon="🏥"
      lastUpdated={providers?.lastUpdated}
      isLoading={isLoading}
    >
      {providers && (
        <div className="space-y-6">
          {/* Subtitle */}
          <p className="text-[13px] text-muted-foreground -mt-2">
            {totalCount} providers found
          </p>

          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search providers..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search providers"
            />
          </div>

          {/* Highest Priority */}
          {filterProviders(providers.highestPriority).length > 0 && (
            <section>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                ⭐ Highest Priority
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filterProviders(providers.highestPriority).map((p, i) => (
                  <ProviderCardInline key={i} provider={p} />
                ))}
              </div>
            </section>
          )}

          {/* Relevant */}
          {filterProviders(providers.relevant).length > 0 && (
            <section>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                🔸 Relevant
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filterProviders(providers.relevant).map((p, i) => (
                  <ProviderCardInline key={i} provider={p} />
                ))}
              </div>
            </section>
          )}

          {/* Private options table */}
          {providers.tables.length > 0 && (
            <section>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                💼 Private Options
              </p>
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[12px] font-medium text-muted-foreground">Provider</TableHead>
                      <TableHead className="text-[12px] font-medium text-muted-foreground">Rate</TableHead>
                      <TableHead className="text-[12px] font-medium text-muted-foreground">Waitlist</TableHead>
                      <TableHead className="text-[12px] font-medium text-muted-foreground">Specialties</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {providers.tables.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-[13px] font-medium text-foreground">
                          {row.provider}
                        </TableCell>
                        <TableCell className="text-[13px] text-muted-foreground">{row.hourlyRate}</TableCell>
                        <TableCell className="text-[13px] text-muted-foreground">{row.waitlist}</TableCell>
                        <TableCell className="text-[13px] text-muted-foreground">{row.specialties}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>
          )}
        </div>
      )}
    </WorkspaceSection>
  );
}
