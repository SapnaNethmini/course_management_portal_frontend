/**
 * Local-only store for the extended profile fields that aren't on the API yet
 * (address, DOB, gender, O/L + A/L results, transcript PDFs).
 *
 * Backend integration is deferred — keep everything in localStorage keyed by
 * uid so the demo can persist across reloads and the dialog gating works.
 */

export interface OLSubjectResult {
  subject: string;
  result: string;
}

export interface ALSubjectResult {
  subject: string;
  result: string;
}

export interface ProfileExtras {
  address: string;
  dateOfBirth: string;
  gender: string;
  olResults: OLSubjectResult[];
  alResults: ALSubjectResult[];
  olPdfName: string | null;
  alPdfName: string | null;
}

export const EMPTY_PROFILE_EXTRAS: ProfileExtras = {
  address: "",
  dateOfBirth: "",
  gender: "",
  olResults: Array.from({ length: 9 }, () => ({ subject: "", result: "" })),
  alResults: Array.from({ length: 3 }, () => ({ subject: "", result: "" })),
  olPdfName: null,
  alPdfName: null,
};

function keyFor(uid: string): string {
  return `edupath.profileExtras.${uid}`;
}

export function loadProfileExtras(uid: string | null | undefined): ProfileExtras {
  if (!uid || typeof window === "undefined") return EMPTY_PROFILE_EXTRAS;
  try {
    const raw = localStorage.getItem(keyFor(uid));
    if (!raw) return EMPTY_PROFILE_EXTRAS;
    const parsed = JSON.parse(raw) as Partial<ProfileExtras>;
    return {
      ...EMPTY_PROFILE_EXTRAS,
      ...parsed,
      olResults:
        parsed.olResults && parsed.olResults.length === 9
          ? parsed.olResults
          : EMPTY_PROFILE_EXTRAS.olResults,
      alResults:
        parsed.alResults && parsed.alResults.length === 3
          ? parsed.alResults
          : EMPTY_PROFILE_EXTRAS.alResults,
    };
  } catch {
    return EMPTY_PROFILE_EXTRAS;
  }
}

export function saveProfileExtras(uid: string, value: ProfileExtras): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(keyFor(uid), JSON.stringify(value));
  } catch {
    /* ignore quota errors */
  }
}

/**
 * "Complete enough" for the student-application flow: requires the core
 * personal details. O/L and A/L tables are encouraged but not gating.
 */
export function isProfileExtrasComplete(extras: ProfileExtras): boolean {
  return Boolean(
    extras.address.trim() && extras.dateOfBirth.trim() && extras.gender.trim(),
  );
}
