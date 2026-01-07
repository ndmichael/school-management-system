// app/dashboard/non_academic_staff/layout.tsx
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Profile = { id: string; main_role: string };

export default async function NonAcademicLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, main_role")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  if (!profile) redirect("/login");

  const isAdmin = profile.main_role === "admin";
  const isNonAcademic = profile.main_role === "non_academic_staff";

  if (!isAdmin && !isNonAcademic) redirect("/dashboard");

  return <>{children}</>;
}
