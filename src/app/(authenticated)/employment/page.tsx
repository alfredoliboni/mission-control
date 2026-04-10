"use client";

import { useState } from "react";
import { useParsedEmployment } from "@/hooks/useWorkspace";
import { WorkspaceSection } from "@/components/workspace/WorkspaceSection";
import { ChevronDown, ChevronRight } from "lucide-react";

/* ── Planning area card (expandable) ─────────────────────────── */

function PlanningAreaCard({
  area,
}: {
  area: { title: string; description: string; items: string[] };
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-card border border-border rounded-xl p-4 transition-all hover:-translate-y-0.5 hover:shadow-md">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-start gap-2 w-full text-left"
      >
        <span className="mt-0.5 shrink-0 text-primary">
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="text-[14px] font-semibold text-foreground">
            {area.title}
          </h3>
          {area.description && (
            <p className="text-[12px] text-muted-foreground mt-0.5">
              {area.description}
            </p>
          )}
        </div>
      </button>

      {expanded && area.items.length > 0 && (
        <ul className="mt-3 ml-6 space-y-1.5 border-l-2 border-primary/10 pl-3">
          {area.items.map((item, i) => (
            <li
              key={i}
              className="text-[12px] text-muted-foreground flex items-start gap-1.5"
            >
              <span className="text-primary mt-0.5 shrink-0">-</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────────── */

export default function EmploymentPage() {
  const { data: employment, isLoading } = useParsedEmployment();

  return (
    <WorkspaceSection
      title="Employment & Internships"
      icon="💼"
      lastUpdated={employment?.lastUpdated}
      isLoading={isLoading}
    >
      {employment && (
        <div className="space-y-6">
          {/* Status badge */}
          {employment.status && (
            <p className="text-[13px] text-muted-foreground -mt-2">
              Status: {employment.status}
            </p>
          )}

          {/* Profile Snapshot: Strengths + Support Needs */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="text-[15px] font-semibold text-foreground">
                <span aria-hidden="true" className="mr-1.5">
                  🧩
                </span>
                Profile Snapshot
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border">
              {/* Strengths */}
              <div className="px-5 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Strengths
                </p>
                <ul className="space-y-1.5">
                  {employment.strengths.map((s, i) => (
                    <li
                      key={i}
                      className="text-[13px] text-foreground flex items-start gap-2"
                    >
                      <span className="text-status-success mt-0.5 shrink-0">
                        +
                      </span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Support Needs */}
              <div className="px-5 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Support Needs
                </p>
                <ul className="space-y-1.5">
                  {employment.supportNeeds.map((n, i) => (
                    <li
                      key={i}
                      className="text-[13px] text-foreground flex items-start gap-2"
                    >
                      <span className="text-status-caution mt-0.5 shrink-0">
                        !
                      </span>
                      <span>{n}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Goals Card */}
          {(employment.goals.nearTerm.length > 0 ||
            employment.goals.midTerm.length > 0) && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="text-[15px] font-semibold text-foreground">
                  <span aria-hidden="true" className="mr-1.5">
                    🎯
                  </span>
                  Employment Goals
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border">
                {/* Near-Term */}
                {employment.goals.nearTerm.length > 0 && (
                  <div className="px-5 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                      Near-Term
                    </p>
                    <ul className="space-y-1.5">
                      {employment.goals.nearTerm.map((g, i) => (
                        <li
                          key={i}
                          className="text-[13px] text-foreground flex items-start gap-2"
                        >
                          <span className="text-status-current mt-0.5 shrink-0">
                            -
                          </span>
                          <span>{g}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Mid-Term */}
                {employment.goals.midTerm.length > 0 && (
                  <div className="px-5 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                      Mid-Term
                    </p>
                    <ul className="space-y-1.5">
                      {employment.goals.midTerm.map((g, i) => (
                        <li
                          key={i}
                          className="text-[13px] text-foreground flex items-start gap-2"
                        >
                          <span className="text-muted-foreground mt-0.5 shrink-0">
                            -
                          </span>
                          <span>{g}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Planning Areas */}
          {employment.planningAreas.length > 0 && (
            <section>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                <span aria-hidden="true" className="mr-1">
                  📋
                </span>
                Recommended Planning Areas
              </p>
              <div className="space-y-3">
                {employment.planningAreas.map((area, i) => (
                  <PlanningAreaCard key={i} area={area} />
                ))}
              </div>
            </section>
          )}

          {/* Career Hypotheses */}
          {employment.careerHypotheses.length > 0 && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="text-[15px] font-semibold text-foreground">
                  <span aria-hidden="true" className="mr-1.5">
                    💡
                  </span>
                  Career Directions
                </h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Working hypotheses, not decisions
                </p>
              </div>
              <div className="px-5 py-4">
                <div className="flex flex-wrap gap-2">
                  {employment.careerHypotheses.map((h, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center text-[12px] font-medium px-2.5 py-1 rounded-lg bg-primary/8 text-primary"
                    >
                      {h}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Next Actions */}
          {employment.nextActions.length > 0 && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="text-[15px] font-semibold text-foreground">
                  <span aria-hidden="true" className="mr-1.5">
                    ✅
                  </span>
                  Next Actions
                </h2>
              </div>
              <div className="px-5 py-4">
                <ol className="space-y-2">
                  {employment.nextActions.map((action, i) => (
                    <li
                      key={i}
                      className="text-[13px] text-foreground flex items-start gap-3"
                    >
                      <span className="text-[12px] font-bold text-primary bg-primary/8 w-6 h-6 rounded-full flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      <span className="pt-0.5">{action}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}
        </div>
      )}
    </WorkspaceSection>
  );
}
