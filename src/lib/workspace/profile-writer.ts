import type { ParsedProfile } from "@/types/workspace";

/**
 * Converts a ParsedProfile back to markdown format that the parser can read.
 * Follows the format contract from format-contracts.md.
 */
export function profileToMarkdown(data: ParsedProfile): string {
  const lines: string[] = [];

  // Title
  lines.push(`# ${data.basicInfo.name || "Child"}'s Profile`);
  lines.push("");

  // Basic Info
  lines.push("## Basic Info");
  lines.push("");
  const basicFields: [string, string | undefined][] = [
    ["Name", data.basicInfo.name],
    ["Date of Birth", data.basicInfo.dateOfBirth],
    ["Age", data.basicInfo.age],
    ["Diagnosis", data.basicInfo.diagnosis],
    ["Current Stage", data.basicInfo.currentStage],
    ["Postal Code", data.basicInfo.postalCode],
    ["Location", data.basicInfo.location],
    ["Family Language", data.basicInfo.familyLanguage],
  ];
  for (const [key, value] of basicFields) {
    if (value) lines.push(`- **${key}:** ${value}`);
  }
  lines.push("");

  // Personal Profile
  lines.push("## Personal Profile");
  lines.push("");

  // Communication Style
  lines.push("### Communication Style");
  if (data.personalProfile.communicationStyles?.length > 0) {
    for (const style of data.personalProfile.communicationStyles) {
      lines.push(`- ${style}`);
    }
  } else if (data.personalProfile.communication) {
    lines.push(`- ${data.personalProfile.communication}`);
  }
  lines.push("");

  // Sensory Profile
  lines.push("### Sensory Profile");
  const sp = data.personalProfile.sensoryProfile;
  if (sp) {
    if (sp.seeks?.length) lines.push(`Seeks: ${sp.seeks.join(", ")}`);
    if (sp.avoids?.length) lines.push(`Avoids: ${sp.avoids.join(", ")}`);
    if (sp.calming?.length) lines.push(`Calming: ${sp.calming.join(", ")}`);
  } else if (data.personalProfile.sensory) {
    lines.push(data.personalProfile.sensory);
  }
  lines.push("");

  // Interests
  lines.push("### Interests");
  if (data.personalProfile.interestsList?.length > 0) {
    for (const item of data.personalProfile.interestsList) {
      lines.push(`- ${item}`);
    }
  } else if (data.personalProfile.interests) {
    lines.push(`- ${data.personalProfile.interests}`);
  }
  lines.push("");

  // Personality Traits
  if (data.personalProfile.personalityTraits?.length > 0) {
    lines.push("### Personality Traits");
    for (const trait of data.personalProfile.personalityTraits) {
      lines.push(`- ${trait}`);
    }
    lines.push("");
  }

  // Triggers
  if (data.personalProfile.triggers?.length > 0) {
    lines.push("### Triggers");
    for (const trigger of data.personalProfile.triggers) {
      lines.push(`- ${trigger}`);
    }
    lines.push("");
  }

  // Strengths
  lines.push("### Strengths");
  if (data.personalProfile.strengthsList?.length > 0) {
    for (const s of data.personalProfile.strengthsList) {
      lines.push(`- ${s}`);
    }
  } else if (data.personalProfile.strengths) {
    lines.push(`- ${data.personalProfile.strengths}`);
  }
  lines.push("");

  // Challenges
  lines.push("### Challenges");
  if (data.personalProfile.challengesList?.length > 0) {
    for (const c of data.personalProfile.challengesList) {
      lines.push(`- ${c}`);
    }
  } else if (data.personalProfile.challenges) {
    lines.push(`- ${data.personalProfile.challenges}`);
  }
  lines.push("");

  // Medical Info
  lines.push("## Medical Info");
  lines.push("");

  // Medications table
  lines.push("### Current Medications");
  lines.push("");
  lines.push("| Medication | Dose | Frequency | Prescriber | Start Date | Status | Notes |");
  lines.push("|-----------|------|-----------|------------|------------|--------|-------|");
  if (data.medical.medications?.length > 0) {
    for (const med of data.medical.medications) {
      lines.push(`| ${med.medication} | ${med.dose} | ${med.frequency} | ${med.prescriber} | ${med.startDate} | ${med.status} | ${med.notes} |`);
    }
  } else {
    lines.push("| (none confirmed) | | | | | | |");
  }
  lines.push("");

  // Supplements table
  if (data.medical.supplements?.length > 0) {
    lines.push("### Supplements");
    lines.push("");
    lines.push("| Supplement | Dose | Frequency | Notes |");
    lines.push("|-----------|------|-----------|-------|");
    for (const sup of data.medical.supplements) {
      lines.push(`| ${sup.supplement} | ${sup.dose} | ${sup.frequency} | ${sup.notes} |`);
    }
    lines.push("");
  }

  // Comorbid Conditions
  if (data.medical.comorbidConditions?.length > 0) {
    lines.push("### Comorbid Conditions");
    for (const cond of data.medical.comorbidConditions) {
      lines.push(`- ${cond}`);
    }
    lines.push("");
  }

  // Doctors
  if (data.medical.doctors?.length > 0) {
    lines.push("### Doctors");
    for (const doc of data.medical.doctors) {
      lines.push(`- **${doc.role}:** ${doc.name} — ${doc.organization} — ${doc.phone}`);
    }
    lines.push("");
  }

  // Appointments
  if (data.medical.appointments?.length > 0) {
    lines.push("### Upcoming Appointments");
    for (const appt of data.medical.appointments) {
      lines.push(`- ${appt.date}: ${appt.description}`);
    }
    lines.push("");
  }

  // Extra Info
  if (data.personalProfile.extraInfo) {
    lines.push("## Extra Information");
    lines.push("");
    lines.push(data.personalProfile.extraInfo);
    lines.push("");
  }

  lines.push(`Last Updated: ${new Date().toISOString().slice(0, 10)}`);

  return lines.join("\n");
}
