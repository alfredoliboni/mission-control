"use client";

import { useParsedUniversity } from "@/hooks/useWorkspace";
import { WorkspaceSection } from "@/components/workspace/WorkspaceSection";
import type { UniversityPlanningPriority } from "@/types/workspace";

function PriorityCard({ priority }: { priority: UniversityPlanningPriority }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 transition-all hover:-translate-y-0.5 hover:shadow-md">
      <h3 className="text-[14px] font-semibold text-foreground mb-1">
        {priority.title}
      </h3>
      {priority.description && (
        <p className="text-[12px] text-muted-foreground mb-2 leading-relaxed">
          {priority.description}
        </p>
      )}
      {priority.items.length > 0 && (
        <ul className="space-y-1">
          {priority.items.map((item, i) => (
            <li
              key={i}
              className="text-[12px] text-muted-foreground flex items-start gap-2"
            >
              <span className="text-primary mt-0.5 shrink-0">&#x2022;</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function UniversityPage() {
  const { data: university, isLoading } = useParsedUniversity();

  return (
    <WorkspaceSection
      title="University & College"
      icon={"🎓"}
      lastUpdated={university?.lastUpdated}
      isLoading={isLoading}
    >
      {university && (
        <div className="space-y-6">
          {/* Status badge */}
          {university.status && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-status-current/8 text-status-current">
                {university.status}
              </span>
            </div>
          )}

          {/* Snapshot */}
          {university.snapshot && (
            <div className="bg-card border border-border rounded-xl p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                {"📋"} Snapshot
              </p>
              <p className="text-[13px] text-foreground leading-relaxed">
                {university.snapshot}
              </p>
            </div>
          )}

          {/* Academic Themes */}
          {university.academicThemes.length > 0 && (
            <section>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                {"🎯"} Good-Fit Academic Themes
              </p>
              <div className="flex flex-wrap gap-2">
                {university.academicThemes.map((theme, i) => (
                  <span
                    key={i}
                    className="text-[12px] font-medium px-3 py-1.5 rounded-lg bg-primary/8 text-primary border border-primary/15"
                  >
                    {theme}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Planning Priorities */}
          {university.planningPriorities.length > 0 && (
            <section>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                {"📝"} Planning Priorities
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                {university.planningPriorities.map((priority, i) => (
                  <PriorityCard key={i} priority={priority} />
                ))}
              </div>
            </section>
          )}

          {/* Documentation Checklist */}
          {university.documentationNeeded.length > 0 && (
            <section>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                {"📂"} Documentation Needed
              </p>
              <div className="bg-card border border-border rounded-xl p-4">
                <ul className="space-y-2">
                  {university.documentationNeeded.map((item, i) => (
                    <li
                      key={i}
                      className="text-[13px] text-foreground flex items-start gap-2"
                    >
                      <span className="text-muted-foreground mt-0.5 shrink-0">
                        {"\u25A1"}
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {/* Campus Considerations */}
          {university.campusConsiderations.length > 0 && (
            <section>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                {"🏫"} Campus Transition Questions
              </p>
              <div className="bg-card border border-border rounded-xl p-4">
                <ul className="space-y-2">
                  {university.campusConsiderations.map((item, i) => (
                    <li
                      key={i}
                      className="text-[13px] text-foreground flex items-start gap-2"
                    >
                      <span className="text-primary mt-0.5 shrink-0">?</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {/* Caution Notes */}
          {university.cautionNotes.length > 0 && (
            <section>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                {"⚠️\uFE0F"} Caution
              </p>
              <div className="bg-status-caution/5 border border-status-caution/20 rounded-xl p-4">
                <ul className="space-y-2">
                  {university.cautionNotes.map((note, i) => (
                    <li
                      key={i}
                      className="text-[13px] text-foreground flex items-start gap-2"
                    >
                      <span className="text-status-caution mt-0.5 shrink-0">
                        {"\u25CF"}
                      </span>
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}
        </div>
      )}
    </WorkspaceSection>
  );
}
