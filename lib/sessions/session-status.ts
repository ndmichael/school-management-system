import type { SessionStatus } from "@/types/session";

/**
 * Returns a local calendar date in YYYY-MM-DD format.
 *
 * Session dates are PostgreSQL `date` values, so comparing
 * date strings avoids timezone shifts from `new Date("YYYY-MM-DD")`.
 */
function getLocalDateValue(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/**
 * Calculates the UI status of an academic session.
 *
 * Rules already used by the Sessions page:
 * - explicitly active session → active
 * - inactive session whose end date has passed → completed
 * - every other inactive session → upcoming
 *
 * `today` is injectable so this function can be tested easily.
 */
export function getSessionStatus(
  isActive: boolean | null | undefined,
  endDate: string,
  today: string = getLocalDateValue(),
): SessionStatus {
  if (isActive === true) {
    return "active";
  }

  return endDate < today
    ? "completed"
    : "upcoming";
}

/**
 * Registration is allowed only for active or upcoming sessions.
 */
export function isSessionAvailableForRegistration(
  isActive: boolean | null | undefined,
  endDate: string,
): boolean {
  return (
    getSessionStatus(isActive, endDate) !==
    "completed"
  );
}