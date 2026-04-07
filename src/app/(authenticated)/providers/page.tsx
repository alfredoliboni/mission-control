"use client";

import { useState } from "react";
import { useParsedProviders, useParsedProfile } from "@/hooks/useWorkspace";
import { WorkspaceSection } from "@/components/workspace/WorkspaceSection";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Phone, Mail, Globe, MapPin, Clock, Info } from "lucide-react";
import type { ParsedProvider } from "@/types/workspace";

function extractContactLinks(contact: string) {
  const phone = contact.match(/[\d()+-][\d\s()+-]{6,}/)?.[0]?.trim();
  const email = contact.match(/[\w.-]+@[\w.-]+\.\w+/)?.[0];
  const website = contact.match(/https?:\/\/[^\s,)]+/)?.[0];
  return { phone, email, website };
}

function ProviderCardInline({ provider, childNeeds }: { provider: ParsedProvider; childNeeds?: string }) {
  const [showWhy, setShowWhy] = useState(false);
  const contacts = extractContactLinks(provider.contact || "");

  const categoryTag = provider.isGapFiller ? (
    <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-status-gap-filler/8 text-status-gap-filler">
      Gap Filler
    </span>
  ) : provider.priority === "highest" ? (
    <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-primary/8 text-primary">
      Priority
    </span>
  ) : (
    <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-status-current/8 text-status-current">
      Relevant
    </span>
  );

  // Build the "why" explanation
  const whyExplanation = provider.relevance && provider.relevance !== "—"
    ? provider.relevance
    : provider.priority === "highest"
      ? `Matches your child's priority needs${provider.services ? ` (${provider.services.substring(0, 60)})` : ""}. Located in your area with ${provider.funding && provider.funding !== "—" ? provider.funding : "accepted"} funding.`
      : `Offers relevant services${provider.services ? `: ${provider.services.substring(0, 60)}` : ""} in your region.`;

  return (
    <div className="bg-card border border-border rounded-xl p-4 transition-all hover:-translate-y-0.5 hover:shadow-md group">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-[14px] font-semibold text-foreground leading-snug">
          {provider.name}
        </h3>
        {categoryTag}
      </div>

      <div className="text-[12px] text-muted-foreground leading-[1.6] space-y-1">
        {provider.type && (
          <p className="flex items-center gap-1.5">
            <MapPin className="h-3 w-3 shrink-0" /> {provider.type}
          </p>
        )}
        {provider.services && (
          <p className="text-foreground font-medium">{provider.services}</p>
        )}
        {provider.waitlist && provider.waitlist !== "—" && (
          <p className="flex items-center gap-1.5">
            <Clock className="h-3 w-3 shrink-0" /> Wait: {provider.waitlist}
          </p>
        )}
        {provider.funding && provider.funding !== "—" && (
          <p className="text-[11px]">💰 {provider.funding}</p>
        )}
      </div>

      {/* Contact links */}
      {(contacts.phone || contacts.email || contacts.website) && (
        <div className="flex flex-wrap gap-2 mt-3 pt-2 border-t border-border">
          {contacts.phone && (
            <a href={`tel:${contacts.phone}`} className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline">
              <Phone className="h-3 w-3" /> {contacts.phone}
            </a>
          )}
          {contacts.email && (
            <a href={`mailto:${contacts.email}`} className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline">
              <Mail className="h-3 w-3" /> Email
            </a>
          )}
          {contacts.website && (
            <a href={contacts.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline">
              <Globe className="h-3 w-3" /> Website
            </a>
          )}
        </div>
      )}

      {/* Why this provider — toggle */}
      <button
        onClick={() => setShowWhy(!showWhy)}
        className="flex items-center gap-1 mt-3 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <Info className="h-3 w-3" />
        {showWhy ? "Hide" : "Why this provider?"}
      </button>
      {showWhy && (
        <p className="mt-1.5 text-[11px] text-muted-foreground bg-warm-50 rounded-lg p-2.5 leading-relaxed">
          🧭 <strong>Navigator&apos;s reasoning:</strong> {whyExplanation}
        </p>
      )}

      {provider.notes && (
        <p className="text-[11px] text-muted-foreground italic mt-2">{provider.notes}</p>
      )}
    </div>
  );
}

export default function ProvidersPage() {
  const { data: providers, isLoading } = useParsedProviders();
  const { data: profile } = useParsedProfile();
  const [search, setSearch] = useState("");
  const childName = profile?.basicInfo.name || "your child";
  const postalCode = profile?.basicInfo.postalCode || "";

  const filterProviders = (
    list: typeof providers extends undefined
      ? never
      : NonNullable<typeof providers>["highestPriority"]
  ) =>
    list.filter(
      (p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.services.toLowerCase().includes(search.toLowerCase())
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
        <div className="space-y-6">
          {/* Subtitle */}
          <p className="text-[13px] text-muted-foreground -mt-2">
            {totalCount} providers matched for {childName}
            {postalCode && ` near ${postalCode}`}
            {" · "}Filtered by your Navigator based on {childName}&apos;s needs
          </p>

          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search providers..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search providers"
            />
          </div>

          {/* Highest Priority */}
          {filterProviders(providers.highestPriority).length > 0 && (
            <section>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                ⭐ Highest Priority
              </p>
              <p className="text-[11px] text-muted-foreground mb-3">
                Directly match {childName}&apos;s most urgent needs — OT, SLP, ABA, or specialists identified in assessments
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filterProviders(providers.highestPriority).map((p, i) => (
                  <ProviderCardInline key={i} provider={p} childNeeds={childName} />
                ))}
              </div>
            </section>
          )}

          {/* Relevant */}
          {filterProviders(providers.relevant).length > 0 && (
            <section>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                🔸 Relevant
              </p>
              <p className="text-[11px] text-muted-foreground mb-3">
                Additional providers that offer useful services — may complement primary therapy or provide community support
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filterProviders(providers.relevant).map((p, i) => (
                  <ProviderCardInline key={i} provider={p} childNeeds={childName} />
                ))}
              </div>
            </section>
          )}

          {/* Private options table */}
          {providers.tables.length > 0 && (
            <section>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                💼 Private Options
              </p>
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[12px] font-medium text-muted-foreground">Provider</TableHead>
                      <TableHead className="text-[12px] font-medium text-muted-foreground">Rate</TableHead>
                      <TableHead className="text-[12px] font-medium text-muted-foreground">Waitlist</TableHead>
                      <TableHead className="text-[12px] font-medium text-muted-foreground">Specialties</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {providers.tables.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-[13px] font-medium text-foreground">
                          {row.provider}
                        </TableCell>
                        <TableCell className="text-[13px] text-muted-foreground">{row.hourlyRate}</TableCell>
                        <TableCell className="text-[13px] text-muted-foreground">{row.waitlist}</TableCell>
                        <TableCell className="text-[13px] text-muted-foreground">{row.specialties}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>
          )}
        </div>
      )}
    </WorkspaceSection>
  );
}
