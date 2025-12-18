import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// =====================================================
// GET — list staff (filters + joins)
// =====================================================
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const search = searchParams.get("search")?.trim() ?? "";
  const role = searchParams.get("role") ?? "";
  const status = searchParams.get("status") ?? "";

  let query = supabaseAdmin
    .from("staff")
    .select(`
      *,
      profiles:profile_id(*),
      departments(*)
    `)
    .order("created_at", { ascending: false });

  if (search) {
    query = query.or(
      `staff_id.ilike.%${search}%,designation.ilike.%${search}%,specialization.ilike.%${search}%`
    );
  }

  if (role && role !== "all") {
    query = query.eq("profiles.main_role", role);
  }

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ staff: data ?? [] });
}

// =====================================================
// POST — create staff (AUTH → PROFILE → STAFF)
// =====================================================
export async function POST(req: Request) {
  let createdAuthUserId: string | null = null;

  try {
    const body = (await req.json()) as Record<string, unknown>;

    const first_name = typeof body.first_name === "string" ? body.first_name.trim() : "";
    const middle_name = typeof body.middle_name === "string" ? body.middle_name.trim() : null;
    const last_name = typeof body.last_name === "string" ? body.last_name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    const phone = typeof body.phone === "string" ? body.phone.trim() : null;
    const gender = typeof body.gender === "string" ? body.gender : null;
    const date_of_birth = typeof body.date_of_birth === "string" ? body.date_of_birth : null;
    const nin = typeof body.nin === "string" ? body.nin.trim() : null;
    const address = typeof body.address === "string" ? body.address.trim() : null;

    const state_of_origin =
      typeof body.state_of_origin === "string" ? body.state_of_origin.trim() : null;
    const lga_of_origin =
      typeof body.lga_of_origin === "string" ? body.lga_of_origin.trim() : null;
    const religion = typeof body.religion === "string" ? body.religion.trim() : null;

    const main_role = typeof body.main_role === "string" ? body.main_role : "";
    const designation = typeof body.designation === "string" ? body.designation.trim() : null;
    const specialization =
      typeof body.specialization === "string" ? body.specialization.trim() : null;
    const department_id =
      typeof body.department_id === "string" ? body.department_id : null;
    const hire_date =
      typeof body.hire_date === "string" ? body.hire_date : null;

    if (!first_name || !last_name || !email || !main_role) {
      return NextResponse.json(
        { error: "Missing required fields: first_name, last_name, email, main_role" },
        { status: 400 }
      );
    }

    // -------------------------------------------------
    // 1️⃣ CREATE AUTH USER (Supabase enforces uniqueness)
    // -------------------------------------------------
    const tempPassword = crypto.randomUUID().replace(/-/g, "").slice(0, 12);

    const { data: authUser, error: authErr } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: false,
        user_metadata: { onboarding_status: "pending", main_role },
      });

    if (authErr) {
      const isDuplicate =
        authErr.message?.toLowerCase().includes("already registered");

      return NextResponse.json(
        { error: isDuplicate ? "User already exists" : authErr.message },
        { status: isDuplicate ? 409 : 400 }
      );
    }

    if (!authUser?.user) {
      return NextResponse.json({ error: "Auth user creation failed" }, { status: 400 });
    }

    createdAuthUserId = authUser.user.id;

    // -------------------------------------------------
    // 2️⃣ CREATE PROFILE
    // -------------------------------------------------
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: createdAuthUserId,
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
        onboarding_status: "pending",
      })
      .select("id")
      .single();

    if (profileErr || !profile) {
      await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId);
      return NextResponse.json(
        { error: profileErr?.message ?? "Failed to create profile" },
        { status: 400 }
      );
    }

    // -------------------------------------------------
    // 3️⃣ STAFF ID GENERATION
    // -------------------------------------------------
    let deptCode = "GEN";
    if (department_id) {
      const { data: dept } = await supabaseAdmin
        .from("departments")
        .select("code")
        .eq("id", department_id)
        .single();
      if (dept?.code) deptCode = dept.code;
    }

    const year = hire_date ? new Date(hire_date).getFullYear() : new Date().getFullYear();
    const yy = String(year).slice(-2);

    const { count } = await supabaseAdmin
      .from("staff")
      .select("id", { count: "exact", head: true })
      .eq("department_id", department_id)
      .like("staff_id", `%/${yy}/%`);

    const seq = String((count ?? 0) + 1).padStart(4, "0");
    const staff_id = `STF/${deptCode}/${yy}/${seq}`;

    // -------------------------------------------------
    // 4️⃣ CREATE STAFF
    // -------------------------------------------------
    const { data: staff, error: staffErr } = await supabaseAdmin
      .from("staff")
      .insert({
        profile_id: profile.id,
        staff_id,
        designation,
        specialization,
        department_id,
        hire_date,
        status: "active",
      })
      .select()
      .single();

    if (staffErr || !staff) {
      await supabaseAdmin.from("profiles").delete().eq("id", profile.id);
      await supabaseAdmin.auth.admin.deleteUser(profile.id);
      return NextResponse.json(
        { error: staffErr?.message ?? "Failed to create staff record" },
        { status: 400 }
      );
    }

    // -------------------------------------------------
    // 5️⃣ ACTIVATE PROFILE
    // -------------------------------------------------
    await supabaseAdmin
      .from("profiles")
      .update({ onboarding_status: "active" })
      .eq("id", profile.id);

    return NextResponse.json({
      success: true,
      staffId: staff.staff_id,
      tempPassword, // temporary until invite flow
      staff,
    });
  } catch (err) {
    if (createdAuthUserId) {
      await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId);
    }

    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected server error" },
      { status: 500 }
    );
  }
}
