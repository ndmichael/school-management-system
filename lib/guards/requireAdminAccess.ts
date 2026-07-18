import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type ProfileRow = {
  id: string;
  main_role: string | null;
};

type AdminAccessResult =
  | {
      userId: string;
      role: "admin";
    }
  | {
      error: NextResponse;
    };

export async function requireAdminAccess(): Promise<AdminAccessResult> {
  const supabase = await createClient();

  const { data: auth, error: authError } =
    await supabase.auth.getUser();

  const userId = auth.user?.id;

  if (authError || !userId) {
    return {
      error: NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      ),
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, main_role")
    .eq("id", userId)
    .maybeSingle<ProfileRow>();

  if (profileError) {
    console.error(
      "Failed to verify admin profile:",
      profileError
    );

    return {
      error: NextResponse.json(
        { error: "Failed to verify access." },
        { status: 500 }
      ),
    };
  }

  if (!profile || profile.main_role !== "admin") {
    return {
      error: NextResponse.json(
        { error: "Admin access required." },
        { status: 403 }
      ),
    };
  }

  return {
    userId,
    role: "admin",
  };
}