import type { ParsedUniversity } from "@/types/workspace";
import { splitByHeading } from "./common";

/** Extract bullet items (- text) from a block of markdown. */
function extractBulletItems(content: string): string[] {
  return content
    .split("\n")
    .filter((l) => l.match(/^\s*-\s+/))
    .map((l) => l.replace(/^\s*-\s+/, "").trim())
    .filter(Boolean);
}

/** Extract the first paragraph of non-heading, non-bullet text. */
function extractParagraph(content: string): string {
  const lines = content.split("\n");
  const paragraphLines: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (paragraphLines.length > 0) break;
      continue;
    }
    if (trimmed.startsWith("#") || trimmed.startsWith("-") || trimmed.startsWith("Source:")) continue;
    paragraphLines.push(trimmed);
  }
  return paragraphLines.join(" ").trim();
}

/**
 * Parse a university.md workspace file into structured data.
 *
 * Expected format matches the agent's narrative planning document with
 * sections like Snapshot, Likely Good-Fit Academic Themes,
 * Post-Secondary Planning Priorities, etc.
 */
export function parseUniversity(markdown: string): ParsedUniversity {
  try {
    const result: ParsedUniversity = {
      title: "",
      lastUpdated: "",
      status: "",
      snapshot: "",
      academicThemes: [],
      planningPriorities: [],
      documentationNeeded: [],
      campusConsiderations: [],
      cautionNotes: [],
    };

    // Extract title from first H1 line
    const titleMatch = markdown.match(/^#\s+(.+)/m);
    if (titleMatch) {
      result.title = titleMatch[1].trim();
    }

    // Extract Last Updated and Status from top-level metadata
    const lastUpdatedMatch = markdown.match(/Last Updated:\s*(.+)/i);
    if (lastUpdatedMatch) {
      result.lastUpdated = lastUpdatedMatch[1].trim();
    }

    const statusMatch = markdown.match(/Status:\s*(.+)/i);
    if (statusMatch) {
      result.status = statusMatch[1].trim();
    }

    const h2Sections = splitByHeading(markdown, 2);

    for (const section of h2Sections) {
      const heading = section.heading.toLowerCase();

      // Snapshot section
      if (heading.includes("snapshot")) {
        result.snapshot = extractParagraph(section.content);
      }

      // Academic themes
      if (
        heading.includes("academic themes") ||
        heading.includes("good-fit academic")
      ) {
        result.academicThemes = extractBulletItems(section.content);
      }

      // Post-Secondary Planning Priorities — contains numbered H3 subsections
      if (heading.includes("planning priorities")) {
        const h3Items = splitByHeading(section.content, 3);
        for (const item of h3Items) {
          if (!item.heading) continue;
          // Strip leading number and dot (e.g. "1. Accessibility Services")
          const title = item.heading.replace(/^\d+\.\s*/, "").trim();
          const description = extractParagraph(item.content);
          const items = extractBulletItems(item.content);
          result.planningPriorities.push({ title, description, items });
        }
      }

      // Documentation Readiness (H3 under Planning Priorities) is captured above,
      // but also handle standalone "Documentation Readiness" H2 sections
      if (
        heading.includes("documentation readiness") ||
        heading.includes("documentation needed")
      ) {
        result.documentationNeeded = extractBulletItems(section.content);
      }

      // Accommodation Areas
      if (heading.includes("accommodation areas")) {
        // Merge into documentationNeeded if it's related, or treat as planning priority
        const items = extractBulletItems(section.content);
        if (items.length > 0) {
          const description = extractParagraph(section.content);
          result.planningPriorities.push({
            title: section.heading,
            description,
            items,
          });
        }
      }

      // Ontario Accessibility Office Targets
      if (heading.includes("accessibility office targets")) {
        const items = extractBulletItems(section.content);
        if (items.length > 0) {
          const description = extractParagraph(section.content);
          result.planningPriorities.push({
            title: section.heading,
            description,
            items,
          });
        }
      }

      // Programs Likely Suited
      if (heading.includes("programs likely suited")) {
        const items = extractBulletItems(section.content);
        if (items.length > 0) {
          const description = extractParagraph(section.content);
          result.planningPriorities.push({
            title: section.heading,
            description,
            items,
          });
        }
      }

      // Financial Aid
      if (heading.includes("financial aid")) {
        const items = extractBulletItems(section.content);
        if (items.length > 0) {
          const description = extractParagraph(section.content);
          result.planningPriorities.push({
            title: section.heading,
            description,
            items,
          });
        }
      }

      // Campus Transition Questions
      if (
        heading.includes("campus transition") ||
        heading.includes("campus considerations")
      ) {
        result.campusConsiderations = extractBulletItems(section.content);
      }

      // Next Actions — treat as campus considerations addendum or planning priority
      if (heading.includes("next actions")) {
        // Numbered items: "1. Confirm academic..."
        const items = section.content
          .split("\n")
          .filter((l) => l.match(/^\d+\.\s+/))
          .map((l) => l.replace(/^\d+\.\s+/, "").trim())
          .filter(Boolean);
        if (items.length > 0) {
          result.planningPriorities.push({
            title: "Next Actions",
            description: "",
            items,
          });
        }
      }

      // Caution
      if (heading.includes("caution")) {
        // Caution may be a paragraph, not bullets
        const paragraph = extractParagraph(section.content);
        const bullets = extractBulletItems(section.content);
        if (bullets.length > 0) {
          result.cautionNotes = bullets;
        } else if (paragraph) {
          result.cautionNotes = [paragraph];
        }
      }
    }

    // If Documentation Readiness was inside Planning Priorities as H3 #4,
    // extract it from there into documentationNeeded
    if (result.documentationNeeded.length === 0) {
      const docPriorityIdx = result.planningPriorities.findIndex(
        (p) => p.title.toLowerCase().includes("documentation")
      );
      if (docPriorityIdx !== -1) {
        result.documentationNeeded =
          result.planningPriorities[docPriorityIdx].items;
      }
    }

    return result;
  } catch {
    return {
      title: "",
      lastUpdated: "",
      status: "",
      snapshot: "",
      academicThemes: [],
      planningPriorities: [],
      documentationNeeded: [],
      campusConsiderations: [],
      cautionNotes: [],
    };
  }
}
