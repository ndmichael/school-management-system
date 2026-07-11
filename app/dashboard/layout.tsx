import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import { DashboardShell } from "@/components/dashboard";

import type {
  DashboardUser,
  UserRole,
  StaffUnit,
} from "@/types/dashboard";

type Props = {
  children: ReactNode;
};

type ProfileRow = {
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  email: string;
  main_role: UserRole | null;
  onboarding_status: string | null;
};

function asStaffUnit(
  value: unknown,
): StaffUnit | null {
  return value === "admissions" ||
    value === "bursary" ||
    value === "exams"
    ? value
    : null;
}

function getStudentBlockedReason(
  status: string,
): string {
  switch (status) {
    case "suspended":
      return "student_suspended";

    case "dismissed":
      return "student_dismissed";

    case "withdrawn":
      return "student_withdrawn";

    case "graduated":
      return "student_graduated";

    default:
      return "student_inactive";
  }
}

function getStaffBlockedReason(
  status: string,
): string {
  switch (status) {
    case "suspended":
      return "staff_suspended";

    case "resigned":
      return "staff_resigned";

    case "terminated":
      return "staff_terminated";

    case "retired":
      return "staff_retired";

    default:
      return "staff_inactive";
  }
}

export default async function DashboardLayout({
  children,
}: Props) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select(
      `
        first_name,
        middle_name,
        last_name,
        email,
        main_role,
        onboarding_status
      `,
    )
    .eq("id", user.id)
    .single<ProfileRow>();

  if (
    profileError ||
    !profile ||
    !profile.main_role
  ) {
    redirect(
      "/api/auth/blocked-signout?reason=account_invalid",
    );
  }

  const role = profile.main_role;

  /*
   * Student protection:
   * only active students may access the dashboard.
   *
   * This also catches students whose status changed
   * after they had already logged in.
   */
  if (role === "student") {
    const {
      data: student,
      error: studentError,
    } = await supabaseAdmin
      .from("students")
      .select("status")
      .eq("profile_id", user.id)
      .maybeSingle();

    if (studentError) {
      console.error(
        "[DASHBOARD_STUDENT_STATUS_ERROR]",
        studentError,
      );

      redirect(
        "/api/auth/blocked-signout?reason=student_inactive",
      );
    }

    if (!student) {
      redirect(
        "/api/auth/blocked-signout?reason=student_record_missing",
      );
    }

    const studentStatus =
      student.status?.trim().toLowerCase() ?? "";

    if (studentStatus !== "active") {
      const reason =
        getStudentBlockedReason(studentStatus);

      redirect(
        `/api/auth/blocked-signout?reason=${reason}`,
      );
    }
  }

  /*
   * Staff protection:
   * applies to academic and non-academic staff.
   * Only active staff may access the dashboard.
   */
  if (
    role === "academic_staff" ||
    role === "non_academic_staff"
  ) {
    const {
      data: staff,
      error: staffError,
    } = await supabaseAdmin
      .from("staff")
      .select("status")
      .eq("profile_id", user.id)
      .maybeSingle();

    if (staffError) {
      console.error(
        "[DASHBOARD_STAFF_STATUS_ERROR]",
        staffError,
      );

      redirect(
        "/api/auth/blocked-signout?reason=staff_inactive",
      );
    }

    if (!staff) {
      redirect(
        "/api/auth/blocked-signout?reason=staff_record_missing",
      );
    }

    const staffStatus =
      staff.status?.trim().toLowerCase() ?? "";

    if (staffStatus !== "active") {
      const reason =
        getStaffBlockedReason(staffStatus);

      redirect(
        `/api/auth/blocked-signout?reason=${reason}`,
      );
    }
  }

  /*
   * Account status is checked before onboarding.
   * A suspended user cannot reach the password setup page.
   *
   * Legacy profiles with null or empty onboarding status
   * remain allowed.
   */
  const onboardingStatus = (
    profile.onboarding_status ?? ""
  )
    .trim()
    .toLowerCase();

  if (
    onboardingStatus &&
    onboardingStatus !== "completed"
  ) {
    redirect("/set-password");
  }

  /*
   * Only non-academic staff currently require a unit.
   */
  let unit: StaffUnit | null = null;

  if (role === "non_academic_staff") {
    const { data: staff, error: unitError } =
      await supabaseAdmin
        .from("staff")
        .select("unit")
        .eq("profile_id", user.id)
        .maybeSingle<{ unit: unknown }>();

    if (unitError) {
      console.error(
        "[DASHBOARD_STAFF_UNIT_ERROR]",
        unitError,
      );
    }

    unit = asStaffUnit(staff?.unit);
  }

  const fullName = [
    profile.first_name,
    profile.middle_name,
    profile.last_name,
  ]
    .filter(
      (value): value is string =>
        Boolean(value?.trim()),
    )
    .join(" ")
    .trim();

  const dashboardUser: DashboardUser = {
    id: user.id,
    fullName: fullName || "User",
    email: profile.email,
    role,
    unit,
  };

  return (
    <DashboardShell user={dashboardUser}>
      {children}
    </DashboardShell>
  );
}