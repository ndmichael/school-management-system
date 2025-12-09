import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const studentId = params.id;

  // Fetch student → get profile_id → load profile
  const { data: stu, error: stuErr } = await supabaseAdmin
    .from("students")
    .select("profile_id")
    .eq("id", studentId)
    .single();

  if (stuErr || !stu)
    return NextResponse.json({ error: stuErr?.message || "Not found" }, { status: 404 });

  const { data: profile, error: profErr } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", stu.profile_id)
    .single();

  if (profErr)
    return NextResponse.json({ error: profErr.message }, { status: 400 });

  return NextResponse.json({ profile });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const studentId = params.id;
  const body = await req.json();

  const { data: stu, error: stuErr } = await supabaseAdmin
    .from("students")
    .select("profile_id")
    .eq("id", studentId)
    .single();

  if (stuErr || !stu)
    return NextResponse.json({ error: stuErr?.message || "Not found" }, { status: 404 });

  const { error } = await supabaseAdmin
    .from("profiles")
    .update(body)
    .eq("id", stu.profile_id);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true });
}
