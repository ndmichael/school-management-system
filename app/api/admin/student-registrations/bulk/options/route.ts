import { NextResponse } from "next/server";

import { requireAdminAccess } from "@/lib/guards/requireAdminAccess";
import { getSessionStatus } from "@/lib/sessions/session-status";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Shape returned by Supabase for an embedded relation count.
 *
 * Depending on the generated relationship typing, the count may
 * appear as one object or as an array containing one object.
 */
type RegistrationCountRelation =
  | {
      count: number | null;
    }
  | {
      count: number | null;
    }[]
  | null;

type SessionWithRegistrationCount = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean | null;
  current_semester: string | null;
  registration_counts: RegistrationCountRelation;
};

type BulkSessionOption = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  current_semester: string | null;
  registration_count: number;
};

/**
 * Safely extracts the aggregate count returned by the
 * embedded student_registrations relation.
 */
function getRegistrationCount(
  relation: RegistrationCountRelation,
): number {
  if (Array.isArray(relation)) {
    return relation[0]?.count ?? 0;
  }

  return relation?.count ?? 0;
}

/**
 * Converts the raw Supabase result into the simpler shape
 * required by the bulk-registration UI.
 */
function mapSessionOption(
  session: SessionWithRegistrationCount,
): BulkSessionOption {
  return {
    id: session.id,
    name: session.name,
    start_date: session.start_date,
    end_date: session.end_date,
    is_active: session.is_active === true,
    current_semester: session.current_semester,
    registration_count: getRegistrationCount(
      session.registration_counts,
    ),
  };
}

/**
 * GET /api/admin/student-registrations/bulk/options
 *
 * Returns:
 * - source sessions that already contain registration history
 * - target sessions that are active or upcoming
 *
 * No student registrations are created by this endpoint.
 */
export async function GET() {
  /*
   * This endpoint uses the service-role Supabase client,
   * so authorization must happen before the database query.
   */
  const guard = await requireAdminAccess();

  if ("error" in guard) {
    return guard.error;
  }

  /*
   * Fetch each session together with the number of
   * student_registrations linked to it.
   *
   * The explicit foreign-key name prevents relationship
   * ambiguity if more session relationships are added later.
   */
  const { data, error } = await supabaseAdmin
    .from("sessions")
    .select(`
      id,
      name,
      start_date,
      end_date,
      is_active,
      current_semester,
      registration_counts:student_registrations!student_registrations_session_id_fkey(count)
    `)
    .order("start_date", { ascending: false });

  if (error) {
    console.error(
      "GET bulk registration options failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to load bulk-registration session options.",
      },
      { status: 500 },
    );
  }

  const sessions = (
    (data ?? []) as unknown as SessionWithRegistrationCount[]
  ).map(mapSessionOption);

  /*
   * A source session must contain reliable registration history.
   *
   * This excludes 2024/2025 because it currently has zero
   * student_registrations.
   */
  const sourceSessions = sessions
    .filter(
      (session) => session.registration_count > 0,
    )
    .sort((firstSession, secondSession) =>
      secondSession.start_date.localeCompare(
        firstSession.start_date,
      ),
    );

  /*
   * A target may be active or upcoming, but never completed.
   *
   * The selected source session is not removed here because the
   * source has not been selected yet. The UI will remove it from
   * the target dropdown, and the preview API will validate again.
   */
  const targetSessions = sessions
    .filter((session) => {
      const status = getSessionStatus(
        session.is_active,
        session.end_date,
      );

      return (
        status === "active" ||
        status === "upcoming"
      );
    })
    .sort((firstSession, secondSession) => {
      /*
       * Display the active session first.
       */
      if (
        firstSession.is_active &&
        !secondSession.is_active
      ) {
        return -1;
      }

      if (
        secondSession.is_active &&
        !firstSession.is_active
      ) {
        return 1;
      }

      /*
       * Upcoming sessions appear from nearest to furthest.
       */
      return firstSession.start_date.localeCompare(
        secondSession.start_date,
      );
    });

  return NextResponse.json({
    source_sessions: sourceSessions,
    target_sessions: targetSessions,
  });
}