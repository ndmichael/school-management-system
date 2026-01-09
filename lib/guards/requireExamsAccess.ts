import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function requireExamsAccess() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, main_role, unit")
    .eq("id", data.user.id)
    .single();

  if (!profile) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  const allowed =
    profile.main_role === "admin" ||
    (profile.main_role === "non_academic_staff" && profile.unit === "exams") ||
    profile.main_role === "academic_staff";

  if (!allowed) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { user: profile };
}
