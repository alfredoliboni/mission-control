import type {
  Appointment,
  Doctor,
  JourneyPartner,
  Medication,
  Supplement,
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

function parseBulletList(content: string): string[] {
  return content
    .split("\n")
    .filter((l) => l.match(/^-\s/))
    .map((l) => l.replace(/^-\s*/, "").trim())
    .filter(Boolean);
}

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
  const h3Sections = splitByHeading(content, 3);

  let interestsList: string[] = [];
  const sensoryProfile = { seeks: [] as string[], avoids: [] as string[], calming: [] as string[] };
  let communicationStyles: string[] = [];
  let personalityTraits: string[] = [];
  let triggers: string[] = [];
  let strengthsList: string[] = [];
  let challengesList: string[] = [];

  for (const section of h3Sections) {
    const heading = section.heading.toLowerCase();
    if (heading.includes("interest")) {
      interestsList = parseBulletList(section.content);
    } else if (heading.includes("sensory")) {
      const kvp = extractKeyValuePairs(section.content);
      sensoryProfile.seeks = (kvp.seeks || "").split(",").map((s) => s.trim()).filter(Boolean);
      sensoryProfile.avoids = (kvp.avoids || "").split(",").map((s) => s.trim()).filter(Boolean);
      sensoryProfile.calming = (kvp.calming || "").split(",").map((s) => s.trim()).filter(Boolean);
    } else if (heading.includes("communication")) {
      communicationStyles = parseBulletList(section.content);
    } else if (heading.includes("personality")) {
      personalityTraits = parseBulletList(section.content);
    } else if (heading.includes("trigger")) {
      triggers = parseBulletList(section.content);
    } else if (heading.includes("strength")) {
      strengthsList = parseBulletList(section.content);
    } else if (heading.includes("challenge")) {
      challengesList = parseBulletList(section.content);
    }
  }

  return {
    communication: pairs.communication || "",
    sensory: pairs.sensory || "",
    interests: pairs.interests || "",
    strengths: pairs.strengths || "",
    challenges: pairs.challenges || "",
    interestsList,
    sensoryProfile,
    communicationStyles,
    personalityTraits,
    triggers,
    strengthsList,
    challengesList,
  };
}

function parseMedical(content: string): ProfileMedical {
  const result: ProfileMedical = {
    medications: [],
    supplements: [],
    comorbidConditions: [],
    doctors: [],
    appointments: [],
  };

  const h3Sections = splitByHeading(content, 3);

  for (const section of h3Sections) {
    const heading = section.heading.toLowerCase();

    if (heading.includes("medication")) {
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

    if (heading.includes("supplement")) {
      const rows = extractTable(section.content);
      result.supplements = rows.map(
        (row): Supplement => ({
          supplement: row.supplement || "",
          dose: row.dose || "",
          frequency: row.frequency || "",
          notes: row.notes || "",
        })
      );
    }

    if (heading.includes("comorbid")) {
      result.comorbidConditions = parseBulletList(section.content);
    }

    if (heading.includes("doctor")) {
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

    if (heading.includes("appointment")) {
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
      interestsList: [],
      sensoryProfile: { seeks: [], avoids: [], calming: [] },
      communicationStyles: [],
      personalityTraits: [],
      triggers: [],
      strengthsList: [],
      challengesList: [],
    };
    let medical: ProfileMedical = {
      medications: [],
      supplements: [],
      comorbidConditions: [],
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
        interestsList: [],
        sensoryProfile: { seeks: [], avoids: [], calming: [] },
        communicationStyles: [],
        personalityTraits: [],
        triggers: [],
        strengthsList: [],
        challengesList: [],
      },
      medical: { medications: [], supplements: [], comorbidConditions: [], doctors: [], appointments: [] },
      journeyPartners: [],
    };
  }
}
