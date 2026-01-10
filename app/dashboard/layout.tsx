// app/dashboard/layout.tsx
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/dashboard";
import type { DashboardUser, UserRole, StaffUnit } from "@/types/dashboard";

type Props = { children: ReactNode };

type ProfileRow = {
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  email: string;
  main_role: UserRole | null;
};

type StaffRow = { unit: StaffUnit | null };

// small runtime guard (DB might still contain junk strings)
function asStaffUnit(value: unknown): StaffUnit | null {
  return value === "admissions" || value === "bursary" || value === "exams"
    ? value
    : null;
}

export default async function DashboardLayout({ children }: Props) {
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) redirect("/login");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("first_name, middle_name, last_name, email, main_role")
    .eq("id", user.id)
    .single<ProfileRow>();

  if (error || !profile?.main_role) redirect("/login");

  const role = profile.main_role;

  // ✅ Only fetch staff.unit for non-academic staff, and coerce safely
  let unit: StaffUnit | null = null;
  if (role === "non_academic_staff") {
    const { data: staff } = await supabase
      .from("staff")
      .select("unit")
      .eq("profile_id", user.id)
      .maybeSingle<{ unit: unknown }>(); // allow unknown, then validate

    unit = asStaffUnit(staff?.unit);
  }

  const fullName = [profile.first_name, profile.middle_name, profile.last_name]
    .filter((x): x is string => Boolean(x && x.trim()))
    .join(" ")
    .trim();

  const dashboardUser: DashboardUser = {
    id: user.id,
    fullName: fullName || "User",
    email: profile.email,
    role,
    unit,
  };

  return <DashboardShell user={dashboardUser}>{children}</DashboardShell>;
}
