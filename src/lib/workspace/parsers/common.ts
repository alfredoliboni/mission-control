/**
 * Shared parsing utilities for workspace markdown files.
 */

/** Split markdown into sections by heading level. */
export function splitByHeading(
  markdown: string,
  level: number
): { heading: string; content: string }[] {
  const prefix = "#".repeat(level) + " ";
  const lines = markdown.split("\n");
  const sections: { heading: string; content: string }[] = [];
  let currentHeading = "";
  let currentLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith(prefix) && !line.startsWith(prefix + "#")) {
      if (currentHeading || currentLines.length > 0) {
        sections.push({
          heading: currentHeading,
          content: currentLines.join("\n").trim(),
        });
      }
      currentHeading = line.slice(prefix.length).trim();
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }

  if (currentHeading || currentLines.length > 0) {
    sections.push({
      heading: currentHeading,
      content: currentLines.join("\n").trim(),
    });
  }

  return sections;
}

/** Extract a markdown table into an array of row objects. */
export function extractTable(
  markdown: string
): Record<string, string>[] {
  const lines = markdown.split("\n").filter((l) => l.trim().startsWith("|"));
  if (lines.length < 2) return [];

  const headers = lines[0]
    .split("|")
    .map((h) => h.trim())
    .filter(Boolean);

  // Skip the separator line (index 1)
  return lines.slice(2).map((line) => {
    const cells = line
      .split("|")
      .map((c) => c.trim())
      .filter((_, i, arr) => i > 0 && i < arr.length); // Remove empty first/last from pipes
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h.toLowerCase().replace(/\s+/g, "_")] = cells[i] || "";
    });
    return row;
  });
}

/** Extract "Last Updated: ..." line from markdown. */
export function extractLastUpdated(markdown: string): string {
  const match = markdown.match(
    /##?\s*Last Updated:\s*(.+)/i
  );
  return match ? match[1].trim() : "";
}

/** Extract items from an "## Agent Monitoring" section. */
export function extractAgentMonitoring(markdown: string): string[] {
  const match = markdown.match(
    /##\s*Agent Monitoring\s*\n([\s\S]*?)(?=\n##\s|\n$|$)/
  );
  if (!match) return [];
  return match[1]
    .split("\n")
    .map((l) => l.replace(/^-\s*/, "").trim())
    .filter(Boolean);
}

/** Extract checkbox items from markdown. */
export function extractCheckboxItems(
  markdown: string
): { text: string; checked: boolean }[] {
  const regex = /^-\s*\[([ xX])\]\s*(.+)$/gm;
  const items: { text: string; checked: boolean }[] = [];
  let match;
  while ((match = regex.exec(markdown)) !== null) {
    items.push({
      checked: match[1] !== " ",
      text: match[2].trim(),
    });
  }
  return items;
}

/** Extract key-value pairs from bullet list (- **Key:** Value). */
export function extractKeyValuePairs(
  markdown: string
): Record<string, string> {
  const pairs: Record<string, string> = {};
  const regex = /^-\s*\*\*(.+?):\*\*\s*(.+)$/gm;
  let match;
  while ((match = regex.exec(markdown)) !== null) {
    const key = match[1].trim().toLowerCase().replace(/\s+/g, "_");
    pairs[key] = match[2].trim();
  }
  return pairs;
}
