import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

/* ----------------------------- GET Guardian ----------------------------- */

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: studentId } = await context.params;

  const { data, error } = await supabaseAdmin
    .from("students")
    .select(
      "guardian_first_name, guardian_last_name, guardian_phone, guardian_status"
    )
    .eq("id", studentId)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ guardian: data });
}

/* ----------------------------- PATCH Guardian ---------------------------- */

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: studentId } = await context.params;
  const body = await req.json();

  const { error } = await supabaseAdmin
    .from("students")
    .update({
      guardian_first_name: body.guardian_first_name ?? null,
      guardian_last_name: body.guardian_last_name ?? null,
      guardian_phone: body.guardian_phone ?? null,
      guardian_status: body.guardian_status ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", studentId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
