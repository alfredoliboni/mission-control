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

  const showGapFillers =
    filter === "all" || filter === "gap_filler";
  const showGovernment =
    filter === "all" || filter === "government";
  const showEducational =
    filter === "all" || filter === "educational";

  return (
    <WorkspaceSection
      title="Programs"
      icon="📚"
      lastUpdated={programs?.lastUpdated}
      isLoading={isLoading}
    >
      {programs && (
        <div className="space-y-8">
          <Tabs
            value={filter}
            onValueChange={(v) => setFilter(v as CategoryFilter)}
          >
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="gap_filler">Gap Fillers</TabsTrigger>
              <TabsTrigger value="government">Government</TabsTrigger>
              <TabsTrigger value="educational">Educational</TabsTrigger>
            </TabsList>
          </Tabs>

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
                {programs.gapFillers.map((p, i) => (
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
                {programs.government.map((p, i) => (
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
                {programs.educational.map((p, i) => (
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
