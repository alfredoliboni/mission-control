import type {
  Appointment,
  Doctor,
  JourneyPartner,
  Medication,
  ParsedProfile,
  ProfileBasicInfo,
  ProfileMedical,
  ProfilePersonal,
} from "@/types/workspace";
import {
  extractKeyValuePairs,
  extractTable,
  splitByHeading,
} from "./common";

function parseBasicInfo(content: string): ProfileBasicInfo {
  const pairs = extractKeyValuePairs(content);
  return {
    name: pairs.name || "",
    dateOfBirth: pairs.date_of_birth || "",
    age: pairs.age || "",
    diagnosis: pairs.diagnosis || "",
    currentStage: pairs.current_stage || "",
    postalCode: pairs.postal_code || "",
    ...pairs,
  };
}

function parsePersonalProfile(content: string): ProfilePersonal {
  const pairs = extractKeyValuePairs(content);
  return {
    communication: pairs.communication || "",
    sensory: pairs.sensory || "",
    interests: pairs.interests || "",
    strengths: pairs.strengths || "",
    challenges: pairs.challenges || "",
    ...pairs,
  };
}

function parseMedical(content: string): ProfileMedical {
  const result: ProfileMedical = {
    medications: [],
    doctors: [],
    appointments: [],
  };

  const h3Sections = splitByHeading(content, 3);

  for (const section of h3Sections) {
    if (
      section.heading.toLowerCase().includes("medication")
    ) {
      const rows = extractTable(section.content);
      result.medications = rows.map(
        (row): Medication => ({
          medication: row.medication || "",
          dose: row.dose || "",
          frequency: row.frequency || "",
          prescriber: row.prescriber || "",
          startDate: row.start_date || "",
          status: row.status || "",
          notes: row.notes || "",
        })
      );
    }

    if (section.heading.toLowerCase().includes("doctor")) {
      const lines = section.content.split("\n").filter((l) => l.startsWith("-"));
      result.doctors = lines.map((line): Doctor => {
        const match = line.match(
          /\*\*(.+?):\*\*\s*(.+?)\s*—\s*(.+?)\s*—\s*(.+)/
        );
        if (match) {
          return {
            role: match[1].trim(),
            name: match[2].trim(),
            organization: match[3].trim(),
            phone: match[4].trim(),
          };
        }
        return { role: "", name: line.replace(/^-\s*/, ""), organization: "", phone: "" };
      });
    }

    if (
      section.heading.toLowerCase().includes("appointment")
    ) {
      const lines = section.content
        .split("\n")
        .filter((l) => l.startsWith("-"));
      result.appointments = lines.map((line): Appointment => {
        const match = line.match(/^-\s*([\d-]+):\s*(.+)/);
        if (match) {
          return { date: match[1], description: match[2].trim() };
        }
        return { date: "", description: line.replace(/^-\s*/, "") };
      });
    }
  }

  return result;
}

function parseJourneyPartners(content: string): JourneyPartner[] {
  const rows = extractTable(content);
  return rows.map(
    (row): JourneyPartner => ({
      role: row.role || "",
      name: row.name || "",
      organization: row.organization || "",
      contact: row.contact || "",
      notes: row.notes || "",
    })
  );
}

export function parseProfile(markdown: string): ParsedProfile {
  try {
    const h1Match = markdown.match(/^#\s+(.+)/m);
    const title = h1Match ? h1Match[1].trim() : "Child Profile";

    const h2Sections = splitByHeading(markdown, 2);

    let basicInfo: ProfileBasicInfo = {
      name: "",
      dateOfBirth: "",
      age: "",
      diagnosis: "",
      currentStage: "",
      postalCode: "",
    };
    let personalProfile: ProfilePersonal = {
      communication: "",
      sensory: "",
      interests: "",
      strengths: "",
      challenges: "",
    };
    let medical: ProfileMedical = {
      medications: [],
      doctors: [],
      appointments: [],
    };
    let journeyPartners: JourneyPartner[] = [];

    for (const section of h2Sections) {
      const heading = section.heading.toLowerCase();
      if (heading.includes("basic info")) {
        basicInfo = parseBasicInfo(section.content);
      } else if (heading.includes("personal profile")) {
        personalProfile = parsePersonalProfile(section.content);
      } else if (heading.includes("medical")) {
        medical = parseMedical(section.content);
      } else if (heading.includes("journey partner")) {
        journeyPartners = parseJourneyPartners(section.content);
      }
    }

    return { title, basicInfo, personalProfile, medical, journeyPartners };
  } catch {
    return {
      title: "Child Profile",
      basicInfo: {
        name: "",
        dateOfBirth: "",
        age: "",
        diagnosis: "",
        currentStage: "",
        postalCode: "",
      },
      personalProfile: {
        communication: "",
        sensory: "",
        interests: "",
        strengths: "",
        challenges: "",
      },
      medical: { medications: [], doctors: [], appointments: [] },
      journeyPartners: [],
    };
  }
}
