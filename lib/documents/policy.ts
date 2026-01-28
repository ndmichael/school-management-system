// lib/documents/policy.ts

export type SponsorshipType = "government" | "school_owner" | "external_body";

export type StudentDocType =
  | "passport"
  | "signature"
  | "academic_result"
  | "birth_or_age"
  | "sponsorship_letter"
  | "supporting_optional"; // lga OR medical (only one slot)

export const REQUIRED_BASE: StudentDocType[] = [
  "passport",
  "signature",
  "academic_result",
  "birth_or_age",
];

export const MAX_TOTAL_DOCS = 5; // base 4 + sponsorship_letter if sponsored

export function validateDocSet(
  presentDocTypes: StudentDocType[],
  sponsorshipType: SponsorshipType | null
): { ok: true } | { ok: false; error: string } {
  // no duplicates
  const uniq = new Set(presentDocTypes);
  if (uniq.size !== presentDocTypes.length) {
    return { ok: false, error: "Duplicate document types are not allowed." };
  }

  // required base
  for (const req of REQUIRED_BASE) {
    if (!presentDocTypes.includes(req)) {
      return { ok: false, error: `Missing required document: ${req}` };
    }
  }

  // sponsored => must have sponsorship_letter
  if (sponsorshipType !== null && !presentDocTypes.includes("sponsorship_letter")) {
    return { ok: false, error: "Sponsorship letter is required for sponsored students." };
  }

  // hard cap
  if (presentDocTypes.length > MAX_TOTAL_DOCS) {
    return { ok: false, error: `Maximum ${MAX_TOTAL_DOCS} documents allowed.` };
  }

  // optional slot: only 1 supporting_optional
  const optionalCount = presentDocTypes.filter((t) => t === "supporting_optional").length;
  if (optionalCount > 1) {
    return { ok: false, error: "Only one optional supporting document is allowed." };
  }

  return { ok: true };
}
