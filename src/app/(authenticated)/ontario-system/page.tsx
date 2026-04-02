"use client";

import { useMemo, useState } from "react";
import { useWorkspaceFile } from "@/hooks/useWorkspace";
import { WorkspaceSection } from "@/components/workspace/WorkspaceSection";
import { parseOntarioSystem } from "@/lib/workspace/parsers/ontario-system";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ChevronDown,
  ChevronRight,
  Clock,
  DollarSign,
  GraduationCap,
  MapPin,
  ExternalLink,
  CheckCircle2,
  ArrowRight,
  Landmark,
  BookOpen,
  Heart,
} from "lucide-react";

// ── Journey step component ───────────────────────────────────────────────

const JOURNEY_STEPS = [
  { label: "Concerns", icon: Heart, desc: "You notice something" },
  { label: "Pediatrician", icon: Heart, desc: "Talk to your doctor" },
  { label: "Referral", icon: ArrowRight, desc: "Specialist referral" },
  { label: "Assessment", icon: BookOpen, desc: "Diagnostic assessment" },
  { label: "Diagnosis", icon: CheckCircle2, desc: "ASD diagnosis" },
  { label: "OAP Registration", icon: Landmark, desc: "accessoap.ca" },
  { label: "Needs Determination", icon: BookOpen, desc: "Phone interview" },
  { label: "Funding", icon: DollarSign, desc: "Budget allocated" },
  { label: "Services", icon: Heart, desc: "Therapies begin" },
];

function JourneyDiagram() {
  return (
    <div className="relative">
      <div className="flex items-start gap-0 overflow-x-auto pb-2">
        {JOURNEY_STEPS.map((step, i) => (
          <div key={step.label} className="flex items-center shrink-0">
            <div className="flex flex-col items-center gap-1.5 w-[90px]">
              <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                <step.icon className="size-4" />
              </div>
              <span className="text-[11px] font-medium text-foreground text-center leading-tight">
                {step.label}
              </span>
              <span className="text-[10px] text-muted-foreground text-center leading-tight">
                {step.desc}
              </span>
            </div>
            {i < JOURNEY_STEPS.length - 1 && (
              <ArrowRight className="size-3.5 text-muted-foreground/50 shrink-0 -mx-1 mt-[-20px]" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Wait time bar ─────────────────────────────────────────────────────────

function WaitTimeBar({ service, wait, months }: { service: string; wait: string; months: number }) {
  const maxMonths = 18;
  const pct = Math.min((months / maxMonths) * 100, 100);
  const color =
    months <= 4 ? "bg-emerald-500" : months <= 8 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-foreground font-medium">{service}</span>
        <span className="text-muted-foreground text-xs">{wait}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Collapsible section ──────────────────────────────────────────────────

function CollapsibleSection({
  title,
  icon: Icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 py-3 text-left hover:bg-warm-50 rounded-lg px-2 -mx-2 transition-colors"
      >
        <Icon className="size-4 text-muted-foreground shrink-0" />
        <span className="text-sm font-semibold text-foreground flex-1">{title}</span>
        {open ? (
          <ChevronDown className="size-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-4 text-muted-foreground" />
        )}
      </button>
      {open && <div className="pl-6 pb-2">{children}</div>}
    </div>
  );
}

// ── Benefit card ─────────────────────────────────────────────────────────

function BenefitCard({ name, amount, eligibility }: { name: string; amount: string; eligibility: string }) {
  return (
    <div className="rounded-lg border border-border p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-semibold text-foreground">{name}</h4>
        <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 shrink-0 text-xs">
          {amount}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{eligibility}</p>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────

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
        {/* Journey Diagram */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-heading flex items-center gap-2">
              <MapPin className="size-4 text-muted-foreground" />
              The Journey
            </CardTitle>
          </CardHeader>
          <CardContent>
            <JourneyDiagram />
          </CardContent>
        </Card>

        {/* OAP Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading flex items-center gap-2">
              <Landmark className="size-4 text-muted-foreground" />
              Ontario Autism Program (OAP)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <CollapsibleSection title="Entry Points" icon={ArrowRight} defaultOpen>
              <ul className="space-y-1.5">
                {data.oap.entryPoints.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="text-primary font-semibold shrink-0">{i + 1}.</span>
                    {item.includes("accessoap.ca") ? (
                      <span>
                        Register at{" "}
                        <a href="https://www.accessoap.ca" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">
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

            <Separator />

            <CollapsibleSection title="Childhood Budget" icon={DollarSign}>
              <ul className="space-y-1.5">
                {data.oap.childhoodBudget.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </CollapsibleSection>

            <Separator />

            <CollapsibleSection title="Foundational Family Services (no waitlist)" icon={Heart}>
              <ul className="space-y-1.5">
                {data.oap.foundationalServices.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </CollapsibleSection>

            <Separator />

            <CollapsibleSection title="Current Wait Times (London region)" icon={Clock} defaultOpen>
              <div className="space-y-3 mt-1">
                {data.oap.waitTimes.map((wt, i) => (
                  <WaitTimeBar key={i} service={wt.service} wait={wt.wait} months={wt.months} />
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-3 italic">
                Estimates based on community reports. Actual times may vary.
              </p>
            </CollapsibleSection>
          </CardContent>
        </Card>

        {/* School System */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading flex items-center gap-2">
              <GraduationCap className="size-4 text-muted-foreground" />
              School System
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <CollapsibleSection title="Individual Education Plan (IEP)" icon={BookOpen} defaultOpen>
              <ul className="space-y-1.5">
                {data.school.iepPoints.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="size-3.5 text-primary/50 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </CollapsibleSection>

            {data.school.boards.length > 0 && (
              <>
                <Separator />
                <CollapsibleSection title="School Boards in London" icon={MapPin}>
                  <div className="space-y-2">
                    {data.school.boards.map((board, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className="font-semibold text-foreground">{board.name}</span>
                        <span className="text-muted-foreground">— {board.type}</span>
                      </div>
                    ))}
                  </div>
                </CollapsibleSection>
              </>
            )}
          </CardContent>
        </Card>

        {/* Financial Supports */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-heading flex items-center gap-2">
              <DollarSign className="size-4 text-muted-foreground" />
              Financial Supports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {data.financialSupports.map((b, i) => (
                <BenefitCard key={i} name={b.name} amount={b.amount} eligibility={b.eligibility} />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        {(data.lastUpdated || data.sources) && (
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            {data.lastUpdated && <span>Last updated: {data.lastUpdated}</span>}
            {data.sources && <span>Sources: {data.sources}</span>}
          </div>
        )}
      </div>
    </WorkspaceSection>
  );
}
