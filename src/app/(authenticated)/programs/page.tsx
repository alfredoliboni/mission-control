"use client";

import { useState } from "react";
import { useParsedPrograms } from "@/hooks/useWorkspace";
import { WorkspaceSection } from "@/components/workspace/WorkspaceSection";
import { ProgramCard } from "@/components/sections/ProgramCard";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type CategoryFilter = "all" | "gap_filler" | "government" | "educational";

export default function ProgramsPage() {
  const { data: programs, isLoading } = useParsedPrograms();
  const [filter, setFilter] = useState<CategoryFilter>("all");
  const [sortOrder, setSortOrder] = useState<"az" | "za">("az");

  const showGapFillers =
    filter === "all" || filter === "gap_filler";
  const showGovernment =
    filter === "all" || filter === "government";
  const showEducational =
    filter === "all" || filter === "educational";

  const sortPrograms = (list: NonNullable<typeof programs>["gapFillers"]) =>
    [...list].sort((a, b) => {
      const cmp = a.name.localeCompare(b.name);
      return sortOrder === "az" ? cmp : -cmp;
    });

  const totalPrograms = programs
    ? programs.gapFillers.length + programs.government.length + programs.educational.length
    : 0;
  const visibleCount = programs
    ? (showGapFillers ? programs.gapFillers.length : 0)
      + (showGovernment ? programs.government.length : 0)
      + (showEducational ? programs.educational.length : 0)
    : 0;

  return (
    <WorkspaceSection
      title="Programs"
      icon="📚"
      lastUpdated={programs?.lastUpdated}
      isLoading={isLoading}
    >
      {programs && (
        <div className="space-y-8">
          <div className="flex flex-wrap items-center gap-3">
            <Tabs
              value={filter}
              onValueChange={(v) => setFilter(v as CategoryFilter)}
              className="w-full sm:w-auto"
            >
              <TabsList className="grid h-auto w-full grid-cols-2 sm:inline-flex sm:w-auto">
                <TabsTrigger className="min-h-[44px] whitespace-normal px-2 py-2 text-center" value="all">All</TabsTrigger>
                <TabsTrigger className="min-h-[44px] whitespace-normal px-2 py-2 text-center" value="gap_filler">Gap Fillers</TabsTrigger>
                <TabsTrigger className="min-h-[44px] whitespace-normal px-2 py-2 text-center" value="government">Government</TabsTrigger>
                <TabsTrigger className="min-h-[44px] whitespace-normal px-2 py-2 text-center" value="educational">Educational</TabsTrigger>
              </TabsList>
            </Tabs>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
              className="w-full sm:w-auto min-h-[44px] text-xs border border-border rounded-lg px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="az">Name A-Z</option>
              <option value="za">Name Z-A</option>
            </select>
            <span className="text-xs text-warm-400 sm:ml-auto">
              Showing {visibleCount} of {totalPrograms} programs
            </span>
          </div>

          {showGapFillers && programs.gapFillers.length > 0 && (
            <section>
              <div className="mb-4">
                <h2 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2">
                  <span aria-hidden="true">🏷️</span> Gap Fillers
                </h2>
                <p className="text-sm text-warm-400 mt-1 ml-7">
                  Use while waiting for funded services, or when services are not covered
                </p>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortPrograms(programs.gapFillers).map((p, i) => (
                  <ProgramCard key={i} program={p} />
                ))}
              </div>
            </section>
          )}

          {showGovernment && programs.government.length > 0 && (
            <section>
              <h2 className="font-heading text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                <span aria-hidden="true">📘</span> Government Programs
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortPrograms(programs.government).map((p, i) => (
                  <ProgramCard key={i} program={p} />
                ))}
              </div>
            </section>
          )}

          {showEducational && programs.educational.length > 0 && (
            <section>
              <h2 className="font-heading text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                <span aria-hidden="true">📗</span> Educational / Courses
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortPrograms(programs.educational).map((p, i) => (
                  <ProgramCard key={i} program={p} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </WorkspaceSection>
  );
}
