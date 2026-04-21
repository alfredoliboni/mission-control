"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useParsedProviders, useParsedProfile } from "@/hooks/useWorkspace";
import { useFamilyProviders } from "@/hooks/useFamilyProviders";
import { useActiveAgent } from "@/hooks/useActiveAgent";
import { WorkspaceSection } from "@/components/workspace/WorkspaceSection";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ProviderMap } from "@/components/sections/ProviderMap";
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
  DollarSign,
  CreditCard,
  Info,
  Plus,
  Loader2,
} from "lucide-react";
import type { ParsedProvider, ParsedProfile } from "@/types/workspace";
import { extractNeeds, buildRecommendationSummary } from "@/lib/needs";
import { usePriorities } from "@/hooks/usePriorities";

// -- Types -------------------------------------------------------------------

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

interface EnrichedProvider {
  name: string;
  relevance?: string;
  priority?: string;
  isGapFiller?: boolean;
  notes?: string;
  supabase_id?: string;
  type?: string;
  description?: string | null;
  specialties?: string[] | null;
  services_array?: string[] | null;
  services_text?: string;
  location_address?: string | null;
  location_city?: string | null;
  location_postal?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  waitlist_estimate?: string | null;
  is_verified?: boolean;
  rating?: number | null;
  price_range?: string | null;
  accepts_funding?: string[] | null;
  funding_text?: string;
  enriched: boolean;
  // Original agent fields (when not enriched)
  contact?: string;
  waitlist?: string;
  funding?: string;
  services?: string;
}

type Tab = "my-providers" | "recommended" | "search";

// -- Helpers -----------------------------------------------------------------

function extractContactLinks(contact: string) {
  const phone = contact.match(/[\d()+-][\d\s()+-]{6,}/)?.[0]?.trim();
  const email = contact.match(/[\w.-]+@[\w.-]+\.\w+/)?.[0];
  const website = contact.match(/https?:\/\/[^\s,)]+/)?.[0];
  return { phone, email, website };
}

function getBorderColor(priority?: string, isGapFiller?: boolean): string {
  if (priority === "highest") return "border-l-primary";
  if (isGapFiller) return "border-l-status-gap-filler";
  return "border-l-status-current";
}

function formatServicesAsDots(services: string): string {
  const parts = services
    .split(/[,;/]/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length <= 1) return services;
  return parts.join(" \u2022 ");
}

function buildFullAddress(
  address?: string | null,
  city?: string | null,
  postal?: string | null
): string | null {
  const parts = [address, city, postal].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

// -- Enrichment hook ---------------------------------------------------------

function useEnrichedProviders(allProviders: ParsedProvider[]) {
  const { data: enriched, isLoading: enrichLoading } = useQuery<{
    providers: EnrichedProvider[];
  }>({
    queryKey: [
      "providers-enrich",
      allProviders.map((p) => p.name).join("|"),
    ],
    queryFn: async () => {
      const res = await fetch("/api/providers/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providers: allProviders.map((p) => ({
            name: p.name,
            type: p.type,
            services: p.services,
            relevance: p.relevance,
            waitlist: p.waitlist,
            contact: p.contact,
            funding: p.funding,
            notes: p.notes,
            priority: p.priority,
            isGapFiller: p.isGapFiller,
          })),
        }),
      });
      if (!res.ok) throw new Error("Enrich failed");
      return res.json();
    },
    enabled: allProviders.length > 0,
    staleTime: 60_000,
    retry: 1,
  });

  // Build a map from name -> enriched data
  const enrichMap = useMemo(() => {
    const map = new Map<string, EnrichedProvider>();
    if (enriched?.providers) {
      for (const ep of enriched.providers) {
        map.set(ep.name, ep);
      }
    }
    return map;
  }, [enriched]);

  return { enrichMap, enrichLoading };
}

// -- My Provider Card (from workspace providers.md) --------------------------

function MyProviderCard({
  provider,
  enriched,
}: {
  provider: ParsedProvider;
  enriched?: EnrichedProvider;
}) {
  const isEnriched = enriched?.enriched === true;
  const borderColor = getBorderColor(provider.priority, provider.isGapFiller);

  // Resolve fields: prefer enriched Supabase data when available
  const name = enriched?.name || provider.name;
  const isVerified = isEnriched && enriched?.is_verified;
  const priceRange = enriched?.price_range;

  // Services: prefer array from Supabase, fall back to agent text
  const servicesDisplay = isEnriched && enriched?.services_array?.length
    ? enriched.services_array.join(" \u2022 ")
    : isEnriched && enriched?.specialties?.length
      ? enriched.specialties.join(" \u2022 ")
      : provider.services
        ? formatServicesAsDots(provider.services)
        : null;

  // Address
  const fullAddress = isEnriched
    ? buildFullAddress(
        enriched?.location_address,
        enriched?.location_city,
        enriched?.location_postal
      )
    : null;

  // Contact info: prefer Supabase
  const phone = isEnriched ? enriched?.phone : extractContactLinks(provider.contact || "").phone;
  const email = isEnriched ? enriched?.email : extractContactLinks(provider.contact || "").email;
  const website = isEnriched
    ? enriched?.website
    : extractContactLinks(provider.contact || "").website;

  // Waitlist
  const waitlist = enriched?.waitlist_estimate || provider.waitlist;
  const hasWaitlist = waitlist && waitlist !== "\u2014";

  // Rating
  const rating = enriched?.rating;

  // Funding
  const acceptsFunding = isEnriched && enriched?.accepts_funding?.length
    ? enriched.accepts_funding
    : null;

  return (
    <div
      className={`bg-card border border-border ${borderColor} border-l-[3px] rounded-xl p-4 transition-all hover:-translate-y-0.5 hover:shadow-md group relative`}
    >
      {/* Top row: name + verified badge + price */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <h3 className="text-[14px] font-semibold text-foreground leading-snug truncate">
            {name}
          </h3>
          {isVerified && (
            <CheckCircle2 className="h-3.5 w-3.5 text-status-success shrink-0" />
          )}
        </div>
        {priceRange && (
          <span className="text-[11px] text-muted-foreground font-medium shrink-0 flex items-center gap-0.5">
            <DollarSign className="h-3 w-3" />
            {priceRange}
          </span>
        )}
      </div>

      {/* Services as dot-separated tags */}
      {servicesDisplay && (
        <p className="text-[12px] text-foreground/80 font-medium leading-relaxed mb-2">
          {servicesDisplay}
        </p>
      )}

      {/* Address */}
      {fullAddress && (
        <p className="flex items-start gap-1 text-[11px] text-muted-foreground mb-1">
          <MapPin className="h-3 w-3 shrink-0 mt-0.5" />
          <span>{fullAddress}</span>
        </p>
      )}

      {/* Phone + Email inline */}
      {(phone || email) && (
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground mb-1">
          {phone && (
            <a
              href={`tel:${phone.replace(/\s/g, "")}`}
              className="inline-flex items-center gap-1 hover:text-primary transition-colors"
            >
              <Phone className="h-3 w-3 shrink-0" />
              <span>{phone}</span>
            </a>
          )}
          {email && (
            <a
              href={`mailto:${email}`}
              className="inline-flex items-center gap-1 hover:text-primary transition-colors"
            >
              <Mail className="h-3 w-3 shrink-0" />
              <span className="truncate max-w-[160px]">{email}</span>
            </a>
          )}
        </div>
      )}

      {/* Website */}
      {website && (
        <a
          href={website.startsWith("http") ? website : `https://${website}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors mb-2"
        >
          <Globe className="h-3 w-3 shrink-0" />
          <span className="truncate max-w-[200px]">
            {website.replace(/^https?:\/\//, "")}
          </span>
        </a>
      )}

      {/* Meta row: waitlist, rating */}
      <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground mb-3">
        {!fullAddress && provider.type && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3 shrink-0" /> {provider.type}
          </span>
        )}
        {hasWaitlist && (
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3 shrink-0" /> {waitlist}
          </span>
        )}
        {rating && (
          <span className="flex items-center gap-1">
            <Star className="h-3 w-3 shrink-0 text-status-caution" /> {rating}
          </span>
        )}
      </div>

      {/* Accepted funding tags */}
      {acceptsFunding && (
        <div className="flex flex-wrap gap-1 mb-3">
          <CreditCard className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
          {acceptsFunding.map((f) => (
            <span
              key={f}
              className="text-[10px] px-1.5 py-0.5 rounded bg-status-success/10 text-status-success font-medium uppercase"
            >
              {f}
            </span>
          ))}
        </div>
      )}

      {/* Not-enriched notice */}
      {!isEnriched && (
        <p className="flex items-center gap-1 text-[10px] text-muted-foreground/70 italic mt-2">
          <Info className="h-3 w-3 shrink-0" />
          Data from Navigator search — contact info may not be current
        </p>
      )}

      {provider.notes && (
        <p className="text-[11px] text-muted-foreground italic mt-2">
          {provider.notes}
        </p>
      )}
    </div>
  );
}

// -- Recommended Provider Card (from Supabase, with Add to Team) -------------

function RecommendedProviderCard({
  provider,
  onAddToTeam,
  isAdding,
}: {
  provider: SupabaseProvider;
  onAddToTeam: (provider: SupabaseProvider) => void;
  isAdding: boolean;
}) {
  const services = provider.services?.length
    ? provider.services.join(" \u2022 ")
    : provider.specialties?.length
      ? provider.specialties.join(" \u2022 ")
      : null;

  const fullAddress = buildFullAddress(
    provider.location_address,
    provider.location_city,
    provider.location_postal
  );

  return (
    <div className="bg-card border border-border border-l-[3px] border-l-primary rounded-xl p-4 transition-all hover:-translate-y-0.5 hover:shadow-md group relative">
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

      {/* Address */}
      {fullAddress && (
        <p className="flex items-start gap-1 text-[11px] text-muted-foreground mb-1">
          <MapPin className="h-3 w-3 shrink-0 mt-0.5" />
          <span>{fullAddress}</span>
        </p>
      )}

      {/* Phone + Email inline */}
      {(provider.phone || provider.email) && (
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground mb-1">
          {provider.phone && (
            <a
              href={`tel:${provider.phone.replace(/\s/g, "")}`}
              className="inline-flex items-center gap-1 hover:text-primary transition-colors"
            >
              <Phone className="h-3 w-3 shrink-0" />
              <span>{provider.phone}</span>
            </a>
          )}
          {provider.email && (
            <a
              href={`mailto:${provider.email}`}
              className="inline-flex items-center gap-1 hover:text-primary transition-colors"
            >
              <Mail className="h-3 w-3 shrink-0" />
              <span className="truncate max-w-[160px]">{provider.email}</span>
            </a>
          )}
        </div>
      )}

      {/* Website */}
      {provider.website && (
        <a
          href={
            provider.website.startsWith("http")
              ? provider.website
              : `https://${provider.website}`
          }
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors mb-2"
        >
          <Globe className="h-3 w-3 shrink-0" />
          <span className="truncate max-w-[200px]">
            {provider.website.replace(/^https?:\/\//, "")}
          </span>
        </a>
      )}

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground mb-2">
        {!fullAddress && provider.location_city && (
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
        <div className="flex flex-wrap gap-1 mb-3">
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

      {/* Add to My Team button */}
      <button
        onClick={() => onAddToTeam(provider)}
        disabled={isAdding}
        className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isAdding ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Plus className="h-3.5 w-3.5" />
        )}
        Add to My Team
      </button>
    </div>
  );
}

// -- Supabase Provider Card (from search) ------------------------------------

function SearchProviderCard({ provider }: { provider: SupabaseProvider }) {
  const services = provider.services?.length
    ? provider.services.join(" \u2022 ")
    : provider.specialties?.length
      ? provider.specialties.join(" \u2022 ")
      : null;

  const fullAddress = buildFullAddress(
    provider.location_address,
    provider.location_city,
    provider.location_postal
  );

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

      {/* Address */}
      {fullAddress && (
        <p className="flex items-start gap-1 text-[11px] text-muted-foreground mb-1">
          <MapPin className="h-3 w-3 shrink-0 mt-0.5" />
          <span>{fullAddress}</span>
        </p>
      )}

      {/* Phone + Email inline */}
      {(provider.phone || provider.email) && (
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground mb-1">
          {provider.phone && (
            <a
              href={`tel:${provider.phone.replace(/\s/g, "")}`}
              className="inline-flex items-center gap-1 hover:text-primary transition-colors"
            >
              <Phone className="h-3 w-3 shrink-0" />
              <span>{provider.phone}</span>
            </a>
          )}
          {provider.email && (
            <a
              href={`mailto:${provider.email}`}
              className="inline-flex items-center gap-1 hover:text-primary transition-colors"
            >
              <Mail className="h-3 w-3 shrink-0" />
              <span className="truncate max-w-[160px]">{provider.email}</span>
            </a>
          )}
        </div>
      )}

      {/* Website */}
      {provider.website && (
        <a
          href={
            provider.website.startsWith("http")
              ? provider.website
              : `https://${provider.website}`
          }
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors mb-2"
        >
          <Globe className="h-3 w-3 shrink-0" />
          <span className="truncate max-w-[200px]">
            {provider.website.replace(/^https?:\/\//, "")}
          </span>
        </a>
      )}

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground mb-2">
        {!fullAddress && provider.location_city && (
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
    </div>
  );
}

// -- Search Filters Panel ----------------------------------------------------

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

// -- Search Tab Content ------------------------------------------------------

function SearchTabContent({ childCity }: { childCity?: string }) {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [city, setCity] = useState(childCity || "");
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

  const { data, isLoading, error } = useQuery<{
    providers: SupabaseProvider[];
  }>({
    queryKey: ["providers-search", queryParams],
    queryFn: async () => {
      const res = await fetch(`/api/providers/search?${queryParams}`);
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
    staleTime: 30_000,
  });

  const results = data?.providers ?? [];

  // Track provider views when search results load
  const trackedIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (results.length === 0) return;
    const newIds = results
      .map((p) => p.id)
      .filter((id) => !trackedIdsRef.current.has(id));
    if (newIds.length === 0) return;
    for (const id of newIds) {
      trackedIdsRef.current.add(id);
    }
    // Fire-and-forget tracking calls
    for (const providerId of newIds) {
      fetch("/api/providers/track-view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId }),
      }).catch(() => {
        /* tracking is best-effort */
      });
    }
  }, [results]);

  return (
    <div className="space-y-4">
      {/* Provider Map */}
      <ProviderMap
        providers={results.map((p) => ({
          id: p.id,
          name: p.name,
          type: p.type,
          location_city: p.location_city,
          location_address: p.location_address,
          services: p.services,
          phone: p.phone,
          email: p.email,
          website: p.website,
          is_verified: p.is_verified,
        }))}
        childCity={city || childCity || undefined}
      />

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

      {!isLoading && !error && (
        <>
          <p className="text-[12px] text-muted-foreground">
            {results.length} provider{results.length !== 1 ? "s" : ""} found
            {city && ` near ${city}`}
            {debouncedQuery && ` for "${debouncedQuery}"`}
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
                No providers found. Try different keywords or clear the city
                filter to see all Ontario providers.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// -- Priority Banner ---------------------------------------------------------

function PriorityBanner({ childName }: { childName: string }) {
  const { data: priorities } = usePriorities();
  const needs = (priorities ?? []).map((p) => ({
    label: p.label,
    detail: p.detail,
  }));
  const recommendation = buildRecommendationSummary(needs);

  return (
    <div className="bg-[#fdf3ee] border border-[#e8a882]/30 rounded-xl px-4 py-3 mb-2">
      <p className="text-[13px] text-foreground leading-relaxed">
        <span className="font-semibold text-primary">Priority Now for {childName}</span>
        {needs.length > 0 && (
          <>
            {" \u2014 "}
            <span className="font-semibold">
              {needs.map((n) => `${n.label}${n.detail ? ` (${n.detail})` : ""}`).join(", ")}
            </span>
            .{recommendation && <> Assessment recommends {recommendation}.</>}
          </>
        )}
      </p>
    </div>
  );
}

// -- Recommended Tab Content -------------------------------------------------

function RecommendedTabContent({
  childName,
  profile,
  workspaceProviderNames,
  agentId,
}: {
  childName: string;
  profile: ParsedProfile | undefined;
  workspaceProviderNames: string[];
  agentId: string | undefined;
}) {
  const queryClient = useQueryClient();
  const needs = useMemo(
    () => (profile ? extractNeeds(profile) : []),
    [profile]
  );
  const postalCode = profile?.basicInfo.postalCode || "";
  const city = profile?.basicInfo.location || "";
  const [addingId, setAddingId] = useState<string | null>(null);

  // Build query params for recommended API
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (needs.length > 0) {
      params.set("needs", needs.map((n) => n.label).join(","));
    } else {
      // Fallback: search for common autism services
      params.set("needs", "OT,SLP,ABA/IBI");
    }
    if (postalCode) params.set("postal", postalCode);
    if (city) params.set("city", city);
    if (workspaceProviderNames.length > 0) {
      params.set(
        "exclude",
        workspaceProviderNames.map((n) => encodeURIComponent(n)).join(",")
      );
    }
    return params.toString();
  }, [needs, postalCode, city, workspaceProviderNames]);

  const { data, isLoading, error } = useQuery<{
    providers: SupabaseProvider[];
  }>({
    queryKey: ["providers-recommended", queryParams],
    queryFn: async () => {
      const res = await fetch(`/api/providers/recommended?${queryParams}`);
      if (!res.ok) throw new Error("Failed to fetch recommendations");
      return res.json();
    },
    enabled: needs.length > 0 || !!profile,
    staleTime: 60_000,
  });

  const [invitePrompt, setInvitePrompt] = useState<SupabaseProvider | null>(null);
  const [inviting, setInviting] = useState(false);

  const addToTeamMutation = useMutation({
    mutationFn: async (provider: SupabaseProvider) => {
      const res = await fetch("/api/providers/add-to-team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent: agentId,
          provider: {
            id: provider.id,
            name: provider.name,
            type: provider.type,
            services: provider.services,
            phone: provider.phone,
            email: provider.email,
            website: provider.website,
            waitlist_estimate: provider.waitlist_estimate,
            location_city: provider.location_city,
            accepts_funding: provider.accepts_funding,
          },
        }),
      });
      if (!res.ok) throw new Error("Failed to add provider");
      return res.json();
    },
    onSuccess: (_data, provider) => {
      toast.success(`${provider.name} added to your providers`);
      queryClient.invalidateQueries({ queryKey: ["workspace", "file", "providers.md"] });
      queryClient.invalidateQueries({ queryKey: ["providers-recommended"] });
      queryClient.invalidateQueries({ queryKey: ["providers-enrich"] });
      setAddingId(null);
      // Show invite prompt if provider has email
      if (provider.email) {
        setInvitePrompt(provider);
      }
    },
    onError: (_err, provider) => {
      toast.error(`Failed to add ${provider.name}. Please try again.`);
      setAddingId(null);
    },
  });

  const handleAddToTeam = useCallback(
    (provider: SupabaseProvider) => {
      setAddingId(provider.id);
      addToTeamMutation.mutate(provider);
    },
    [addToTeamMutation]
  );

  const handleInviteProvider = useCallback(async () => {
    if (!invitePrompt?.email) return;
    setInviting(true);
    try {
      const res = await fetch("/api/care-team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: invitePrompt.email,
          name: invitePrompt.name,
          role: invitePrompt.type || "therapist",
          organization: invitePrompt.name,
          child_name: childName,
        }),
      });
      if (res.ok) {
        toast.success(`Invitation sent to ${invitePrompt.name}`);
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to send invitation");
      }
    } catch {
      toast.error("Failed to send invitation");
    } finally {
      setInviting(false);
      setInvitePrompt(null);
    }
  }, [invitePrompt, childName]);

  const results = data?.providers ?? [];

  return (
    <div className="space-y-5">
      {/* Invite prompt after Add to My Team */}
      {invitePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-card border border-border rounded-xl p-6 max-w-md mx-4 space-y-4 shadow-xl">
            <h3 className="text-lg font-semibold text-foreground">
              {invitePrompt.name} added! 🎉
            </h3>
            <p className="text-sm text-muted-foreground">
              Would you also like to invite <strong>{invitePrompt.name}</strong> to your care team?
              This lets them upload documents, exchange messages, and access {childName}&apos;s profile.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleInviteProvider}
                disabled={inviting}
                className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 text-sm"
              >
                {inviting ? "Sending..." : "Yes, invite"}
              </button>
              <button
                onClick={() => setInvitePrompt(null)}
                className="flex-1 border border-border py-2.5 rounded-lg font-semibold text-muted-foreground hover:bg-warm-50 transition-colors text-sm"
              >
                No, just add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Priority Banner */}
      <PriorityBanner childName={childName} />

      {needs.length === 0 && (
        <div className="text-center py-12">
          <p className="text-[13px] text-muted-foreground">
            We need more information about {childName}&apos;s needs to generate
            recommendations. Your Navigator is building the profile.
          </p>
        </div>
      )}

      {isLoading && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-52 w-full rounded-xl" />
          ))}
        </div>
      )}

      {error && (
        <div className="text-center py-8">
          <p className="text-[13px] text-status-blocked">
            Something went wrong loading recommendations. Please try again.
          </p>
        </div>
      )}

      {needs.length > 0 && !isLoading && !error && (
        <>
          <p className="text-[12px] text-muted-foreground">
            {results.length} provider{results.length !== 1 ? "s" : ""}{" "}
            recommended for {childName}
            {postalCode && ` near ${postalCode}`}
          </p>
          {results.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.map((p) => (
                <RecommendedProviderCard
                  key={p.id}
                  provider={p}
                  onAddToTeam={handleAddToTeam}
                  isAdding={addingId === p.id}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-[13px] text-muted-foreground">
                No new recommendations found. All matching providers may already
                be on your team, or try searching in the Search All tab.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// -- Main Page ---------------------------------------------------------------

export default function ProvidersPage() {
  const { data: dbProviders } = useFamilyProviders();
  const { data: mdProviders, isLoading } = useParsedProviders();
  const { data: profile } = useParsedProfile();
  const agentId = useActiveAgent();
  const [activeTab, setActiveTab] = useState<Tab>("recommended");
  const [matchSearch, setMatchSearch] = useState("");

  // DB-first, .md fallback: build the three priority buckets for "My Providers"
  const hasDbProviders = dbProviders && dbProviders.length > 0;

  const { myHighest, myRelevant, myOther } = useMemo<{
    myHighest: ParsedProvider[];
    myRelevant: ParsedProvider[];
    myOther: ParsedProvider[];
  }>(() => {
    if (hasDbProviders) {
      const toProvider = (p: (typeof dbProviders)[number]): ParsedProvider => ({
        name: p.providerName,
        type: "",
        services: "",
        relevance: p.agentNote || "",
        waitlist: "",
        contact: "",
        funding: "",
        notes: p.agentNote || "",
        priority: p.priority as ParsedProvider["priority"],
        isGapFiller: p.isGapFiller,
      });
      return {
        myHighest: dbProviders.filter((p) => p.priority === "highest").map(toProvider),
        myRelevant: dbProviders.filter((p) => p.priority === "relevant").map(toProvider),
        myOther: dbProviders.filter((p) => p.priority === "other").map(toProvider),
      };
    }
    // Fallback: workspace .md
    return {
      myHighest: mdProviders?.highestPriority ?? [],
      myRelevant: mdProviders?.relevant ?? [],
      myOther: mdProviders?.other ?? [],
    };
  }, [hasDbProviders, dbProviders, mdProviders]);

  const allMyProviders = useMemo(
    () => [...myHighest, ...myRelevant, ...myOther],
    [myHighest, myRelevant, myOther]
  );

  const { enrichMap, enrichLoading } = useEnrichedProviders(allMyProviders);

  const childName = profile?.basicInfo.name || "your child";
  const postalCode = profile?.basicInfo.postalCode || "";

  // Collect all provider names for exclusion from recommendations
  const workspaceProviderNames = useMemo(
    () => allMyProviders.map((p) => p.name),
    [allMyProviders]
  );

  const filterProviders = (list: ParsedProvider[]): ParsedProvider[] =>
    list.filter(
      (p) =>
        p.name.toLowerCase().includes(matchSearch.toLowerCase()) ||
        p.services.toLowerCase().includes(matchSearch.toLowerCase())
    );

  const totalCount = myHighest.length + myRelevant.length + myOther.length;

  function renderProviderGrid(list: ParsedProvider[]) {
    const filtered = filterProviders(list);
    if (filtered.length === 0) return null;
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((p, i) => (
          <MyProviderCard
            key={i}
            provider={p}
            enriched={enrichMap.get(p.name) ?? enrichMap.get(
              // Try matching by enriched name (Supabase name may differ slightly)
              Array.from(enrichMap.keys()).find(
                (k) => k.toLowerCase().includes(p.name.toLowerCase().split(",")[0].split(" ")[0])
              ) || ""
            )}
          />
        ))}
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "recommended", label: "Recommended", icon: "🎯" },
    { key: "my-providers", label: "My Providers", icon: "🏥" },
    { key: "search", label: "Search All", icon: "🔍" },
  ];

  // Show the page once either DB or .md data is available (or both are still loading)
  const pageReady = hasDbProviders || !!mdProviders;

  return (
    <WorkspaceSection
      title="Service Providers"
      icon="🏥"
      lastUpdated={mdProviders?.lastUpdated}
      isLoading={isLoading && !hasDbProviders}
    >
      {pageReady && (
        <div className="space-y-5">
          {/* Tabs */}
          <div className="flex items-center gap-0 border-b border-border">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2.5 text-[13px] font-medium transition-colors relative ${
                  activeTab === tab.key
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="mr-1.5">{tab.icon}</span>
                {tab.label}
                {activeTab === tab.key && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-t" />
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === "my-providers" && (
            <div className="space-y-5">
              {/* Subtitle */}
              <p className="text-[13px] text-muted-foreground">
                {totalCount} provider{totalCount !== 1 ? "s" : ""} on{" "}
                {childName}&apos;s team
                {postalCode && ` near ${postalCode}`}
              </p>

              {/* Search within my providers */}
              {totalCount > 0 && (
                <div className="relative max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Filter your providers..."
                    className="pl-9"
                    value={matchSearch}
                    onChange={(e) => setMatchSearch(e.target.value)}
                    aria-label="Filter your providers"
                  />
                </div>
              )}

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
                  {/* Highest Priority */}
                  {filterProviders(myHighest).length > 0 && (
                    <section>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                        Highest Priority
                      </p>
                      {renderProviderGrid(myHighest)}
                    </section>
                  )}

                  {/* Relevant */}
                  {filterProviders(myRelevant).length > 0 && (
                    <section>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                        Relevant
                      </p>
                      {renderProviderGrid(myRelevant)}
                    </section>
                  )}

                  {/* Other / gap fillers */}
                  {filterProviders(myOther).length > 0 && (
                    <section>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                        Other Providers
                      </p>
                      {renderProviderGrid(myOther)}
                    </section>
                  )}
                </>
              )}

              {/* Empty state */}
              {totalCount === 0 && (
                <div className="text-center py-12">
                  <p className="text-[13px] text-muted-foreground">
                    No providers on your team yet. Check the{" "}
                    <button
                      onClick={() => setActiveTab("recommended")}
                      className="text-primary hover:underline font-medium"
                    >
                      Recommended
                    </button>{" "}
                    tab to find providers matching {childName}&apos;s needs, or{" "}
                    <button
                      onClick={() => setActiveTab("search")}
                      className="text-primary hover:underline font-medium"
                    >
                      Search All
                    </button>{" "}
                    to browse the directory.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === "recommended" && (
            <RecommendedTabContent
              childName={childName}
              profile={profile}
              workspaceProviderNames={workspaceProviderNames}
              agentId={agentId}
            />
          )}

          {activeTab === "search" && (
            <SearchTabContent childCity={profile?.basicInfo.location} />
          )}
        </div>
      )}
    </WorkspaceSection>
  );
}
