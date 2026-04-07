import type { ParsedEmployment } from "@/types/workspace";
import { splitByHeading } from "./common";

/**
 * Extract bullet list items (- item) from a block of markdown text.
 */
function extractBulletItems(text: string): string[] {
  return text
    .split("\n")
    .filter((l) => /^-\s+/.test(l.trim()))
    .map((l) => l.trim().replace(/^-\s+/, "").trim())
    .filter(Boolean);
}

/**
 * Extract numbered list items (1. item) from a block of markdown text.
 */
function extractNumberedItems(text: string): string[] {
  return text
    .split("\n")
    .filter((l) => /^\d+\.\s+/.test(l.trim()))
    .map((l) => l.trim().replace(/^\d+\.\s+/, "").trim())
    .filter(Boolean);
}

/**
 * Parse an employment.md workspace file into a structured ParsedEmployment object.
 */
export function parseEmployment(markdown: string): ParsedEmployment {
  try {
    const result: ParsedEmployment = {
      title: "",
      strengths: [],
      supportNeeds: [],
      goals: { nearTerm: [], midTerm: [] },
      planningAreas: [],
      careerHypotheses: [],
      nextActions: [],
    };

    // Extract title from first H1
    const titleMatch = markdown.match(/^#\s+(.+)$/m);
    if (titleMatch) {
      result.title = titleMatch[1].trim();
    }

    // Extract Last Updated from "Last Updated: ..." line (not a heading)
    const lastUpdatedMatch = markdown.match(/^Last Updated:\s*(.+)$/m);
    if (lastUpdatedMatch) {
      result.lastUpdated = lastUpdatedMatch[1].trim();
    }

    // Extract Status from "Status: ..." line
    const statusMatch = markdown.match(/^Status:\s*(.+)$/m);
    if (statusMatch) {
      result.status = statusMatch[1].trim();
    }

    const h2Sections = splitByHeading(markdown, 2);

    for (const section of h2Sections) {
      const heading = section.heading.toLowerCase();

      if (heading.includes("employment profile snapshot")) {
        // Split into strengths and support needs by looking for sub-labels
        const lines = section.content.split("\n");
        let mode: "none" | "strengths" | "needs" = "none";

        for (const line of lines) {
          const lower = line.toLowerCase().trim();
          if (lower.startsWith("likely strengths") || lower.startsWith("strengths")) {
            mode = "strengths";
            continue;
          }
          if (
            lower.startsWith("likely support needs") ||
            lower.startsWith("support needs")
          ) {
            mode = "needs";
            continue;
          }
          // Skip source lines
          if (lower.startsWith("source:")) {
            mode = "none";
            continue;
          }
          if (/^-\s+/.test(line.trim())) {
            const item = line.trim().replace(/^-\s+/, "").trim();
            if (!item) continue;
            if (mode === "strengths") {
              result.strengths.push(item);
            } else if (mode === "needs") {
              result.supportNeeds.push(item);
            }
          }
        }
      }

      if (heading.includes("employment goals")) {
        const h3Sections = splitByHeading(section.content, 3);
        for (const sub of h3Sections) {
          const subHeading = sub.heading.toLowerCase();
          if (subHeading.includes("near-term") || subHeading.includes("near term")) {
            result.goals.nearTerm = extractBulletItems(sub.content);
          }
          if (subHeading.includes("mid-term") || subHeading.includes("mid term")) {
            result.goals.midTerm = extractBulletItems(sub.content);
          }
        }
      }

      if (heading.includes("recommended planning areas")) {
        const h3Sections = splitByHeading(section.content, 3);
        for (const sub of h3Sections) {
          if (!sub.heading) continue;
          // Remove leading number prefix (e.g., "1. Vocational Assessment")
          const areaTitle = sub.heading.replace(/^\d+\.\s*/, "").trim();
          const items = extractBulletItems(sub.content);

          // Description is the non-bullet, non-empty text before the first bullet
          const contentLines = sub.content.split("\n");
          const descriptionLines: string[] = [];
          for (const line of contentLines) {
            if (/^-\s+/.test(line.trim())) break;
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith("#")) {
              descriptionLines.push(trimmed);
            }
          }

          result.planningAreas.push({
            title: areaTitle,
            description: descriptionLines.join(" ").trim(),
            items,
          });
        }
      }

      if (
        heading.includes("potential good-fit career directions") ||
        heading.includes("career hypotheses")
      ) {
        result.careerHypotheses = extractBulletItems(section.content);
      }

      if (heading.includes("next actions")) {
        // Next actions can be numbered or bulleted
        const numbered = extractNumberedItems(section.content);
        if (numbered.length > 0) {
          result.nextActions = numbered;
        } else {
          result.nextActions = extractBulletItems(section.content);
        }
      }
    }

    return result;
  } catch {
    return {
      title: "",
      strengths: [],
      supportNeeds: [],
      goals: { nearTerm: [], midTerm: [] },
      planningAreas: [],
      careerHypotheses: [],
      nextActions: [],
    };
  }
}
