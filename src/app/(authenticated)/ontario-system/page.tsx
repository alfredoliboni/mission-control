"use client";

import { useMemo, useState } from "react";
import { useWorkspaceFile } from "@/hooks/useWorkspace";
import { WorkspaceSection } from "@/components/workspace/WorkspaceSection";
import { parseOntarioSystem } from "@/lib/workspace/parsers/ontario-system";
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Wait-time bar ───────────────────────────────────────────────── */

function WaitTimeBar({ service, wait, months }: { service: string; wait: string; months: number }) {
  const maxMonths = 18;
  const pct = Math.min((months / maxMonths) * 100, 100);
  const color =
    months <= 4 ? "bg-status-success" : months <= 8 ? "bg-status-caution" : "bg-status-blocked";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-foreground">{service}</span>
        <span className="text-[11px] text-muted-foreground">{wait}</span>
      </div>
      <div className="h-1.5 rounded-full bg-border overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ── Collapsible section ─────────────────────────────────────────── */

function CollapsibleSection({
  title,
  emoji,
  children,
  defaultOpen = false,
}: {
  title: string;
  emoji: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 py-2.5 text-left rounded-lg transition-colors"
      >
        <span className="text-sm">{emoji}</span>
        <span className="text-[13px] font-semibold text-foreground flex-1">{title}</span>
        {open ? (
          <ChevronDown className="size-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-4 text-muted-foreground" />
        )}
      </button>
      {open && <div className="pl-6 pb-3">{children}</div>}
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────────── */

export default function OntarioSystemPage() {
  const { data: content, isLoading } = useWorkspaceFile("ontario-system.md");

  const data = useMemo(() => {
    if (!content) return null;
    return parseOntarioSystem(content);
  }, [content]);

  if (!data) {
    return (
      <WorkspaceSection title="Ontario System" icon="🏛️" isLoading={isLoading}>
        <p className="text-muted-foreground">No data available.</p>
      </WorkspaceSection>
    );
  }

  return (
    <WorkspaceSection title="Ontario System" icon="🏛️" isLoading={isLoading}>
      <div className="space-y-4">
        {/* OAP Card */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-[15px] font-semibold text-foreground mb-3 flex items-center gap-2">
            🏛️ Ontario Autism Program (OAP)
          </h2>

          <div className="space-y-1 divide-y divide-border">
            <CollapsibleSection title="Entry Points" emoji="🚪" defaultOpen>
              <ul className="space-y-1.5">
                {data.oap.entryPoints.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12px] text-muted-foreground leading-relaxed">
                    <span className="text-primary font-semibold shrink-0">{i + 1}.</span>
                    {item.includes("accessoap.ca") ? (
                      <span>
                        Register at{" "}
                        <a
                          href="https://www.accessoap.ca"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-0.5"
                        >
                          accessoap.ca <ExternalLink className="size-3" />
                        </a>{" "}
                        after diagnosis
                      </span>
                    ) : (
                      item
                    )}
                  </li>
                ))}
              </ul>
            </CollapsibleSection>

            <CollapsibleSection title="Childhood Budget" emoji="💵">
              <ul className="space-y-1.5">
                {data.oap.childhoodBudget.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12px] text-muted-foreground leading-relaxed">
                    <span className="text-status-success shrink-0">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </CollapsibleSection>

            <CollapsibleSection title="Foundational Family Services (no waitlist)" emoji="❤️">
              <ul className="space-y-1.5">
                {data.oap.foundationalServices.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12px] text-muted-foreground leading-relaxed">
                    <span className="text-status-success shrink-0">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </CollapsibleSection>

            <CollapsibleSection title="Current Wait Times (London region)" emoji="⏱️" defaultOpen>
              <div className="space-y-3 mt-1">
                {data.oap.waitTimes.map((wt, i) => (
                  <WaitTimeBar key={i} service={wt.service} wait={wt.wait} months={wt.months} />
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-3 italic">
                Estimates based on community reports. Actual times may vary.
              </p>
            </CollapsibleSection>
          </div>
        </div>

        {/* School System Card */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-[15px] font-semibold text-foreground mb-3 flex items-center gap-2">
            🎓 School System
          </h2>

          <div className="space-y-1 divide-y divide-border">
            <CollapsibleSection title="Individual Education Plan (IEP)" emoji="📝" defaultOpen>
              <ul className="space-y-1.5">
                {data.school.iepPoints.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12px] text-muted-foreground leading-relaxed">
                    <span className="text-primary/60 shrink-0">&#8226;</span>
                    {item}
                  </li>
                ))}
              </ul>
            </CollapsibleSection>

            {data.school.boards.length > 0 && (
              <CollapsibleSection title="School Boards in London" emoji="📍">
                <div className="space-y-2">
                  {data.school.boards.map((board, i) => (
                    <div key={i} className="flex items-center gap-2 text-[12px]">
                      <span className="font-medium text-foreground">{board.name}</span>
                      <span className="text-muted-foreground">-- {board.type}</span>
                    </div>
                  ))}
                </div>
              </CollapsibleSection>
            )}
          </div>
        </div>

        {/* Financial Supports Card */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-[15px] font-semibold text-foreground mb-3 flex items-center gap-2">
            💰 Financial Supports
          </h2>

          <div className="grid gap-3 sm:grid-cols-2">
            {data.financialSupports.map((b, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-4 transition-all hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <h4 className="text-[13px] font-semibold text-foreground">{b.name}</h4>
                  <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-status-success/8 text-status-success shrink-0">
                    {b.amount}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{b.eligibility}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        {(data.lastUpdated || data.sources) && (
          <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
            {data.lastUpdated && <span>Last updated: {data.lastUpdated}</span>}
            {data.sources && <span>Sources: {data.sources}</span>}
          </div>
        )}
      </div>
    </WorkspaceSection>
  );
}
