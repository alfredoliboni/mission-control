import type {
  ParsedJourneyPartner,
  ParsedJourneyPartners,
} from "@/types/workspace";
import {
  extractKeyValuePairs,
  extractLastUpdated,
  splitByHeading,
} from "./common";

/** Extract "Last Updated" from both `## Last Updated: ...` and bare `Last Updated: ...` formats. */
function extractLastUpdatedFlexible(markdown: string): string {
  const result = extractLastUpdated(markdown);
  if (result) return result;
  // Fallback: bare "Last Updated:" without heading markers (agent-written format)
  const match = markdown.match(/^Last Updated:\s*(.+)/im);
  return match ? match[1].trim() : "";
}

function parsePartnerBlock(
  heading: string,
  content: string,
  active: boolean
): ParsedJourneyPartner {
  const pairs = extractKeyValuePairs(content);

  return {
    name: heading,
    role: pairs.role || "",
    organization: pairs.organization || "",
    services: pairs.services || "",
    contact: pairs.contact || "",
    status: pairs.status || "",
    source: pairs.source || "",
    active,
  };
}

export function parseJourneyPartners(
  markdown: string
): ParsedJourneyPartners {
  try {
    const result: ParsedJourneyPartners = {
      activeTeam: [],
      formerTeam: [],
      lastUpdated: extractLastUpdatedFlexible(markdown),
    };

    const h2Sections = splitByHeading(markdown, 2);

    for (const section of h2Sections) {
      const heading = section.heading.toLowerCase();
      const isActive = heading.includes("active");
      const isFormer = heading.includes("former");

      if (!isActive && !isFormer) continue;

      const h3Items = splitByHeading(section.content, 3);
      for (const item of h3Items) {
        if (!item.heading) continue;
        const partner = parsePartnerBlock(
          item.heading,
          item.content,
          isActive
        );

        if (isActive) {
          result.activeTeam.push(partner);
        } else {
          result.formerTeam.push(partner);
        }
      }
    }

    return result;
  } catch {
    return {
      activeTeam: [],
      formerTeam: [],
      lastUpdated: "",
    };
  }
}
