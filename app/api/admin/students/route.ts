import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const DEFAULT_PAGE_SIZE = 20;
const ALLOWED_PAGE_SIZES = new Set([20, 50]);
const ALLOWED_STATUSES = new Set([
  "all",
  "active",
  "suspended",
  "graduated",
]);

interface ProfileSearchRow {
  id: string;
}

interface StudentIdRow {
  id: string;
}

interface CurrentSession {
  id: string;
  name: string;
}

interface RegistrationRow {
  level: string | null;
  status: string | null;
  session_id: string;
  sessions:
    | {
        id: string;
        name: string;
      }
    | {
        id: string;
        name: string;
      }[]
    | null;
}

interface RawStudentRow {
  id: string;
  profile_id: string;
  matric_no: string;
  status: string | null;
  created_at: string;

  profiles:
    | {
        first_name: string;
        middle_name: string | null;
        last_name: string;
        email: string;
        avatar_file: unknown;
      }
    | {
        first_name: string;
        middle_name: string | null;
        last_name: string;
        email: string;
        avatar_file: unknown;
      }[]
    | null;

  programs:
    | {
        name: string | null;
      }
    | {
        name: string | null;
      }[]
    | null;

  departments:
    | {
        name: string | null;
      }
    | {
        name: string | null;
      }[]
    | null;

  student_registrations: RegistrationRow[] | null;
}

function parsePositiveInteger(
  value: string | null,
  fallback: number,
): number {
  if (!value) return fallback;

  const parsed = Number.parseInt(value, 10);

  return Number.isSafeInteger(parsed) && parsed > 0
    ? parsed
    : fallback;
}

function firstRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function startOfCurrentMonth(): string {
  const now = new Date();

  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  ).toISOString();
}

function normaliseSearch(value: string): string {
  return value.trim().replace(/\s+/g, " ").slice(0, 100);
}

async function getActiveSession(): Promise<CurrentSession | null> {
  const { data, error } = await supabaseAdmin
    .from("sessions")
    .select("id, name")
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load active session: ${error.message}`);
  }

  return data as CurrentSession | null;
}

async function getMatchingStudentIds(
  search: string,
): Promise<string[] | null> {
  if (!search) return null;

  const pattern = `%${search}%`;

  /*
   * We intentionally perform separate searches.
   *
   * This avoids Supabase/PostgREST's limitation where one .or()
   * cannot combine students columns and profiles columns.
   */
  const [
    matricResult,
    firstNameResult,
    middleNameResult,
    lastNameResult,
    emailResult,
  ] = await Promise.all([
    supabaseAdmin
      .from("students")
      .select("id")
      .is("archived_at", null)
      .ilike("matric_no", pattern),

    supabaseAdmin
      .from("profiles")
      .select("id")
      .ilike("first_name", pattern),

    supabaseAdmin
      .from("profiles")
      .select("id")
      .ilike("middle_name", pattern),

    supabaseAdmin
      .from("profiles")
      .select("id")
      .ilike("last_name", pattern),

    supabaseAdmin
      .from("profiles")
      .select("id")
      .ilike("email", pattern),
  ]);

  const searchError =
    matricResult.error ??
    firstNameResult.error ??
    middleNameResult.error ??
    lastNameResult.error ??
    emailResult.error;

  if (searchError) {
    throw new Error(`Student search failed: ${searchError.message}`);
  }

  const profileIds = new Set<string>();

  const profileResults = [
    firstNameResult.data,
    middleNameResult.data,
    lastNameResult.data,
    emailResult.data,
  ];

  for (const result of profileResults) {
    for (const profile of (result ?? []) as ProfileSearchRow[]) {
      profileIds.add(profile.id);
    }
  }

  const studentIds = new Set<string>();

  for (const student of (matricResult.data ?? []) as StudentIdRow[]) {
    studentIds.add(student.id);
  }

  if (profileIds.size > 0) {
    const { data: studentsByProfile, error: studentsByProfileError } =
      await supabaseAdmin
        .from("students")
        .select("id")
        .is("archived_at", null)
        .in("profile_id", Array.from(profileIds));

    if (studentsByProfileError) {
      throw new Error(
        `Profile student search failed: ${studentsByProfileError.message}`,
      );
    }

    for (const student of (studentsByProfile ??
      []) as StudentIdRow[]) {
      studentIds.add(student.id);
    }
  }

  return Array.from(studentIds);
}

async function getStatistics() {
  const monthStart = startOfCurrentMonth();

  const [
    totalResult,
    activeResult,
    suspendedResult,
    newThisMonthResult,
  ] = await Promise.all([
    supabaseAdmin
      .from("students")
      .select("id", { count: "exact", head: true })
      .is("archived_at", null),

    supabaseAdmin
      .from("students")
      .select("id", { count: "exact", head: true })
      .is("archived_at", null)
      .eq("status", "active"),

    supabaseAdmin
      .from("students")
      .select("id", { count: "exact", head: true })
      .is("archived_at", null)
      .eq("status", "suspended"),

    supabaseAdmin
      .from("students")
      .select("id", { count: "exact", head: true })
      .is("archived_at", null)
      .gte("created_at", monthStart),
  ]);

  const statisticsError =
    totalResult.error ??
    activeResult.error ??
    suspendedResult.error ??
    newThisMonthResult.error;

  if (statisticsError) {
    throw new Error(
      `Failed to load statistics: ${statisticsError.message}`,
    );
  }

  return {
    total: totalResult.count ?? 0,
    active: activeResult.count ?? 0,
    suspended: suspendedResult.count ?? 0,
    newThisMonth: newThisMonthResult.count ?? 0,
  };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);

    const search = normaliseSearch(
      url.searchParams.get("search") ?? "",
    );

    const requestedStatus =
      url.searchParams.get("status") ?? "all";

    const status = ALLOWED_STATUSES.has(requestedStatus)
      ? requestedStatus
      : "all";

    const page = parsePositiveInteger(
      url.searchParams.get("page"),
      1,
    );

    const requestedPageSize = parsePositiveInteger(
      url.searchParams.get("pageSize"),
      DEFAULT_PAGE_SIZE,
    );

    const pageSize = ALLOWED_PAGE_SIZES.has(requestedPageSize)
      ? requestedPageSize
      : DEFAULT_PAGE_SIZE;

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const [activeSession, matchingStudentIds, statistics] =
      await Promise.all([
        getActiveSession(),
        getMatchingStudentIds(search),
        getStatistics(),
      ]);

    /*
     * A search was supplied but nothing matched.
     * Return immediately instead of querying with an empty .in().
     */
    if (
      search.length > 0 &&
      matchingStudentIds !== null &&
      matchingStudentIds.length === 0
    ) {
      return NextResponse.json({
        students: [],
        pagination: {
          page: 1,
          pageSize,
          total: 0,
          totalPages: 1,
        },
        statistics,
        activeSession,
      });
    }

    let query = supabaseAdmin
      .from("students")
      .select(
        `
          id,
          profile_id,
          matric_no,
          status,
          created_at,

          profiles!students_profile_id_fkey (
            first_name,
            middle_name,
            last_name,
            email,
            avatar_file
          ),

          programs:program_id (
            name
          ),

          departments:department_id (
            name
          ),

          student_registrations (
            level,
            status,
            session_id,
            sessions:session_id (
              id,
              name
            )
          )
        `,
        { count: "exact" },
      )
      .is("archived_at", null)
      .order("created_at", { ascending: false });

    if (status !== "all") {
      query = query.eq("status", status);
    }

    if (
      matchingStudentIds !== null &&
      matchingStudentIds.length > 0
    ) {
      query = query.in("id", matchingStudentIds);
    }

    /*
     * Filter the embedded registration to the active session.
     *
     * Because student_registrations is not an inner join,
     * students without a current registration remain visible.
     */
    if (activeSession) {
      query = query.eq(
        "student_registrations.session_id",
        activeSession.id,
      );
    }

    const { data, error, count } = await query.range(from, to);

    if (error) {
      console.error("GET /api/admin/students error:", error);

      return NextResponse.json(
        { error: error.message },
        { status: 400 },
      );
    }

    const rawStudents = (data ?? []) as unknown as RawStudentRow[];

    const students = rawStudents.map((student) => {
      const profile = firstRelation(student.profiles);
      const program = firstRelation(student.programs);
      const department = firstRelation(student.departments);

      const registration =
        student.student_registrations?.find(
          (item) =>
            !activeSession ||
            item.session_id === activeSession.id,
        ) ?? null;

      const session = registration
        ? firstRelation(registration.sessions)
        : null;

      return {
        id: student.id,
        matric_no: student.matric_no,
        level: registration?.level ?? null,
        status: student.status,
        created_at: student.created_at,

        profiles: profile
          ? {
              first_name: profile.first_name,
              middle_name: profile.middle_name,
              last_name: profile.last_name,
              email: profile.email,
              avatar_file: profile.avatar_file,
            }
          : null,

        programs: program
          ? {
              name: program.name,
            }
          : null,

        departments: department
          ? {
              name: department.name,
            }
          : null,

        sessions: session
          ? {
              name: session.name,
            }
          : activeSession
            ? {
                name: activeSession.name,
              }
            : null,

        registration_status:
          registration?.status ?? "not_registered",
      };
    });

    const total = count ?? 0;
    const totalPages = Math.max(
      1,
      Math.ceil(total / pageSize),
    );

    return NextResponse.json({
      students,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
      },
      statistics,
      activeSession,
    });
  } catch (error) {
    console.error(
      "Unexpected GET /api/admin/students error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load students",
      },
      { status: 500 },
    );
  }
}