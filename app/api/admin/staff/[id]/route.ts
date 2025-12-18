import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Json = Record<string, unknown>;

function str(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}
function strTrim(v: unknown): string | null {
  const s = str(v);
  if (!s) return null;
  const t = s.trim();
  return t ? t : null;
}
function isoNow(): string {
  return new Date().toISOString();
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const { data, error } = await supabaseAdmin
    .from("staff")
    .select(
      `
        *,
        profiles:profile_id(*),
        departments(*)
      `
    )
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (!data) {
    return NextResponse.json({ error: "Staff not found" }, { status: 404 });
  }

  return NextResponse.json({ staff: data });
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: staffId } = await context.params;

  const body = (await req.json()) as Json;

  // 1) Load staff -> get profile_id
  const { data: staffRow, error: staffLoadErr } = await supabaseAdmin
    .from("staff")
    .select("id, profile_id")
    .eq("id", staffId)
    .single();

  if (staffLoadErr) {
    return NextResponse.json({ error: staffLoadErr.message }, { status: 400 });
  }
  if (!staffRow) {
    return NextResponse.json({ error: "Staff not found" }, { status: 404 });
  }

  const profileId = staffRow.profile_id as string;

  // 2) Build profile update (only update fields provided)
  const profileUpdate: Record<string, unknown> = {};
  const first_name = strTrim(body.first_name);
  const middle_name = strTrim(body.middle_name);
  const last_name = strTrim(body.last_name);
  const email = strTrim(body.email)?.toLowerCase();
  const phone = strTrim(body.phone);
  const gender = strTrim(body.gender);
  const date_of_birth = strTrim(body.date_of_birth);
  const nin = strTrim(body.nin);
  const address = strTrim(body.address);
  const state_of_origin = strTrim(body.state_of_origin);
  const lga_of_origin = strTrim(body.lga_of_origin);
  const religion = strTrim(body.religion);
  const main_role = strTrim(body.main_role);

  if (first_name !== null) profileUpdate.first_name = first_name;
  if (middle_name !== null) profileUpdate.middle_name = middle_name;
  if (last_name !== null) profileUpdate.last_name = last_name;
  if (email !== null) profileUpdate.email = email;
  if (phone !== null) profileUpdate.phone = phone;
  if (gender !== null) profileUpdate.gender = gender;
  if (date_of_birth !== null) profileUpdate.date_of_birth = date_of_birth;
  if (nin !== null) profileUpdate.nin = nin;
  if (address !== null) profileUpdate.address = address;
  if (state_of_origin !== null) profileUpdate.state_of_origin = state_of_origin;
  if (lga_of_origin !== null) profileUpdate.lga_of_origin = lga_of_origin;
  if (religion !== null) profileUpdate.religion = religion;
  if (main_role !== null) profileUpdate.main_role = main_role;

  if (Object.keys(profileUpdate).length > 0) {
    profileUpdate.updated_at = isoNow();

    const { error: profileErr } = await supabaseAdmin
      .from("profiles")
      .update(profileUpdate)
      .eq("id", profileId);

    if (profileErr) {
      return NextResponse.json({ error: profileErr.message }, { status: 400 });
    }
  }

  // 3) Build staff update
  const staffUpdate: Record<string, unknown> = {};
  const designation = strTrim(body.designation);
  const specialization = strTrim(body.specialization);
  const department_id = strTrim(body.department_id);
  const hire_date = strTrim(body.hire_date);
  const status = strTrim(body.status);

  if (designation !== null) staffUpdate.designation = designation;
  if (specialization !== null) staffUpdate.specialization = specialization;
  if (department_id !== null) staffUpdate.department_id = department_id;
  if (hire_date !== null) staffUpdate.hire_date = hire_date;
  if (status !== null) staffUpdate.status = status;

  if (Object.keys(staffUpdate).length > 0) {
    staffUpdate.updated_at = isoNow();

    const { error: staffErr } = await supabaseAdmin
      .from("staff")
      .update(staffUpdate)
      .eq("id", staffId);

    if (staffErr) {
      return NextResponse.json({ error: staffErr.message }, { status: 400 });
    }
  }

  // 4) Return fresh joined row
  const { data: updated, error: reloadErr } = await supabaseAdmin
    .from("staff")
    .select(
      `
        *,
        profiles:profile_id(*),
        departments(*)
      `
    )
    .eq("id", staffId)
    .single();

  if (reloadErr) {
    return NextResponse.json({ error: reloadErr.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, staff: updated });
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: staffId } = await context.params;

  // 1) get profile_id for this staff row
  const { data: staff, error: staffFetchErr } = await supabaseAdmin
    .from("staff")
    .select("id, profile_id")
    .eq("id", staffId)
    .single();

  if (staffFetchErr || !staff) {
    return NextResponse.json({ error: "Staff not found" }, { status: 404 });
  }

  // 2) soft delete staff
  const { error: staffErr } = await supabaseAdmin
    .from("staff")
    .update({ status: "deleted", updated_at: new Date().toISOString() })
    .eq("id", staff.id);

  if (staffErr) {
    return NextResponse.json({ error: staffErr.message }, { status: 400 });
  }

  // 3) optional: mark profile disabled (if you have onboarding_status)
  await supabaseAdmin
    .from("profiles")
    .update({ updated_at: new Date().toISOString() /*, onboarding_status: "disabled"*/ })
    .eq("id", staff.profile_id);

  // 4) ban auth user (reversible)
  // ban_duration examples: "8760h" (1 year), "720h" (30 days), "none" (unban)
  const { error: banErr } = await supabaseAdmin.auth.admin.updateUserById(
    staff.profile_id,
    { ban_duration: "8760h" }
  );

  if (banErr) {
    // staff row already marked deleted; surface auth failure clearly
    return NextResponse.json(
      { error: `Staff deleted but failed to ban auth user: ${banErr.message}` },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true });
}

