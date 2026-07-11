"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const LoginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export type LoginResult = {
  success: boolean;
  error: string;
};

const roleToPath = {
  admin: "/dashboard/admin",
  student: "/dashboard/student",
  academic_staff: "/dashboard/academic_staff",
  non_academic_staff: "/dashboard/non_academic_staff",
} as const;

type MainRole = keyof typeof roleToPath;

function authErrorToMessage(message?: string): string {
  const normalizedMessage = (
    message ?? ""
  ).toLowerCase();

  if (
    normalizedMessage.includes(
      "invalid login credentials",
    )
  ) {
    return "Invalid email or password.";
  }

  if (
    normalizedMessage.includes("email not confirmed")
  ) {
    return "Please confirm your email before signing in.";
  }

  if (
    normalizedMessage.includes("too many requests")
  ) {
    return "Too many attempts. Please try again later.";
  }

  return "Unable to sign in. Please try again.";
}

function getStudentLoginError(
  status: string | null,
): string {
  switch (status?.trim().toLowerCase()) {
    case "suspended":
      return "Your student account has been suspended. Contact the administration.";

    case "dismissed":
      return "Your student account has been dismissed. Contact the administration.";

    case "withdrawn":
      return "Your student account is marked as withdrawn. Contact the administration.";

    case "graduated":
      return "Graduate access is not currently available.";

    default:
      return "Your student account is not active. Contact the administration.";
  }
}

function getStaffLoginError(
  status: string | null,
): string {
  switch (status?.trim().toLowerCase()) {
    case "suspended":
      return "Your staff account has been suspended. Contact the administration.";

    case "resigned":
      return "This staff account is marked as resigned and can no longer access the system.";

    case "terminated":
      return "This staff account has been terminated and can no longer access the system.";

    case "retired":
      return "This staff account is marked as retired and can no longer access the system.";

    default:
      return "Your staff account is not active. Contact the administration.";
  }
}

export async function loginAction(
  _prevState: LoginResult,
  formData: FormData,
): Promise<LoginResult> {
  const supabase = await createClient();

  const parsed = LoginSchema.safeParse({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "Invalid email or password.",
    };
  }

  const { email, password } = parsed.data;

  const {
    data,
    error: signInError,
  } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    return {
      success: false,
      error: authErrorToMessage(
        signInError.message,
      ),
    };
  }

  const user = data.user;

  if (!user) {
    return {
      success: false,
      error: "Authentication failed.",
    };
  }

  /*
   * Load the user's profile, role and onboarding status.
   */
  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select("main_role, onboarding_status")
    .eq("id", user.id)
    .single();

  if (
    profileError ||
    !profile ||
    !profile.main_role
  ) {
    await supabase.auth.signOut();

    return {
      success: false,
      error: "User role not found.",
    };
  }

  const role = profile.main_role as string;

  /*
   * Reject unknown roles.
   */
  if (!(role in roleToPath)) {
    await supabase.auth.signOut();

    return {
      success: false,
      error: "User role not supported.",
    };
  }

  const mainRole = role as MainRole;

  /*
   * Student restriction:
   * only active students may continue.
   */
  if (mainRole === "student") {
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
        "[STUDENT_LOGIN_STATUS_ERROR]",
        studentError,
      );

      await supabase.auth.signOut();

      return {
        success: false,
        error:
          "Unable to verify your student account. Please try again.",
      };
    }

    if (!student) {
      await supabase.auth.signOut();

      return {
        success: false,
        error:
          "Your student record could not be found. Contact the administration.",
      };
    }

    const studentStatus =
      student.status?.trim().toLowerCase() ?? "";

    if (studentStatus !== "active") {
      await supabase.auth.signOut();

      return {
        success: false,
        error: getStudentLoginError(
          studentStatus,
        ),
      };
    }
  }

  /*
   * Staff restriction:
   * applies to academic and non-academic staff.
   * Only active staff may continue.
   */
  if (
    mainRole === "academic_staff" ||
    mainRole === "non_academic_staff"
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
        "[STAFF_LOGIN_STATUS_ERROR]",
        staffError,
      );

      await supabase.auth.signOut();

      return {
        success: false,
        error:
          "Unable to verify your staff account. Please try again.",
      };
    }

    if (!staff) {
      await supabase.auth.signOut();

      return {
        success: false,
        error:
          "Your staff record could not be found. Contact the administration.",
      };
    }

    const staffStatus =
      staff.status?.trim().toLowerCase() ?? "";

    if (staffStatus !== "active") {
      await supabase.auth.signOut();

      return {
        success: false,
        error: getStaffLoginError(staffStatus),
      };
    }
  }

  /*
   * Legacy profiles with a null or empty onboarding status
   * remain allowed.
   *
   * Known incomplete statuses such as "pending" must
   * complete password setup.
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

  redirect(roleToPath[mainRole]);
}