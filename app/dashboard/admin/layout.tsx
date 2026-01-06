// app/dashboard/admin/layout.tsx
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/dashboard";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("main_role")
    .eq("id", user.id)
    .maybeSingle<{ main_role: UserRole | null }>();

  if (!profile?.main_role) redirect("/login");

  if (profile.main_role !== "admin") redirect("/forbidden");

  return children;
}
