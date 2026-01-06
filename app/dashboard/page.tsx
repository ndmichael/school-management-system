// app/dashboard/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/dashboard";

const ROLE_HOME: Record<UserRole, string> = {
  admin: "/dashboard/admin",
  student: "/dashboard/student",
  academic_staff: "/dashboard/academic_staff",
  non_academic_staff: "/dashboard/non_academic_staff",
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("main_role")
    .eq("id", user.id)
    .maybeSingle<{ main_role: UserRole | null }>();

  if (error || !profile?.main_role) redirect("/login");

  redirect(ROLE_HOME[profile.main_role] ?? "/login");
}
