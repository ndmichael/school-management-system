import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const search = url.searchParams.get("search")?.trim().toLowerCase() || "";
  const status = url.searchParams.get("status") || "all";
  const page = Number(url.searchParams.get("page") || 1);
  const pageSize = Number(url.searchParams.get("pageSize") || 20);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Build filters
  const matchFilters: Record<string, any> = {};
  if (status !== "all") matchFilters.status = status;

  // Base query (students table)
  let query = supabaseAdmin
    .from("students")
    .select(
      `
      id,
      profile_id,
      matric_no,
      level,
      status,
      program_id,
      department_id,
      course_session_id,

      profiles!inner (
        first_name,
        middle_name,
        last_name,
        email,
        phone,
        gender
      ),

      programs:program_id (
        name,
        code
      ),

      departments:department_id (
        name,
        code
      ),

      sessions:course_session_id (
        name
      )
    `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  // Apply status filter
  if (status !== "all") query = query.eq("status", status);

  // Search (case-insensitive)
  if (search) {
    query = query.or(
      `matric_no.ilike.%${search}%, 
       profiles.first_name.ilike.%${search}%, 
       profiles.last_name.ilike.%${search}%, 
       profiles.email.ilike.%${search}%`
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
      total: count || 0,
      totalPages: Math.ceil((count || 0) / pageSize),
    },
  });
}
