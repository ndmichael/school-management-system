// app/dashboard/layout.tsx
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/dashboard";
import type { DashboardUser, UserRole } from "@/types/dashboard";

type Props = {
  children: ReactNode;
};

type StaffRow = { unit: string | null };

export default async function DashboardLayout({ children }: Props) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("first_name, middle_name, last_name, email, main_role")
    .eq("id", user.id)
    .single();

  if (error || !profile?.main_role) redirect("/login");

  const role = profile.main_role as UserRole;

  // ✅ Fetch unit once for non-academic staff (used by shared Sidebar)
  let unit: string | null = null;
  if (role === "non_academic_staff") {
    const { data: staff } = await supabase
      .from("staff")
      .select("unit")
      .eq("profile_id", user.id)
      .maybeSingle<StaffRow>();

    unit = staff?.unit ?? null;
  }

  const fullName = [profile.first_name, profile.middle_name, profile.last_name]
    .filter(Boolean)
    .join(" ");

  const dashboardUser: DashboardUser = {
    id: user.id,
    fullName: fullName || "User",
    email: profile.email,
    role,
    unit, // ✅
  };

  return <DashboardShell user={dashboardUser}>{children}</DashboardShell>;
}
