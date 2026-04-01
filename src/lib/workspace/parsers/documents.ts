import type {
  DocumentEntry,
  ParsedDocuments,
} from "@/types/workspace";
import { extractTable, splitByHeading } from "./common";

export function parseDocuments(markdown: string): ParsedDocuments {
  try {
    const result: ParsedDocuments = {
      documents: [],
      summaries: [],
    };

    const h2Sections = splitByHeading(markdown, 2);

    for (const section of h2Sections) {
      const heading = section.heading.toLowerCase();

      if (heading.includes("all documents")) {
        const rows = extractTable(section.content);
        result.documents = rows.map(
          (row): DocumentEntry => ({
            date: row.date || "",
            title: row.title || "",
            from: row.from || "",
            type: row.type || "",
            storageLink: row.storage_link || "",
          })
        );
      }

      if (heading.includes("summaries")) {
        const h3Items = splitByHeading(section.content, 3);
        for (const item of h3Items) {
          if (!item.heading) continue;
          const findings = item.content
            .split("\n")
            .filter((l) => l.startsWith("-") || l.match(/^\d+\./))
            .map((l) =>
              l
                .replace(/^-\s*/, "")
                .replace(/^\d+\.\s*/, "")
                .trim()
            )
            .filter(Boolean);

          result.summaries.push({
            title: item.heading,
            findings,
          });
        }
      }
    }

    return result;
  } catch {
    return { documents: [], summaries: [] };
  }
}
