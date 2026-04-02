import type {
  ParsedProvider,
  ParsedProviders,
  ProviderPriority,
  ProviderTable,
} from "@/types/workspace";
import {
  extractKeyValuePairs,
  extractLastUpdated,
  extractTable,
  splitByHeading,
} from "./common";

function parseProviderBlock(
  heading: string,
  content: string,
  priority: ProviderPriority
): ParsedProvider {
  const pairs = extractKeyValuePairs(content);
  const isGapFiller =
    content.includes("GAP FILLER") || content.includes("🏷️");

  return {
    name: heading,
    type: pairs.type || "",
    services: pairs.services || "",
    relevance: pairs.relevance || "",
    waitlist: pairs.waitlist || "",
    contact: pairs.contact || "",
    funding: pairs.funding || pairs.cost || "",
    notes: pairs.notes || "",
    priority,
    isGapFiller,
  };
}

export function parseProviders(markdown: string): ParsedProviders {
  try {
    const result: ParsedProviders = {
      highestPriority: [],
      relevant: [],
      other: [],
      tables: [],
      lastUpdated: extractLastUpdated(markdown),
    };

    const h3Sections = splitByHeading(markdown, 3);

    let currentPriority: ProviderPriority = "other";

    for (const section of h3Sections) {
      const heading = section.heading.toLowerCase();

      // Detect priority group headers
      if (heading.includes("highest priority")) {
        currentPriority = "highest";
        continue;
      }
      if (heading.includes("relevant") || heading.includes("community") || section.heading.includes("🔸")) {
        currentPriority = "relevant";
        continue;
      }

      // Check for tables within provider sections
      if (section.content.includes("|")) {
        const tableRows = extractTable(section.content);
        if (tableRows.length > 0 && tableRows[0].provider) {
          result.tables = tableRows.map(
            (row): ProviderTable => ({
              provider: row.provider || "",
              hourlyRate: row.hourly_rate || "",
              waitlist: row.waitlist || "",
              specialties: row.specialties || "",
            })
          );
        }
      }

      // Parse individual provider entries (h4 within h3)
      const h4Sections = splitByHeading(section.content, 4);
      if (h4Sections.length > 0) {
        for (const providerSection of h4Sections) {
          if (!providerSection.heading) continue;
          const provider = parseProviderBlock(
            providerSection.heading,
            providerSection.content,
            currentPriority
          );
          switch (currentPriority) {
            case "highest":
              result.highestPriority.push(provider);
              break;
            case "relevant":
              result.relevant.push(provider);
              break;
            default:
              result.other.push(provider);
          }
        }
      }
    }

    // If the H3/H4 split didn't capture providers, try a simpler approach
    // by looking for H4 headers directly under the document
    if (
      result.highestPriority.length === 0 &&
      result.relevant.length === 0
    ) {
      const h2Sections = splitByHeading(markdown, 2);
      for (const section of h2Sections) {
        const h3s = splitByHeading(section.content, 3);
        for (const h3 of h3s) {
          const heading = h3.heading.toLowerCase();
          if (heading.includes("highest priority")) {
            currentPriority = "highest";
          } else if (heading.includes("relevant") || heading.includes("community") || h3.heading.includes("🔸")) {
            currentPriority = "relevant";
          }

          const h4s = splitByHeading(h3.content, 4);
          for (const h4 of h4s) {
            if (!h4.heading) continue;
            const provider = parseProviderBlock(
              h4.heading,
              h4.content,
              currentPriority
            );
            switch (currentPriority) {
              case "highest":
                result.highestPriority.push(provider);
                break;
              case "relevant":
                result.relevant.push(provider);
                break;
              default:
                result.other.push(provider);
            }
          }
        }
      }
    }

    return result;
  } catch {
    return {
      highestPriority: [],
      relevant: [],
      other: [],
      tables: [],
      lastUpdated: "",
    };
  }
}
