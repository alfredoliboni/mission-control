import type {
  ParsedProgram,
  ParsedPrograms,
  ProgramCategory,
} from "@/types/workspace";
import {
  extractKeyValuePairs,
  extractLastUpdated,
  splitByHeading,
} from "./common";

function detectCategory(sectionHeading: string): ProgramCategory {
  const lower = sectionHeading.toLowerCase();
  if (lower.includes("gap filler") || lower.includes("🏷️"))
    return "gap_filler";
  if (lower.includes("government") || lower.includes("📘"))
    return "government";
  if (lower.includes("educational") || lower.includes("📗"))
    return "educational";
  return "educational";
}

function parseProgramBlock(
  heading: string,
  content: string,
  category: ProgramCategory
): ParsedProgram {
  const pairs = extractKeyValuePairs(content);
  const isGapFiller = category === "gap_filler";

  return {
    name: heading,
    category,
    type: pairs.type || "",
    cost: pairs.cost || "",
    ages: pairs.ages || "",
    schedule: pairs.schedule || "",
    location: pairs.location || "",
    whyGapFiller: pairs.why_gap_filler || "",
    register: pairs.register || pairs.contact || pairs.portal || "",
    status: pairs.status || "",
    details: pairs,
    isGapFiller,
  };
}

export function parsePrograms(markdown: string): ParsedPrograms {
  try {
    const result: ParsedPrograms = {
      gapFillers: [],
      government: [],
      educational: [],
      lastUpdated: extractLastUpdated(markdown),
    };

    const h2Sections = splitByHeading(markdown, 2);

    for (const section of h2Sections) {
      if (!section.heading) continue;
      const category = detectCategory(section.heading);
      const h3Items = splitByHeading(section.content, 3);

      for (const item of h3Items) {
        if (!item.heading) continue;
        const program = parseProgramBlock(
          item.heading,
          item.content,
          category
        );

        switch (category) {
          case "gap_filler":
            result.gapFillers.push(program);
            break;
          case "government":
            result.government.push(program);
            break;
          case "educational":
            result.educational.push(program);
            break;
        }
      }
    }

    return result;
  } catch {
    return {
      gapFillers: [],
      government: [],
      educational: [],
      lastUpdated: "",
    };
  }
}
