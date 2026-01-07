import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function requireAdminOrBursary() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("main_role")
    .eq("id", auth.user.id)
    .single();

  if (!profile) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  if (profile.main_role !== "admin" && profile.main_role !== "non_academic_staff") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { userId: auth.user.id, role: profile.main_role };
}
