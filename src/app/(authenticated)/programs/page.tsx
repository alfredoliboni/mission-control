"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParsedPrograms, useParsedProfile } from "@/hooks/useWorkspace";
import { useFamilyPrograms } from "@/hooks/useFamilyPrograms";
import { WorkspaceSection } from "@/components/workspace/WorkspaceSection";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Globe,
  MapPin,
  Phone,
  Mail,
  ChevronDown,
  ChevronUp,
  Filter,
  Info,
  Calendar,
  Users,
  ExternalLink,
} from "lucide-react";
import type { ParsedProgram, ProgramCategory, ParsedPrograms, ParsedProfile } from "@/types/workspace";
import { extractNeeds, buildRecommendationSummary } from "@/lib/needs";

// -- Types -------------------------------------------------------------------

interface SupabaseProgram {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  provider_id: string | null;
  provider_name: string | null;
  location: string | null;
  date_start: string | null;
  date_end: string | null;
  eligibility: string | null;
  age_min: number | null;
  age_max: number | null;
  cost: string | null;
  registration_url: string | null;
  tags: string[] | null;
  created_at: string | null;
}

interface EnrichedProgram {
  name: string;
  category?: string;
  whyGapFiller?: string;
  isGapFiller?: boolean;
  status?: string;
  type?: string;
  schedule?: string;
  supabase_id?: string;
  description?: string | null;
  provider_name?: string | null;
  location?: string | null;
  date_start?: string | null;
  date_end?: string | null;
  eligibility?: string | null;
  age_min?: number | null;
  age_max?: number | null;
  ages?: string;
  cost?: string | null;
  registration_url?: string | null;
  tags?: string[] | null;
  url?: string;
  phone?: string;
  email?: string;
  register?: string;
  enriched: boolean;
}

type Tab = "matches" | "search";

// -- Helpers -----------------------------------------------------------------

function getBorderColor(program: ParsedProgram): string {
  if (program.category === "gap_filler") return "border-l-status-gap-filler";
  if (program.category === "government") return "border-l-status-current";
  return "border-l-status-success";
}

function getSearchBorderColor(category: string | null): string {
  if (category === "gap_filler" || category === "financial")
    return "border-l-status-gap-filler";
  if (category === "program" || category === "camp")
    return "border-l-status-current";
  return "border-l-status-success";
}

function formatTypeDots(program: ParsedProgram): string {
  const parts: string[] = [];
  if (program.type) parts.push(program.type);
  if (program.category === "gap_filler") parts.push("Gap Filler");
  else if (program.category === "government") parts.push("Government");
  else if (program.category === "educational") parts.push("Educational");
  if (
    program.cost &&
    program.cost !== "\u2014" &&
    !parts.some((p) => p.toLowerCase() === program.cost.toLowerCase())
  ) {
    parts.push(program.cost);
  }
  if (parts.length <= 1) return parts[0] || "";
  return parts.join(" \u2022 ");
}

const categoryTagMap: Record<
  ProgramCategory,
  { label: string; className: string }
> = {
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

// -- Enrichment hook ---------------------------------------------------------

function useEnrichedPrograms(programs: ParsedPrograms | undefined) {
  const allWorkspace = useMemo(() => {
    if (!programs) return [];
    return [
      ...programs.gapFillers,
      ...programs.government,
      ...programs.educational,
    ];
  }, [programs]);

  const { data: enriched, isLoading: enrichLoading } = useQuery<{
    programs: EnrichedProgram[];
  }>({
    queryKey: [
      "programs-enrich",
      allWorkspace.map((p) => p.name).join("|"),
    ],
    queryFn: async () => {
      const res = await fetch("/api/programs/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programs: allWorkspace.map((p) => ({
            name: p.name,
            category: p.category,
            type: p.type,
            cost: p.cost,
            ages: p.ages,
            schedule: p.schedule,
            location: p.location,
            whyGapFiller: p.whyGapFiller,
            register: p.register,
            status: p.status,
            url: p.url,
            phone: p.phone,
            email: p.email,
            isGapFiller: p.isGapFiller,
          })),
        }),
      });
      if (!res.ok) throw new Error("Enrich failed");
      return res.json();
    },
    enabled: allWorkspace.length > 0,
    staleTime: 60_000,
    retry: 1,
  });

  const enrichMap = useMemo(() => {
    const map = new Map<string, EnrichedProgram>();
    if (enriched?.programs) {
      for (const ep of enriched.programs) {
        map.set(ep.name, ep);
      }
    }
    return map;
  }, [enriched]);

  return { enrichMap, enrichLoading };
}

// -- Enriched Program Card ---------------------------------------------------

function EnrichedProgramCard({
  program,
  enriched,
}: {
  program: ParsedProgram;
  enriched?: EnrichedProgram;
}) {
  const isEnriched = enriched?.enriched === true;
  const borderColor = getBorderColor(program);
  const tag = categoryTagMap[program.category];

  // Resolve fields
  const name = enriched?.name || program.name;
  const cost = enriched?.cost || program.cost;
  const hasCost = cost && cost !== "\u2014";
  const location = enriched?.location || program.location;
  const hasLocation = location && location !== "\u2014";
  const description = isEnriched ? enriched?.description : null;

  // Ages: prefer enriched min/max, fall back to agent text
  const ageDisplay = isEnriched && (enriched?.age_min != null || enriched?.age_max != null)
    ? `${enriched.age_min ?? "?"}\u2013${enriched.age_max ?? "?"}`
    : program.ages && program.ages !== "\u2014"
      ? program.ages
      : null;

  // Dates
  const dateRange =
    isEnriched && (enriched?.date_start || enriched?.date_end)
      ? [enriched.date_start, enriched.date_end].filter(Boolean).join(" \u2013 ")
      : null;

  // Schedule (agent only)
  const schedule = program.schedule && program.schedule !== "\u2014" ? program.schedule : null;

  // Tags
  const tags = isEnriched && enriched?.tags?.length ? enriched.tags : null;

  // Eligibility
  const eligibility = isEnriched ? enriched?.eligibility : null;

  // Provider name
  const providerName = isEnriched ? enriched?.provider_name : null;

  // Registration URL
  const registrationUrl = enriched?.registration_url || program.register;
  const hasRegUrl = registrationUrl && registrationUrl !== "\u2014" && registrationUrl.startsWith("http");

  // Contact
  const phone = enriched?.phone || program.phone;
  const email = enriched?.email || program.email;
  const url = enriched?.url || program.url;

  // Why text
  const whyText =
    program.category === "gap_filler"
      ? program.whyGapFiller ||
        `While waiting for funded services, this ${program.type?.toLowerCase() || "program"} can help maintain progress. Gap fillers help bridge the gap during waitlist periods.`
      : program.whyGapFiller ||
        (program.category === "government"
          ? `Government-funded program relevant to your child's needs.`
          : `Offers educational support aligned with your child's development goals.`);

  return (
    <div
      className={`bg-card border border-border ${borderColor} border-l-[3px] rounded-xl p-4 transition-all hover:-translate-y-0.5 hover:shadow-md group relative`}
    >
      {/* Top row: name + cost */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-[14px] font-semibold text-foreground leading-snug">
          {name}
        </h3>
        {hasCost && (
          <span className="text-[11px] text-muted-foreground font-medium shrink-0">
            {cost}
          </span>
        )}
      </div>

      {/* Type as dot-separated */}
      <p className="text-[12px] text-foreground/80 font-medium leading-relaxed mb-2">
        {formatTypeDots(program)}
      </p>

      {/* Provider name */}
      {providerName && (
        <p className="text-[11px] text-muted-foreground mb-1">
          By {providerName}
        </p>
      )}

      {/* Description (from Supabase) */}
      {description && (
        <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2 mb-2">
          {description}
        </p>
      )}

      {/* Meta row: age, schedule/dates, location */}
      <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground mb-3">
        {ageDisplay && (
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3 shrink-0" /> Ages {ageDisplay}
          </span>
        )}
        {dateRange && (
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3 shrink-0" /> {dateRange}
          </span>
        )}
        {!dateRange && schedule && (
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3 shrink-0" /> {schedule}
          </span>
        )}
        {hasLocation && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3 shrink-0" /> {location}
          </span>
        )}
      </div>

      {/* Tags */}
      {tags && (
        <div className="flex flex-wrap gap-1 mb-2">
          {tags.slice(0, 5).map((t) => (
            <span
              key={t}
              className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Eligibility */}
      {eligibility && (
        <p className="text-[10px] text-muted-foreground italic mb-2">
          Eligibility: {eligibility}
        </p>
      )}

      {/* Why line */}
      <p className="text-[11px] text-primary leading-relaxed">
        <span className="font-semibold">Why:</span> {whyText}
      </p>

      {/* Gap Filler tag */}
      {program.category === "gap_filler" && (
        <div className="mt-2">
          <span
            className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${tag.className}`}
          >
            {tag.label}
          </span>
          <p className="text-[10px] text-muted-foreground mt-1 leading-snug">
            Gap fillers help maintain progress during waitlist periods.
          </p>
        </div>
      )}

      {/* Contact links + registration */}
      {(phone || email || url || hasRegUrl) && (
        <div className="flex flex-wrap items-center gap-3 mt-3 pt-2 border-t border-border">
          {phone && (
            <a
              href={`tel:${phone.replace(/\s/g, "")}`}
              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors"
              aria-label={`Call ${name}`}
            >
              <Phone className="h-3 w-3" />
              <span>{phone}</span>
            </a>
          )}
          {email && (
            <a
              href={`mailto:${email}`}
              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors"
              aria-label={`Email ${name}`}
            >
              <Mail className="h-3 w-3" />
              <span className="truncate max-w-[140px]">{email}</span>
            </a>
          )}
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors"
              aria-label={`Visit ${name} website`}
            >
              <Globe className="h-3 w-3" />
            </a>
          )}
          {hasRegUrl && (
            <a
              href={registrationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-medium transition-colors ml-auto"
            >
              <ExternalLink className="h-3 w-3" />
              Register
            </a>
          )}
        </div>
      )}

      {/* Not-enriched notice */}
      {!isEnriched && (
        <p className="flex items-center gap-1 text-[10px] text-muted-foreground/70 italic mt-2">
          <Info className="h-3 w-3 shrink-0" />
          Data from Navigator search — details may not be current
        </p>
      )}

      {program.status && program.status !== "\u2014" && (
        <p className="text-[11px] text-muted-foreground italic mt-2">
          Status: {program.status}
        </p>
      )}
    </div>
  );
}

// -- Supabase Program Card (from search) -------------------------------------

function SearchProgramCard({ program }: { program: SupabaseProgram }) {
  const borderColor = getSearchBorderColor(program.category);

  const ageRange =
    program.age_min != null || program.age_max != null
      ? `${program.age_min ?? "?"}\u2013${program.age_max ?? "?"}`
      : null;

  const dateRange =
    program.date_start || program.date_end
      ? [program.date_start, program.date_end].filter(Boolean).join(" \u2013 ")
      : null;

  return (
    <div
      className={`bg-card border border-border border-l-[3px] ${borderColor} rounded-xl p-4 transition-all hover:-translate-y-0.5 hover:shadow-md group relative`}
    >
      {/* Top row: name + cost */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-[14px] font-semibold text-foreground leading-snug">
          {program.title}
        </h3>
        {program.cost && (
          <span className="text-[11px] text-muted-foreground font-medium shrink-0">
            {program.cost}
          </span>
        )}
      </div>

      {/* Category + tags */}
      {(program.category || (program.tags && program.tags.length > 0)) && (
        <p className="text-[12px] text-foreground/80 font-medium leading-relaxed mb-2">
          {[program.category, ...(program.tags?.slice(0, 3) || [])]
            .filter(Boolean)
            .join(" \u2022 ")}
        </p>
      )}

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground mb-2">
        {ageRange && (
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3 shrink-0" /> Ages {ageRange}
          </span>
        )}
        {dateRange && (
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3 shrink-0" /> {dateRange}
          </span>
        )}
        {program.location && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3 shrink-0" /> {program.location}
          </span>
        )}
      </div>

      {/* Provider name */}
      {program.provider_name && (
        <p className="text-[11px] text-muted-foreground mb-1">
          By {program.provider_name}
        </p>
      )}

      {/* Description */}
      {program.description && (
        <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2 mb-2">
          {program.description}
        </p>
      )}

      {/* Eligibility */}
      {program.eligibility && (
        <p className="text-[10px] text-muted-foreground italic mb-2">
          Eligibility: {program.eligibility}
        </p>
      )}

      {/* Registration link */}
      {program.registration_url && (
        <div className="mt-2 pt-2 border-t border-border">
          <a
            href={program.registration_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-medium transition-colors"
          >
            <Globe className="h-3 w-3" /> Register / More Info
          </a>
        </div>
      )}
    </div>
  );
}

// -- Search Filters Panel ----------------------------------------------------

function SearchFilters({
  category,
  setCategory,
  ageMin,
  setAgeMin,
  ageMax,
  setAgeMax,
  cost,
  setCost,
}: {
  category: string;
  setCategory: (v: string) => void;
  ageMin: string;
  setAgeMin: (v: string) => void;
  ageMax: string;
  setAgeMax: (v: string) => void;
  cost: string;
  setCost: (v: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
      >
        <Filter className="h-3.5 w-3.5" />
        Filters
        {expanded ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
      </button>
      {expanded && (
        <div className="flex flex-wrap gap-3 mt-3 p-3 bg-muted/50 rounded-lg">
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground">
              Category
            </label>
            <select
              className="block h-7 text-[12px] w-40 rounded-md border border-border bg-background px-2 focus:outline-none focus:ring-1 focus:ring-primary"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">All</option>
              <option value="program">Program</option>
              <option value="training">Training</option>
              <option value="camp">Camp</option>
              <option value="financial">Financial</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground">
              Age Min
            </label>
            <Input
              type="number"
              placeholder="e.g., 3"
              className="h-7 text-[12px] w-24"
              value={ageMin}
              onChange={(e) => setAgeMin(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground">
              Age Max
            </label>
            <Input
              type="number"
              placeholder="e.g., 12"
              className="h-7 text-[12px] w-24"
              value={ageMax}
              onChange={(e) => setAgeMax(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground">
              Cost
            </label>
            <select
              className="block h-7 text-[12px] w-32 rounded-md border border-border bg-background px-2 focus:outline-none focus:ring-1 focus:ring-primary"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
            >
              <option value="">Any</option>
              <option value="free">Free</option>
              <option value="paid">Paid</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

// -- Search Tab Content ------------------------------------------------------

function SearchTabContent() {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [category, setCategory] = useState("");
  const [ageMin, setAgeMin] = useState("");
  const [ageMax, setAgeMax] = useState("");
  const [cost, setCost] = useState("");
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);

  function handleSearchChange(value: string) {
    setSearchInput(value);
    if (debounceTimer) clearTimeout(debounceTimer);
    const timer = setTimeout(() => {
      setDebouncedQuery(value);
    }, 400);
    setDebounceTimer(timer);
  }

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (debouncedQuery) params.set("q", debouncedQuery);
    if (category) params.set("category", category);
    if (ageMin) params.set("age_min", ageMin);
    if (ageMax) params.set("age_max", ageMax);
    if (cost) params.set("cost", cost);
    return params.toString();
  }, [debouncedQuery, category, ageMin, ageMax, cost]);

  const hasQuery = !!(debouncedQuery || category || ageMin || ageMax || cost);

  const { data, isLoading, error } = useQuery<{
    programs: SupabaseProgram[];
  }>({
    queryKey: ["programs-search", queryParams],
    queryFn: async () => {
      const res = await fetch(`/api/programs/search?${queryParams}`);
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
    enabled: hasQuery,
    staleTime: 30_000,
  });

  const results = data?.programs ?? [];

  return (
    <div className="space-y-4">
      {/* Search input */}
      <div className="relative max-w-lg">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="What are you looking for? e.g., social skills, swimming..."
          className="pl-9"
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
          aria-label="Search all programs"
        />
      </div>

      {/* Filters */}
      <SearchFilters
        category={category}
        setCategory={setCategory}
        ageMin={ageMin}
        setAgeMin={setAgeMin}
        ageMax={ageMax}
        setAgeMax={setAgeMax}
        cost={cost}
        setCost={setCost}
      />

      {/* Results */}
      {!hasQuery && (
        <div className="text-center py-12">
          <p className="text-[13px] text-muted-foreground">
            Search for any program, workshop, or activity to explore the full
            directory.
          </p>
        </div>
      )}

      {isLoading && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      )}

      {error && (
        <div className="text-center py-8">
          <p className="text-[13px] text-status-blocked">
            Something went wrong searching programs. Please try again.
          </p>
        </div>
      )}

      {hasQuery && !isLoading && !error && (
        <>
          <p className="text-[12px] text-muted-foreground">
            {results.length} program{results.length !== 1 ? "s" : ""} found
          </p>
          {results.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.map((p) => (
                <SearchProgramCard key={p.id} program={p} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-[13px] text-muted-foreground">
                No programs match your search. Try different keywords or adjust
                filters.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// -- Priority Banner ---------------------------------------------------------

function PriorityBanner({
  childName,
  programs,
  profile,
}: {
  childName: string;
  programs: {
    gapFillers: ParsedProgram[];
    government: ParsedProgram[];
    educational: ParsedProgram[];
  };
  profile: ParsedProfile | undefined;
}) {
  const totalCount =
    programs.gapFillers.length +
    programs.government.length +
    programs.educational.length;
  const gapFillerCount = programs.gapFillers.length;

  if (totalCount === 0) return null;

  const needs = profile ? extractNeeds(profile) : [];
  const recommendation = profile ? buildRecommendationSummary(needs) : "";

  return (
    <div className="bg-[#fdf3ee] border border-[#e8a882]/30 rounded-xl px-4 py-3 mb-2">
      <p className="text-[13px] text-foreground leading-relaxed">
        <span className="font-semibold text-primary">Priority Now</span>
        {" \u2014 "}
        {needs.length > 0 ? (
          <>
            Based on {childName}&apos;s needs:{" "}
            <span className="font-semibold">
              {needs.map((n) => `${n.label}${n.detail ? ` (${n.detail})` : ""}`).join(", ")}
            </span>
            .{recommendation && (
              <> Assessment recommends {recommendation}.</>
            )}{" "}
            Your Navigator found {totalCount} matching program
            {totalCount !== 1 ? "s" : ""}
            {gapFillerCount > 0 && (
              <>
                {" \u2014 "}
                {gapFillerCount} gap filler{gapFillerCount !== 1 ? "s" : ""} to
                use while waiting for funded services
              </>
            )}
            .
          </>
        ) : (
          <>
            Your Navigator found {totalCount} program
            {totalCount !== 1 ? "s" : ""} that match {childName}&apos;s needs
            {gapFillerCount > 0 && (
              <>
                {" \u2014 "}
                <span className="font-medium">
                  {gapFillerCount} {gapFillerCount === 1 ? "is a" : "are"} gap
                  filler{gapFillerCount !== 1 ? "s" : ""} to use while waiting for
                  funded services
                </span>
              </>
            )}
          </>
        )}
      </p>
    </div>
  );
}

// -- Main Page ---------------------------------------------------------------

export default function ProgramsPage() {
  const { data: mdPrograms, isLoading } = useParsedPrograms();
  const { data: dbPrograms } = useFamilyPrograms();
  const { data: profile } = useParsedProfile();
  const [activeTab, setActiveTab] = useState<Tab>("matches");
  const [matchSearch, setMatchSearch] = useState("");

  // DB-first with .md fallback for Matched Programs tab
  const hasDbPrograms = dbPrograms && dbPrograms.length > 0;
  const matchedPrograms: ParsedPrograms | undefined = useMemo(() => {
    if (hasDbPrograms) {
      return {
        gapFillers: dbPrograms.filter((p) => p.isGapFiller).map((p) => ({
          name: p.programName,
          category: "gap_filler" as const,
          type: "",
          cost: "",
          ages: "",
          schedule: "",
          location: "",
          whyGapFiller: p.agentNote || "",
          register: "",
          status: p.status,
          url: "",
          phone: "",
          email: "",
          details: {},
          isGapFiller: true,
        })),
        government: dbPrograms.filter((p) => !p.isGapFiller).map((p) => ({
          name: p.programName,
          category: "government" as const,
          type: "",
          cost: "",
          ages: "",
          schedule: "",
          location: "",
          whyGapFiller: p.agentNote || "",
          register: "",
          status: p.status,
          url: "",
          phone: "",
          email: "",
          details: {},
          isGapFiller: false,
        })),
        educational: [],
        lastUpdated: mdPrograms?.lastUpdated ?? "",
      };
    }
    return mdPrograms;
  }, [hasDbPrograms, dbPrograms, mdPrograms]);

  // Use matchedPrograms for enrichment and display; fall back to mdPrograms shape
  // Resolved to a non-undefined value for TypeScript narrowing in the render
  const programs = matchedPrograms ?? mdPrograms;

  const { enrichMap, enrichLoading } = useEnrichedPrograms(programs);

  const childName = profile?.basicInfo.name || "your child";

  const allPrograms = useMemo(() => {
    if (!programs) return [];
    return [
      ...programs.gapFillers,
      ...programs.government,
      ...programs.educational,
    ];
  }, [programs]);

  const filterPrograms = (list: ParsedProgram[]): ParsedProgram[] =>
    list.filter(
      (p) =>
        p.name.toLowerCase().includes(matchSearch.toLowerCase()) ||
        (p.type && p.type.toLowerCase().includes(matchSearch.toLowerCase())) ||
        (p.location &&
          p.location.toLowerCase().includes(matchSearch.toLowerCase()))
    );

  const totalCount = allPrograms.length;

  function renderProgramGrid(list: ParsedProgram[]) {
    const filtered = filterPrograms(list);
    if (filtered.length === 0) return null;
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((p, i) => (
          <EnrichedProgramCard
            key={i}
            program={p}
            enriched={enrichMap.get(p.name) ?? enrichMap.get(
              Array.from(enrichMap.keys()).find(
                (k) => k.toLowerCase().includes(p.name.toLowerCase().split(" ")[0])
              ) || ""
            )}
          />
        ))}
      </div>
    );
  }

  return (
    <WorkspaceSection
      title="Programs"
      icon="📚"
      lastUpdated={mdPrograms?.lastUpdated}
      isLoading={isLoading}
    >
      {programs && (
        <div className="space-y-5">
          {/* Priority Banner */}
          <PriorityBanner childName={childName} programs={programs} profile={profile} />

          {/* Tabs */}
          <div className="flex items-center gap-0 border-b border-border">
            <button
              onClick={() => setActiveTab("matches")}
              className={`px-4 py-2.5 text-[13px] font-medium transition-colors relative ${
                activeTab === "matches"
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Matched Programs
              {activeTab === "matches" && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-t" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("search")}
              className={`px-4 py-2.5 text-[13px] font-medium transition-colors relative ${
                activeTab === "search"
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Search All Programs
              {activeTab === "search" && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-t" />
              )}
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === "matches" && (
            <div className="space-y-5">
              {/* Subtitle */}
              <p className="text-[13px] text-muted-foreground">
                {totalCount} program{totalCount !== 1 ? "s" : ""} matched for{" "}
                {childName} {"\u00B7"} Filtered by your Navigator based on{" "}
                {childName}&apos;s needs
              </p>

              {/* Search within matches */}
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Filter matched programs..."
                  className="pl-9"
                  value={matchSearch}
                  onChange={(e) => setMatchSearch(e.target.value)}
                  aria-label="Filter matched programs"
                />
              </div>

              {/* Loading enrichment */}
              {enrichLoading && (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: Math.min(totalCount, 6) }).map(
                    (_, i) => (
                      <Skeleton key={i} className="h-52 w-full rounded-xl" />
                    )
                  )}
                </div>
              )}

              {!enrichLoading && (
                <>
                  {/* Gap Fillers */}
                  {filterPrograms(programs.gapFillers).length > 0 && (
                    <section>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                        Gap Fillers
                      </p>
                      {renderProgramGrid(programs.gapFillers)}
                    </section>
                  )}

                  {/* Government */}
                  {filterPrograms(programs.government).length > 0 && (
                    <section>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                        Government Programs
                      </p>
                      {renderProgramGrid(programs.government)}
                    </section>
                  )}

                  {/* Educational */}
                  {filterPrograms(programs.educational).length > 0 && (
                    <section>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                        Educational / Courses
                      </p>
                      {renderProgramGrid(programs.educational)}
                    </section>
                  )}
                </>
              )}

              {/* Empty state */}
              {totalCount === 0 && (
                <div className="text-center py-12">
                  <p className="text-[13px] text-muted-foreground">
                    No matched programs yet. Your Navigator is still researching
                    options for {childName}.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === "search" && <SearchTabContent />}
        </div>
      )}
    </WorkspaceSection>
  );
}
