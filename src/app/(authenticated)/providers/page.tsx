"use client";

import { useState } from "react";
import { useParsedProviders } from "@/hooks/useWorkspace";
import { WorkspaceSection } from "@/components/workspace/WorkspaceSection";
import { ProviderCard } from "@/components/sections/ProviderCard";
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

export default function ProvidersPage() {
  const { data: providers, isLoading } = useParsedProviders();
  const [search, setSearch] = useState("");

  const filterProviders = (list: typeof providers extends undefined ? never : NonNullable<typeof providers>["highestPriority"]) =>
    list.filter(
      (p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.services.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <WorkspaceSection
      title="Service Providers"
      icon="🏥"
      lastUpdated={providers?.lastUpdated}
      isLoading={isLoading}
    >
      {providers && (
        <div className="space-y-8">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-warm-300" />
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
              <h2 className="font-heading text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                <span aria-hidden="true">🔝</span> Highest Priority
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filterProviders(providers.highestPriority).map((p, i) => (
                  <ProviderCard key={i} provider={p} />
                ))}
              </div>
            </section>
          )}

          {/* Relevant */}
          {filterProviders(providers.relevant).length > 0 && (
            <section>
              <h2 className="font-heading text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                <span aria-hidden="true">🔸</span> Relevant
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filterProviders(providers.relevant).map((p, i) => (
                  <ProviderCard key={i} provider={p} />
                ))}
              </div>
            </section>
          )}

          {/* Private options table */}
          {providers.tables.length > 0 && (
            <section>
              <h2 className="font-heading text-lg font-semibold text-foreground mb-3">
                Private Options
              </h2>
              <div className="rounded-xl border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Provider</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Waitlist</TableHead>
                      <TableHead>Specialties</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {providers.tables.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">
                          {row.provider}
                        </TableCell>
                        <TableCell>{row.hourlyRate}</TableCell>
                        <TableCell>{row.waitlist}</TableCell>
                        <TableCell>{row.specialties}</TableCell>
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
