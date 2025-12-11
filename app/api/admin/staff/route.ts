import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// ================================
// GET ALL STAFF — filters + join fix
// ================================
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const search = searchParams.get("search")?.trim() || "";
  const role = searchParams.get("role") || ""; // academic_staff | non_academic_staff
  const status = searchParams.get("status") || "";

  let query = supabaseAdmin
    .from("staff")
    .select(
      `
        *,
        profiles:profile_id(*),
        departments(*)
      `
    )
    .order("created_at", { ascending: false });

  // SEARCH
  if (search) {
    query = query.or(
      `staff_id.ilike.%${search}%,designation.ilike.%${search}%,specialization.ilike.%${search}%`
    );
  }

  // FILTER BY ROLE
  if (role && role !== "all") {
    query = query.eq("profiles.main_role", role);
  }

  // FILTER BY STATUS
  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("🔥 STAFF GET ERROR:", error.message);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ staff: data });
}

// ================================
// CREATE STAFF — auth + profile + staff record
// ================================
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      first_name,
      middle_name,
      last_name,
      email,
      phone,
      gender,
      date_of_birth,
      nin,
      address,
      state_of_origin,
      lga_of_origin,
      religion,
      main_role, // academic_staff | non_academic_staff

      designation,
      specialization,
      department_id,
      hire_date,
    } = body;

    if (!first_name || !last_name || !email || !main_role) {
      return NextResponse.json(
        { error: "Missing required fields: first_name, last_name, email, main_role" },
        { status: 400 }
      );
    }

    // 1️⃣ AUTH USER
    const tempPassword = Math.random().toString(36).slice(-10);

    const { data: authUser, error: authErr } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
      });

    if (authErr || !authUser.user) {
      return NextResponse.json(
        { error: "Failed to create authentication user." },
        { status: 400 }
      );
    }

    const userId = authUser.user.id;

    // 2️⃣ PROFILE RECORD
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: userId,
        first_name,
        middle_name,
        last_name,
        email,
        phone,
        gender,
        date_of_birth,
        nin,
        address,
        state_of_origin,
        lga_of_origin,
        religion,
        main_role,
      })
      .select()
      .single();

    if (profileErr || !profile) {
      return NextResponse.json(
        { error: "Failed to create profile." },
        { status: 400 }
      );
    }

    // 3️⃣ DEPT CODE
    const { data: dept } = await supabaseAdmin
      .from("departments")
      .select("code")
      .eq("id", department_id)
      .single();

    const deptCode = dept?.code || "GEN";

    // 4️⃣ YEAR SEGMENT
    const hireYear = hire_date
      ? new Date(hire_date).getFullYear()
      : new Date().getFullYear();
    const yy = hireYear.toString().slice(-2);

    // 5️⃣ SEQUENCE
    const { count: seqCount } = await supabaseAdmin
      .from("staff")
      .select("id", { count: "exact", head: true })
      .eq("department_id", department_id)
      .like("staff_id", `%/${yy}/%`);

    const nextSeq = String((seqCount ?? 0) + 1).padStart(4, "0");

    // 6️⃣ STAFF ID
    const staffId = `STF/${deptCode}/${yy}/${nextSeq}`;

    // 7️⃣ INSERT STAFF RECORD
    const { data: staff, error: staffErr } = await supabaseAdmin
      .from("staff")
      .insert({
        profile_id: userId,
        staff_id: staffId,
        designation,
        specialization,
        department_id,
        hire_date,
        status: "active",
      })
      .select()
      .single();

    if (staffErr || !staff) {
      return NextResponse.json(
        { error: "Failed to create staff record." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      staffId,
      tempPassword,
      staff,
    });
  } catch (err) {
    console.error("🔥 STAFF CREATE ERROR:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected server error" },
      { status: 500 }
    );
  }
}

// ================================
// UPDATE STAFF (PATCH) — profile + staff
// ================================
export async function PATCH(req: Request) {
  try {
    const body = await req.json();

    const {
      id, // staff.id
      profile_id,
      // profile fields
      first_name,
      middle_name,
      last_name,
      email,
      phone,
      gender,
      date_of_birth,
      nin,
      address,
      state_of_origin,
      lga_of_origin,
      religion,
      main_role,

      // staff fields
      designation,
      specialization,
      department_id,
      hire_date,
      status,
    } = body;

    if (!id || !profile_id) {
      return NextResponse.json(
        { error: "Missing id or profile_id for update." },
        { status: 400 }
      );
    }

    // 1️⃣ UPDATE PROFILE
    const { error: profileErr } = await supabaseAdmin
      .from("profiles")
      .update({
        first_name,
        middle_name,
        last_name,
        email,
        phone,
        gender,
        date_of_birth,
        nin,
        address,
        state_of_origin,
        lga_of_origin,
        religion,
        main_role,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile_id);

    if (profileErr) {
      return NextResponse.json(
        { error: profileErr.message },
        { status: 400 }
      );
    }

    // 2️⃣ UPDATE STAFF
    const { data: updatedStaff, error: staffErr } = await supabaseAdmin
      .from("staff")
      .update({
        designation,
        specialization,
        department_id,
        hire_date,
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (staffErr) {
      return NextResponse.json(
        { error: staffErr.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, staff: updatedStaff });
  } catch (err) {
    console.error("🔥 STAFF UPDATE ERROR:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected server error" },
      { status: 500 }
    );
  }
}

// ================================
// DELETE STAFF — soft delete
// ================================
export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Missing staff id" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("staff")
      .update({
        status: "deleted",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("🔥 STAFF DELETE ERROR:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected server error" },
      { status: 500 }
    );
  }
}
