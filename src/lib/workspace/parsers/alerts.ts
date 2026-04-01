import type { AlertSeverity, AlertStatus, ParsedAlert } from "@/types/workspace";
import { splitByHeading } from "./common";

function parseSeverity(text: string): AlertSeverity {
  if (text.includes("HIGH") || text.includes("🔴")) return "HIGH";
  if (text.includes("MEDIUM") || text.includes("🟡")) return "MEDIUM";
  return "INFO";
}

function parseAlertBlock(
  heading: string,
  content: string,
  status: AlertStatus
): ParsedAlert | null {
  // Heading format: "2026-04-01 | 🔴 HIGH | Medication Confirmation Required"
  // Or for dismissed: "2026-03-15 | Autism Ontario Spring Registration Open"
  const parts = heading.split("|").map((p) => p.trim());
  if (parts.length < 2) return null;

  const date = parts[0];
  let severity: AlertSeverity = "INFO";
  let title: string;

  if (parts.length >= 3) {
    severity = parseSeverity(parts[1]);
    title = parts.slice(2).join("|").trim();
  } else {
    title = parts.slice(1).join("|").trim();
  }

  // Extract action line
  const actionMatch = content.match(/\*\*Action:\*\*\s*(.+)/);
  const action = actionMatch ? actionMatch[1].trim() : "";

  // Description is everything except the action line
  const description = content
    .replace(/\*\*Action:\*\*\s*.+/, "")
    .trim();

  return { date, severity, title, description, action, status };
}

export function parseAlerts(markdown: string): ParsedAlert[] {
  try {
    const alerts: ParsedAlert[] = [];
    const h2Sections = splitByHeading(markdown, 2);

    for (const section of h2Sections) {
      const status: AlertStatus =
        section.heading.toLowerCase() === "dismissed" ? "dismissed" : "active";

      if (
        section.heading.toLowerCase() === "active" ||
        section.heading.toLowerCase() === "dismissed"
      ) {
        const h3Items = splitByHeading(section.content, 3);
        for (const item of h3Items) {
          if (!item.heading) continue;
          const alert = parseAlertBlock(item.heading, item.content, status);
          if (alert) alerts.push(alert);
        }
      }
    }

    return alerts;
  } catch {
    return [];
  }
}
