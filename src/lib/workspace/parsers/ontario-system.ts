import { extractLastUpdated, splitByHeading } from "./common";

export interface WaitTimeEntry {
  service: string;
  wait: string;
  months: number; // numeric for bar width
}

export interface BenefitEntry {
  name: string;
  amount: string;
  eligibility: string;
}

export interface OntarioSystemData {
  journeyOverview: string;
  oap: {
    entryPoints: string[];
    childhoodBudget: string[];
    foundationalServices: string[];
    waitTimes: WaitTimeEntry[];
  };
  school: {
    iepPoints: string[];
    boards: { name: string; type: string }[];
  };
  financialSupports: BenefitEntry[];
  lastUpdated: string;
  sources: string;
}

function parseListItems(content: string): string[] {
  return content
    .split("\n")
    .filter((l) => /^[\d\-\*]\s*\.?\s+/.test(l.trim()) || /^\d+\.\s+/.test(l.trim()))
    .map((l) => l.replace(/^[\d\-\*]+\.?\s+/, "").trim())
    .filter(Boolean);
}

function parseWaitTimes(content: string): WaitTimeEntry[] {
  const rows: WaitTimeEntry[] = [];
  const lines = content.split("\n");
  for (const line of lines) {
    const match = line.match(/^\|([^|]+)\|([^|]+)\|/);
    if (match) {
      const service = match[1].trim();
      const wait = match[2].trim();
      if (service.toLowerCase() === "service" || service.startsWith("--")) continue;
      // extract numeric months from wait string
      const numMatch = wait.match(/(\d+)\s*-?\s*(\d+)?/);
      const months = numMatch ? (numMatch[2] ? (parseInt(numMatch[1]) + parseInt(numMatch[2])) / 2 : parseInt(numMatch[1])) : 6;
      rows.push({ service, wait, months });
    }
  }
  return rows;
}

function parseBenefits(content: string): BenefitEntry[] {
  const rows: BenefitEntry[] = [];
  const lines = content.split("\n");
  for (const line of lines) {
    const match = line.match(/^\|([^|]+)\|([^|]+)\|([^|]+)\|/);
    if (match) {
      const name = match[1].trim().replace(/\*\*/g, "");
      const amount = match[2].trim();
      const eligibility = match[3].trim();
      if (name.toLowerCase() === "benefit" || name.startsWith("--")) continue;
      rows.push({ name, amount, eligibility });
    }
  }
  return rows;
}

export function parseOntarioSystem(raw: string): OntarioSystemData {
  const h2Sections = splitByHeading(raw, 2);
  const lastUpdated = extractLastUpdated(raw);

  let journeyOverview = "";
  let oap = { entryPoints: [] as string[], childhoodBudget: [] as string[], foundationalServices: [] as string[], waitTimes: [] as WaitTimeEntry[] };
  let school = { iepPoints: [] as string[], boards: [] as { name: string; type: string }[] };
  let financialSupports: BenefitEntry[] = [];
  let sources = "";

  for (const section of h2Sections) {
    const heading = section.heading.toLowerCase();

    if (heading.includes("journey")) {
      const codeMatch = section.content.match(/```[\s\S]*?```/);
      journeyOverview = codeMatch ? codeMatch[0].replace(/```/g, "").trim() : section.content.trim();
    } else if (heading.includes("ontario autism program") || heading.includes("oap")) {
      const h3Sections = splitByHeading(section.content, 3);
      for (const sub of h3Sections) {
        const subH = sub.heading.toLowerCase();
        if (subH.includes("entry")) {
          oap.entryPoints = parseListItems(sub.content);
        } else if (subH.includes("childhood budget")) {
          oap.childhoodBudget = parseListItems(sub.content);
        } else if (subH.includes("foundational")) {
          oap.foundationalServices = parseListItems(sub.content);
        } else if (subH.includes("wait")) {
          oap.waitTimes = parseWaitTimes(sub.content);
        }
      }
    } else if (heading.includes("school")) {
      const h3Sections = splitByHeading(section.content, 3);
      for (const sub of h3Sections) {
        const subH = sub.heading.toLowerCase();
        if (subH.includes("iep") || subH.includes("individual education")) {
          school.iepPoints = parseListItems(sub.content);
        } else if (subH.includes("board")) {
          const boardLines = sub.content.split("\n").filter((l) => l.includes("**"));
          for (const bl of boardLines) {
            const match = bl.match(/\*\*([^*]+)\*\*.*?—\s*(.*)/);
            if (match) school.boards.push({ name: match[1].trim(), type: match[2].trim() });
          }
        }
      }
    } else if (heading.includes("financial")) {
      financialSupports = parseBenefits(section.content);
    } else if (heading.includes("source")) {
      sources = section.content.trim();
    }
  }

  return { journeyOverview, oap, school, financialSupports, lastUpdated, sources };
}
