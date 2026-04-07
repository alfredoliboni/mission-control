"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParsedProviders, useParsedProfile } from "@/hooks/useWorkspace";
import { WorkspaceSection } from "@/components/workspace/WorkspaceSection";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Phone,
  Mail,
  Globe,
  MapPin,
  Clock,
  Star,
  ChevronDown,
  ChevronUp,
  Filter,
  CheckCircle2,
} from "lucide-react";
import type { ParsedProvider } from "@/types/workspace";

// ── Types ───────────────────────────────────────────────────────────────

interface SupabaseProvider {
  id: string;
  name: string;
  type: string | null;
  description: string | null;
  specialties: string[] | null;
  services: string[] | null;
  location_address: string | null;
  location_city: string | null;
  location_postal: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  waitlist_estimate: string | null;
  is_verified: boolean;
  rating: number | null;
  price_range: string | null;
  accepts_funding: string[] | null;
}

type Tab = "matches" | "search";

// ── Helpers ─────────────────────────────────────────────────────────────

function extractContactLinks(contact: string) {
  const phone = contact.match(/[\d()+-][\d\s()+-]{6,}/)?.[0]?.trim();
  const email = contact.match(/[\w.-]+@[\w.-]+\.\w+/)?.[0];
  const website = contact.match(/https?:\/\/[^\s,)]+/)?.[0];
  return { phone, email, website };
}

function getBorderColor(provider: ParsedProvider): string {
  if (provider.priority === "highest") return "border-l-primary";
  if (provider.isGapFiller) return "border-l-status-gap-filler";
  return "border-l-status-current";
}

function formatServicesAsDots(services: string): string {
  // Split on common delimiters and join with bullet
  const parts = services
    .split(/[,;/]/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length <= 1) return services;
  return parts.join(" \u2022 ");
}

// ── Matched Provider Card (from workspace) ──────────────────────────────

function MatchedProviderCard({ provider }: { provider: ParsedProvider }) {
  const contacts = extractContactLinks(provider.contact || "");
  const borderColor = getBorderColor(provider);

  const whyText =
    provider.relevance && provider.relevance !== "\u2014"
      ? provider.relevance
      : provider.priority === "highest"
        ? `Matches priority needs${provider.services ? ` (${provider.services.substring(0, 80)})` : ""}.`
        : `Offers relevant services${provider.services ? `: ${provider.services.substring(0, 80)}` : ""} in your region.`;

  return (
    <div
      className={`bg-card border border-border ${borderColor} border-l-[3px] rounded-xl p-4 transition-all hover:-translate-y-0.5 hover:shadow-md group relative`}
    >
      {/* Top row: name + price placeholder */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-[14px] font-semibold text-foreground leading-snug">
          {provider.name}
        </h3>
        {provider.funding && provider.funding !== "\u2014" && (
          <span className="text-[11px] text-muted-foreground font-medium shrink-0">
            {provider.funding}
          </span>
        )}
      </div>

      {/* Services as dot-separated tags */}
      {provider.services && (
        <p className="text-[12px] text-foreground/80 font-medium leading-relaxed mb-2">
          {formatServicesAsDots(provider.services)}
        </p>
      )}

      {/* Meta row: distance, wait, rating */}
      <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground mb-3">
        {provider.type && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3 shrink-0" /> {provider.type}
          </span>
        )}
        {provider.waitlist && provider.waitlist !== "\u2014" && (
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3 shrink-0" /> {provider.waitlist}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Star className="h-3 w-3 shrink-0 text-status-caution" /> 4.5
        </span>
      </div>

      {/* Why line */}
      <p className="text-[11px] text-primary leading-relaxed">
        <span className="font-semibold">Why:</span> {whyText}
      </p>

      {/* Contact links */}
      {(contacts.phone || contacts.email || contacts.website) && (
        <div className="flex flex-wrap items-center gap-3 mt-3 pt-2 border-t border-border">
          {contacts.phone && (
            <a
              href={`tel:${contacts.phone}`}
              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors"
              aria-label={`Call ${provider.name}`}
            >
              <Phone className="h-3 w-3" />
            </a>
          )}
          {contacts.email && (
            <a
              href={`mailto:${contacts.email}`}
              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors"
              aria-label={`Email ${provider.name}`}
            >
              <Mail className="h-3 w-3" />
            </a>
          )}
          {contacts.website && (
            <a
              href={contacts.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors"
              aria-label={`Visit ${provider.name} website`}
            >
              <Globe className="h-3 w-3" />
            </a>
          )}
        </div>
      )}

      {provider.notes && (
        <p className="text-[11px] text-muted-foreground italic mt-2">
          {provider.notes}
        </p>
      )}
    </div>
  );
}

// ── Supabase Provider Card (from search) ────────────────────────────────

function SearchProviderCard({ provider }: { provider: SupabaseProvider }) {
  const services = provider.services?.length
    ? provider.services.join(" \u2022 ")
    : provider.specialties?.length
      ? provider.specialties.join(" \u2022 ")
      : null;

  return (
    <div className="bg-card border border-border border-l-[3px] border-l-status-current rounded-xl p-4 transition-all hover:-translate-y-0.5 hover:shadow-md group relative">
      {/* Top row: name + price */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-[14px] font-semibold text-foreground leading-snug">
            {provider.name}
          </h3>
          {provider.is_verified && (
            <CheckCircle2 className="h-3.5 w-3.5 text-status-success shrink-0" />
          )}
        </div>
        {provider.price_range && (
          <span className="text-[11px] text-muted-foreground font-medium shrink-0">
            {provider.price_range}
          </span>
        )}
      </div>

      {/* Services as dot-separated */}
      {services && (
        <p className="text-[12px] text-foreground/80 font-medium leading-relaxed mb-2">
          {services}
        </p>
      )}

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground mb-2">
        {provider.location_city && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3 shrink-0" /> {provider.location_city}
          </span>
        )}
        {provider.waitlist_estimate && (
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3 shrink-0" /> {provider.waitlist_estimate}
          </span>
        )}
        {provider.rating && (
          <span className="flex items-center gap-1">
            <Star className="h-3 w-3 shrink-0 text-status-caution" />{" "}
            {provider.rating}
          </span>
        )}
        {provider.type && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
            {provider.type}
          </span>
        )}
      </div>

      {/* Description */}
      {provider.description && (
        <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2 mb-2">
          {provider.description}
        </p>
      )}

      {/* Funding */}
      {provider.accepts_funding && provider.accepts_funding.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {provider.accepts_funding.map((f) => (
            <span
              key={f}
              className="text-[10px] px-1.5 py-0.5 rounded bg-status-success/10 text-status-success font-medium uppercase"
            >
              {f}
            </span>
          ))}
        </div>
      )}

      {/* Contact icons */}
      {(provider.phone || provider.email || provider.website) && (
        <div className="flex flex-wrap items-center gap-3 mt-2 pt-2 border-t border-border">
          {provider.phone && (
            <a
              href={`tel:${provider.phone}`}
              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors"
              aria-label={`Call ${provider.name}`}
            >
              <Phone className="h-3 w-3" />
            </a>
          )}
          {provider.email && (
            <a
              href={`mailto:${provider.email}`}
              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors"
              aria-label={`Email ${provider.name}`}
            >
              <Mail className="h-3 w-3" />
            </a>
          )}
          {provider.website && (
            <a
              href={provider.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors"
              aria-label={`Visit ${provider.name} website`}
            >
              <Globe className="h-3 w-3" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// ── Search Filters Panel ────────────────────────────────────────────────

function SearchFilters({
  city,
  setCity,
  type,
  setType,
}: {
  city: string;
  setCity: (v: string) => void;
  type: string;
  setType: (v: string) => void;
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
              City / Region
            </label>
            <Input
              placeholder="e.g., London"
              className="h-7 text-[12px] w-40"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground">
              Service Type
            </label>
            <Input
              placeholder="e.g., clinic"
              className="h-7 text-[12px] w-40"
              value={type}
              onChange={(e) => setType(e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Search Tab Content ──────────────────────────────────────────────────

function SearchTabContent() {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [city, setCity] = useState("");
  const [type, setType] = useState("");
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
    if (city) params.set("city", city);
    if (type) params.set("type", type);
    return params.toString();
  }, [debouncedQuery, city, type]);

  const hasQuery = !!(debouncedQuery || city || type);

  const { data, isLoading, error } = useQuery<{
    providers: SupabaseProvider[];
  }>({
    queryKey: ["providers-search", queryParams],
    queryFn: async () => {
      const res = await fetch(`/api/providers/search?${queryParams}`);
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
    enabled: hasQuery,
    staleTime: 30_000,
  });

  const results = data?.providers ?? [];

  return (
    <div className="space-y-4">
      {/* Search input */}
      <div className="relative max-w-lg">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="What do you need? e.g., speech therapy, sensory support..."
          className="pl-9"
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
          aria-label="Search all providers"
        />
      </div>

      {/* Filters */}
      <SearchFilters city={city} setCity={setCity} type={type} setType={setType} />

      {/* Results */}
      {!hasQuery && (
        <div className="text-center py-12">
          <p className="text-[13px] text-muted-foreground">
            Search for any service, specialty, or provider name to explore the
            full directory.
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
            Something went wrong searching providers. Please try again.
          </p>
        </div>
      )}

      {hasQuery && !isLoading && !error && (
        <>
          <p className="text-[12px] text-muted-foreground">
            {results.length} provider{results.length !== 1 ? "s" : ""} found
          </p>
          {results.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.map((p) => (
                <SearchProviderCard key={p.id} provider={p} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-[13px] text-muted-foreground">
                No providers match your search. Try different keywords or adjust
                filters.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Priority Banner ─────────────────────────────────────────────────────

function PriorityBanner({
  childName,
  providers,
}: {
  childName: string;
  providers: { highestPriority: ParsedProvider[] };
}) {
  if (providers.highestPriority.length === 0) return null;

  // Derive the top priority service from the first highest-priority provider
  const topProvider = providers.highestPriority[0];
  const topService = topProvider.services
    ? topProvider.services.split(/[,;/]/)[0].trim()
    : "specialist support";

  return (
    <div className="bg-primary/5 border border-primary/15 rounded-xl px-4 py-3 mb-2">
      <p className="text-[13px] text-foreground leading-relaxed">
        <span className="font-semibold text-primary">Priority Now</span>
        {" \u2014 "}Based on {childName}&apos;s needs:{" "}
        <span className="font-medium">{topService}</span> is the highest
        priority. Assessment recommends targeted support in this area.
      </p>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────

export default function ProvidersPage() {
  const { data: providers, isLoading } = useParsedProviders();
  const { data: profile } = useParsedProfile();
  const [activeTab, setActiveTab] = useState<Tab>("matches");
  const [matchSearch, setMatchSearch] = useState("");

  const childName = profile?.basicInfo.name || "your child";
  const postalCode = profile?.basicInfo.postalCode || "";

  const filterProviders = (
    list: ParsedProvider[]
  ): ParsedProvider[] =>
    list.filter(
      (p) =>
        p.name.toLowerCase().includes(matchSearch.toLowerCase()) ||
        p.services.toLowerCase().includes(matchSearch.toLowerCase())
    );

  const totalCount = providers
    ? providers.highestPriority.length +
      providers.relevant.length +
      providers.other.length
    : 0;

  return (
    <WorkspaceSection
      title="Service Providers"
      icon="🏥"
      lastUpdated={providers?.lastUpdated}
      isLoading={isLoading}
    >
      {providers && (
        <div className="space-y-5">
          {/* Priority Banner */}
          <PriorityBanner childName={childName} providers={providers} />

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
              Your Matches
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
              Search All Providers
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
                {totalCount} providers matched for {childName}
                {postalCode && ` near ${postalCode}`}
                {" \u00B7 "}Filtered by your Navigator based on {childName}
                &apos;s needs
              </p>

              {/* Search within matches */}
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Filter matched providers..."
                  className="pl-9"
                  value={matchSearch}
                  onChange={(e) => setMatchSearch(e.target.value)}
                  aria-label="Filter matched providers"
                />
              </div>

              {/* Highest Priority */}
              {filterProviders(providers.highestPriority).length > 0 && (
                <section>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                    Highest Priority
                  </p>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filterProviders(providers.highestPriority).map((p, i) => (
                      <MatchedProviderCard key={i} provider={p} />
                    ))}
                  </div>
                </section>
              )}

              {/* Relevant */}
              {filterProviders(providers.relevant).length > 0 && (
                <section>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                    Relevant
                  </p>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filterProviders(providers.relevant).map((p, i) => (
                      <MatchedProviderCard key={i} provider={p} />
                    ))}
                  </div>
                </section>
              )}

              {/* Other / gap fillers */}
              {filterProviders(providers.other).length > 0 && (
                <section>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                    Gap Fillers
                  </p>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filterProviders(providers.other).map((p, i) => (
                      <MatchedProviderCard key={i} provider={p} />
                    ))}
                  </div>
                </section>
              )}

              {/* Empty state */}
              {totalCount === 0 && (
                <div className="text-center py-12">
                  <p className="text-[13px] text-muted-foreground">
                    No matched providers yet. Your Navigator is still
                    researching options for {childName}.
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
