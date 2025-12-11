import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: staffId } = await context.params;
  const body = await req.json();

  // First get profile_id from staff
  const { data: staff } = await supabaseAdmin
    .from("staff")
    .select("profile_id")
    .eq("id", staffId)
    .single();

  if (!staff)
    return NextResponse.json({ error: "Staff not found" }, { status: 404 });

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({
      first_name: body.first_name,
      middle_name: body.middle_name,
      last_name: body.last_name,
      email: body.email,
      phone: body.phone,
      gender: body.gender,
      date_of_birth: body.date_of_birth,
      nin: body.nin,
      address: body.address,
      state_of_origin: body.state_of_origin,
      lga_of_origin: body.lga_of_origin,
      religion: body.religion,
    })
    .eq("id", staff.profile_id);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true });
}
