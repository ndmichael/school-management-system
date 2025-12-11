import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// ===========================
// GET ONE STAFF
// ===========================
export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const { data, error } = await supabaseAdmin
    .from("staff")
    .select(`
      *,
      profiles:profile_id(*),
      departments:department_id(*)
    `)
    .eq("id", id)
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ staff: data });
}

// ===========================
// UPDATE STAFF
// ===========================
export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const body = await req.json();

  const { error, data } = await supabaseAdmin
    .from("staff")
    .update({
      designation: body.designation,
      specialization: body.specialization,
      department_id: body.department_id,
      hire_date: body.hire_date,
      status: body.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ staff: data });
}

// ===========================
// SOFT DELETE STAFF
// ===========================
export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const { error } = await supabaseAdmin
    .from("staff")
    .update({ status: "deleted" })
    .eq("id", id);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true });
}
