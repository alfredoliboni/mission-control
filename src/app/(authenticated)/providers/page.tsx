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
  const [category, setCategory] = useState<"all" | "highestPriority" | "relevant" | "other">("all");
  const [sortOrder, setSortOrder] = useState<"az" | "za">("az");

  const filterProviders = (list: NonNullable<typeof providers>["highestPriority"]) =>
    list
      .filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.services.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => {
        const cmp = a.name.localeCompare(b.name);
        return sortOrder === "az" ? cmp : -cmp;
      });

  const totalProviders = providers
    ? providers.highestPriority.length + providers.relevant.length + providers.tables.length
    : 0;

  const visibleCount = providers
    ? (category === "all" || category === "highestPriority" ? filterProviders(providers.highestPriority).length : 0)
      + (category === "all" || category === "relevant" ? filterProviders(providers.relevant).length : 0)
      + (category === "all" || category === "other" ? providers.tables.length : 0)
    : 0;

  return (
    <WorkspaceSection
      title="Service Providers"
      icon="🏥"
      lastUpdated={providers?.lastUpdated}
      isLoading={isLoading}
    >
      {providers && (
        <div className="space-y-8">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:max-w-sm sm:flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-warm-300" />
              <Input
                placeholder="Search providers..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search providers"
              />
            </div>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as typeof category)}
              className="w-full sm:w-auto text-xs border border-border rounded-lg px-2.5 py-1.5 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All categories</option>
              <option value="highestPriority">Highest Priority</option>
              <option value="relevant">Relevant</option>
              <option value="other">Private Options</option>
            </select>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
              className="w-full sm:w-auto text-xs border border-border rounded-lg px-2.5 py-1.5 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="az">Name A-Z</option>
              <option value="za">Name Z-A</option>
            </select>
            <span className="text-xs text-warm-400 sm:ml-auto">
              Showing {visibleCount} of {totalProviders} providers
            </span>
          </div>

          {/* Highest Priority */}
          {(category === "all" || category === "highestPriority") &&
            filterProviders(providers.highestPriority).length > 0 && (
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
          {(category === "all" || category === "relevant") &&
            filterProviders(providers.relevant).length > 0 && (
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
          {(category === "all" || category === "other") &&
            providers.tables.length > 0 && (
            <section>
              <h2 className="font-heading text-lg font-semibold text-foreground mb-3">
                Private Options
              </h2>
              <div className="rounded-xl border border-border overflow-x-auto">
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
