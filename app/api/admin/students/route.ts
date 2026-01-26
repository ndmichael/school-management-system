import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

function toInt(v: string | null, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export async function GET(req: Request) {
  const url = new URL(req.url);

  const search = (url.searchParams.get("search") ?? "").trim().toLowerCase();
  const status = url.searchParams.get("status") ?? "all";

  const page = toInt(url.searchParams.get("page"), 1);
  const pageSize = toInt(url.searchParams.get("pageSize"), 20);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabaseAdmin
    .from("students")
    .select(
      `
      id,
      profile_id,
      matric_no,
      status,
      created_at,

      profiles!inner (
        first_name,
        middle_name,
        last_name,
        email,
        phone,
        gender,
        avatar_file
      ),

      programs:program_id (
        name,
        code
      ),

      departments:department_id (
        name,
        code
      ),

      student_registrations (
        level,
        sessions (
          id,
          name
        )
      )
      `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (status !== "all") {
    query = query.eq("status", status);
  }

  if (search) {
    query = query.or(
      `
      matric_no.ilike.%${search}%,
      profiles.first_name.ilike.%${search}%,
      profiles.last_name.ilike.%${search}%,
      profiles.email.ilike.%${search}%
      `
    );
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("GET /admin/students error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    students: data,
    pagination: {
      page,
      pageSize,
      total: count ?? 0,
      totalPages: Math.ceil((count ?? 0) / pageSize),
    },
  });
}
