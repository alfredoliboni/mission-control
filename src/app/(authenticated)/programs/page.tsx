"use client";

import { useState } from "react";
import { useParsedPrograms } from "@/hooks/useWorkspace";
import { WorkspaceSection } from "@/components/workspace/WorkspaceSection";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ParsedProgram, ProgramCategory } from "@/types/workspace";

type CategoryFilter = "all" | "gap_filler" | "government" | "educational";

const categoryTagMap: Record<ProgramCategory, { label: string; className: string }> = {
  gap_filler: {
    label: "Gap Filler",
    className: "bg-status-gap-filler/8 text-status-gap-filler",
  },
  government: {
    label: "Government",
    className: "bg-status-current/8 text-status-current",
  },
  educational: {
    label: "Educational",
    className: "bg-primary/8 text-primary",
  },
};

function ProgramCardInline({ program }: { program: ParsedProgram }) {
  const tag = categoryTagMap[program.category];

  return (
    <div className="bg-card border border-border rounded-xl p-4 transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-[14px] font-semibold text-foreground leading-snug">
          {program.name}
        </h3>
        <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded shrink-0 ${tag.className}`}>
          {tag.label}
        </span>
      </div>
      {/* Gap Filler explanation */}
      {program.category === "gap_filler" && (
        <p className="text-[11px] text-status-gap-filler/80 mt-1 leading-snug">
          {program.whyGapFiller
            ? program.whyGapFiller
            : `While waiting for funded services, this ${program.type?.toLowerCase() || "program"} can help. Your Navigator identified this based on Alex's needs.`}
        </p>
      )}

      <div className="text-[12px] text-muted-foreground leading-[1.6] space-y-0.5">
        {program.type && <p>{program.type}</p>}
        {program.cost && program.cost !== "—" && <p>Cost: {program.cost}</p>}
        {program.ages && program.ages !== "—" && <p>Ages: {program.ages}</p>}
        {program.schedule && program.schedule !== "—" && (
          <p>Schedule: {program.schedule}</p>
        )}
        {program.location && program.location !== "—" && (
          <p>Location: {program.location}</p>
        )}
        {/* whyGapFiller shown above the details block for gap_filler programs */}
        {program.status && program.status !== "—" && (
          <p>Status: {program.status}</p>
        )}
        {program.url && (
          <a
            href={program.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline inline-block mt-1"
          >
            Visit website
          </a>
        )}
      </div>
    </div>
  );
}

export default function ProgramsPage() {
  const { data: programs, isLoading } = useParsedPrograms();
  const [filter, setFilter] = useState<CategoryFilter>("all");

  const showGapFillers = filter === "all" || filter === "gap_filler";
  const showGovernment = filter === "all" || filter === "government";
  const showEducational = filter === "all" || filter === "educational";

  return (
    <WorkspaceSection
      title="Programs"
      icon="📚"
      lastUpdated={programs?.lastUpdated}
      isLoading={isLoading}
    >
      {programs && (
        <div className="space-y-6">
          {/* Tabs */}
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

          {/* Gap Fillers */}
          {showGapFillers && programs.gapFillers.length > 0 && (
            <section>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                🏷️ Gap Fillers
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {programs.gapFillers.map((p, i) => (
                  <ProgramCardInline key={i} program={p} />
                ))}
              </div>
            </section>
          )}

          {/* Government */}
          {showGovernment && programs.government.length > 0 && (
            <section>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                📘 Government Programs
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {programs.government.map((p, i) => (
                  <ProgramCardInline key={i} program={p} />
                ))}
              </div>
            </section>
          )}

          {/* Educational */}
          {showEducational && programs.educational.length > 0 && (
            <section>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                📗 Educational / Courses
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {programs.educational.map((p, i) => (
                  <ProgramCardInline key={i} program={p} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </WorkspaceSection>
  );
}
