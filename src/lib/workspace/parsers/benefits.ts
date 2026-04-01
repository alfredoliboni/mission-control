import type {
  BenefitStatus,
  BenefitStatusRow,
  ParsedBenefits,
} from "@/types/workspace";
import {
  extractAgentMonitoring,
  extractKeyValuePairs,
  extractLastUpdated,
  extractTable,
  splitByHeading,
} from "./common";

function parseBenefitStatus(statusText: string): BenefitStatus {
  const lower = statusText.toLowerCase();
  if (lower.includes("registered") || lower.includes("✅"))
    return "registered";
  if (lower.includes("pending") || lower.includes("⏳")) return "pending";
  if (lower.includes("waiting")) return "waiting";
  if (lower.includes("approved")) return "approved";
  if (lower.includes("active")) return "active";
  return "not_started";
}

export function parseBenefits(markdown: string): ParsedBenefits {
  try {
    const result: ParsedBenefits = {
      statusTable: [],
      details: [],
      agentMonitoring: extractAgentMonitoring(markdown),
      lastUpdated: extractLastUpdated(markdown),
    };

    const h2Sections = splitByHeading(markdown, 2);

    for (const section of h2Sections) {
      const heading = section.heading.toLowerCase();

      if (heading.includes("application status")) {
        const rows = extractTable(section.content);
        result.statusTable = rows.map(
          (row): BenefitStatusRow => ({
            benefit: row.benefit || "",
            status: parseBenefitStatus(row.status || ""),
            statusDisplay: row.status || "",
            applied: row.applied || "",
            notes: row.notes || "",
          })
        );
      }

      if (heading.includes("detailed eligibility")) {
        const h3Items = splitByHeading(section.content, 3);
        for (const item of h3Items) {
          if (!item.heading) continue;
          const pairs = extractKeyValuePairs(item.content);

          // Also extract action items with ⚠️ prefix
          const actionMatch = item.content.match(
            /\*\*⚠️\s*Action:\*\*\s*(.+)/
          );
          const action = actionMatch
            ? actionMatch[1].trim()
            : pairs["⚠️_action"] || pairs.action || "";

          result.details.push({
            name: item.heading,
            eligibility: pairs.eligibility || "",
            amount: pairs.amount || "",
            unlocks: pairs.unlocks || "",
            howApplied: pairs.how_applied || "",
            expectedResponse: pairs.expected_response || "",
            action,
            documentsNeeded: pairs.documents_needed || "",
            details: pairs,
          });
        }
      }
    }

    return result;
  } catch {
    return {
      statusTable: [],
      details: [],
      agentMonitoring: [],
      lastUpdated: "",
    };
  }
}
