import type {
  ParsedPathway,
  PathwayItem,
  PathwayItemStatus,
  PathwayStageStatus,
} from "@/types/workspace";
import { splitByHeading } from "./common";

function parseStageStatus(heading: string): PathwayStageStatus {
  if (heading.includes("[completed]")) return "completed";
  if (heading.includes("[current]")) return "current";
  return "upcoming";
}

function parseItemStatus(text: string, completed: boolean): PathwayItemStatus {
  if (completed) return "completed";
  if (text.includes("🔴") || text.includes("BLOCKED")) return "blocked";
  if (text.includes("⭐") || text.includes("MILESTONE")) return "milestone";
  if (text.includes("🔵")) return "current";
  return "upcoming";
}

function extractDate(text: string): string | undefined {
  // Match " — YYYY-MM-DD" or " — YYYY-MM" at end of text
  const match = text.match(/—\s*([\d]{4}-[\d]{2}(?:-[\d]{2})?)\s*$/);
  return match ? match[1] : undefined;
}

function cleanItemText(text: string): string {
  return text
    .replace(/—\s*[\d]{4}-[\d]{2}(?:-[\d]{2})?\s*$/, "")
    .replace(/🔵\s*/, "")
    .replace(/🔴\s*/, "")
    .replace(/⬜\s*/, "")
    .replace(/⭐\s*/, "")
    .trim();
}

export function parsePathway(markdown: string): ParsedPathway {
  try {
    const result: ParsedPathway = {
      currentStage: "",
      stages: [],
      nextActions: [],
    };

    // Extract current stage
    const stageMatch = markdown.match(
      /##\s*Current Stage:\s*(.+)/i
    );
    if (stageMatch) {
      result.currentStage = stageMatch[1].trim();
    }

    // Extract stages (h3 sections)
    const h2Sections = splitByHeading(markdown, 2);

    for (const section of h2Sections) {
      if (section.heading.toLowerCase() === "stages") {
        const h3Stages = splitByHeading(section.content, 3);
        for (const stageSection of h3Stages) {
          if (!stageSection.heading) continue;

          const status = parseStageStatus(stageSection.heading);
          // Extract stage number and title
          const titleMatch = stageSection.heading.match(
            /(\d+)\.\s*(.+?)(?:\s*\[.+\])?$/
          );
          const number = titleMatch ? parseInt(titleMatch[1]) : 0;
          const title = titleMatch
            ? titleMatch[2].trim()
            : stageSection.heading.replace(/\[.+\]/, "").trim();

          const items: PathwayItem[] = [];
          const itemRegex = /^-\s*\[([ xX])\]\s*(.+)$/gm;
          let match;
          while (
            (match = itemRegex.exec(stageSection.content)) !== null
          ) {
            const completed = match[1] !== " ";
            const rawText = match[2].trim();
            items.push({
              text: cleanItemText(rawText),
              completed,
              status: parseItemStatus(rawText, completed),
              date: extractDate(rawText),
            });
          }

          result.stages.push({ number, title, status, items });
        }
      }

      // Extract next actions
      if (section.heading.toLowerCase() === "next actions") {
        const lines = section.content.split("\n");
        for (const line of lines) {
          const match = line.match(/^\d+\.\s*(.+)/);
          if (match) {
            result.nextActions.push(match[1].trim());
          }
        }
      }
    }

    return result;
  } catch {
    return { currentStage: "", stages: [], nextActions: [] };
  }
}
