import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status"); // "pending" | "accepted" | "rejected" | "all"
    const search = searchParams.get("search")?.trim() || "";

    const supabase = await createClient();

    // 1️⃣ Get applications (flat)
    let appQuery = supabase
      .from("applications")
      .select(
        `
        id,
        application_no,
        status,
        created_at,
        first_name,
        middle_name,
        last_name,
        email,
        phone,
        application_type,
        program_id,
        session_id,
        student_id,
        converted_to_student
      `
      )
      .order("created_at", { ascending: false });

    if (status && status !== "all") {
      appQuery = appQuery.eq("status", status);
    }

    if (search) {
      appQuery = appQuery.or(
        `application_no.ilike.%${search}%,email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`
      );
    }

    const { data: apps, error: appsError } = await appQuery;

    if (appsError) {
      console.error("Applications list error:", appsError);
      return NextResponse.json({ error: appsError.message }, { status: 400 });
    }

    if (!apps || apps.length === 0) {
      return NextResponse.json({ applications: [] });
    }

    // 2️⃣ Collect unique program_ids & session_ids
    const programIds = Array.from(
      new Set(
        apps
          .map((a) => a.program_id as string | null)
          .filter((id): id is string => !!id)
      )
    );

    const sessionIds = Array.from(
      new Set(
        apps
          .map((a) => a.session_id as string | null)
          .filter((id): id is string => !!id)
      )
    );

    // 3️⃣ Fetch programs
    let programMap = new Map<string, string>();
    if (programIds.length > 0) {
      const { data: programs, error: progError } = await supabase
        .from("programs")
        .select("id, name")
        .in("id", programIds);

      if (progError) {
        console.error("Programs fetch error:", progError);
      } else if (programs) {
        programMap = new Map(
          programs.map((p: { id: string; name: string }) => [p.id, p.name])
        );
      }
    }

    // 4️⃣ Fetch sessions
    let sessionMap = new Map<string, string>();
    if (sessionIds.length > 0) {
      const { data: sessions, error: sessError } = await supabase
        .from("sessions")
        .select("id, name")
        .in("id", sessionIds);

      if (sessError) {
        console.error("Sessions fetch error:", sessError);
      } else if (sessions) {
        sessionMap = new Map(
          sessions.map((s: { id: string; name: string }) => [s.id, s.name])
        );
      }
    }

    // 5️⃣ Merge names into the response
    const appsWithNames = apps.map((a) => ({
      ...a,
      programName: a.program_id ? programMap.get(a.program_id) ?? null : null,
      sessionName: a.session_id ? sessionMap.get(a.session_id) ?? null : null,
    }));

    return NextResponse.json({ applications: appsWithNames });
  } catch (err: any) {
    console.error("/api/applications GET error:", err);
    return NextResponse.json(
      { error: err.message || "Invalid request" },
      { status: 400 }
    );
  }
}
