/**
 * Patient linkId helpers for the doctor portal.
 *
 * When a stakeholder_links row has no child_agent_id (legacy whole-family invites),
 * we fan out one "virtual" row per child using a compound linkId:
 *   <realLinkId>__<childAgentId>
 *
 * parsePatientLinkId extracts both parts so downstream endpoints can still
 * look up the real DB row but know which child to scope to.
 */

export interface ParsedPatientLink {
  linkId: string;
  childAgentIdOverride?: string;
}

export function parsePatientLinkId(raw: string): ParsedPatientLink {
  const idx = raw.indexOf("__");
  if (idx === -1) return { linkId: raw };
  return {
    linkId: raw.slice(0, idx),
    childAgentIdOverride: raw.slice(idx + 2),
  };
}

export function encodePatientLinkId(linkId: string, childAgentId?: string): string {
  return childAgentId ? `${linkId}__${childAgentId}` : linkId;
}
